// path: backend/src/modules/enterprise-email/services/email-signature.service.ts
// purpose: Enterprise email signature management with templates, branding, and dynamic variables
// dependencies: @nestjs/common, prisma, handlebars, image-processing

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface EmailSignature {
  id: string;
  name: string;
  htmlContent: string;
  textContent: string;
  isDefault: boolean;
  // Persisted flags in schema
  useForReplies?: boolean;
  useForForwards?: boolean;
  // Non-persisted presentation fields (for previews/templates)
  variables?: SignatureVariable[];
  design?: SignatureDesign;
  compliance?: ComplianceSettings;
  usage?: SignatureUsage;
}

export interface SignatureVariable {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'url' | 'image' | 'date' | 'custom';
  defaultValue?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface SignatureDesign {
  template: string;
  theme: SignatureTheme;
  layout: 'horizontal' | 'vertical' | 'card' | 'minimal';
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
  fonts: {
    primary: string;
    size: number;
    weight: string;
  };
  spacing: {
    padding: number;
    margin: number;
  };
  borders: {
    enabled: boolean;
    style: string;
    color: string;
    width: number;
  };
}

export interface SignatureTheme {
  name: string;
  corporate: boolean;
  modern: boolean;
  colorScheme: 'light' | 'dark' | 'auto';
}

export interface ComplianceSettings {
  includeDisclaimer: boolean;
  disclaimerText?: string;
  includeConfidentiality: boolean;
  includeLegalNotice: boolean;
  customCompliance?: string[];
}

export interface SignatureUsage {
  applyToNewEmails: boolean;
  applyToReplies: boolean;
  applyToForwards: boolean;
  excludeDomains?: string[];
  scheduleBasedRules?: ScheduleRule[];
}

export interface ScheduleRule {
  name: string;
  schedule: {
    days: number[]; // 0-6 (Sunday-Saturday)
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    timezone: string;
  };
  signatureId: string;
  priority: number;
}

export interface SignatureTemplate {
  id: string;
  name: string;
  category: string;
  htmlTemplate: string;
  textTemplate: string;
  previewImage?: string;
  variables: SignatureVariable[];
  isPremium: boolean;
}

@Injectable()
export class EmailSignatureService {
  private readonly logger = new Logger(EmailSignatureService.name);
  private readonly templatesPath = process.env.SIGNATURE_TEMPLATES_PATH || './assets/signature-templates';
  private compiledTemplates = new Map<string, HandlebarsTemplateDelegate>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.initializeHandlebarsHelpers();
  }

  async createSignature(
    userId: string,
    tenantId: string,
    signatureData: {
      name: string;
      templateId?: string;
      variables?: Record<string, any>;
      design?: Partial<SignatureDesign>;
      compliance?: Partial<ComplianceSettings>;
      usage?: Partial<SignatureUsage>;
      isDefault?: boolean;
    }
  ): Promise<EmailSignature> {
    try {
      // If this is set as default, unset other default signatures
      if (signatureData.isDefault) {
        await this.prisma.emailSignature.updateMany({
          where: { userId, tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Get template if specified
      let template = null;
      if (signatureData.templateId) {
        template = await this.getSignatureTemplate(signatureData.templateId);
      }

      // Generate signature content
      const { htmlContent, textContent } = await this.generateSignatureContent(
        template,
        signatureData.variables || {},
        signatureData.design,
        userId,
        tenantId
      );

      // Create signature record (persist only schema fields)
      const signature = await this.prisma.emailSignature.create({
        data: {
          name: signatureData.name,
          content: htmlContent,
          textContent,
          isDefault: signatureData.isDefault || false,
          useForReplies: signatureData.usage?.applyToReplies ?? true,
          useForForwards: signatureData.usage?.applyToForwards ?? true,
          userId,
          tenantId,
        },
      });

      this.logger.log(`Email signature created: ${signature.name} for user ${userId}`);
      return this.formatSignature(signature);
    } catch (error) {
      this.logger.error('Error creating email signature', error);
      throw error;
    }
  }

  async updateSignature(
    signatureId: string,
    userId: string,
    tenantId: string,
    updates: Partial<EmailSignature>
  ): Promise<EmailSignature> {
    try {
      const existingSignature = await this.prisma.emailSignature.findFirst({
        where: { id: signatureId, userId, tenantId },
      });

      if (!existingSignature) {
        throw new NotFoundException('Email signature not found');
      }

      // Handle default signature changes
      if (updates.isDefault && !existingSignature.isDefault) {
        await this.prisma.emailSignature.updateMany({
          where: { userId, tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Determine new content values. We persist only schema fields.
      // If caller provided new rendered content, use it; otherwise keep existing.
      const htmlContent = (updates as any).htmlContent ?? (existingSignature as any).content;
      const textContent = updates.textContent ?? existingSignature.textContent;

      // Build safe update payload for schema fields only
      const safeData: any = {
        name: updates.name ?? existingSignature.name,
        content: htmlContent,
        textContent,
        isDefault: updates.isDefault ?? existingSignature.isDefault,
        useForReplies: updates.useForReplies ?? existingSignature.useForReplies,
        useForForwards: updates.useForForwards ?? existingSignature.useForForwards,
      };

      const updatedSignature = await this.prisma.emailSignature.update({
        where: { id: signatureId },
        data: safeData,
      });

      this.logger.log(`Email signature updated: ${signatureId}`);
      return this.formatSignature(updatedSignature);
    } catch (error) {
      this.logger.error('Error updating email signature', error);
      throw error;
    }
  }

  async deleteSignature(signatureId: string, userId: string, tenantId: string): Promise<void> {
    try {
      const signature = await this.prisma.emailSignature.findFirst({
        where: { id: signatureId, userId, tenantId },
      });

      if (!signature) {
        throw new NotFoundException('Email signature not found');
      }

      await this.prisma.emailSignature.delete({
        where: { id: signatureId },
      });

      // If this was the default signature, make another one default if exists
      if (signature.isDefault) {
        const nextSignature = await this.prisma.emailSignature.findFirst({
          where: { userId, tenantId },
          orderBy: { createdAt: 'asc' },
        });

        if (nextSignature) {
          await this.prisma.emailSignature.update({
            where: { id: nextSignature.id },
            data: { isDefault: true },
          });
        }
      }

      this.logger.log(`Email signature deleted: ${signatureId}`);
    } catch (error) {
      this.logger.error('Error deleting email signature', error);
      throw error;
    }
  }

  async getUserSignatures(userId: string, tenantId: string): Promise<EmailSignature[]> {
    try {
      const signatures = await this.prisma.emailSignature.findMany({
        where: { userId, tenantId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      return signatures.map(signature => this.formatSignature(signature));
    } catch (error) {
      this.logger.error('Error getting user signatures', error);
      throw error;
    }
  }

  async getUserSignature(userId: string, tenantId: string, signatureId?: string): Promise<EmailSignature | null> {
    try {
      let signature;
      
      if (signatureId) {
        signature = await this.prisma.emailSignature.findFirst({
          where: { id: signatureId, userId, tenantId },
        });
      } else {
        // Get default signature
        signature = await this.prisma.emailSignature.findFirst({
          where: { userId, tenantId, isDefault: true },
        });
      }

      return signature ? this.formatSignature(signature) : null;
    } catch (error) {
      this.logger.error('Error getting user signature', error);
      throw error;
    }
  }

  async getSignatureForEmail(
    userId: string,
    tenantId: string,
    emailContext: {
      type: 'new' | 'reply' | 'forward';
      recipient?: string;
      timestamp?: Date;
    }
  ): Promise<EmailSignature | null> {
    try {
      // Get user's signatures
      const signatures = await this.prisma.emailSignature.findMany({
        where: { userId, tenantId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      if (signatures.length === 0) return null;

      // Select by simple flags
      const type = emailContext.type;
      if (type === 'reply') {
        const s = signatures.find(s => s.useForReplies) || signatures[0];
        return this.formatSignature(s);
      }
      if (type === 'forward') {
        const s = signatures.find(s => s.useForForwards) || signatures[0];
        return this.formatSignature(s);
      }
      // new
      const s = signatures.find(sig => sig.isDefault) || signatures[0];
      return this.formatSignature(s);
    } catch (error) {
      this.logger.error('Error getting signature for email', error);
      throw error;
    }
  }

  async getSignatureTemplates(): Promise<SignatureTemplate[]> {
    try {
      // In a real implementation, these would come from database or files
      const templates: SignatureTemplate[] = [
        {
          id: 'corporate-modern',
          name: 'Corporate Modern',
          category: 'business',
          htmlTemplate: await this.loadTemplateFile('corporate-modern.html'),
          textTemplate: await this.loadTemplateFile('corporate-modern.txt'),
          variables: this.getCorporateVariables(),
          isPremium: false,
        },
        {
          id: 'minimal-clean',
          name: 'Minimal Clean',
          category: 'minimal',
          htmlTemplate: await this.loadTemplateFile('minimal-clean.html'),
          textTemplate: await this.loadTemplateFile('minimal-clean.txt'),
          variables: this.getMinimalVariables(),
          isPremium: false,
        },
        {
          id: 'executive-premium',
          name: 'Executive Premium',
          category: 'executive',
          htmlTemplate: await this.loadTemplateFile('executive-premium.html'),
          textTemplate: await this.loadTemplateFile('executive-premium.txt'),
          variables: this.getExecutiveVariables(),
          isPremium: true,
        },
      ];

      return templates;
    } catch (error) {
      this.logger.error('Error getting signature templates', error);
      throw error;
    }
  }

  async previewSignature(
    templateId: string,
    variables: Record<string, any>,
    design?: Partial<SignatureDesign>
  ): Promise<{ htmlContent: string; textContent: string }> {
    try {
      const template = await this.getSignatureTemplate(templateId);
      return await this.generateSignatureContent(template, variables, design, 'preview', 'preview');
    } catch (error) {
      this.logger.error('Error generating signature preview', error);
      throw error;
    }
  }

  async duplicateSignature(
    signatureId: string,
    userId: string,
    tenantId: string,
    newName?: string
  ): Promise<EmailSignature> {
    try {
      const originalSignature = await this.prisma.emailSignature.findFirst({
        where: { id: signatureId, userId, tenantId },
      });

      if (!originalSignature) {
        throw new NotFoundException('Original signature not found');
      }

      const duplicatedSignature = await this.prisma.emailSignature.create({
        data: {
          name: newName || `${originalSignature.name} (Copy)`,
          content: (originalSignature as any).content ?? (originalSignature as any).htmlContent,
          textContent: originalSignature.textContent,
          isDefault: false, // Never duplicate as default
          useForReplies: (originalSignature as any).useForReplies ?? true,
          useForForwards: (originalSignature as any).useForForwards ?? true,
          userId,
          tenantId,
        },
      });

      this.logger.log(`Email signature duplicated: ${originalSignature.id} -> ${duplicatedSignature.id}`);
      return this.formatSignature(duplicatedSignature);
    } catch (error) {
      this.logger.error('Error duplicating signature', error);
      throw error;
    }
  }

  private async generateSignatureContent(
    template: SignatureTemplate | null,
    variables: Record<string, any>,
    design?: Partial<SignatureDesign>,
    userId?: string,
    tenantId?: string
  ): Promise<{ htmlContent: string; textContent: string }> {
    try {
      // Get user/tenant info for auto-population
      const contextVariables = await this.getContextVariables(userId, tenantId);
      const allVariables = { ...contextVariables, ...variables };

      let htmlContent: string;
      let textContent: string;

      if (template) {
        // Use template
        const htmlTemplate = Handlebars.compile(template.htmlTemplate);
        const textTemplate = Handlebars.compile(template.textTemplate);
        
        htmlContent = htmlTemplate(allVariables);
        textContent = textTemplate(allVariables);
      } else {
        // Generate basic signature
        htmlContent = this.generateBasicHTMLSignature(allVariables, design);
        textContent = this.generateBasicTextSignature(allVariables);
      }

      // Apply compliance settings
      if (design && design.template) {
        const complianceSettings = this.getDefaultCompliance();
        htmlContent = this.applyCompliance(htmlContent, complianceSettings);
        textContent = this.applyComplianceToText(textContent, complianceSettings);
      }

      return { htmlContent, textContent };
    } catch (error) {
      this.logger.error('Error generating signature content', error);
      throw error;
    }
  }

  private async getContextVariables(userId?: string, tenantId?: string): Promise<Record<string, any>> {
    const variables: Record<string, any> = {};
    let resolvedTenantId = tenantId;

    if (userId && userId !== 'preview') {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            phone: true,
            tenantId: true,
          },
        });

        if (user) {
          const inferredFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          variables.fullName = inferredFullName || user.name || user.email;
          variables.firstName = user.firstName || '';
          variables.lastName = user.lastName || '';
          variables.email = user.email;
          variables.title = '';
          variables.department = '';
          variables.phone = user.phone || '';
          variables.mobile = '';

          resolvedTenantId = resolvedTenantId ?? user.tenantId ?? undefined;
        }
      } catch (error) {
        this.logger.warn('Error fetching user context for signature', error);
      }
    }

    if (resolvedTenantId) {
      try {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: resolvedTenantId },
          select: {
            name: true,
            domain: true,
          },
        });

        if (tenant) {
          variables.companyName = tenant.name || '';
          variables.website = tenant.domain || '';
          variables.address = variables.address || '';
        }
      } catch (error) {
        this.logger.warn('Error fetching tenant context for signature', error);
      }
    }

    // Ensure optional fields exist to simplify template handling
    variables.companyName = variables.companyName || '';
    variables.website = variables.website || '';
    variables.address = variables.address || '';

    return variables;
  }

  private async getSignatureTemplate(templateId: string): Promise<SignatureTemplate> {
    const templates = await this.getSignatureTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new NotFoundException(`Signature template not found: ${templateId}`);
    }
    
    return template;
  }

  private async loadTemplateFile(filename: string): Promise<string> {
    try {
      const filePath = path.join(this.templatesPath, filename);
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      // Return a basic template if file doesn't exist
      if (filename.endsWith('.html')) {
        return this.getDefaultHTMLTemplate();
      } else {
        return this.getDefaultTextTemplate();
      }
    }
  }

  private getDefaultHTMLTemplate(): string {
    return `
<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #333;">
  <div style="border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 10px;">
    <strong style="font-size: 16px; color: #0066cc;">{{fullName}}</strong><br>
    {{#if title}}<em>{{title}}</em><br>{{/if}}
    {{#if companyName}}<strong>{{companyName}}</strong><br>{{/if}}
  </div>
  <div>
    {{#if email}}<a href="mailto:{{email}}" style="color: #0066cc; text-decoration: none;">{{email}}</a><br>{{/if}}
    {{#if phone}}Phone: {{phone}}<br>{{/if}}
    {{#if website}}<a href="{{website}}" style="color: #0066cc; text-decoration: none;">{{website}}</a>{{/if}}
  </div>
</div>`;
  }

  private getDefaultTextTemplate(): string {
    return `{{fullName}}
{{#if title}}{{title}}{{/if}}
{{#if companyName}}{{companyName}}{{/if}}
{{#if email}}Email: {{email}}{{/if}}
{{#if phone}}Phone: {{phone}}{{/if}}
{{#if website}}Web: {{website}}{{/if}}`;
  }

  private generateBasicHTMLSignature(variables: Record<string, any>, design?: Partial<SignatureDesign>): string {
    const template = Handlebars.compile(this.getDefaultHTMLTemplate());
    return template(variables);
  }

  private generateBasicTextSignature(variables: Record<string, any>): string {
    const template = Handlebars.compile(this.getDefaultTextTemplate());
    return template(variables);
  }

  private applyCompliance(htmlContent: string, compliance: ComplianceSettings): string {
    let result = htmlContent;

    if (compliance.includeDisclaimer && compliance.disclaimerText) {
      result += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 11px; color: #666;">
        ${compliance.disclaimerText}
      </div>`;
    }

    if (compliance.includeConfidentiality) {
      result += `<div style="margin-top: 10px; font-size: 10px; color: #999;">
        This email and any attachments are confidential and intended solely for the addressee.
      </div>`;
    }

    return result;
  }

  private applyComplianceToText(textContent: string, compliance: ComplianceSettings): string {
    let result = textContent;

    if (compliance.includeDisclaimer && compliance.disclaimerText) {
      result += `\n\n---\n${compliance.disclaimerText}`;
    }

    if (compliance.includeConfidentiality) {
      result += '\n\nThis email and any attachments are confidential and intended solely for the addressee.';
    }

    return result;
  }

  private findMatchingScheduleRule(rules: ScheduleRule[], timestamp?: Date): ScheduleRule | null {
    if (!timestamp) timestamp = new Date();

    const currentDay = timestamp.getDay();
    const currentTime = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`;

    return rules
      .filter(rule => rule.schedule.days.includes(currentDay))
      .filter(rule => currentTime >= rule.schedule.startTime && currentTime <= rule.schedule.endTime)
      .sort((a, b) => b.priority - a.priority)[0] || null;
  }

  private getCorporateVariables(): SignatureVariable[] {
    return [
      { key: 'fullName', label: 'Full Name', type: 'text', required: true },
      { key: 'title', label: 'Job Title', type: 'text', required: true },
      { key: 'companyName', label: 'Company Name', type: 'text', required: true },
      { key: 'email', label: 'Email Address', type: 'email', required: true },
      { key: 'phone', label: 'Phone Number', type: 'phone', required: false },
      { key: 'website', label: 'Website', type: 'url', required: false },
    ];
  }

  private getMinimalVariables(): SignatureVariable[] {
    return [
      { key: 'fullName', label: 'Full Name', type: 'text', required: true },
      { key: 'email', label: 'Email Address', type: 'email', required: true },
      { key: 'phone', label: 'Phone Number', type: 'phone', required: false },
    ];
  }

  private getExecutiveVariables(): SignatureVariable[] {
    return [
      { key: 'fullName', label: 'Full Name', type: 'text', required: true },
      { key: 'title', label: 'Executive Title', type: 'text', required: true },
      { key: 'companyName', label: 'Company Name', type: 'text', required: true },
      { key: 'email', label: 'Email Address', type: 'email', required: true },
      { key: 'phone', label: 'Direct Phone', type: 'phone', required: true },
      { key: 'mobile', label: 'Mobile Phone', type: 'phone', required: false },
      { key: 'website', label: 'Website', type: 'url', required: false },
      { key: 'linkedin', label: 'LinkedIn Profile', type: 'url', required: false },
    ];
  }

  private getDefaultDesign(): SignatureDesign {
    return {
      template: 'corporate-modern',
      theme: { name: 'Corporate', corporate: true, modern: true, colorScheme: 'light' },
      layout: 'horizontal',
      colors: {
        primary: '#0066cc',
        secondary: '#333333',
        text: '#666666',
        background: '#ffffff',
      },
      fonts: {
        primary: 'Arial, sans-serif',
        size: 14,
        weight: 'normal',
      },
      spacing: {
        padding: 10,
        margin: 15,
      },
      borders: {
        enabled: true,
        style: 'solid',
        color: '#0066cc',
        width: 2,
      },
    };
  }

  private getDefaultCompliance(): ComplianceSettings {
    return {
      includeDisclaimer: false,
      includeConfidentiality: false,
      includeLegalNotice: false,
    };
  }

  private getDefaultUsage(): SignatureUsage {
    return {
      applyToNewEmails: true,
      applyToReplies: true,
      applyToForwards: false,
    };
  }

  private formatSignature(signature: any): EmailSignature {
    return {
      id: signature.id,
      name: signature.name,
      htmlContent: signature.content || signature.htmlContent,
      textContent: signature.textContent,
      isDefault: signature.isDefault,
      useForReplies: signature.useForReplies ?? true,
      useForForwards: signature.useForForwards ?? true,
      // Non-persisted presentation defaults
      variables: [],
      design: this.getDefaultDesign(),
      compliance: this.getDefaultCompliance(),
      usage: this.getDefaultUsage(),
    };
  }

  private initializeHandlebarsHelpers(): void {
    // Register custom Handlebars helpers
    Handlebars.registerHelper('formatPhone', (phone: string) => {
      if (!phone) return '';
      // Basic phone formatting - can be enhanced
      return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    });

    Handlebars.registerHelper('uppercase', (text: string) => {
      return text ? text.toUpperCase() : '';
    });

    Handlebars.registerHelper('lowercase', (text: string) => {
      return text ? text.toLowerCase() : '';
    });
  }
}

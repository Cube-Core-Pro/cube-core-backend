// path: backend/src/modules/webmail/services/template.service.ts
// purpose: Email template management service with Fortune500 features
// dependencies: @nestjs/common, prisma, handlebars for templating

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'marketing' | 'transactional' | 'notification' | 'internal' | 'customer_service';
  variables: TemplateVariable[];
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  lastUsed?: Date;
  tags: string[];
  permissions: TemplatePermissions;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'url';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: string;
}

export interface TemplatePermissions {
  canView: string[];
  canEdit: string[];
  canDelete: string[];
  canUse: string[];
  isPublic: boolean;
}

export interface TemplateRenderData {
  [key: string]: any;
}

export interface RenderedTemplate {
  subject: string;
  body: string;
  plainText: string;
  metadata: {
    templateId: string;
    renderedAt: Date;
    variables: TemplateRenderData;
  };
}

export interface TemplateStats {
  totalTemplates: number;
  activeTemplates: number;
  totalUsage: number;
  popularTemplates: Array<{
    id: string;
    name: string;
    usageCount: number;
  }>;
  categoryBreakdown: Record<string, number>;
  recentActivity: Array<{
    templateId: string;
    action: 'created' | 'updated' | 'used' | 'deleted';
    timestamp: Date;
    userId: string;
  }>;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private prisma: PrismaService) {}

  async createTemplate(
    templateData: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'lastUsed'>,
    userId: string,
  ): Promise<EmailTemplate> {
    try {
      // Validate template content
      this.validateTemplateContent(templateData);

      const templateId = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const template: EmailTemplate = {
        ...templateData,
        id: templateId,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        createdBy: userId,
      };

      // Store template (in a real implementation, this would be in database)
      await this.storeTemplate(template);

      this.logger.log(`Email template ${templateId} created by ${userId}`);
      return template;
    } catch (error) {
      this.logger.error(`Error creating template: ${error.message}`);
      throw error;
    }
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<EmailTemplate>,
    userId: string,
  ): Promise<EmailTemplate> {
    try {
      const template = await this.getTemplate(templateId, userId);
      
      if (!this.hasPermission(template, userId, 'canEdit')) {
        throw new ForbiddenException('Insufficient permissions to edit template');
      }

      // Validate updates
      if (updates.subject || updates.body) {
        this.validateTemplateContent({ ...template, ...updates });
      }

      const updatedTemplate: EmailTemplate = {
        ...template,
        ...updates,
        updatedAt: new Date(),
      };

      await this.storeTemplate(updatedTemplate);

      this.logger.log(`Template ${templateId} updated by ${userId}`);
      return updatedTemplate;
    } catch (error) {
      this.logger.error(`Error updating template: ${error.message}`);
      throw error;
    }
  }

  async getTemplate(templateId: string, userId: string): Promise<EmailTemplate> {
    try {
      const template = await this.retrieveTemplate(templateId);
      
      if (!template) {
        throw new NotFoundException('Template not found');
      }

      if (!this.hasPermission(template, userId, 'canView')) {
        throw new ForbiddenException('Insufficient permissions to view template');
      }

      return template;
    } catch (error) {
      this.logger.error(`Error getting template: ${error.message}`);
      throw error;
    }
  }

  async getTemplates(
    userId: string,
    filters?: {
      category?: string;
      isActive?: boolean;
      tags?: string[];
      search?: string;
    },
  ): Promise<EmailTemplate[]> {
    try {
      const allTemplates = await this.getAllTemplates();
      
      return allTemplates.filter(template => {
        // Check permissions
        if (!this.hasPermission(template, userId, 'canView')) {
          return false;
        }

        // Apply filters
        if (filters?.category && template.category !== filters.category) {
          return false;
        }

        if (filters?.isActive !== undefined && template.isActive !== filters.isActive) {
          return false;
        }

        if (filters?.tags?.length && !filters.tags.some(tag => template.tags.includes(tag))) {
          return false;
        }

        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          if (!template.name.toLowerCase().includes(searchLower) &&
              !template.subject.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        return true;
      });
    } catch (error) {
      this.logger.error(`Error getting templates: ${error.message}`);
      throw error;
    }
  }

  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    try {
      const template = await this.getTemplate(templateId, userId);
      
      if (!this.hasPermission(template, userId, 'canDelete')) {
        throw new ForbiddenException('Insufficient permissions to delete template');
      }

      await this.removeTemplate(templateId);

      this.logger.log(`Template ${templateId} deleted by ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting template: ${error.message}`);
      throw error;
    }
  }

  async renderTemplate(
    templateId: string,
    data: TemplateRenderData,
    userId: string,
  ): Promise<RenderedTemplate> {
    try {
      const template = await this.getTemplate(templateId, userId);
      
      if (!this.hasPermission(template, userId, 'canUse')) {
        throw new ForbiddenException('Insufficient permissions to use template');
      }

      if (!template.isActive) {
        throw new ForbiddenException('Template is not active');
      }

      // Validate required variables
      this.validateTemplateData(template, data);

      // Render subject and body
      const renderedSubject = this.renderString(template.subject, data);
      const renderedBody = this.renderString(template.body, data);
      const plainText = this.convertToPlainText(renderedBody);

      // Update usage statistics
      await this.updateTemplateUsage(templateId);

      const rendered: RenderedTemplate = {
        subject: renderedSubject,
        body: renderedBody,
        plainText,
        metadata: {
          templateId,
          renderedAt: new Date(),
          variables: data,
        },
      };

      this.logger.log(`Template ${templateId} rendered by ${userId}`);
      return rendered;
    } catch (error) {
      this.logger.error(`Error rendering template: ${error.message}`);
      throw error;
    }
  }

  async duplicateTemplate(
    templateId: string,
    newName: string,
    userId: string,
  ): Promise<EmailTemplate> {
    try {
      const originalTemplate = await this.getTemplate(templateId, userId);
      
      const duplicatedTemplate = {
        ...originalTemplate,
        name: newName,
        isDefault: false,
        createdBy: userId,
      };

      delete (duplicatedTemplate as any).id;
      delete (duplicatedTemplate as any).createdAt;
      delete (duplicatedTemplate as any).updatedAt;
      delete (duplicatedTemplate as any).usageCount;
      delete (duplicatedTemplate as any).lastUsed;

      return this.createTemplate(duplicatedTemplate, userId);
    } catch (error) {
      this.logger.error(`Error duplicating template: ${error.message}`);
      throw error;
    }
  }

  async getTemplateStats(userId: string): Promise<TemplateStats> {
    try {
      const templates = await this.getTemplates(userId);
      
      const totalTemplates = templates.length;
      const activeTemplates = templates.filter(t => t.isActive).length;
      const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);
      
      const popularTemplates = templates
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10)
        .map(t => ({
          id: t.id,
          name: t.name,
          usageCount: t.usageCount,
        }));

      const categoryBreakdown = templates.reduce((acc, template) => {
        acc[template.category] = (acc[template.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Mock recent activity
      const recentActivity = templates
        .slice(0, 5)
        .map(t => ({
          templateId: t.id,
          action: 'used' as const,
          timestamp: t.lastUsed || t.updatedAt,
          userId: t.createdBy,
        }));

      return {
        totalTemplates,
        activeTemplates,
        totalUsage,
        popularTemplates,
        categoryBreakdown,
        recentActivity,
      };
    } catch (error) {
      this.logger.error(`Error getting template stats: ${error.message}`);
      throw error;
    }
  }

  async previewTemplate(
    templateId: string,
    data: TemplateRenderData,
    userId: string,
  ): Promise<{ subject: string; body: string }> {
    try {
      const template = await this.getTemplate(templateId, userId);
      
      // Render with provided data, using defaults for missing required fields
      const completeData = this.fillDefaultValues(template, data);
      
      return {
        subject: this.renderString(template.subject, completeData),
        body: this.renderString(template.body, completeData),
      };
    } catch (error) {
      this.logger.error(`Error previewing template: ${error.message}`);
      throw error;
    }
  }

  async validateTemplateVariables(templateId: string, data: TemplateRenderData, userId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const template = await this.getTemplate(templateId, userId);
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check required variables
      template.variables
        .filter(v => v.required)
        .forEach(variable => {
          if (!data.hasOwnProperty(variable.name)) {
            errors.push(`Required variable '${variable.name}' is missing`);
          }
        });

      // Validate variable types and formats
      template.variables.forEach(variable => {
        if (data.hasOwnProperty(variable.name)) {
          const value = data[variable.name];
          
          if (!this.validateVariableType(variable, value)) {
            errors.push(`Variable '${variable.name}' has invalid type. Expected ${variable.type}`);
          }
          
          if (variable.validation && !this.validateVariableFormat(variable.validation, value)) {
            errors.push(`Variable '${variable.name}' does not match required format`);
          }
        }
      });

      // Check for unused variables in data
      Object.keys(data).forEach(key => {
        if (!template.variables.find(v => v.name === key)) {
          warnings.push(`Variable '${key}' is not used in template`);
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Error validating template variables: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods
  private validateTemplateContent(template: Partial<EmailTemplate>): void {
    if (!template.name?.trim()) {
      throw new Error('Template name is required');
    }

    if (!template.subject?.trim()) {
      throw new Error('Template subject is required');
    }

    if (!template.body?.trim()) {
      throw new Error('Template body is required');
    }

    // Validate template syntax
    try {
      this.renderString(template.subject || '', {});
      this.renderString(template.body || '', {});
    } catch (error) {
      throw new Error(`Template syntax error: ${error.message}`);
    }
  }

  private hasPermission(template: EmailTemplate, userId: string, permission: keyof TemplatePermissions): boolean {
    if (template.createdBy === userId) return true;
    if (template.permissions.isPublic && permission === 'canView') return true;
    
    const permissionArray = template.permissions[permission] as string[];
    return Array.isArray(permissionArray) && permissionArray.includes(userId);
  }

  private renderString(template: string, data: TemplateRenderData): string {
    // Simple template rendering - replace {{variable}} with data values
    return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return data.hasOwnProperty(variable) ? String(data[variable]) : match;
    });
  }

  private convertToPlainText(html: string): string {
    // Simple HTML to plain text conversion
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  private validateTemplateData(template: EmailTemplate, data: TemplateRenderData): void {
    const requiredVars = template.variables.filter(v => v.required);
    
    for (const variable of requiredVars) {
      if (!data.hasOwnProperty(variable.name)) {
        throw new Error(`Required variable '${variable.name}' is missing`);
      }
      
      if (!this.validateVariableType(variable, data[variable.name])) {
        throw new Error(`Variable '${variable.name}' has invalid type. Expected ${variable.type}`);
      }
    }
  }

  private validateVariableType(variable: TemplateVariable, value: any): boolean {
    switch (variable.type) {
      case 'text':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'boolean':
        return typeof value === 'boolean';
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  private validateVariableFormat(validation: string, value: any): boolean {
    try {
      const regex = new RegExp(validation);
      return regex.test(String(value));
    } catch {
      return true; // If regex is invalid, skip validation
    }
  }

  private fillDefaultValues(template: EmailTemplate, data: TemplateRenderData): TemplateRenderData {
    const completeData = { ...data };
    
    template.variables.forEach(variable => {
      if (!completeData.hasOwnProperty(variable.name) && variable.defaultValue !== undefined) {
        completeData[variable.name] = variable.defaultValue;
      }
    });
    
    return completeData;
  }

  private async updateTemplateUsage(templateId: string): Promise<void> {
    try {
      const template = await this.retrieveTemplate(templateId);
      if (template) {
        template.usageCount += 1;
        template.lastUsed = new Date();
        await this.storeTemplate(template);
      }
    } catch (error) {
      this.logger.error(`Error updating template usage: ${error.message}`);
    }
  }

  // Mock storage methods - in real implementation, use database
  private async storeTemplate(template: EmailTemplate): Promise<void> {
    // Mock storage - would use Prisma in real implementation
  }

  private async retrieveTemplate(templateId: string): Promise<EmailTemplate | null> {
    // Mock retrieval - would use Prisma in real implementation
    return null;
  }

  private async getAllTemplates(): Promise<EmailTemplate[]> {
    // Mock retrieval - would use Prisma in real implementation
    return [];
  }

  private async removeTemplate(templateId: string): Promise<void> {
    // Mock removal - would use Prisma in real implementation
  }
}
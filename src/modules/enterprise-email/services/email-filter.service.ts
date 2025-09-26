// path: backend/src/modules/enterprise-email/services/email-filter.service.ts
// purpose: Advanced email filtering system with AI-powered categorization and rule-based filtering
// dependencies: @nestjs/common, prisma, ai-processing, rule-engine

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from '../../../redis/redis.service';

export interface FilterRule {
  id: string;
  name: string;
  conditions: FilterCondition[];
  actions: FilterAction[];
  priority: number;
  isActive: boolean;
  isAI?: boolean;
}

export interface FilterCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'attachments' | 'size' | 'date' | 'headers';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex' | 'greaterThan' | 'lessThan' | 'exists';
  value: string | number | boolean;
  caseSensitive?: boolean;
}

export interface FilterAction {
  type: 'moveToFolder' | 'addTag' | 'markAsRead' | 'markAsSpam' | 'delete' | 'forward' | 'autoReply' | 'setPriority';
  value: string;
  parameters?: Record<string, any>;
}

export interface FilterResult {
  matched: boolean;
  matchedRules: string[];
  folderId?: string;
  tags: string[];
  isSpam: boolean;
  autoReply?: string;
  forwardTo?: string[];
  priority?: string;
}

@Injectable()
export class EmailFilterService {
  private readonly logger = new Logger(EmailFilterService.name);
  private filterCache = new Map<string, FilterRule[]>();

  private parseJsonArray<T>(value: any): T[] {
    try {
      if (!value) return [];
      if (Array.isArray(value)) return value as T[];
      if (typeof value === 'string') return JSON.parse(value) as T[];
      // Prisma JsonValue could be JsonArray
      return value as T[];
    } catch {
      return [];
    }
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async applyFilters(emailData: any, userId: string, tenantId: string): Promise<FilterResult> {
    try {
      const result: FilterResult = {
        matched: false,
        matchedRules: [],
        tags: [],
        isSpam: false,
      };

      // Get user's filter rules
      const filterRules = await this.getUserFilterRules(userId, tenantId);
      
      // Sort by priority (higher priority first)
      const sortedRules = filterRules.sort((a, b) => b.priority - a.priority);

      // Apply each rule
      for (const rule of sortedRules) {
        if (!rule.isActive) continue;

        const matches = await this.evaluateRule(rule, emailData);
        if (matches) {
          result.matched = true;
          result.matchedRules.push(rule.id);

          // Execute rule actions
          await this.executeRuleActions(rule, result, emailData, userId, tenantId);

          // If rule sets email as spam or deletes it, stop processing further rules
          if (result.isSpam || result.tags.includes('deleted')) {
            break;
          }
        }
      }

      // Apply AI-powered smart categorization if no manual rules matched
      if (!result.matched) {
        const aiResult = await this.applyAIFiltering(emailData, userId, tenantId);
        Object.assign(result, aiResult);
      }

      this.logger.log(`Filters applied for user ${userId}: ${result.matchedRules.length} rules matched`);
      return result;
    } catch (error) {
      this.logger.error('Error applying email filters', error);
      throw error;
    }
  }

  async createFilterRule(userId: string, tenantId: string, ruleData: {
    name: string;
    conditions: FilterCondition[];
    actions: FilterAction[];
    priority?: number;
    isActive?: boolean;
  }): Promise<FilterRule> {
    try {
      const rule = await this.prisma.emailFilter.create({
        data: {
          name: ruleData.name,
          conditions: ruleData.conditions as unknown as Prisma.InputJsonValue,
          actions: ruleData.actions as unknown as Prisma.InputJsonValue,
          priority: ruleData.priority || 0,
          isActive: ruleData.isActive !== false,
          userId,
          tenantId,
        },
      });

      // Clear cache for user
      this.clearUserFilterCache(userId);

      this.logger.log(`Filter rule created: ${rule.name} for user ${userId}`);
      return {
        id: rule.id,
        name: rule.name,
        conditions: this.parseJsonArray<FilterCondition>(rule.conditions),
        actions: this.parseJsonArray<FilterAction>(rule.actions),
        priority: rule.priority,
        isActive: rule.isActive,
      };
    } catch (error) {
      this.logger.error('Error creating filter rule', error);
      throw error;
    }
  }

  async updateFilterRule(
    ruleId: string,
    userId: string,
    tenantId: string,
    updates: Partial<FilterRule>
  ): Promise<FilterRule> {
    try {
      const existingRule = await this.prisma.emailFilter.findFirst({
        where: { id: ruleId, userId, tenantId },
      });

      if (!existingRule) {
        throw new NotFoundException('Filter rule not found');
      }

      const updatedRule = await this.prisma.emailFilter.update({
        where: { id: ruleId },
        data: {
          name: updates.name,
          isActive: updates.isActive,
          priority: updates.priority,
          conditions: (updates.conditions as unknown as Prisma.InputJsonValue) ?? undefined,
          actions: (updates.actions as unknown as Prisma.InputJsonValue) ?? undefined,
        },
      });

      // Clear cache for user
      this.clearUserFilterCache(userId);

      this.logger.log(`Filter rule updated: ${updatedRule.name}`);
      return {
        id: updatedRule.id,
        name: updatedRule.name,
        conditions: this.parseJsonArray<FilterCondition>(updatedRule.conditions),
        actions: this.parseJsonArray<FilterAction>(updatedRule.actions),
        priority: updatedRule.priority,
        isActive: updatedRule.isActive,
      };
    } catch (error) {
      this.logger.error('Error updating filter rule', error);
      throw error;
    }
  }

  async deleteFilterRule(ruleId: string, userId: string, tenantId: string): Promise<void> {
    try {
      const rule = await this.prisma.emailFilter.findFirst({
        where: { id: ruleId, userId, tenantId },
      });

      if (!rule) {
        throw new NotFoundException('Filter rule not found');
      }

      await this.prisma.emailFilter.delete({
        where: { id: ruleId },
      });

      // Clear cache for user
      this.clearUserFilterCache(userId);

      this.logger.log(`Filter rule deleted: ${rule.name}`);
    } catch (error) {
      this.logger.error('Error deleting filter rule', error);
      throw error;
    }
  }

  async getUserFilterRules(userId: string, tenantId: string): Promise<FilterRule[]> {
    try {
      const cacheKey = `filters:${userId}:${tenantId}`;
      
      // Check cache first
      if (this.filterCache.has(cacheKey)) {
        return this.filterCache.get(cacheKey);
      }

      const rules = await this.prisma.emailFilter.findMany({
        where: { userId, tenantId },
        orderBy: { priority: 'desc' },
      });

      const filterRules = rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        conditions: this.parseJsonArray<FilterCondition>(rule.conditions),
        actions: this.parseJsonArray<FilterAction>(rule.actions),
        priority: rule.priority,
        isActive: rule.isActive,
      }));

      // Cache for 5 minutes
      this.filterCache.set(cacheKey, filterRules);
      setTimeout(() => this.filterCache.delete(cacheKey), 5 * 60 * 1000);

      return filterRules;
    } catch (error) {
      this.logger.error('Error getting user filter rules', error);
      throw error;
    }
  }

  async testFilterRule(
    rule: FilterRule,
    emailData: any
  ): Promise<{ matches: boolean; executedActions: string[] }> {
    try {
  const matches = await this.evaluateRule(rule, emailData);
  const executedActions: string[] = [];

      if (matches) {
        for (const action of rule.actions) {
          executedActions.push(`${action.type}: ${action.value}`);
        }
      }

      return { matches, executedActions };
    } catch (error) {
      this.logger.error('Error testing filter rule', error);
      throw error;
    }
  }

  async getFilterStatistics(userId: string, tenantId: string): Promise<{
    totalRules: number;
    activeRules: number;
    appliedToday: number;
    topMatchedRules: Array<{ ruleName: string; matchCount: number }>;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalRules, activeRules, appliedToday] = await Promise.all([
        this.prisma.emailFilter.count({
          where: { userId, tenantId },
        }),
        this.prisma.emailFilter.count({
          where: { userId, tenantId, isActive: true },
        }),
        this.prisma.enterpriseEmail.count({
          where: {
            userId,
            tenantId,
            createdAt: { gte: today },
            // approximate: at least one tag equals anything; since list filter lacks isEmpty, count any having at least one of common tags
            OR: [
              { tags: { has: 'important' } },
              { tags: { has: 'newsletter' } },
              { tags: { has: 'business' } },
            ],
          },
        }),
      ]);

      // Get top matched rules from cache or database
      const topMatchedRules = await this.getTopMatchedRules(userId, tenantId);

      return {
        totalRules,
        activeRules,
        appliedToday,
        topMatchedRules,
      };
    } catch (error) {
      this.logger.error('Error getting filter statistics', error);
      throw error;
    }
  }

  private async evaluateRule(rule: FilterRule, emailData: any): Promise<boolean> {
    try {
      // All conditions must match (AND logic)
      for (const condition of rule.conditions) {
        const fieldValue = this.getFieldValue(emailData, condition.field);
        const matches = this.evaluateCondition(condition, fieldValue);
        
        if (!matches) {
          return false;
        }
      }
      return true;
    } catch (error) {
      this.logger.error('Error evaluating rule', error);
      return false;
    }
  }

  private getFieldValue(emailData: any, field: string): any {
    switch (field) {
      case 'from':
        return emailData.from;
      case 'to':
        return Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to;
      case 'subject':
        return emailData.subject;
      case 'body':
        return emailData.body || emailData.htmlBody;
      case 'attachments':
        return emailData.attachments || [];
      case 'size':
        return emailData.size || 0;
      case 'date':
        return new Date(emailData.date || emailData.sentAt);
      case 'headers':
        return emailData.headers || {};
      default:
        return null;
    }
  }

  private evaluateCondition(condition: FilterCondition, fieldValue: any): boolean {
    if (fieldValue == null) return false;

  let value = condition.value;
    let compareValue = fieldValue;

    // Handle case sensitivity for string operations
    if (typeof compareValue === 'string' && typeof value === 'string' && !condition.caseSensitive) {
      compareValue = compareValue.toLowerCase();
      value = value.toLowerCase();
    }

    switch (condition.operator) {
      case 'contains':
        return typeof compareValue === 'string' && compareValue.includes(value as string);
      case 'equals':
        return compareValue === value;
      case 'startsWith':
        return typeof compareValue === 'string' && compareValue.startsWith(value as string);
      case 'endsWith':
        return typeof compareValue === 'string' && compareValue.endsWith(value as string);
      case 'regex':
        try {
          const regex = new RegExp(value as string, condition.caseSensitive ? 'g' : 'gi');
          return regex.test(compareValue);
        } catch {
          return false;
        }
      case 'greaterThan':
        return compareValue > value;
      case 'lessThan':
        return compareValue < value;
      case 'exists':
        return fieldValue != null && (Array.isArray(fieldValue) ? fieldValue.length > 0 : true);
      default:
        return false;
    }
  }

  private async executeRuleActions(
    rule: FilterRule,
    result: FilterResult,
    emailData: any,
    userId: string,
    tenantId: string
  ): Promise<void> {
    for (const action of rule.actions) {
      switch (action.type) {
        case 'moveToFolder':
          result.folderId = action.value;
          break;
        case 'addTag':
          if (!result.tags.includes(action.value)) {
            result.tags.push(action.value);
          }
          break;
        case 'markAsSpam':
          result.isSpam = true;
          break;
        case 'setPriority':
          result.priority = action.value;
          break;
        case 'forward':
          result.forwardTo = action.value.split(',').map(email => email.trim());
          break;
        case 'autoReply':
          result.autoReply = action.value;
          break;
      }
    }

    // Increment rule match counter
    await this.incrementRuleMatchCount(rule.id);
  }

  private async applyAIFiltering(emailData: any, userId: string, tenantId: string): Promise<Partial<FilterResult>> {
    try {
      // AI-powered categorization based on content analysis
      const result: Partial<FilterResult> = {
        tags: [],
      };

      // Analyze email content for automatic categorization
      const content = `${emailData.subject} ${emailData.body}`.toLowerCase();

      // Business category detection
      if (this.containsBusinessKeywords(content)) {
        result.tags.push('business');
      }

      // Newsletter detection
      if (this.isNewsletter(emailData)) {
        result.tags.push('newsletter');
        // Move newsletters to a specific folder if user has one
        const newsletterFolder = await this.getUserFolder(userId, tenantId, 'newsletters');
        if (newsletterFolder) {
          result.folderId = newsletterFolder.id;
        }
      }

      // Important email detection
      if (this.isImportantEmail(emailData, content)) {
        result.tags.push('important');
        result.priority = 'HIGH';
      }

      // Meeting/event detection
      if (this.isMeetingEmail(content)) {
        result.tags.push('meeting');
      }

      return result;
    } catch (error) {
      this.logger.error('Error applying AI filtering', error);
      return { tags: [] };
    }
  }

  private containsBusinessKeywords(content: string): boolean {
    const businessKeywords = [
      'invoice', 'payment', 'contract', 'proposal', 'meeting', 'deadline',
      'project', 'client', 'customer', 'business', 'financial', 'budget'
    ];
    return businessKeywords.some(keyword => content.includes(keyword));
  }

  private isNewsletter(emailData: any): boolean {
    const from = emailData.from?.toLowerCase() || '';
    const subject = emailData.subject?.toLowerCase() || '';
    
    return from.includes('newsletter') ||
           from.includes('noreply') ||
           from.includes('no-reply') ||
           subject.includes('newsletter') ||
           subject.includes('unsubscribe') ||
           (emailData.headers && emailData.headers['list-unsubscribe']);
  }

  private isImportantEmail(emailData: any, content: string): boolean {
    const importantKeywords = ['urgent', 'important', 'asap', 'emergency', 'critical'];
    const hasImportantKeywords = importantKeywords.some(keyword => content.includes(keyword));
    
    // Check if from VIP contact
    const isFromVIP = this.isFromVIPContact(emailData.from);
    
    return hasImportantKeywords || isFromVIP || emailData.priority === 'HIGH';
  }

  private isMeetingEmail(content: string): boolean {
    const meetingKeywords = ['meeting', 'calendar', 'schedule', 'appointment', 'zoom', 'teams'];
    return meetingKeywords.some(keyword => content.includes(keyword));
  }

  private isFromVIPContact(fromEmail: string): boolean {
    // This could be enhanced to check against a VIP contacts list
    const vipDomains = ['ceo@', 'president@', 'director@'];
    return vipDomains.some(domain => fromEmail?.toLowerCase().includes(domain));
  }

  private async getUserFolder(userId: string, tenantId: string, folderName: string) {
    try {
      return await this.prisma.emailFolder.findFirst({
        where: {
          userId,
          tenantId,
          name: { contains: folderName, mode: 'insensitive' },
        },
      });
    } catch {
      return null;
    }
  }

  private async incrementRuleMatchCount(ruleId: string): Promise<void> {
    try {
      await this.redis.incr(`rule_matches:${ruleId}`);
      await this.redis.expire(`rule_matches:${ruleId}`, 86400 * 7); // 7 days
    } catch (error) {
      this.logger.warn('Failed to increment rule match count', error);
    }
  }

  private async getTopMatchedRules(userId: string, tenantId: string): Promise<Array<{ ruleName: string; matchCount: number }>> {
    try {
      const rules = await this.prisma.emailFilter.findMany({
        where: { userId, tenantId },
        select: { id: true, name: true },
      });

      const topRules = [];
      for (const rule of rules) {
        const count = await this.redis.get(`rule_matches:${rule.id}`);
        if (count) {
          topRules.push({
            ruleName: rule.name,
            matchCount: parseInt(count, 10),
          });
        }
      }

      return topRules.sort((a, b) => b.matchCount - a.matchCount).slice(0, 5);
    } catch (error) {
      this.logger.error('Error getting top matched rules', error);
      return [];
    }
  }

  private clearUserFilterCache(userId: string): void {
    const keysToDelete = Array.from(this.filterCache.keys()).filter(key => 
      key.startsWith(`filters:${userId}:`)
    );
    keysToDelete.forEach(key => this.filterCache.delete(key));
  }
}
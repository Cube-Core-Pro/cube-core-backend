// path: backend/src/modules/webmail/services/filter.service.ts
// purpose: Email filtering and rules management service with Fortune500 automation
// dependencies: @nestjs/common, prisma, email rules engine, machine learning

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailMessage } from '../webmail.service';

export interface EmailFilter {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: FilterCondition[];
  actions: FilterAction[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  executionCount: number;
  lastExecuted?: Date;
  category: 'spam' | 'security' | 'productivity' | 'organization' | 'compliance' | 'custom';
  scope: 'personal' | 'department' | 'organization';
  tags: string[];
}

export interface FilterCondition {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string | string[] | number | boolean;
  caseSensitive?: boolean;
  negate?: boolean;
}

export interface FilterAction {
  id: string;
  type: FilterActionType;
  parameters: Record<string, any>;
  order: number;
}

export type FilterField = 
  | 'from' 
  | 'to' 
  | 'cc' 
  | 'bcc' 
  | 'subject' 
  | 'body' 
  | 'attachment_name' 
  | 'attachment_type'
  | 'sender_domain'
  | 'received_date'
  | 'size'
  | 'priority'
  | 'has_attachments'
  | 'is_encrypted'
  | 'spam_score'
  | 'sender_reputation';

export type FilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains'
  | 'starts_with' 
  | 'ends_with'
  | 'matches_regex'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in_list'
  | 'not_in_list'
  | 'is_empty'
  | 'is_not_empty';

export type FilterActionType = 
  | 'move_to_folder'
  | 'copy_to_folder'
  | 'mark_as_read'
  | 'mark_as_unread'
  | 'mark_as_important'
  | 'mark_as_spam'
  | 'delete'
  | 'quarantine'
  | 'forward_to'
  | 'reply_with_template'
  | 'add_tag'
  | 'remove_tag'
  | 'set_priority'
  | 'create_task'
  | 'send_notification'
  | 'encrypt_email'
  | 'block_sender'
  | 'whitelist_sender'
  | 'log_security_event';

export interface FilterExecutionResult {
  filterId: string;
  emailId: string;
  matched: boolean;
  actionsExecuted: string[];
  errors: string[];
  executedAt: Date;
  executionTimeMs: number;
}

export interface FilterStats {
  totalFilters: number;
  activeFilters: number;
  totalExecutions: number;
  averageExecutionTime: number;
  topFilters: Array<{
    id: string;
    name: string;
    executionCount: number;
    successRate: number;
  }>;
  categoryBreakdown: Record<string, number>;
  recentActivity: FilterExecutionResult[];
}

export interface SmartFilterSuggestion {
  name: string;
  description: string;
  confidence: number;
  conditions: FilterCondition[];
  actions: FilterAction[];
  basedOnEmails: string[];
  category: string;
}

@Injectable()
export class FilterService {
  private readonly logger = new Logger(FilterService.name);

  constructor(private prisma: PrismaService) {}

  async createFilter(
    filterData: Omit<EmailFilter, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastExecuted'>,
    userId: string,
  ): Promise<EmailFilter> {
    try {
      // Validate filter conditions and actions
      this.validateFilter(filterData);

      const filterId = `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const filter: EmailFilter = {
        ...filterData,
        id: filterId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
      };

      // Store filter
      await this.storeFilter(filter);

      this.logger.log(`Email filter ${filterId} created by ${userId}`);
      return filter;
    } catch (error) {
      this.logger.error(`Error creating filter: ${error.message}`);
      throw error;
    }
  }

  async updateFilter(
    filterId: string,
    updates: Partial<EmailFilter>,
    userId: string,
  ): Promise<EmailFilter> {
    try {
      const filter = await this.getFilter(filterId, userId);
      
      // Validate updates
      if (updates.conditions || updates.actions) {
        this.validateFilter({ ...filter, ...updates });
      }

      const updatedFilter: EmailFilter = {
        ...filter,
        ...updates,
        updatedAt: new Date(),
      };

      await this.storeFilter(updatedFilter);

      this.logger.log(`Filter ${filterId} updated by ${userId}`);
      return updatedFilter;
    } catch (error) {
      this.logger.error(`Error updating filter: ${error.message}`);
      throw error;
    }
  }

  async getFilter(filterId: string, userId: string): Promise<EmailFilter> {
    try {
      const filter = await this.retrieveFilter(filterId);
      
      if (!filter) {
        throw new NotFoundException('Filter not found');
      }

      // Check permissions
      if (!this.hasFilterPermission(filter, userId)) {
        throw new BadRequestException('Insufficient permissions to access filter');
      }

      return filter;
    } catch (error) {
      this.logger.error(`Error getting filter: ${error.message}`);
      throw error;
    }
  }

  async getFilters(
    userId: string,
    filters?: {
      category?: string;
      scope?: string;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<EmailFilter[]> {
    try {
      const allFilters = await this.getAllFilters();
      
      return allFilters.filter(filter => {
        // Check permissions
        if (!this.hasFilterPermission(filter, userId)) {
          return false;
        }

        // Apply filters
        if (filters?.category && filter.category !== filters.category) {
          return false;
        }

        if (filters?.scope && filter.scope !== filters.scope) {
          return false;
        }

        if (filters?.isActive !== undefined && filter.isActive !== filters.isActive) {
          return false;
        }

        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          if (!filter.name.toLowerCase().includes(searchLower) &&
              !filter.description.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        return true;
      }).sort((a, b) => a.priority - b.priority);
    } catch (error) {
      this.logger.error(`Error getting filters: ${error.message}`);
      throw error;
    }
  }

  async deleteFilter(filterId: string, userId: string): Promise<void> {
    try {
      const filter = await this.getFilter(filterId, userId);
      
      // Check if user can delete (owner or admin)
      if (filter.createdBy !== userId) {
        throw new BadRequestException('Insufficient permissions to delete filter');
      }

      await this.removeFilter(filterId);

      this.logger.log(`Filter ${filterId} deleted by ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting filter: ${error.message}`);
      throw error;
    }
  }

  async executeFilters(email: EmailMessage, userId: string): Promise<FilterExecutionResult[]> {
    try {
      const userFilters = await this.getFilters(userId, { isActive: true });
      const results: FilterExecutionResult[] = [];

      // Sort filters by priority
      const sortedFilters = userFilters.sort((a, b) => a.priority - b.priority);

      for (const filter of sortedFilters) {
        const startTime = Date.now();
        const result = await this.executeFilter(filter, email);
        const executionTime = Date.now() - startTime;

        results.push({
          ...result,
          executionTimeMs: executionTime,
        });

        // Update filter execution statistics
        await this.updateFilterStats(filter.id, result.matched);

        // If filter matched and has stop-processing action, break
        if (result.matched && this.hasStopProcessingAction(filter)) {
          break;
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Error executing filters: ${error.message}`);
      throw error;
    }
  }

  async executeFilter(filter: EmailFilter, email: EmailMessage): Promise<FilterExecutionResult> {
    try {
      const startTime = Date.now();
      
      // Check if email matches filter conditions
      const matched = await this.evaluateConditions(filter.conditions, email);
      const actionsExecuted: string[] = [];
      const errors: string[] = [];

      if (matched) {
        // Execute actions
        for (const action of filter.actions.sort((a, b) => a.order - b.order)) {
          try {
            await this.executeAction(action, email);
            actionsExecuted.push(`${action.type}: ${JSON.stringify(action.parameters)}`);
          } catch (actionError) {
            const error = `Failed to execute action ${action.type}: ${actionError.message}`;
            errors.push(error);
            this.logger.error(error);
          }
        }
      }

      return {
        filterId: filter.id,
        emailId: email.messageId,
        matched,
        actionsExecuted,
        errors,
        executedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Error executing filter ${filter.id}: ${error.message}`);
      return {
        filterId: filter.id,
        emailId: email.messageId,
        matched: false,
        actionsExecuted: [],
        errors: [error.message],
        executedAt: new Date(),
        executionTimeMs: 0,
      };
    }
  }

  async generateSmartFilterSuggestions(
    userId: string,
    recentEmails: EmailMessage[],
  ): Promise<SmartFilterSuggestion[]> {
    try {
      const suggestions: SmartFilterSuggestion[] = [];

      // Analyze email patterns
      const patterns = await this.analyzeEmailPatterns(recentEmails);
      
      // Generate suggestions based on patterns
      for (const pattern of patterns) {
        const suggestion = await this.createFilterSuggestion(pattern, recentEmails);
        if (suggestion.confidence > 0.7) {
          suggestions.push(suggestion);
        }
      }

      // Sort by confidence
      return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
    } catch (error) {
      this.logger.error(`Error generating smart filter suggestions: ${error.message}`);
      return [];
    }
  }

  async getFilterStats(userId: string): Promise<FilterStats> {
    try {
      const filters = await this.getFilters(userId);
      
      const totalFilters = filters.length;
      const activeFilters = filters.filter(f => f.isActive).length;
      const totalExecutions = filters.reduce((sum, f) => sum + f.executionCount, 0);
      
      // Calculate average execution time (mock)
      const averageExecutionTime = 50; // milliseconds

      const topFilters = filters
        .sort((a, b) => b.executionCount - a.executionCount)
        .slice(0, 5)
        .map(f => ({
          id: f.id,
          name: f.name,
          executionCount: f.executionCount,
          successRate: 0.95, // Mock success rate
        }));

      const categoryBreakdown = filters.reduce((acc, filter) => {
        acc[filter.category] = (acc[filter.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Mock recent activity
      const recentActivity: FilterExecutionResult[] = filters.slice(0, 5).map(f => ({
        filterId: f.id,
        emailId: `email_${Date.now()}`,
        matched: Math.random() > 0.5,
        actionsExecuted: ['move_to_folder: {"folder": "Important"}'],
        errors: [],
        executedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        executionTimeMs: Math.floor(Math.random() * 100) + 10,
      }));

      return {
        totalFilters,
        activeFilters,
        totalExecutions,
        averageExecutionTime,
        topFilters,
        categoryBreakdown,
        recentActivity,
      };
    } catch (error) {
      this.logger.error(`Error getting filter stats: ${error.message}`);
      throw error;
    }
  }

  async testFilter(filter: EmailFilter, testEmail: EmailMessage): Promise<{
    matched: boolean;
    matchedConditions: string[];
    potentialActions: string[];
    warnings: string[];
  }> {
    try {
      const matchedConditions: string[] = [];
      const warnings: string[] = [];
      
      // Test each condition
      for (const condition of filter.conditions) {
        const conditionMatched = await this.evaluateCondition(condition, testEmail);
        if (conditionMatched) {
          matchedConditions.push(`${condition.field} ${condition.operator} ${condition.value}`);
        }
      }

      const matched = await this.evaluateConditions(filter.conditions, testEmail);
      
      // List potential actions
      const potentialActions = filter.actions.map(action => 
        `${action.type}: ${JSON.stringify(action.parameters)}`
      );

      // Generate warnings
      if (filter.actions.some(a => a.type === 'delete')) {
        warnings.push('This filter will permanently delete matching emails');
      }
      
      if (filter.actions.some(a => a.type === 'quarantine')) {
        warnings.push('This filter will quarantine matching emails');
      }

      return {
        matched,
        matchedConditions,
        potentialActions,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Error testing filter: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods
  private validateFilter(filter: Partial<EmailFilter>): void {
    if (!filter.name?.trim()) {
      throw new BadRequestException('Filter name is required');
    }

    if (!filter.conditions?.length) {
      throw new BadRequestException('Filter must have at least one condition');
    }

    if (!filter.actions?.length) {
      throw new BadRequestException('Filter must have at least one action');
    }

    // Validate conditions
    filter.conditions.forEach((condition, index) => {
      if (!condition.field || !condition.operator) {
        throw new BadRequestException(`Condition ${index + 1} is missing required fields`);
      }
    });

    // Validate actions
    filter.actions.forEach((action, index) => {
      if (!action.type) {
        throw new BadRequestException(`Action ${index + 1} is missing type`);
      }
    });
  }

  private hasFilterPermission(filter: EmailFilter, userId: string): boolean {
    // Users can access their own filters
    if (filter.createdBy === userId) return true;
    
    // Organization-wide filters are accessible to all users
    if (filter.scope === 'organization') return true;
    
    // Department filters would need additional permission logic
    // This is a simplified version
    return false;
  }

  private async evaluateConditions(conditions: FilterCondition[], email: EmailMessage): Promise<boolean> {
    // For now, implement AND logic (all conditions must match)
    // In a more advanced implementation, this could support OR/AND combinations
    
    for (const condition of conditions) {
      const matched = await this.evaluateCondition(condition, email);
      if (!matched) {
        return false;
      }
    }
    
    return conditions.length > 0;
  }

  private async evaluateCondition(condition: FilterCondition, email: EmailMessage): Promise<boolean> {
    const fieldValue = this.getFieldValue(condition.field, email);
    let result = this.compareValues(condition.operator, fieldValue, condition.value, condition.caseSensitive);
    
    if (condition.negate) {
      result = !result;
    }
    
    return result;
  }

  private getFieldValue(field: FilterField, email: EmailMessage): any {
    switch (field) {
      case 'from': return email.from;
      case 'to': return email.to.join(', ');
      case 'cc': return email.cc?.join(', ') || '';
      case 'bcc': return email.bcc?.join(', ') || '';
      case 'subject': return email.subject;
      case 'body': return email.body;
      case 'sender_domain': return email.from.split('@')[1];
      case 'received_date': return email.receivedAt;
      case 'size': return email.body.length; // Simplified
      case 'has_attachments': return email.attachments.length > 0;
      case 'attachment_name': return email.attachments.map(a => a.filename).join(', ');
      case 'attachment_type': return email.attachments.map(a => a.contentType).join(', ');
      default: return '';
    }
  }

  private compareValues(operator: FilterOperator, fieldValue: any, conditionValue: any, caseSensitive = false): boolean {
    const field = caseSensitive ? String(fieldValue) : String(fieldValue).toLowerCase();
    const value = caseSensitive ? String(conditionValue) : String(conditionValue).toLowerCase();

    switch (operator) {
      case 'equals': return field === value;
      case 'not_equals': return field !== value;
      case 'contains': return field.includes(value);
      case 'not_contains': return !field.includes(value);
      case 'starts_with': return field.startsWith(value);
      case 'ends_with': return field.endsWith(value);
      case 'matches_regex': 
        try {
          const regex = new RegExp(String(conditionValue), caseSensitive ? '' : 'i');
          return regex.test(field);
        } catch {
          return false;
        }
      case 'greater_than': return Number(fieldValue) > Number(conditionValue);
      case 'less_than': return Number(fieldValue) < Number(conditionValue);
      case 'between':
        if (Array.isArray(conditionValue) && conditionValue.length === 2) {
          const num = Number(fieldValue);
          return num >= Number(conditionValue[0]) && num <= Number(conditionValue[1]);
        }
        return false;
      case 'in_list':
        const list = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return list.some(item => (caseSensitive ? item : String(item).toLowerCase()) === field);
      case 'not_in_list':
        const notList = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return !notList.some(item => (caseSensitive ? item : String(item).toLowerCase()) === field);
      case 'is_empty': return !fieldValue || String(fieldValue).trim() === '';
      case 'is_not_empty': return fieldValue && String(fieldValue).trim() !== '';
      default: return false;
    }
  }

  private async executeAction(action: FilterAction, email: EmailMessage): Promise<void> {
    switch (action.type) {
      case 'move_to_folder':
        await this.moveEmailToFolder(email.messageId, action.parameters.folder);
        break;
      case 'copy_to_folder':
        await this.copyEmailToFolder(email.messageId, action.parameters.folder);
        break;
      case 'mark_as_read':
        await this.markEmailAsRead(email.messageId, true);
        break;
      case 'mark_as_unread':
        await this.markEmailAsRead(email.messageId, false);
        break;
      case 'mark_as_important':
        await this.markEmailAsImportant(email.messageId, true);
        break;
      case 'mark_as_spam':
        await this.markEmailAsSpam(email.messageId);
        break;
      case 'delete':
        await this.deleteEmail(email.messageId);
        break;
      case 'quarantine':
        await this.quarantineEmail(email.messageId);
        break;
      case 'add_tag':
        await this.addTagToEmail(email.messageId, action.parameters.tag);
        break;
      case 'forward_to':
        await this.forwardEmail(email.messageId, action.parameters.email);
        break;
      case 'send_notification':
        await this.sendNotification(action.parameters.message, action.parameters.recipient);
        break;
      // Add more action implementations as needed
      default:
        this.logger.warn(`Unimplemented action type: ${action.type}`);
    }
  }

  private hasStopProcessingAction(filter: EmailFilter): boolean {
    return filter.actions.some(action => 
      ['delete', 'quarantine', 'move_to_folder'].includes(action.type)
    );
  }

  private async analyzeEmailPatterns(emails: EmailMessage[]): Promise<any[]> {
    // Simplified pattern analysis
    const patterns: any[] = [];
    
    // Find frequent senders
    const senderCounts: Record<string, number> = {};
    emails.forEach(email => {
      const domain = email.from.split('@')[1];
      senderCounts[domain] = (senderCounts[domain] || 0) + 1;
    });

    // Suggest filters for frequent senders
    Object.entries(senderCounts)
      .filter(([, count]) => count >= 5)
      .forEach(([domain, count]) => {
        patterns.push({
          type: 'frequent_sender',
          domain,
          count,
          confidence: Math.min(count / 10, 1),
        });
      });

    return patterns;
  }

  private async createFilterSuggestion(pattern: any, emails: EmailMessage[]): Promise<SmartFilterSuggestion> {
    switch (pattern.type) {
      case 'frequent_sender':
        return {
          name: `Auto-organize emails from ${pattern.domain}`,
          description: `Automatically organize emails from ${pattern.domain} (${pattern.count} emails found)`,
          confidence: pattern.confidence,
          conditions: [{
            id: 'cond_1',
            field: 'sender_domain' as FilterField,
            operator: 'equals' as FilterOperator,
            value: pattern.domain,
          }],
          actions: [{
            id: 'act_1',
            type: 'move_to_folder' as FilterActionType,
            parameters: { folder: `Auto/${pattern.domain}` },
            order: 1,
          }],
          basedOnEmails: emails.filter(e => e.from.includes(pattern.domain)).map(e => e.messageId),
          category: 'organization',
        };
      default:
        return {
          name: 'Unknown pattern',
          description: 'Unknown pattern detected',
          confidence: 0,
          conditions: [],
          actions: [],
          basedOnEmails: [],
          category: 'custom',
        };
    }
  }

  private async updateFilterStats(filterId: string, matched: boolean): Promise<void> {
    try {
      const filter = await this.retrieveFilter(filterId);
      if (filter) {
        filter.executionCount += 1;
        filter.lastExecuted = new Date();
        await this.storeFilter(filter);
      }
    } catch (error) {
      this.logger.error(`Error updating filter stats: ${error.message}`);
    }
  }

  // Mock email action methods - implement with actual email service
  private async moveEmailToFolder(emailId: string, folder: string): Promise<void> {
    this.logger.log(`Moving email ${emailId} to folder ${folder}`);
  }

  private async copyEmailToFolder(emailId: string, folder: string): Promise<void> {
    this.logger.log(`Copying email ${emailId} to folder ${folder}`);
  }

  private async markEmailAsRead(emailId: string, isRead: boolean): Promise<void> {
    this.logger.log(`Marking email ${emailId} as ${isRead ? 'read' : 'unread'}`);
  }

  private async markEmailAsImportant(emailId: string, isImportant: boolean): Promise<void> {
    this.logger.log(`Marking email ${emailId} as ${isImportant ? 'important' : 'normal'}`);
  }

  private async markEmailAsSpam(emailId: string): Promise<void> {
    this.logger.log(`Marking email ${emailId} as spam`);
  }

  private async deleteEmail(emailId: string): Promise<void> {
    this.logger.log(`Deleting email ${emailId}`);
  }

  private async quarantineEmail(emailId: string): Promise<void> {
    this.logger.log(`Quarantining email ${emailId}`);
  }

  private async addTagToEmail(emailId: string, tag: string): Promise<void> {
    this.logger.log(`Adding tag ${tag} to email ${emailId}`);
  }

  private async forwardEmail(emailId: string, recipient: string): Promise<void> {
    this.logger.log(`Forwarding email ${emailId} to ${recipient}`);
  }

  private async sendNotification(message: string, recipient: string): Promise<void> {
    this.logger.log(`Sending notification to ${recipient}: ${message}`);
  }

  // Mock database methods - implement with actual database
  private async storeFilter(filter: EmailFilter): Promise<void> {
    // Store in database
  }

  private async retrieveFilter(filterId: string): Promise<EmailFilter | null> {
    // Retrieve from database
    return null;
  }

  private async getAllFilters(): Promise<EmailFilter[]> {
    // Get all from database
    return [];
  }

  private async removeFilter(filterId: string): Promise<void> {
    // Delete from database
  }
}
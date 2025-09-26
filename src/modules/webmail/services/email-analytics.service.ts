// path: backend/src/modules/webmail/services/email-analytics.service.ts
// purpose: AI-powered email analytics and insights service
// dependencies: NestJS, OpenAI, sentiment analysis, email patterns

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailMessage } from '../webmail.service';

export interface EmailSentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
  };
  urgency: 'low' | 'medium' | 'high' | 'critical';
  tone: 'formal' | 'informal' | 'professional' | 'casual' | 'aggressive';
}

export interface EmailInsights {
  category: 'work' | 'personal' | 'promotional' | 'newsletter' | 'support' | 'social';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionItems: string[];
  keyTopics: string[];
  suggestedResponse: string;
  estimatedReadTime: number;
  complexity: 'simple' | 'moderate' | 'complex';
  requiresResponse: boolean;
  deadline?: Date;
}

export interface EmailThreadAnalysis {
  threadId: string;
  participantCount: number;
  messageCount: number;
  averageResponseTime: number;
  sentimentTrend: Array<{
    timestamp: Date;
    sentiment: number;
  }>;
  keyDecisions: string[];
  unresolved: string[];
  summary: string;
}

export interface ProductivityMetrics {
  dailyEmailCount: number;
  averageResponseTime: number;
  unreadCount: number;
  priorityDistribution: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryBreakdown: Record<string, number>;
  peakHours: number[];
  responseRate: number;
  actionItemCompletion: number;
}

@Injectable()
export class EmailAnalyticsService {
  private readonly logger = new Logger(EmailAnalyticsService.name);

  constructor(private readonly configService: ConfigService) {}

  async analyzeSentiment(email: EmailMessage): Promise<EmailSentimentAnalysis> {
    try {
      const content = `${email.subject} ${email.body}`;
      
      // AI-powered sentiment analysis
      const sentimentScore = await this.performSentimentAnalysis(content);
      const emotions = await this.analyzeEmotions(content);
      const urgency = await this.detectUrgency(content, email);
      const tone = await this.analyzeTone(content);

      return {
        sentiment: sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral',
        confidence: Math.abs(sentimentScore),
        emotions,
        urgency,
        tone,
      };
    } catch (error) {
      this.logger.error('Failed to analyze email sentiment:', error);
      return this.getDefaultSentimentAnalysis();
    }
  }

  async generateInsights(email: EmailMessage): Promise<EmailInsights> {
    try {
      const category = await this.categorizeEmail(email);
      const priority = await this.determinePriority(email);
      const actionItems = await this.extractActionItems(email.body);
      const keyTopics = await this.extractKeyTopics(email);
      const suggestedResponse = await this.generateSuggestedResponse(email);
      const estimatedReadTime = this.calculateReadTime(email.body);
      const complexity = await this.assessComplexity(email);
      const requiresResponse = await this.determineResponseRequired(email);
      const deadline = await this.extractDeadline(email.body);

      return {
        category,
        priority,
        actionItems,
        keyTopics,
        suggestedResponse,
        estimatedReadTime,
        complexity,
        requiresResponse,
        deadline,
      };
    } catch (error) {
      this.logger.error('Failed to generate email insights:', error);
      return this.getDefaultInsights();
    }
  }

  async analyzeThread(emails: EmailMessage[]): Promise<EmailThreadAnalysis> {
    try {
      const threadId = emails[0]?.messageId || 'unknown';
      const participantCount = this.countUniqueParticipants(emails);
      const messageCount = emails.length;
      const averageResponseTime = this.calculateAverageResponseTime(emails);
      const sentimentTrend = await this.analyzeSentimentTrend(emails);
      const keyDecisions = await this.extractKeyDecisions(emails);
      const unresolved = await this.identifyUnresolvedItems(emails);
      const summary = await this.generateThreadSummary(emails);

      return {
        threadId,
        participantCount,
        messageCount,
        averageResponseTime,
        sentimentTrend,
        keyDecisions,
        unresolved,
        summary,
      };
    } catch (error) {
      this.logger.error('Failed to analyze email thread:', error);
      return this.getDefaultThreadAnalysis();
    }
  }

  async generateProductivityMetrics(
    emails: EmailMessage[],
    userId: string,
    timeframe: 'day' | 'week' | 'month' = 'day'
  ): Promise<ProductivityMetrics> {
    try {
      const filteredEmails = this.filterEmailsByTimeframe(emails, timeframe);
      
      const dailyEmailCount = filteredEmails.length;
      const averageResponseTime = this.calculateAverageResponseTime(filteredEmails);
      const unreadCount = filteredEmails.filter(e => !e.isRead).length;
      const priorityDistribution = await this.calculatePriorityDistribution(filteredEmails);
      const categoryBreakdown = await this.calculateCategoryBreakdown(filteredEmails);
      const peakHours = this.identifyPeakHours(filteredEmails);
      const responseRate = this.calculateResponseRate(filteredEmails);
      const actionItemCompletion = await this.calculateActionItemCompletion(filteredEmails);

      return {
        dailyEmailCount,
        averageResponseTime,
        unreadCount,
        priorityDistribution,
        categoryBreakdown,
        peakHours,
        responseRate,
        actionItemCompletion,
      };
    } catch (error) {
      this.logger.error('Failed to generate productivity metrics:', error);
      return this.getDefaultProductivityMetrics();
    }
  }

  async generateSmartReply(email: EmailMessage, context?: string): Promise<string> {
    try {
      const prompt = this.buildReplyPrompt(email, context);
      return await this.generateAIResponse(prompt);
    } catch (error) {
      this.logger.error('Failed to generate smart reply:', error);
      return 'Thank you for your email. I will review it and get back to you soon.';
    }
  }

  async detectSpamProbability(email: EmailMessage): Promise<number> {
    try {
      const features = this.extractSpamFeatures(email);
      return await this.calculateSpamScore(features);
    } catch (error) {
      this.logger.error('Failed to detect spam probability:', error);
      return 0.1; // Low spam probability as default
    }
  }

  // Private helper methods
  private async performSentimentAnalysis(content: string): Promise<number> {
    // Mock AI sentiment analysis - replace with actual AI service
    const positiveWords = ['great', 'excellent', 'good', 'happy', 'pleased', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'disappointed', 'angry', 'frustrated'];
    
    const words = content.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.1;
      if (negativeWords.includes(word)) score -= 0.1;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private async analyzeEmotions(content: string): Promise<EmailSentimentAnalysis['emotions']> {
    // Mock emotion analysis
    return {
      joy: Math.random() * 0.5,
      anger: Math.random() * 0.3,
      fear: Math.random() * 0.2,
      sadness: Math.random() * 0.3,
      surprise: Math.random() * 0.4,
    };
  }

  private async detectUrgency(content: string, email: EmailMessage): Promise<EmailSentimentAnalysis['urgency']> {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'deadline'];
    const contentLower = content.toLowerCase();
    
    if (urgentKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'critical';
    }
    
    if (email.subject.includes('!') || contentLower.includes('please respond')) {
      return 'high';
    }
    
    return Math.random() > 0.5 ? 'medium' : 'low';
  }

  private async analyzeTone(content: string): Promise<EmailSentimentAnalysis['tone']> {
    const formalWords = ['dear', 'sincerely', 'regards', 'respectfully'];
    const informalWords = ['hey', 'hi', 'thanks', 'cheers'];
    
    const contentLower = content.toLowerCase();
    
    if (formalWords.some(word => contentLower.includes(word))) {
      return 'formal';
    }
    
    if (informalWords.some(word => contentLower.includes(word))) {
      return 'informal';
    }
    
    return 'professional';
  }

  private async categorizeEmail(email: EmailMessage): Promise<EmailInsights['category']> {
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();
    
    if (subject.includes('unsubscribe') || body.includes('promotional')) return 'promotional';
    if (subject.includes('newsletter') || body.includes('newsletter')) return 'newsletter';
    if (subject.includes('support') || body.includes('help')) return 'support';
    if (email.from.includes('noreply') || email.from.includes('no-reply')) return 'promotional';
    
    return Math.random() > 0.5 ? 'work' : 'personal';
  }

  private async determinePriority(email: EmailMessage): Promise<EmailInsights['priority']> {
    const urgentKeywords = ['urgent', 'asap', 'critical', 'emergency'];
    const content = `${email.subject} ${email.body}`.toLowerCase();
    
    if (urgentKeywords.some(keyword => content.includes(keyword))) {
      return 'urgent';
    }
    
    if (email.subject.includes('!') || content.includes('important')) {
      return 'high';
    }
    
    return Math.random() > 0.5 ? 'medium' : 'low';
  }

  private async extractActionItems(body: string): Promise<string[]> {
    const actionPatterns = [
      /please\s+([^.!?]+)/gi,
      /could\s+you\s+([^.!?]+)/gi,
      /need\s+to\s+([^.!?]+)/gi,
      /action\s+required:\s*([^.!?]+)/gi,
    ];
    
    const actionItems: string[] = [];
    
    actionPatterns.forEach(pattern => {
      const matches = body.match(pattern);
      if (matches) {
        actionItems.push(...matches.map(match => match.trim()));
      }
    });
    
    return actionItems.slice(0, 5); // Limit to 5 action items
  }

  private async extractKeyTopics(email: EmailMessage): Promise<string[]> {
    const content = `${email.subject} ${email.body}`;
    const words = content.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    const wordFreq: Record<string, number> = {};
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3 && !stopWords.includes(cleanWord)) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
      }
    });
    
    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private async generateSuggestedResponse(email: EmailMessage): Promise<string> {
    const category = await this.categorizeEmail(email);
    
    const templates = {
      work: 'Thank you for your email. I will review the details and get back to you by [date].',
      personal: 'Thanks for reaching out! I appreciate you thinking of me.',
      support: 'Thank you for contacting support. I will investigate this issue and provide an update soon.',
      promotional: 'Thank you for the information.',
      newsletter: 'Thank you for the newsletter.',
      social: 'Thanks for sharing this with me!',
    };
    
    return templates[category] || templates.work;
  }

  private calculateReadTime(body: string): number {
    const wordsPerMinute = 200;
    const wordCount = body.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  private async assessComplexity(email: EmailMessage): Promise<EmailInsights['complexity']> {
    const content = `${email.subject} ${email.body}`;
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / sentenceCount;
    
    if (avgWordsPerSentence > 20 || wordCount > 500) return 'complex';
    if (avgWordsPerSentence > 15 || wordCount > 200) return 'moderate';
    return 'simple';
  }

  private async determineResponseRequired(email: EmailMessage): Promise<boolean> {
    const content = `${email.subject} ${email.body}`.toLowerCase();
    const questionWords = ['?', 'what', 'when', 'where', 'why', 'how', 'can you', 'could you', 'please'];
    
    return questionWords.some(word => content.includes(word));
  }

  private async extractDeadline(body: string): Promise<Date | undefined> {
    const datePatterns = [
      /by\s+(\w+\s+\d{1,2})/gi,
      /deadline:\s*(\w+\s+\d{1,2})/gi,
      /due\s+(\w+\s+\d{1,2})/gi,
    ];
    
    for (const pattern of datePatterns) {
      const match = body.match(pattern);
      if (match) {
        const dateStr = match[1];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    return undefined;
  }

  private countUniqueParticipants(emails: EmailMessage[]): number {
    const participants = new Set<string>();
    emails.forEach(email => {
      participants.add(email.from);
      email.to.forEach(to => participants.add(to));
      email.cc?.forEach(cc => participants.add(cc));
    });
    return participants.size;
  }

  private calculateAverageResponseTime(emails: EmailMessage[]): number {
    if (emails.length < 2) return 0;
    
    const sortedEmails = emails.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
    let totalTime = 0;
    let responseCount = 0;
    
    for (let i = 1; i < sortedEmails.length; i++) {
      const timeDiff = sortedEmails[i].receivedAt.getTime() - sortedEmails[i - 1].receivedAt.getTime();
      totalTime += timeDiff;
      responseCount++;
    }
    
    return responseCount > 0 ? totalTime / responseCount / (1000 * 60 * 60) : 0; // Return in hours
  }

  private async analyzeSentimentTrend(emails: EmailMessage[]): Promise<EmailThreadAnalysis['sentimentTrend']> {
    const trend: EmailThreadAnalysis['sentimentTrend'] = [];
    
    for (const email of emails) {
      const sentiment = await this.performSentimentAnalysis(`${email.subject} ${email.body}`);
      trend.push({
        timestamp: email.receivedAt,
        sentiment,
      });
    }
    
    return trend.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private async extractKeyDecisions(emails: EmailMessage[]): Promise<string[]> {
    const decisions: string[] = [];
    const decisionPatterns = [
      /we\s+decided\s+([^.!?]+)/gi,
      /decision:\s*([^.!?]+)/gi,
      /agreed\s+to\s+([^.!?]+)/gi,
    ];
    
    emails.forEach(email => {
      decisionPatterns.forEach(pattern => {
        const matches = email.body.match(pattern);
        if (matches) {
          decisions.push(...matches.map(match => match.trim()));
        }
      });
    });
    
    return decisions.slice(0, 5);
  }

  private async identifyUnresolvedItems(emails: EmailMessage[]): Promise<string[]> {
    const unresolved: string[] = [];
    const unresolvedPatterns = [
      /still\s+need\s+([^.!?]+)/gi,
      /pending:\s*([^.!?]+)/gi,
      /unresolved:\s*([^.!?]+)/gi,
    ];
    
    emails.forEach(email => {
      unresolvedPatterns.forEach(pattern => {
        const matches = email.body.match(pattern);
        if (matches) {
          unresolved.push(...matches.map(match => match.trim()));
        }
      });
    });
    
    return unresolved.slice(0, 5);
  }

  private async generateThreadSummary(emails: EmailMessage[]): Promise<string> {
    if (emails.length === 0) return 'No emails in thread.';
    
    const participants = this.countUniqueParticipants(emails);
    const keyTopics = await this.extractKeyTopics(emails[0]);
    
    return `Thread with ${participants} participants discussing ${keyTopics.slice(0, 3).join(', ')}. ${emails.length} messages exchanged.`;
  }

  private filterEmailsByTimeframe(emails: EmailMessage[], timeframe: 'day' | 'week' | 'month'): EmailMessage[] {
    const now = new Date();
    const cutoff = new Date();
    
    switch (timeframe) {
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
    }
    
    return emails.filter(email => email.receivedAt >= cutoff);
  }

  private async calculatePriorityDistribution(emails: EmailMessage[]): Promise<ProductivityMetrics['priorityDistribution']> {
    const distribution = { urgent: 0, high: 0, medium: 0, low: 0 };
    
    for (const email of emails) {
      const priority = await this.determinePriority(email);
      distribution[priority]++;
    }
    
    return distribution;
  }

  private async calculateCategoryBreakdown(emails: EmailMessage[]): Promise<Record<string, number>> {
    const breakdown: Record<string, number> = {};
    
    for (const email of emails) {
      const category = await this.categorizeEmail(email);
      breakdown[category] = (breakdown[category] || 0) + 1;
    }
    
    return breakdown;
  }

  private identifyPeakHours(emails: EmailMessage[]): number[] {
    const hourCounts: Record<number, number> = {};
    
    emails.forEach(email => {
      const hour = email.receivedAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  private calculateResponseRate(emails: EmailMessage[]): number {
    // Mock calculation - would need to track actual responses
    return Math.random() * 0.5 + 0.5; // 50-100%
  }

  private async calculateActionItemCompletion(emails: EmailMessage[]): Promise<number> {
    // Mock calculation - would need to track actual completion
    return Math.random() * 0.4 + 0.6; // 60-100%
  }

  private buildReplyPrompt(email: EmailMessage, context?: string): string {
    return `Generate a professional reply to this email:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}
${context ? `Context: ${context}` : ''}

Reply:`;
  }

  private async generateAIResponse(prompt: string): Promise<string> {
    // Mock AI response - replace with actual AI service
    return 'Thank you for your email. I will review it and get back to you soon.';
  }

  private extractSpamFeatures(email: EmailMessage): Record<string, any> {
    return {
      hasExcessiveCapitals: /[A-Z]{5,}/.test(email.subject + email.body),
      hasSpamWords: ['free', 'win', 'prize', 'urgent'].some(word => 
        email.body.toLowerCase().includes(word)
      ),
      hasMultipleExclamations: (email.subject + email.body).split('!').length > 3,
      fromSuspiciousDomain: email.from.includes('noreply') || email.from.includes('no-reply'),
      hasLinks: /https?:\/\//.test(email.body),
      bodyLength: email.body.length,
    };
  }

  private async calculateSpamScore(features: Record<string, any>): Promise<number> {
    let score = 0;
    
    if (features.hasExcessiveCapitals) score += 0.3;
    if (features.hasSpamWords) score += 0.4;
    if (features.hasMultipleExclamations) score += 0.2;
    if (features.fromSuspiciousDomain) score += 0.1;
    if (features.hasLinks && features.bodyLength < 100) score += 0.2;
    
    return Math.min(1, score);
  }

  // Default fallback methods
  private getDefaultSentimentAnalysis(): EmailSentimentAnalysis {
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      emotions: { joy: 0.2, anger: 0.1, fear: 0.1, sadness: 0.1, surprise: 0.2 },
      urgency: 'medium',
      tone: 'professional',
    };
  }

  private getDefaultInsights(): EmailInsights {
    return {
      category: 'work',
      priority: 'medium',
      actionItems: [],
      keyTopics: [],
      suggestedResponse: 'Thank you for your email.',
      estimatedReadTime: 1,
      complexity: 'moderate',
      requiresResponse: false,
    };
  }

  private getDefaultThreadAnalysis(): EmailThreadAnalysis {
    return {
      threadId: 'unknown',
      participantCount: 1,
      messageCount: 0,
      averageResponseTime: 0,
      sentimentTrend: [],
      keyDecisions: [],
      unresolved: [],
      summary: 'No analysis available.',
    };
  }

  private getDefaultProductivityMetrics(): ProductivityMetrics {
    return {
      dailyEmailCount: 0,
      averageResponseTime: 0,
      unreadCount: 0,
      priorityDistribution: { urgent: 0, high: 0, medium: 0, low: 0 },
      categoryBreakdown: {},
      peakHours: [],
      responseRate: 0,
      actionItemCompletion: 0,
    };
  }
}
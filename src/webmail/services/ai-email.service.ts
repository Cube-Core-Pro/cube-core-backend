// path: backend/src/webmail/services/ai-email.service.ts
// purpose: AI-powered email features - smart compose, reply, categorization
// dependencies: OpenAI, Prisma, Redis, NLP libraries

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import OpenAI from 'openai';

@Injectable()
export class AiEmailService {
  private readonly logger = new Logger(AiEmailService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async enhanceEmail(
    tenantId: string,
    userId: string,
    emailData: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      bodyType: 'text' | 'html';
      priority?: 'low' | 'normal' | 'high';
    },
  ) {
    try {
      const [
        enhancedSubject,
        enhancedBody,
        suggestedPriority,
        toneAnalysis,
      ] = await Promise.all([
        this.enhanceSubject(emailData.subject),
        this.enhanceBody(emailData.body, emailData.bodyType),
        this.suggestPriority(emailData.subject, emailData.body),
        this.analyzeTone(emailData.body),
      ]);

      return {
        ...emailData,
        subject: enhancedSubject,
        body: enhancedBody,
        priority: emailData.priority || suggestedPriority,
        aiEnhancements: {
          toneAnalysis,
          suggestions: await this.getWritingSuggestions(emailData.body),
          readabilityScore: this.calculateReadabilityScore(emailData.body),
          estimatedReadTime: this.estimateReadTime(emailData.body),
        },
      };
    } catch (error) {
      this.logger.error('Error enhancing email with AI', error);
      return emailData; // Return original if AI enhancement fails
    }
  }

  async generateSmartReply(
    tenantId: string,
    userId: string,
    originalEmail: {
      subject: string;
      body: string;
      fromEmail: string;
      fromName: string;
    },
    replyType: 'quick' | 'detailed' | 'professional' | 'casual',
  ) {
    try {
      const cacheKey = `ai:smart_reply:${originalEmail.subject}:${replyType}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const prompt = this.buildReplyPrompt(originalEmail, replyType);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a professional email assistant. Generate appropriate email replies based on the context and tone requested.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content || '';
      
      const result = {
        subject: `Re: ${originalEmail.subject}`,
        body: reply,
        bodyType: 'text' as const,
        suggestions: await this.getReplyImprovements(reply),
      };

      await this.redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1 hour cache
      return result;
    } catch (error) {
      this.logger.error('Error generating smart reply', error);
      throw error;
    }
  }

  async categorizeEmail(
    tenantId: string,
    email: {
      subject: string;
      body: string;
      fromEmail: string;
      fromName: string;
    },
  ) {
    try {
      const cacheKey = `ai:categorize:${email.subject}:${email.fromEmail}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const prompt = `
        Categorize this email into one of these categories:
        - URGENT: Requires immediate attention
        - IMPORTANT: Important but not urgent
        - NEWSLETTER: Marketing/newsletter content
        - SOCIAL: Social media notifications
        - PROMOTIONAL: Sales/promotional content
        - PERSONAL: Personal communication
        - WORK: Work-related communication
        - SPAM: Likely spam/unwanted
        - OTHER: Doesn't fit other categories

        Email:
        From: ${email.fromName} <${email.fromEmail}>
        Subject: ${email.subject}
        Body: ${email.body.substring(0, 500)}...

        Respond with just the category name and confidence score (0-100).
        Format: CATEGORY:CONFIDENCE
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an email categorization expert. Analyze emails and categorize them accurately.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 50,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content || 'OTHER:50';
      const [category, confidence] = response.split(':');

      const result = {
        category: category.trim(),
        confidence: parseInt(confidence?.trim() || '50'),
        suggestedActions: this.getSuggestedActions(category.trim()),
      };

      await this.redis.setex(cacheKey, 7200, JSON.stringify(result)); // 2 hours cache
      return result;
    } catch (error) {
      this.logger.error('Error categorizing email', error);
      return { category: 'OTHER', confidence: 50, suggestedActions: [] };
    }
  }

  async extractActionItems(
    tenantId: string,
    userId: string,
    email: {
      subject: string;
      body: string;
    },
  ) {
    try {
      const prompt = `
        Extract action items from this email. Look for:
        - Tasks to be completed
        - Deadlines mentioned
        - Follow-up actions required
        - Meetings to schedule
        - Documents to review

        Email:
        Subject: ${email.subject}
        Body: ${email.body}

        Return a JSON array of action items with this format:
        [
          {
            "action": "Description of action",
            "priority": "high|medium|low",
            "deadline": "YYYY-MM-DD or null",
            "type": "task|meeting|review|follow-up"
          }
        ]
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting actionable items from emails. Return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 800,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content || '[]';
      
      try {
        return JSON.parse(response);
      } catch {
        return [];
      }
    } catch (error) {
      this.logger.error('Error extracting action items', error);
      return [];
    }
  }

  async generateEmailSummary(
    tenantId: string,
    userId: string,
    emails: Array<{
      subject: string;
      body: string;
      fromName: string;
      receivedAt: Date;
    }>,
  ) {
    try {
      if (emails.length === 0) return null;

      const emailsText = emails.map(email => 
        `From: ${email.fromName}\nSubject: ${email.subject}\nDate: ${email.receivedAt.toISOString()}\nContent: ${email.body.substring(0, 200)}...`
      ).join('\n\n---\n\n');

      const prompt = `
        Create a concise summary of these ${emails.length} emails:

        ${emailsText}

        Provide:
        1. Key topics discussed
        2. Important action items
        3. Urgent matters requiring attention
        4. Overall sentiment/tone

        Keep the summary under 200 words.
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an executive assistant creating email summaries for busy professionals.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.5,
      });

      return completion.choices[0]?.message?.content || null;
    } catch (error) {
      this.logger.error('Error generating email summary', error);
      return null;
    }
  }

  async getDashboardSuggestions(tenantId: string, userId: string) {
    try {
      const cacheKey = `ai:dashboard_suggestions:${tenantId}:${userId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      // Get recent email patterns
      const recentEmails = await this.prisma.enterpriseEmail.findMany({
        where: {
          tenantId,
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
          deletedAt: null,
        },
        select: {
          subject: true,
          from: true,
          isRead: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const suggestions = [];

      // Unread email suggestions
      const unreadEmails = recentEmails.filter(email => !email.isRead);
      if (unreadEmails.length > 10) {
        suggestions.push({
          type: 'action',
          title: 'High Unread Count',
          description: `You have ${unreadEmails.length} unread emails. Consider using filters or quick actions.`,
          action: 'bulk_mark_read',
          priority: 'medium',
        });
      }

      // Frequent sender suggestions
      const senderCounts = recentEmails.reduce((acc, email) => {
        acc[email.from] = (acc[email.from] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const frequentSenders = Object.entries(senderCounts)
        .filter(([_, count]) => count >= 5)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 3);

      if (frequentSenders.length > 0) {
        suggestions.push({
          type: 'insight',
          title: 'Frequent Senders',
          description: `Top senders this week: ${frequentSenders.map(([email]) => email).join(', ')}`,
          action: 'create_filter',
          priority: 'low',
        });
      }

      // Response time suggestion
      const oldUnreadEmails = unreadEmails.filter(
        email => email.createdAt < new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      if (oldUnreadEmails.length > 0) {
        suggestions.push({
          type: 'reminder',
          title: 'Pending Responses',
          description: `${oldUnreadEmails.length} emails older than 24 hours need attention.`,
          action: 'review_old_emails',
          priority: 'high',
        });
      }

      const result = { suggestions, lastUpdated: new Date() };
      await this.redis.setex(cacheKey, 1800, JSON.stringify(result)); // 30 min cache
      return result;
    } catch (error) {
      this.logger.error('Error getting dashboard suggestions', error);
      return { suggestions: [], lastUpdated: new Date() };
    }
  }

  async analyzeEmailIntent(
    tenantId: string,
    userId: string,
    email: {
      subject: string;
      body: string;
      fromEmail: string;
    },
  ) {
    try {
      const cacheKey = `ai:intent:${email.subject}:${email.fromEmail}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const prompt = `
        Analyze the intent and urgency of this email:

        From: ${email.fromEmail}
        Subject: ${email.subject}
        Body: ${email.body.substring(0, 1000)}...

        Determine:
        1. Primary intent (request, information, complaint, meeting, approval, etc.)
        2. Urgency level (low, medium, high, critical)
        3. Required action type (reply, forward, schedule, approve, etc.)
        4. Estimated response time needed
        5. Key entities mentioned (people, dates, amounts, etc.)

        Return JSON format:
        {
          "intent": "string",
          "urgency": "low|medium|high|critical",
          "actionRequired": "string",
          "responseTimeNeeded": "immediate|same_day|within_week|no_rush",
          "entities": ["entity1", "entity2"],
          "confidence": 0-100
        }
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert email analyst. Analyze email intent and provide structured insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content || '{}';
      
      try {
        const result = JSON.parse(response);
        await this.redis.setex(cacheKey, 3600, JSON.stringify(result));
        return result;
      } catch {
        return {
          intent: 'unknown',
          urgency: 'medium',
          actionRequired: 'review',
          responseTimeNeeded: 'within_week',
          entities: [],
          confidence: 50,
        };
      }
    } catch (error) {
      this.logger.error('Error analyzing email intent', error);
      return {
        intent: 'unknown',
        urgency: 'medium',
        actionRequired: 'review',
        responseTimeNeeded: 'within_week',
        entities: [],
        confidence: 0,
      };
    }
  }

  async generateEmailTemplates(
    tenantId: string,
    userId: string,
    templateType: 'meeting_request' | 'follow_up' | 'thank_you' | 'apology' | 'proposal' | 'rejection',
    context?: {
      recipientName?: string;
      companyName?: string;
      meetingDate?: string;
      projectName?: string;
      customContext?: string;
    },
  ) {
    try {
      const cacheKey = `ai:template:${templateType}:${JSON.stringify(context)}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const contextPrompt = this.buildTemplateContext(templateType, context);
      
      const prompt = `
        Generate a professional email template for: ${templateType}
        
        Context: ${contextPrompt}
        
        Requirements:
        - Professional tone
        - Clear and concise
        - Include placeholders for customization
        - Appropriate subject line
        - Call to action if needed
        
        Return JSON format:
        {
          "subject": "Subject line with [PLACEHOLDER] if needed",
          "body": "Email body with [PLACEHOLDER] markers",
          "tone": "professional|friendly|formal",
          "placeholders": ["PLACEHOLDER1", "PLACEHOLDER2"],
          "tips": ["tip1", "tip2"]
        }
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a professional email template generator. Create effective, customizable email templates.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 600,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || '{}';
      
      try {
        const result = JSON.parse(response);
        await this.redis.setex(cacheKey, 7200, JSON.stringify(result)); // 2 hours cache
        return result;
      } catch {
        return this.getFallbackTemplate(templateType);
      }
    } catch (error) {
      this.logger.error('Error generating email template', error);
      return this.getFallbackTemplate(templateType);
    }
  }

  async analyzeEmailPerformance(
    tenantId: string,
    userId: string,
    timeframe: 'week' | 'month' | 'quarter' = 'month',
  ) {
    try {
      const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [sentEmails, receivedEmails, responseMetrics] = await Promise.all([
        this.prisma.enterpriseEmail.findMany({
          where: {
            tenantId,
            userId,
            type: 'SENT',
            createdAt: { gte: startDate },
          },
          select: {
            subject: true,
            to: true,
            createdAt: true,
          },
        }),
        this.prisma.enterpriseEmail.findMany({
          where: {
            tenantId,
            userId,
            type: 'RECEIVED',
            createdAt: { gte: startDate },
          },
          select: {
            subject: true,
            from: true,
            isRead: true,
            createdAt: true,
          },
        }),
        this.calculateResponseMetrics(tenantId, userId, startDate),
      ]);

      const analysis = {
        period: { timeframe, days, startDate, endDate: new Date() },
        volume: {
          sent: sentEmails.length,
          received: receivedEmails.length,
          dailyAverage: Math.round((sentEmails.length + receivedEmails.length) / days),
        },
        responseMetrics,
        patterns: {
          busiestDays: this.analyzeBusiestDays(sentEmails, receivedEmails),
          topRecipients: this.analyzeTopRecipients(sentEmails),
          topSenders: this.analyzeTopSenders(receivedEmails),
        },
        insights: await this.generatePerformanceInsights(sentEmails, receivedEmails, responseMetrics),
      };

      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing email performance', error);
      throw error;
    }
  }

  // Private helper methods
  private async enhanceSubject(subject: string): Promise<string> {
    if (!subject || subject.length < 5) return subject;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'Improve email subjects to be more clear and actionable. Keep them under 60 characters.',
          },
          {
            role: 'user',
            content: `Improve this email subject: "${subject}"`,
          },
        ],
        max_tokens: 50,
        temperature: 0.5,
      });

      const enhanced = completion.choices[0]?.message?.content?.trim();
      return enhanced && enhanced.length <= 60 ? enhanced : subject;
    } catch {
      return subject;
    }
  }

  private async enhanceBody(body: string, _bodyType: 'text' | 'html'): Promise<string> {
    if (!body || body.length < 20) return body;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'Improve email body text for clarity, professionalism, and conciseness. Maintain the original meaning.',
          },
          {
            role: 'user',
            content: `Improve this email body: "${body.substring(0, 1000)}"`,
          },
        ],
        max_tokens: 800,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content?.trim() || body;
    } catch {
      return body;
    }
  }

  private async suggestPriority(subject: string, body: string): Promise<'low' | 'normal' | 'high'> {
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'deadline', 'immediately'];
    const text = (subject + ' ' + body).toLowerCase();
    
    if (urgentKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }

    return 'normal';
  }

  private async analyzeTone(text: string) {
    const tones = {
      professional: 0,
      casual: 0,
      friendly: 0,
      urgent: 0,
      formal: 0,
    };

    const professionalWords = ['please', 'thank you', 'regards', 'sincerely'];
    const casualWords = ['hey', 'thanks', 'cool', 'awesome'];
    const urgentWords = ['urgent', 'asap', 'immediately', 'critical'];
    const formalWords = ['furthermore', 'therefore', 'consequently', 'moreover'];

    const lowerText = text.toLowerCase();

    professionalWords.forEach(word => {
      if (lowerText.includes(word)) tones.professional += 1;
    });

    casualWords.forEach(word => {
      if (lowerText.includes(word)) tones.casual += 1;
    });

    urgentWords.forEach(word => {
      if (lowerText.includes(word)) tones.urgent += 1;
    });

    formalWords.forEach(word => {
      if (lowerText.includes(word)) tones.formal += 1;
    });

    const dominantTone = Object.entries(tones).reduce((a, b) => 
      tones[a[0]] > tones[b[0]] ? a : b
    )[0];

    return {
      dominant: dominantTone,
      scores: tones,
      confidence: Math.max(...Object.values(tones)) / Math.max(1, text.split(' ').length) * 100,
    };
  }

  private async getWritingSuggestions(_text: string) {
    return [
      {
        type: 'grammar',
        message: 'Consider using active voice for clearer communication',
        severity: 'suggestion',
      },
      {
        type: 'clarity',
        message: 'Break long sentences into shorter ones for better readability',
        severity: 'info',
      },
    ];
  }

  private calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).length - 1;
    const words = text.split(/\s+/).length;
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    // Flesch Reading Ease Score
    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private countSyllables(text: string): number {
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiou]{2,}/g, 'a')
      .replace(/[^aeiou]/g, '')
      .length || 1;
  }

  private estimateReadTime(text: string): number {
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  private buildReplyPrompt(originalEmail: any, replyType: string): string {
    return `
      Generate a ${replyType} email reply to:
      
      From: ${originalEmail.fromName} <${originalEmail.fromEmail}>
      Subject: ${originalEmail.subject}
      Body: ${originalEmail.body.substring(0, 500)}...
      
      Reply should be ${replyType} in tone and appropriate for business communication.
    `;
  }

  private async getReplyImprovements(reply: string) {
    return [
      {
        type: 'tone',
        suggestion: 'Consider adding a more personal touch',
        original: reply.substring(0, 50),
        improved: 'Enhanced version...',
      },
    ];
  }

  private getSuggestedActions(category: string) {
    const actionMap = {
      URGENT: ['reply_immediately', 'flag', 'add_to_calendar'],
      IMPORTANT: ['flag', 'add_to_tasks', 'schedule_reply'],
      NEWSLETTER: ['unsubscribe', 'move_to_folder', 'mark_read'],
      PROMOTIONAL: ['unsubscribe', 'delete', 'block_sender'],
      SPAM: ['delete', 'block_sender', 'report_spam'],
      WORK: ['reply', 'forward', 'add_to_calendar'],
      PERSONAL: ['reply', 'archive'],
      OTHER: ['archive', 'categorize'],
    };

    return actionMap[category] || ['archive'];
  }

  private buildTemplateContext(templateType: string, context?: any): string {
    if (!context) return `Generate a ${templateType} email template`;
    
    const contextParts = [];
    if (context.recipientName) contextParts.push(`Recipient: ${context.recipientName}`);
    if (context.companyName) contextParts.push(`Company: ${context.companyName}`);
    if (context.meetingDate) contextParts.push(`Meeting Date: ${context.meetingDate}`);
    if (context.projectName) contextParts.push(`Project: ${context.projectName}`);
    if (context.customContext) contextParts.push(`Additional Context: ${context.customContext}`);
    
    return contextParts.length > 0 
      ? `Generate a ${templateType} email template with context: ${contextParts.join(', ')}`
      : `Generate a ${templateType} email template`;
  }

  private getFallbackTemplate(templateType: string) {
    const templates = {
      meeting_request: {
        subject: 'Meeting Request - [TOPIC]',
        body: 'Dear [RECIPIENT_NAME],\n\nI would like to schedule a meeting to discuss [TOPIC]. Would [DATE_TIME] work for you?\n\nBest regards,\n[YOUR_NAME]',
        tone: 'professional',
        placeholders: ['TOPIC', 'RECIPIENT_NAME', 'DATE_TIME', 'YOUR_NAME'],
        tips: ['Be specific about the meeting purpose', 'Suggest multiple time options'],
      },
      follow_up: {
        subject: 'Follow-up: [ORIGINAL_SUBJECT]',
        body: 'Dear [RECIPIENT_NAME],\n\nI wanted to follow up on [TOPIC]. Please let me know if you need any additional information.\n\nBest regards,\n[YOUR_NAME]',
        tone: 'professional',
        placeholders: ['ORIGINAL_SUBJECT', 'RECIPIENT_NAME', 'TOPIC', 'YOUR_NAME'],
        tips: ['Reference the original conversation', 'Be polite but persistent'],
      },
      thank_you: {
        subject: 'Thank you - [REASON]',
        body: 'Dear [RECIPIENT_NAME],\n\nThank you for [REASON]. I appreciate your [SPECIFIC_HELP].\n\nBest regards,\n[YOUR_NAME]',
        tone: 'friendly',
        placeholders: ['REASON', 'RECIPIENT_NAME', 'SPECIFIC_HELP', 'YOUR_NAME'],
        tips: ['Be specific about what you\'re thanking for', 'Keep it genuine'],
      },
    };

    return templates[templateType] || templates.follow_up;
  }

  private async calculateResponseMetrics(tenantId: string, userId: string, startDate: Date) {
    // Mock implementation - in real scenario, this would analyze email threads
    return {
      averageResponseTime: '2.5 hours',
      responseRate: 85,
      pendingResponses: 3,
      quickResponses: 12, // < 1 hour
      slowResponses: 2, // > 24 hours
    };
  }

  private analyzeBusiestDays(sentEmails: any[], receivedEmails: any[]) {
    const allEmails = [...sentEmails, ...receivedEmails];
    const dayCount = {};
    
    allEmails.forEach(email => {
      const day = email.createdAt.toLocaleDateString('en-US', { weekday: 'long' });
      dayCount[day] = (dayCount[day] || 0) + 1;
    });

    return Object.entries(dayCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([day, count]) => ({ day, count: count as number }));
  }

  private analyzeTopRecipients(sentEmails: any[]) {
    const recipientCount = {};
    
    sentEmails.forEach(email => {
      email.to.forEach(recipient => {
        recipientCount[recipient] = (recipientCount[recipient] || 0) + 1;
      });
    });

    return Object.entries(recipientCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([email, count]) => ({ email, count: count as number }));
  }

  private analyzeTopSenders(receivedEmails: any[]) {
    const senderCount = {};
    
    receivedEmails.forEach(email => {
      senderCount[email.from] = (senderCount[email.from] || 0) + 1;
    });

    return Object.entries(senderCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([email, count]) => ({ email, count: count as number }));
  }

  private async generatePerformanceInsights(sentEmails: any[], receivedEmails: any[], responseMetrics: any) {
    const insights = [];

    if (sentEmails.length > receivedEmails.length * 2) {
      insights.push({
        type: 'productivity',
        message: 'You send significantly more emails than you receive. Consider if all outgoing emails are necessary.',
        priority: 'medium',
      });
    }

    if (responseMetrics.responseRate < 70) {
      insights.push({
        type: 'communication',
        message: 'Your response rate is below average. Consider setting up email templates for common responses.',
        priority: 'high',
      });
    }

    if (responseMetrics.pendingResponses > 5) {
      insights.push({
        type: 'organization',
        message: 'You have several pending responses. Consider using email scheduling or reminders.',
        priority: 'medium',
      });
    }

    return insights;
  }
}

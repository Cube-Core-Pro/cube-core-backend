// path: backend/src/webmail/services/anti-spam.service.ts
// purpose: Advanced anti-spam protection with ML and reputation scoring
// dependencies: Prisma, Redis, ML libraries, external reputation APIs

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AntiSpamService {
  private readonly logger = new Logger(AntiSpamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async scanIncomingEmail(
    tenantId: string,
    email: {
      fromEmail: string;
      fromName: string;
      subject: string;
      body: string;
      headers: Record<string, string>;
      attachments?: Array<{ filename: string; size: number; mimeType: string }>;
    },
  ) {
    try {
      const spamScore = await this.calculateSpamScore(email);
      const reputation = await this.checkSenderReputation(email.fromEmail);
      const contentAnalysis = await this.analyzeContent(email.subject, email.body);
      const headerAnalysis = this.analyzeHeaders(email.headers);

      const result = {
        isSpam: spamScore > 70 || reputation.isBlacklisted,
        spamScore,
        reputation,
        contentAnalysis,
        headerAnalysis,
        actions: this.determineActions(spamScore, reputation, contentAnalysis),
        confidence: this.calculateConfidence(spamScore, reputation, contentAnalysis),
      };

      // Log security event
      await this.logSecurityEvent(tenantId, 'SPAM_SCAN', {
        fromEmail: email.fromEmail,
        spamScore,
        isSpam: result.isSpam,
        confidence: result.confidence,
      });

      // Update sender reputation
      await this.updateSenderReputation(email.fromEmail, result.isSpam, spamScore, tenantId);

      return result;
    } catch (error) {
      this.logger.error('Error scanning incoming email for spam', error);
      return {
        isSpam: false,
        spamScore: 0,
        error: 'Scan failed',
      };
    }
  }

  async scanOutgoingEmail(
    email: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      attachments?: string[];
    },
  ) {
    try {
      // Check for potential spam indicators in outgoing emails
      const contentScore = await this.analyzeOutgoingContent(email.subject, email.body);
      const recipientAnalysis = await this.analyzeRecipients(email.to);
      
      const warnings = [];
      
      if (contentScore > 50) {
        warnings.push({
          type: 'content',
          message: 'Email content may trigger spam filters',
          severity: 'warning',
        });
      }

      if (email.to.length > 50) {
        warnings.push({
          type: 'recipients',
          message: 'Large recipient list may be flagged as bulk email',
          severity: 'info',
        });
      }

      if (recipientAnalysis.suspiciousCount > 0) {
        warnings.push({
          type: 'recipients',
          message: `${recipientAnalysis.suspiciousCount} recipients have suspicious patterns`,
          severity: 'warning',
        });
      }

      return {
        warnings,
        recommendations: this.getOutgoingRecommendations(contentScore, recipientAnalysis),
        deliverabilityScore: Math.max(0, 100 - contentScore),
      };
    } catch (error) {
      this.logger.error('Error scanning outgoing email', error);
      return { warnings: [], recommendations: [], deliverabilityScore: 100 };
    }
  }

  async trainSpamFilter(
    tenantId: string,
    userId: string,
    emails: Array<{
      id: string;
      isSpam: boolean;
      subject: string;
      body: string;
      fromEmail: string;
    }>,
  ) {
    try {
      // Update spam patterns based on user feedback
      for (const email of emails) {
        await this.updateSpamPatterns(tenantId, email);
        
        // Update sender reputation based on user feedback
        await this.updateSenderReputation(email.fromEmail, email.isSpam, email.isSpam ? 80 : 20, tenantId);
      }

      // Retrain ML model with new data
      await this.retrainModel(tenantId, emails);

      await this.logSecurityEvent(tenantId, 'SPAM_TRAINING', {
        userId,
        emailCount: emails.length,
        spamCount: emails.filter(e => e.isSpam).length,
      });

      return {
        success: true,
        trainedEmails: emails.length,
        modelVersion: await this.getModelVersion(tenantId),
      };
    } catch (error) {
      this.logger.error('Error training spam filter', error);
      throw error;
    }
  }

  async getSpamStatistics(tenantId: string, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [
        totalScanned,
        spamBlocked,
        falsePositives,
        falseNegatives,
        topSpamSenders,
      ] = await Promise.all([
        this.prisma.emailSecurityLog.count({
          where: {
            tenantId,
            type: 'SPAM_SCAN',
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.emailSecurityLog.count({
          where: {
            tenantId,
            type: 'SPAM_BLOCKED',
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.emailSecurityLog.count({
          where: {
            tenantId,
            type: 'SPAM_FALSE_POSITIVE',
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.emailSecurityLog.count({
          where: {
            tenantId,
            type: 'SPAM_FALSE_NEGATIVE',
            createdAt: { gte: startDate },
          },
        }),
        this.getTopSpamSenders(tenantId, startDate),
      ]);

      const accuracy = totalScanned > 0 
        ? ((totalScanned - falsePositives - falseNegatives) / totalScanned) * 100 
        : 100;

      return {
        totalScanned,
        spamBlocked,
        falsePositives,
        falseNegatives,
        accuracy: Math.round(accuracy * 100) / 100,
        blockRate: totalScanned > 0 ? (spamBlocked / totalScanned) * 100 : 0,
        topSpamSenders,
        period: { days, startDate, endDate: new Date() },
      };
    } catch (error) {
      this.logger.error('Error getting spam statistics', error);
      throw error;
    }
  }

  async updateSpamRules(
    tenantId: string,
    userId: string,
    rules: Array<{
      type: 'sender' | 'subject' | 'content' | 'header';
      pattern: string;
      action: 'block' | 'quarantine' | 'flag';
      isRegex: boolean;
      isActive: boolean;
    }>,
  ) {
    try {
      // Delete existing rules
      await this.prisma.spamRule.deleteMany({
        where: { tenantId },
      });

      const createdRules = await this.prisma.spamRule.createMany({
        data: rules.map((rule, index) => ({
          tenantId,
          userId,
          createdBy: userId,
          name: `${rule.type}_rule_${index + 1}`,
          type: rule.type,
          pattern: rule.pattern,
          action: rule.action,
          isRegex: rule.isRegex,
          isActive: rule.isActive,
          priority: index,
          createdAt: new Date(),
        })),
      });

      // Clear cache
      await this.redis.del(`spam_rules:${tenantId}`);

      await this.logSecurityEvent(tenantId, 'SPAM_RULES_UPDATED', {
        userId,
        ruleCount: rules.length,
      });

      return {
        success: true,
        rulesCreated: createdRules.count,
      };
    } catch (error) {
      this.logger.error('Error updating spam rules', error);
      throw error;
    }
  }

  // Private helper methods
  private async calculateSpamScore(email: any): Promise<number> {
    let score = 0;

    // Subject analysis
    const subjectScore = this.analyzeSubject(email.subject);
    score += subjectScore;

    // Content analysis
    const contentScore = this.analyzeBodyContent(email.body);
    score += contentScore;

    // Sender analysis
    const senderScore = await this.analyzeSender(email.fromEmail, email.fromName);
    score += senderScore;

    // Attachment analysis
    if (email.attachments) {
      const attachmentScore = this.analyzeAttachments(email.attachments);
      score += attachmentScore;
    }

    // Header analysis
    const headerScore = this.analyzeHeaders(email.headers);
    score += headerScore;

    return Math.min(100, Math.max(0, score));
  }

  private analyzeSubject(subject: string): number {
    let score = 0;
    const spamKeywords = [
      'free', 'urgent', 'act now', 'limited time', 'click here',
      'make money', 'work from home', 'guaranteed', 'no obligation',
      'winner', 'congratulations', 'claim now', 'special offer',
    ];

    const lowerSubject = subject.toLowerCase();
    
    spamKeywords.forEach(keyword => {
      if (lowerSubject.includes(keyword)) {
        score += 15;
      }
    });

    // Check for excessive capitalization
    const capsRatio = (subject.match(/[A-Z]/g) || []).length / subject.length;
    if (capsRatio > 0.5) score += 20;

    // Check for excessive punctuation
    const punctuationRatio = (subject.match(/[!?]{2,}/g) || []).length;
    score += punctuationRatio * 10;

    return score;
  }

  private analyzeBodyContent(body: string): number {
    let score = 0;

    // Check for suspicious URLs
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = body.match(urlPattern) || [];
    
    if (urls.length > 5) score += 20;
    
    // Check for suspicious domains
    const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'goo.gl'];
    urls.forEach(url => {
      if (suspiciousDomains.some(domain => url.includes(domain))) {
        score += 15;
      }
    });

    // Check for money-related content
    const moneyPattern = /\$\d+|\d+\s*(dollars?|usd|euros?)/gi;
    const moneyMatches = body.match(moneyPattern) || [];
    score += Math.min(30, moneyMatches.length * 10);

    // Check for urgency indicators
    const urgencyWords = ['urgent', 'hurry', 'limited time', 'expires', 'deadline'];
    urgencyWords.forEach(word => {
      if (body.toLowerCase().includes(word)) {
        score += 10;
      }
    });

    return score;
  }

  private async analyzeSender(fromEmail: string, fromName: string): Promise<number> {
    let score = 0;

    // Check sender reputation
    const reputation = await this.getSenderReputation(fromEmail);
    if (reputation.isBlacklisted) score += 50;
    if (reputation.spamScore > 70) score += 30;

    // Check for suspicious email patterns
    if (fromEmail.includes('noreply') && fromName.toLowerCase().includes('bank')) {
      score += 25; // Potential phishing
    }

    // Check domain reputation
    const domain = fromEmail.split('@')[1];
    const domainReputation = await this.getDomainReputation(domain);
    if (domainReputation.isBlacklisted) score += 40;

    return score;
  }

  private analyzeAttachments(attachments: Array<{ filename: string; mimeType: string }>): number {
    let score = 0;

    const dangerousExtensions = ['.exe', '.scr', '.bat', '.com', '.pif', '.vbs', '.js'];
    const suspiciousMimeTypes = [
      'application/x-msdownload',
      'application/x-executable',
      'application/x-winexe',
    ];

    attachments.forEach(attachment => {
      // Check dangerous file extensions
      if (dangerousExtensions.some(ext => attachment.filename.toLowerCase().endsWith(ext))) {
        score += 40;
      }

      // Check suspicious MIME types
      if (suspiciousMimeTypes.includes(attachment.mimeType)) {
        score += 30;
      }

      // Check for double extensions
      if ((attachment.filename.match(/\./g) || []).length > 2) {
        score += 20;
      }
    });

    return score;
  }

  private analyzeHeaders(headers: Record<string, string>): number {
    let score = 0;

    // Check for missing or suspicious headers
    if (!headers['Message-ID']) score += 15;
    if (!headers['Date']) score += 10;
    if (!headers['From']) score += 20;

    // Check for suspicious routing
    const received = headers['Received'] || '';
    const receivedHops = received.split('from ').length - 1;
    if (receivedHops > 10) score += 20;

    // Check for suspicious authentication
    if (headers['Authentication-Results']?.includes('fail')) {
      score += 25;
    }

    return score;
  }

  private async checkSenderReputation(email: string) {
    const cacheKey = `sender_reputation:${email}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const reputation = await this.getSenderReputation(email);
    await this.redis.setex(cacheKey, 3600, JSON.stringify(reputation)); // 1 hour cache

    return reputation;
  }

  private async getSenderReputation(email: string) {
    try {
      const senderStats = await this.prisma.senderReputation.findFirst({
        where: { email },
      });

      if (!senderStats) {
        return {
          email,
          spamScore: 0,
          isBlacklisted: false,
          isWhitelisted: false,
          totalEmails: 0,
          spamEmails: 0,
          lastSeen: null,
        };
      }

      return {
        email: senderStats.email,
        spamScore: senderStats.totalEmails > 0
          ? (senderStats.spamEmails / senderStats.totalEmails) * 100
          : 0,
        isBlacklisted: senderStats.isBlocked,
        isWhitelisted: false,
        totalEmails: senderStats.totalEmails,
        spamEmails: senderStats.spamEmails,
        lastSeen: senderStats.lastSeen,
      };
    } catch (error) {
      this.logger.error('Error getting sender reputation', error);
      return {
        email,
        spamScore: 0,
        isBlacklisted: false,
        isWhitelisted: false,
        totalEmails: 0,
        spamEmails: 0,
        lastSeen: null,
      };
    }
  }

  private async getDomainReputation(domain: string) {
    // Implement domain reputation checking
    // This could integrate with external services like Spamhaus, etc.
    return {
      domain,
      isBlacklisted: false,
      reputation: 'good',
    };
  }

  private async updateSenderReputation(email: string, isSpam: boolean, spamScore: number, tenantId: string) {
    try {
      const domain = email.split('@')[1] || '';
      await this.prisma.senderReputation.upsert({
        where: { 
          tenantId_email: {
            tenantId,
            email
          }
        },
        update: {
          totalEmails: { increment: 1 },
          spamEmails: isSpam ? { increment: 1 } : undefined,
          score: spamScore,
          lastSeen: new Date(),
        },
        create: {
          tenantId,
          email,
          domain,
          totalEmails: 1,
          spamEmails: isSpam ? 1 : 0,
          score: spamScore,
          isBlocked: false,
          lastSeen: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Error updating sender reputation', error);
    }
  }

  private async analyzeContent(subject: string, body: string) {
    return {
      subjectScore: this.analyzeSubject(subject),
      bodyScore: this.analyzeBodyContent(body),
      languageDetection: this.detectLanguage(body),
      sentimentAnalysis: this.analyzeSentiment(body),
    };
  }

  private detectLanguage(text: string): string {
    // Advanced language detection with multiple indicators
    const languagePatterns = {
      en: {
        common: ['the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'his', 'they', 'this', 'have', 'from', 'not', 'but'],
        patterns: [/\b(ing|tion|ed|ly)\b/g, /\b(a|an|the)\s+\w+/g],
        chars: /[a-zA-Z]/g,
        weight: 1
      },
      es: {
        common: ['que', 'de', 'no', 'la', 'el', 'en', 'y', 'a', 'es', 'se', 'un', 'te', 'lo', 'le', 'da'],
        patterns: [/\b(ción|mente|ando|iendo)\b/g, /\b(el|la|los|las)\s+\w+/g],
        chars: /[ñáéíóúü]/g,
        weight: 2
      },
      fr: {
        common: ['de', 'le', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son'],
        patterns: [/\b(tion|ment|eur|euse)\b/g, /\b(le|la|les|du|des)\s+\w+/g],
        chars: /[àâäéèêëïîôöùûüÿç]/g,
        weight: 2
      },
      de: {
        common: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'auf', 'für', 'ist', 'im', 'nicht'],
        patterns: [/\b(ung|keit|heit|lich)\b/g, /\b(der|die|das|den|dem)\s+\w+/g],
        chars: /[äöüß]/g,
        weight: 2
      },
      it: {
        common: ['il', 'di', 'che', 'e', 'la', 'per', 'un', 'in', 'con', 'non', 'una', 'su', 'le', 'da', 'si'],
        patterns: [/\b(zione|mente|ando|endo)\b/g, /\b(il|la|lo|gli|le)\s+\w+/g],
        chars: /[àèéìíîòóù]/g,
        weight: 2
      },
      pt: {
        common: ['o', 'de', 'a', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'se'],
        patterns: [/\b(ção|mente|ando|endo)\b/g, /\b(o|a|os|as|do|da)\s+\w+/g],
        chars: /[ãâáàçéêíóôõú]/g,
        weight: 2
      }
    };

    const words = text.toLowerCase().split(/\s+/);
    const scores = {};

    Object.entries(languagePatterns).forEach(([lang, config]) => {
      let score = 0;
      
      // Common words score
      const commonMatches = config.common.filter(word => words.includes(word)).length;
      score += commonMatches * config.weight;
      
      // Pattern matching score
      config.patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) score += matches.length * 0.5;
      });
      
      // Character-specific score
      const charMatches = text.match(config.chars);
      if (charMatches) score += charMatches.length * config.weight;
      
      scores[lang] = score;
    });

    // Find language with highest score
    const detectedLang = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
    
    // Return 'unknown' if confidence is too low
    const maxScore = Math.max(...Object.values(scores).map(Number));
    return maxScore > 2 ? detectedLang : 'unknown';
  }

  private analyzeSentiment(text: string) {
    // Advanced sentiment analysis with weighted scoring
    const positiveWords = {
      strong: ['excellent', 'amazing', 'outstanding', 'fantastic', 'incredible', 'perfect', 'brilliant', 'exceptional'],
      moderate: ['good', 'great', 'nice', 'wonderful', 'pleasant', 'satisfactory', 'positive', 'helpful'],
      weak: ['okay', 'fine', 'decent', 'acceptable', 'adequate', 'reasonable', 'fair']
    };
    
    const negativeWords = {
      strong: ['terrible', 'awful', 'horrible', 'disgusting', 'pathetic', 'useless', 'worst', 'hate'],
      moderate: ['bad', 'poor', 'disappointing', 'unacceptable', 'annoying', 'frustrating', 'wrong'],
      weak: ['meh', 'boring', 'bland', 'mediocre', 'average', 'so-so']
    };

    const spamIndicators = {
      urgency: ['urgent', 'immediate', 'act now', 'limited time', 'expires', 'hurry'],
      money: ['free', 'cash', 'money', 'prize', 'winner', 'lottery', 'million', 'rich'],
      suspicious: ['click here', 'guarantee', 'no risk', 'amazing deal', 'once in lifetime']
    };
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let spamScore = 0;
    
    // Calculate sentiment score with weights
    positiveWords.strong.forEach(word => {
      if (words.includes(word)) score += 3;
    });
    positiveWords.moderate.forEach(word => {
      if (words.includes(word)) score += 2;
    });
    positiveWords.weak.forEach(word => {
      if (words.includes(word)) score += 1;
    });
    
    negativeWords.strong.forEach(word => {
      if (words.includes(word)) score -= 3;
    });
    negativeWords.moderate.forEach(word => {
      if (words.includes(word)) score -= 2;
    });
    negativeWords.weak.forEach(word => {
      if (words.includes(word)) score -= 1;
    });

    // Calculate spam indicators
    Object.values(spamIndicators).flat().forEach(phrase => {
      if (text.toLowerCase().includes(phrase)) spamScore += 2;
    });

    // Determine sentiment with confidence
    let sentiment = 'neutral';
    let confidence = 0.5;
    
    if (score > 2) {
      sentiment = 'positive';
      confidence = Math.min(0.9, 0.5 + (score * 0.1));
    } else if (score < -2) {
      sentiment = 'negative';
      confidence = Math.min(0.9, 0.5 + (Math.abs(score) * 0.1));
    }

    return {
      sentiment,
      score,
      confidence,
      spamScore,
      isSpammy: spamScore > 4
    };
  }

  private determineActions(spamScore: number, reputation: any, contentAnalysis: any) {
    const actions = [];

    if (spamScore > 80 || reputation.isBlacklisted) {
      actions.push('block');
    } else if (spamScore > 60) {
      actions.push('quarantine');
    } else if (spamScore > 40) {
      actions.push('flag');
    }

    if (contentAnalysis.subjectScore > 50) {
      actions.push('subject_warning');
    }

    return actions;
  }

  private calculateConfidence(spamScore: number, reputation: any, contentAnalysis: any): number {
    let confidence = 50; // Base confidence

    // Increase confidence based on multiple indicators
    if (spamScore > 70) confidence += 20;
    if (reputation.emailCount > 10) confidence += 15;
    if (contentAnalysis.subjectScore > 40) confidence += 10;
    if (contentAnalysis.bodyScore > 40) confidence += 10;

    return Math.min(100, confidence);
  }

  private async analyzeOutgoingContent(subject: string, body: string): Promise<number> {
    // Analyze outgoing content for potential spam triggers
    let score = 0;

    // Check for spam trigger words
    const spamTriggers = [
      'free', 'guarantee', 'no risk', 'act now', 'limited time',
      'make money fast', 'work from home', 'click here', 'buy now',
    ];

    const text = (subject + ' ' + body).toLowerCase();
    spamTriggers.forEach(trigger => {
      if (text.includes(trigger)) score += 10;
    });

    // Check for excessive links
    const linkCount = (body.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > 3) score += linkCount * 5;

    // Check for excessive capitalization
    const capsRatio = (body.match(/[A-Z]/g) || []).length / body.length;
    if (capsRatio > 0.3) score += 20;

    return Math.min(100, score);
  }

  private async analyzeRecipients(recipients: string[]) {
    let suspiciousCount = 0;

    for (const recipient of recipients) {
      const reputation = await this.getSenderReputation(recipient);
      if (reputation.spamScore > 50) {
        suspiciousCount++;
      }
    }

    return {
      total: recipients.length,
      suspiciousCount,
      suspiciousRatio: suspiciousCount / recipients.length,
    };
  }

  private getOutgoingRecommendations(contentScore: number, recipientAnalysis: any) {
    const recommendations = [];

    if (contentScore > 50) {
      recommendations.push({
        type: 'content',
        message: 'Reduce spam trigger words to improve deliverability',
        priority: 'high',
      });
    }

    if (recipientAnalysis.suspiciousRatio > 0.1) {
      recommendations.push({
        type: 'recipients',
        message: 'Review recipient list for suspicious addresses',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  private async logSecurityEvent(
    tenantId: string,
    type: string,
    details: Record<string, unknown>,
    action: string = 'blocked',
  ) {
    try {
      await this.prisma.emailSecurityLog.create({
        data: {
          tenant: { connect: { id: tenantId } },
          eventType: 'spam_detection',
          type,
          action,
          description: `Spam detection: ${action}`,
          severity: 'medium',
          details: details as Prisma.JsonObject,
        },
      });
    } catch (error) {
      this.logger.error('Error logging security event', error);
    }
  }

  private async getTopSpamSenders(tenantId: string, startDate: Date) {
    return this.prisma.senderReputation.findMany({
      where: {
        tenantId,
        lastSeen: { gte: startDate },
      },
      orderBy: { spamEmails: 'desc' },
      take: 10,
      select: {
        email: true,
        spamEmails: true,
        totalEmails: true,
        score: true,
        lastSeen: true,
      },
    });
  }

  private async updateSpamPatterns(_tenantId: string, _email: any) {
    // Update ML patterns based on user feedback
    // This would integrate with your ML pipeline
  }

  private async retrainModel(_tenantId: string, _emails: any[]) {
    // Retrain spam detection model
    // This would trigger your ML retraining pipeline
  }

  private async getModelVersion(_tenantId: string): Promise<string> {
    // Return current model version
    return '1.0.0';
  }
}

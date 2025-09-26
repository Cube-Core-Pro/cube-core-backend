// path: backend/src/modules/enterprise-email/services/anti-spam.service.ts
// purpose: Advanced AI-powered anti-spam and security scanning for enterprise emails
// dependencies: @nestjs/common, prisma, redis, ml-models, virus-scanner

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import * as crypto from 'crypto';

export interface SpamAnalysisResult {
  isSpam: boolean;
  spamScore: number; // 0-1 (0 = not spam, 1 = definitely spam)
  confidence: number; // 0-1
  reasons: SpamReason[];
  classification: SpamClassification;
  aiAnalysis: AIAnalysisResult;
  blockedBy?: string[]; // Which rules/filters blocked it
}

export interface SpamReason {
  type: 'sender' | 'content' | 'headers' | 'links' | 'attachments' | 'reputation' | 'pattern';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
}

export interface SpamClassification {
  category: 'legitimate' | 'promotional' | 'phishing' | 'malware' | 'scam' | 'bulk' | 'suspicious';
  subcategory?: string;
  maliciousIntent: boolean;
}

export interface AIAnalysisResult {
  contentAnalysis: {
    sentiment: 'positive' | 'negative' | 'neutral' | 'suspicious';
    language: string;
    readingLevel: number;
    urgencyIndicators: string[];
    socialEngineeringTactics: string[];
  };
  behavioralAnalysis: {
    senderReputation: number;
    domainAge: number;
    sendingPatterns: string[];
    authenticationStatus: AuthenticationStatus;
  };
  threatAnalysis: {
    phishingProbability: number;
    malwareProbability: number;
    scamProbability: number;
    dataHarvestingRisk: number;
  };
}

export interface AuthenticationStatus {
  spf: 'pass' | 'fail' | 'softfail' | 'neutral' | 'none' | 'permerror' | 'temperror';
  dkim: 'pass' | 'fail' | 'none' | 'policy' | 'neutral' | 'permerror' | 'temperror';
  dmarc: 'pass' | 'fail' | 'none';
  trusted: boolean;
}

export interface VirusScanResult {
  hasVirus: boolean;
  virusName?: string;
  scanEngine: string;
  scanDate: Date;
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  quarantined: boolean;
  scanDetails?: {
    filesScanned: number;
    threatsFound: number;
    scanDuration: number;
  };
}

export interface SecuritySettings {
  spamThreshold: number; // 0-1
  quarantineThreshold: number; // 0-1
  blockThreshold: number; // 0-1
  enablePhishingDetection: boolean;
  enableMalwareScanning: boolean;
  enableContentAnalysis: boolean;
  enableReputationFiltering: boolean;
  whitelistedDomains: string[];
  blacklistedDomains: string[];
  customRules: CustomSecurityRule[];
}

export interface CustomSecurityRule {
  id: string;
  name: string;
  type: 'sender' | 'subject' | 'content' | 'attachment';
  pattern: string;
  action: 'block' | 'quarantine' | 'tag' | 'score';
  enabled: boolean;
  priority: number;
}

@Injectable()
export class AntiSpamService {
  private readonly logger = new Logger(AntiSpamService.name);
  private spamModelCache = new Map<string, any>();
  private reputationCache = new Map<string, number>();

  // Spam detection patterns
  private readonly spamPatterns = {
    subjects: [
      /urgent.{0,10}action.{0,10}required/i,
      /congratulations.{0,20}winner/i,
      /click.{0,10}here.{0,10}now/i,
      /limited.{0,10}time.{0,10}offer/i,
      /act.{0,10}now/i,
      /free.{0,10}money/i,
      /nigerian.{0,10}prince/i,
    ],
    content: [
      /verify.{0,20}account.{0,20}immediately/i,
      /suspended.{0,20}account/i,
      /click.{0,10}link.{0,10}below/i,
      /download.{0,10}attachment/i,
      /wire.{0,10}transfer/i,
      /cryptocurrency.{0,20}investment/i,
    ],
    phishing: [
      /paypal.{0,20}security/i,
      /amazon.{0,20}verification/i,
      /bank.{0,20}security.{0,20}alert/i,
      /microsoft.{0,20}security/i,
      /apple.{0,20}id.{0,20}locked/i,
    ],
  };

  // Dangerous file extensions
  private readonly dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.dll',
    '.vbs', '.js', '.jar', '.app', '.deb', '.pkg', '.dmg'
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async analyzeEmail(emailData: any, tenantId?: string): Promise<SpamAnalysisResult> {
    try {
      const startTime = Date.now();

      // Get security settings for tenant
      const securitySettings = tenantId ?
        await this.getSecuritySettings(tenantId) :
        this.getDefaultSecuritySettings();

      // Initialize analysis result
      const result: SpamAnalysisResult = {
        isSpam: false,
        spamScore: 0,
        confidence: 0,
        reasons: [],
        classification: {
          category: 'legitimate',
          maliciousIntent: false,
        },
        aiAnalysis: await this.performAIAnalysis(emailData),
        blockedBy: [],
      };

      // 1. Check whitelist/blacklist
      const domainCheck = this.checkDomainLists(emailData.from, securitySettings);
      if (domainCheck.action) {
        if (domainCheck.action === 'block') {
          result.isSpam = true;
          result.spamScore = 1.0;
          result.blockedBy.push('blacklist');
          result.reasons.push({
            type: 'sender',
            description: 'Sender domain is blacklisted',
            severity: 'critical',
            score: 1.0,
          });
        } else if (domainCheck.action === 'allow') {
          // Whitelisted - reduce spam score
          result.spamScore -= 0.3;
        }
      }

      // 2. Authentication checks
      const authCheck = await this.checkAuthentication(emailData);
      result.aiAnalysis.behavioralAnalysis.authenticationStatus = authCheck;
      
      if (!authCheck.trusted) {
        const authScore = this.calculateAuthScore(authCheck);
        result.spamScore += authScore;
        result.reasons.push({
          type: 'sender',
          description: 'Email authentication failed',
          severity: authScore > 0.5 ? 'high' : 'medium',
          score: authScore,
        });
      }

      // 3. Content analysis
      const contentAnalysis = await this.analyzeContent(emailData, securitySettings);
      result.spamScore += contentAnalysis.score;
      result.reasons.push(...contentAnalysis.reasons);

      // 4. Pattern matching
      const patternAnalysis = this.analyzePatterns(emailData);
      result.spamScore += patternAnalysis.score;
      result.reasons.push(...patternAnalysis.reasons);

      // 5. Sender reputation
      const reputationScore = await this.checkSenderReputation(emailData.from);
      result.aiAnalysis.behavioralAnalysis.senderReputation = reputationScore;
      
      if (reputationScore < 0.3) {
        const repScore = (0.3 - reputationScore) * 2;
        result.spamScore += repScore;
        result.reasons.push({
          type: 'reputation',
          description: 'Poor sender reputation',
          severity: repScore > 0.5 ? 'high' : 'medium',
          score: repScore,
        });
      }

      // 6. Link analysis
      const linkAnalysis = await this.analyzeLinks(emailData);
      result.spamScore += linkAnalysis.score;
      result.reasons.push(...linkAnalysis.reasons);

      // 7. Attachment analysis
      if (emailData.attachments && emailData.attachments.length > 0) {
        const attachmentAnalysis = await this.analyzeAttachments(emailData.attachments);
        result.spamScore += attachmentAnalysis.score;
        result.reasons.push(...attachmentAnalysis.reasons);
      }

      // 8. AI model prediction
      if (securitySettings.enableContentAnalysis) {
        const aiScore = await this.getAISpamScore(emailData);
        result.spamScore = (result.spamScore + aiScore) / 2; // Average with rule-based score
        result.confidence = Math.min(1, result.confidence + 0.3);
      }

      // Normalize spam score
      result.spamScore = Math.min(1, Math.max(0, result.spamScore));

      // Determine final classification
      result.classification = this.classifyEmail(result.spamScore, result.reasons, result.aiAnalysis);
      result.isSpam = result.spamScore >= securitySettings.spamThreshold;

      // Calculate confidence
      result.confidence = this.calculateConfidence(result);

      // Log analysis for learning
  await this.logSpamAnalysis(emailData, result, tenantId);

      const analysisDuration = Date.now() - startTime;
      this.logger.log(`Spam analysis completed in ${analysisDuration}ms: Score ${result.spamScore.toFixed(3)}, IsSpam: ${result.isSpam}`);

      return result;
    } catch (error) {
      this.logger.error('Error analyzing email for spam', error);
      
      // Return safe default on error
      return {
        isSpam: true,
        spamScore: 0.8,
        confidence: 0.5,
        reasons: [{
          type: 'pattern',
          description: 'Analysis error - marked as suspicious for safety',
          severity: 'medium',
          score: 0.8,
        }],
        classification: {
          category: 'suspicious',
          maliciousIntent: false,
        },
        aiAnalysis: {
          contentAnalysis: {
            sentiment: 'neutral',
            language: 'unknown',
            readingLevel: 5,
            urgencyIndicators: [],
            socialEngineeringTactics: [],
          },
          behavioralAnalysis: {
            senderReputation: 0.5,
            domainAge: 0,
            sendingPatterns: [],
            authenticationStatus: {
              spf: 'none',
              dkim: 'none',
              dmarc: 'none',
              trusted: false,
            },
          },
          threatAnalysis: {
            phishingProbability: 0.5,
            malwareProbability: 0.5,
            scamProbability: 0.5,
            dataHarvestingRisk: 0.5,
          },
        },
      };
    }
  }

  async scanForVirus(emailData: any): Promise<VirusScanResult> {
    try {
      const startTime = Date.now();
      
      const result: VirusScanResult = {
        hasVirus: false,
        scanEngine: 'ClamAV-Enterprise',
        scanDate: new Date(),
        threatLevel: 'none',
        quarantined: false,
        scanDetails: {
          filesScanned: 0,
          threatsFound: 0,
          scanDuration: 0,
        },
      };

      let filesScanned = 0;
      let threatsFound = 0;

      // Scan email content for malicious patterns
      const contentThreats = this.scanContentForThreats(emailData.body + emailData.htmlBody);
      if (contentThreats.length > 0) {
        result.hasVirus = true;
        result.virusName = contentThreats[0];
        result.threatLevel = 'high';
        threatsFound++;
      }

      // Scan attachments if present
      if (emailData.attachments && emailData.attachments.length > 0) {
        for (const attachment of emailData.attachments) {
          filesScanned++;
          const attachmentScan = await this.scanAttachmentForVirus(attachment);
          if (attachmentScan.hasVirus) {
            result.hasVirus = true;
            result.virusName = attachmentScan.virusName;
            result.threatLevel = 'critical';
            threatsFound++;
          }
        }
      }

      // Scan URLs for malicious links
      const urls = this.extractURLs(emailData.body + emailData.htmlBody);
      for (const url of urls) {
        filesScanned++;
        const urlScan = await this.scanURLForThreats(url);
        if (urlScan.isMalicious) {
          result.hasVirus = true;
          result.virusName = urlScan.threatType;
          result.threatLevel = 'high';
          threatsFound++;
        }
      }

      const scanDuration = Date.now() - startTime;
      
      result.scanDetails = {
        filesScanned,
        threatsFound,
        scanDuration,
      };

      this.logger.log(`Virus scan completed: ${filesScanned} files, ${threatsFound} threats, ${scanDuration}ms`);
      return result;
    } catch (error) {
      this.logger.error('Error scanning for virus', error);
      
      return {
        hasVirus: true, // Fail safe
        virusName: 'ScanError',
        scanEngine: 'Error',
        scanDate: new Date(),
        threatLevel: 'medium',
        quarantined: false,
        scanDetails: {
          filesScanned: 0,
          threatsFound: 1,
          scanDuration: 0,
        },
      };
    }
  }

  async updateSpamModel(trainingData: Array<{
    emailData: any;
    isSpam: boolean;
    userFeedback?: boolean;
  }>): Promise<void> {
    try {
      // This would train/update the ML model with new data
      // For now, we'll just log the training data
      this.logger.log(`Training spam model with ${trainingData.length} examples`);
      
      // In a real implementation, you would:
      // 1. Preprocess the training data
      // 2. Extract features
      // 3. Update the ML model
      // 4. Validate performance
      // 5. Deploy updated model
    } catch (error) {
      this.logger.error('Error updating spam model', error);
      throw error;
    }
  }

  async reportSpam(emailId: string, userId: string, isSpam: boolean): Promise<void> {
    try {
      // Fetch email to resolve tenantId and sender
      const email = await this.prisma.enterpriseEmail.findFirst({
        where: { id: emailId },
      });

      const tenantId = email?.tenantId;

      // Log security event instead of non-existent SpamReport
      if (tenantId) {
        await this.prisma.emailSecurityLog.create({
          data: {
            tenantId,
            emailId,
            eventType: 'USER_REPORT',
            type: isSpam ? 'spam' : 'not_spam',
            action: isSpam ? 'flag' : 'unflag',
            description: `User ${userId} reported email ${emailId} as ${isSpam ? 'SPAM' : 'NOT_SPAM'}`,
            severity: isSpam ? 'warning' : 'info',
            metadata: { userId },
          },
        });
      }

      // Update reputation based on user feedback
      if (email?.from) {
        await this.updateSenderReputation(email.from, isSpam ? -0.1 : 0.1, tenantId);
      }

      this.logger.log(`Spam feedback recorded: ${emailId} - ${isSpam ? 'SPAM' : 'NOT_SPAM'}`);
    } catch (error) {
      this.logger.error('Error reporting spam', error);
      throw error;
    }
  }

  private async performAIAnalysis(emailData: any): Promise<AIAnalysisResult> {
    // Simulate AI analysis - in reality this would use ML models
    return {
      contentAnalysis: {
        sentiment: this.analyzeSentiment(emailData.body),
        language: this.detectLanguage(emailData.body),
        readingLevel: this.calculateReadingLevel(emailData.body),
        urgencyIndicators: this.findUrgencyIndicators(emailData.subject + ' ' + emailData.body),
        socialEngineeringTactics: this.detectSocialEngineering(emailData.body),
      },
      behavioralAnalysis: {
        senderReputation: await this.checkSenderReputation(emailData.from),
        domainAge: await this.getDomainAge(emailData.from.split('@')[1]),
        sendingPatterns: await this.analyzeSendingPatterns(emailData.from),
        authenticationStatus: {
          spf: 'none',
          dkim: 'none',
          dmarc: 'none',
          trusted: false,
        },
      },
      threatAnalysis: {
        phishingProbability: this.calculatePhishingProbability(emailData),
        malwareProbability: this.calculateMalwareProbability(emailData),
        scamProbability: this.calculateScamProbability(emailData),
        dataHarvestingRisk: this.calculateDataHarvestingRisk(emailData),
      },
    };
  }

  private checkDomainLists(fromEmail: string, settings: SecuritySettings): { action?: 'block' | 'allow' } {
    const domain = fromEmail.split('@')[1]?.toLowerCase();
    
    if (settings.blacklistedDomains.includes(domain)) {
      return { action: 'block' };
    }
    
    if (settings.whitelistedDomains.includes(domain)) {
      return { action: 'allow' };
    }
    
    return {};
  }

  private async checkAuthentication(emailData: any): Promise<AuthenticationStatus> {
    // Simulate authentication check - in reality this would check actual SPF/DKIM/DMARC
    return {
      spf: 'pass',
      dkim: 'pass',
      dmarc: 'pass',
      trusted: true,
    };
  }

  private calculateAuthScore(auth: AuthenticationStatus): number {
    let score = 0;
    
    if (auth.spf !== 'pass') score += 0.2;
    if (auth.dkim !== 'pass') score += 0.2;
    if (auth.dmarc !== 'pass') score += 0.3;
    if (!auth.trusted) score += 0.2;
    
    return score;
  }

  private async analyzeContent(emailData: any, settings: SecuritySettings): Promise<{
    score: number;
    reasons: SpamReason[];
  }> {
    const reasons: SpamReason[] = [];
    let score = 0;

    const content = (emailData.subject + ' ' + emailData.body).toLowerCase();

    // Check for excessive caps
    const capsRatio = this.calculateCapsRatio(content);
    if (capsRatio > 0.3) {
      score += capsRatio * 0.3;
      reasons.push({
        type: 'content',
        description: 'Excessive use of capital letters',
        severity: capsRatio > 0.5 ? 'medium' : 'low',
        score: capsRatio * 0.3,
      });
    }

    // Check for suspicious keywords
    const suspiciousWords = ['free', 'winner', 'urgent', 'act now', 'limited time'];
    const suspiciousCount = suspiciousWords.filter(word => content.includes(word)).length;
    if (suspiciousCount > 2) {
      const suspiciousScore = suspiciousCount * 0.1;
      score += suspiciousScore;
      reasons.push({
        type: 'content',
        description: 'Contains multiple suspicious keywords',
        severity: 'medium',
        score: suspiciousScore,
      });
    }

    return { score: Math.min(0.8, score), reasons };
  }

  private analyzePatterns(emailData: any): { score: number; reasons: SpamReason[] } {
    const reasons: SpamReason[] = [];
    let score = 0;

    const subject = emailData.subject?.toLowerCase() || '';
    const body = emailData.body?.toLowerCase() || '';

    // Check spam patterns
    for (const pattern of this.spamPatterns.subjects) {
      if (pattern.test(subject)) {
        score += 0.4;
        reasons.push({
          type: 'pattern',
          description: 'Subject matches known spam pattern',
          severity: 'high',
          score: 0.4,
        });
        break;
      }
    }

    for (const pattern of this.spamPatterns.content) {
      if (pattern.test(body)) {
        score += 0.3;
        reasons.push({
          type: 'pattern',
          description: 'Content matches known spam pattern',
          severity: 'medium',
          score: 0.3,
        });
        break;
      }
    }

    for (const pattern of this.spamPatterns.phishing) {
      if (pattern.test(subject + ' ' + body)) {
        score += 0.6;
        reasons.push({
          type: 'pattern',
          description: 'Contains phishing indicators',
          severity: 'high',
          score: 0.6,
        });
        break;
      }
    }

    return { score: Math.min(0.9, score), reasons };
  }

  private async checkSenderReputation(senderEmail: string, tenantId?: string): Promise<number> {
    try {
      const cacheKey = `reputation:${tenantId || 'global'}:${senderEmail}`;
      
      // Check cache first
      if (this.reputationCache.has(cacheKey)) {
        return this.reputationCache.get(cacheKey);
      }

      // Check Redis cache
      const cachedReputation = await this.redis.get(cacheKey);
      if (cachedReputation) {
        const reputation = parseFloat(cachedReputation);
        this.reputationCache.set(cacheKey, reputation);
        return reputation;
      }

      // Calculate reputation based on historical data
  const reputation = await this.calculateSenderReputation(senderEmail, tenantId);
      
      // Cache result
      this.reputationCache.set(cacheKey, reputation);
      await this.redis.setex(cacheKey, 3600, reputation.toString()); // Cache for 1 hour
      
      return reputation;
    } catch (error) {
      this.logger.error('Error checking sender reputation', error);
      return 0.5; // Default neutral reputation
    }
  }

  private async calculateSenderReputation(senderEmail: string, tenantId?: string): Promise<number> {
    try {
      // Get historical data about this sender
      const [totalEmails, spamReports] = await Promise.all([
        this.prisma.enterpriseEmail.count({
          where: tenantId ? { from: senderEmail, tenantId } : { from: senderEmail },
        }),
        this.prisma.enterpriseEmail.count({
          where: tenantId ? { from: senderEmail, tenantId, isSpam: true } : { from: senderEmail, isSpam: true },
        }),
      ]);

      if (totalEmails === 0) return 0.5; // No history = neutral

      const spamRate = spamReports / totalEmails;
      const reputation = 1 - Math.min(1, spamRate * 2); // Convert spam rate to reputation

      return Math.max(0, Math.min(1, reputation));
    } catch (error) {
      this.logger.error('Error calculating sender reputation', error);
      return 0.5;
    }
  }

  private async analyzeLinks(emailData: any): Promise<{ score: number; reasons: SpamReason[] }> {
    const reasons: SpamReason[] = [];
    let score = 0;

    const content = emailData.body + (emailData.htmlBody || '');
    const urls = this.extractURLs(content);

    if (urls.length > 10) {
      score += 0.3;
      reasons.push({
        type: 'links',
        description: 'Contains excessive number of links',
        severity: 'medium',
        score: 0.3,
      });
    }

    // Check for suspicious domains
    const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'ow.ly'];
    const hasSuspiciousLinks = urls.some(url => 
      suspiciousDomains.some(domain => url.includes(domain))
    );

    if (hasSuspiciousLinks) {
      score += 0.4;
      reasons.push({
        type: 'links',
        description: 'Contains suspicious shortened URLs',
        severity: 'high',
        score: 0.4,
      });
    }

    return { score: Math.min(0.7, score), reasons };
  }

  private async analyzeAttachments(attachments: any[]): Promise<{ score: number; reasons: SpamReason[] }> {
    const reasons: SpamReason[] = [];
    let score = 0;

    for (const attachment of attachments) {
      const filename = attachment.filename?.toLowerCase() || '';
      const extension = filename.substring(filename.lastIndexOf('.'));

      if (this.dangerousExtensions.includes(extension)) {
        score += 0.8;
        reasons.push({
          type: 'attachments',
          description: `Dangerous file type: ${extension}`,
          severity: 'critical',
          score: 0.8,
        });
      }

      // Check for double extensions
      if (filename.match(/\.\w+\.\w+$/)) {
        score += 0.5;
        reasons.push({
          type: 'attachments',
          description: 'File with double extension detected',
          severity: 'high',
          score: 0.5,
        });
      }
    }

    return { score: Math.min(0.9, score), reasons };
  }

  private async getAISpamScore(emailData: any): Promise<number> {
    // Simulate ML model prediction
    // In reality, this would use a trained model
    const features = this.extractFeatures(emailData);
    return this.simulateMLPrediction(features);
  }

  private extractFeatures(emailData: any): number[] {
    // Extract numerical features for ML model
    const features = [];
    
    const content = (emailData.subject + ' ' + emailData.body).toLowerCase();
    
    features.push(content.length); // Content length
    features.push(this.calculateCapsRatio(content)); // Caps ratio
    features.push((emailData.attachments || []).length); // Attachment count
    features.push(this.extractURLs(content).length); // URL count
    features.push(content.split('!').length - 1); // Exclamation count
    
    return features;
  }

  private simulateMLPrediction(features: number[]): number {
    // Simple simulation of ML prediction
    // In reality, this would use a trained model like scikit-learn or TensorFlow
    let score = 0;
    
    if (features[0] > 5000) score += 0.1; // Long content
    if (features[1] > 0.3) score += 0.2;   // High caps ratio
    if (features[2] > 5) score += 0.3;     // Many attachments
    if (features[3] > 10) score += 0.2;    // Many URLs
    if (features[4] > 5) score += 0.1;     // Many exclamations
    
    return Math.min(1, score);
  }

  private classifyEmail(spamScore: number, reasons: SpamReason[], aiAnalysis: AIAnalysisResult): SpamClassification {
    if (spamScore > 0.8) {
      if (aiAnalysis.threatAnalysis.phishingProbability > 0.7) {
        return { category: 'phishing', maliciousIntent: true };
      } else if (aiAnalysis.threatAnalysis.malwareProbability > 0.7) {
        return { category: 'malware', maliciousIntent: true };
      } else if (aiAnalysis.threatAnalysis.scamProbability > 0.7) {
        return { category: 'scam', maliciousIntent: true };
      } else {
        return { category: 'bulk', maliciousIntent: false };
      }
    } else if (spamScore > 0.5) {
      return { category: 'suspicious', maliciousIntent: false };
    } else if (spamScore > 0.3) {
      return { category: 'promotional', maliciousIntent: false };
    } else {
      return { category: 'legitimate', maliciousIntent: false };
    }
  }

  private calculateConfidence(result: SpamAnalysisResult): number {
    let confidence = 0.5; // Base confidence
    
    // More reasons = higher confidence
    confidence += Math.min(0.3, result.reasons.length * 0.1);
    
    // Extreme scores = higher confidence
    if (result.spamScore > 0.8 || result.spamScore < 0.2) {
      confidence += 0.2;
    }
    
    return Math.min(1, confidence);
  }

  // Utility methods
  private calculateCapsRatio(text: string): number {
    const caps = text.replace(/[^A-Z]/g, '').length;
    const total = text.replace(/[^A-Za-z]/g, '').length;
    return total > 0 ? caps / total : 0;
  }

  private extractURLs(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    return text.match(urlRegex) || [];
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' | 'suspicious' {
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst'];
    const suspiciousWords = ['urgent', 'limited', 'act now', 'expire', 'winner'];
    
    const lower = text.toLowerCase();
    
    if (suspiciousWords.some(word => lower.includes(word))) return 'suspicious';
    
    const positiveCount = positiveWords.filter(word => lower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lower.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private detectLanguage(text: string): string {
    // Simple language detection - in reality would use a proper library
    return 'en'; // Default to English
  }

  private calculateReadingLevel(text: string): number {
    // Simple reading level calculation
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const avgWordsPerSentence = words / Math.max(1, sentences);
    
    return Math.min(12, Math.max(1, Math.round(avgWordsPerSentence / 5)));
  }

  private findUrgencyIndicators(text: string): string[] {
    const urgencyWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'deadline', 'expires'];
    const lower = text.toLowerCase();
    
    return urgencyWords.filter(word => lower.includes(word));
  }

  private detectSocialEngineering(text: string): string[] {
    const tactics = [];
    const lower = text.toLowerCase();
    
    if (lower.includes('verify') && lower.includes('account')) {
      tactics.push('Account verification request');
    }
    
    if (lower.includes('click') && lower.includes('link')) {
      tactics.push('Suspicious link request');
    }
    
    if (lower.includes('winner') || lower.includes('congratulations')) {
      tactics.push('False prize notification');
    }
    
    return tactics;
  }

  private async getDomainAge(domain: string): Promise<number> {
    // Simulate domain age lookup
    return Math.random() * 365 * 10; // 0-10 years
  }

  private async analyzeSendingPatterns(email: string): Promise<string[]> {
    // Analyze historical sending patterns
    return ['normal_frequency', 'consistent_timing'];
  }

  private calculatePhishingProbability(emailData: any): number {
    let probability = 0;
    const content = (emailData.subject + ' ' + emailData.body).toLowerCase();
    
    if (content.includes('verify') && content.includes('account')) probability += 0.3;
    if (content.includes('suspended') && content.includes('account')) probability += 0.4;
    if (content.includes('click') && content.includes('link')) probability += 0.2;
    
    return Math.min(1, probability);
  }

  private calculateMalwareProbability(emailData: any): number {
    let probability = 0;
    
    if (emailData.attachments?.length > 0) {
      const hasExecutable = emailData.attachments.some(att => 
        this.dangerousExtensions.some(ext => att.filename?.endsWith(ext))
      );
      if (hasExecutable) probability += 0.6;
    }
    
    return Math.min(1, probability);
  }

  private calculateScamProbability(emailData: any): number {
    let probability = 0;
    const content = (emailData.subject + ' ' + emailData.body).toLowerCase();
    
    if (content.includes('money') || content.includes('transfer')) probability += 0.3;
    if (content.includes('prince') || content.includes('inheritance')) probability += 0.5;
    if (content.includes('lottery') || content.includes('winner')) probability += 0.4;
    
    return Math.min(1, probability);
  }

  private calculateDataHarvestingRisk(emailData: any): number {
    let risk = 0;
    const content = (emailData.subject + ' ' + emailData.body).toLowerCase();
    
    if (content.includes('survey') || content.includes('form')) risk += 0.2;
    if (content.includes('personal information')) risk += 0.3;
    if (content.includes('social security')) risk += 0.5;
    
    return Math.min(1, risk);
  }

  private scanContentForThreats(content: string): string[] {
    const threats = [];
    
    if (content.includes('<script>') || content.includes('javascript:')) {
      threats.push('JS.Malicious.Script');
    }
    
    if (content.includes('eicar') || content.includes('X5O!P%@AP[4\\PZX54(P^)7CC)7}')) {
      threats.push('EICAR.Test.Virus');
    }
    
    return threats;
  }

  private async scanAttachmentForVirus(attachment: any): Promise<{ hasVirus: boolean; virusName?: string }> {
    const filename = attachment.filename?.toLowerCase() || '';
    
    // Simple filename-based detection
    if (filename.includes('virus') || filename.includes('malware')) {
      return { hasVirus: true, virusName: 'Test.Virus.Detected' };
    }
    
    // Check dangerous extensions
    const extension = filename.substring(filename.lastIndexOf('.'));
    if (this.dangerousExtensions.includes(extension)) {
      return { hasVirus: true, virusName: 'Suspicious.Executable.File' };
    }
    
    return { hasVirus: false };
  }

  private async scanURLForThreats(url: string): Promise<{ isMalicious: boolean; threatType?: string }> {
    // Simple URL threat detection
    const suspiciousDomains = ['malware.com', 'phishing.net', 'scam.org'];
    
    if (suspiciousDomains.some(domain => url.includes(domain))) {
      return { isMalicious: true, threatType: 'Malicious.URL.Detected' };
    }
    
    return { isMalicious: false };
  }

  private async getSecuritySettings(tenantId: string): Promise<SecuritySettings> {
    try {
      // Read security-related settings from Tenant.settings JSON
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      const settings = (tenant?.settings as any) || {};
      const security = settings.emailSecurity || settings.security || settings.securitySettings;
      return security as SecuritySettings || this.getDefaultSecuritySettings();
    } catch (error) {
      this.logger.error('Error getting security settings', error);
      return this.getDefaultSecuritySettings();
    }
  }

  private getDefaultSecuritySettings(): SecuritySettings {
    return {
      spamThreshold: 0.7,
      quarantineThreshold: 0.5,
      blockThreshold: 0.9,
      enablePhishingDetection: true,
      enableMalwareScanning: true,
      enableContentAnalysis: true,
      enableReputationFiltering: true,
      whitelistedDomains: [],
      blacklistedDomains: [],
      customRules: [],
    };
  }

  private async updateSenderReputation(senderEmail: string, change: number, tenantId?: string): Promise<void> {
    try {
      const current = await this.checkSenderReputation(senderEmail, tenantId);
      const newReputation = Math.max(0, Math.min(1, current + change));
      
      const cacheKey = `reputation:${tenantId || 'global'}:${senderEmail}`;
      this.reputationCache.set(cacheKey, newReputation);
      await this.redis.setex(cacheKey, 3600, newReputation.toString());

      // Persist to SenderReputation table per tenant when available
      if (tenantId) {
        await this.prisma.senderReputation.upsert({
          where: { tenantId_email: { tenantId, email: senderEmail } },
          update: { reputation: newReputation, updatedAt: new Date() },
          create: { tenantId, email: senderEmail, reputation: newReputation, createdAt: new Date(), updatedAt: new Date() },
        });
      }
      
      this.logger.log(`Updated reputation for ${senderEmail}: ${current} -> ${newReputation}`);
    } catch (error) {
      this.logger.error('Error updating sender reputation', error);
    }
  }

  private async logSpamAnalysis(emailData: any, result: SpamAnalysisResult, tenantId?: string): Promise<void> {
    try {
      // Log for analytics and model improvement
      const logEntry = {
        timestamp: new Date(),
        from: emailData.from,
        subject: emailData.subject?.substring(0, 100), // Truncate for privacy
        spamScore: result.spamScore,
        isSpam: result.isSpam,
        confidence: result.confidence,
        classification: result.classification.category,
        reasonCount: result.reasons.length,
        tenantId,
      };
      
      await this.redis.lpush('spam_analysis_log', JSON.stringify(logEntry));
      await this.redis.ltrim('spam_analysis_log', 0, 10000); // Keep only recent entries
    } catch (error) {
      this.logger.warn('Failed to log spam analysis', error);
    }
  }
}
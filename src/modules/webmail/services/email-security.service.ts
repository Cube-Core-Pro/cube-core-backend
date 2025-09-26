// path: backend/src/modules/webmail/services/email-security.service.ts
// purpose: Advanced email security and threat detection service
// dependencies: NestJS, virus scanning, phishing detection, content analysis

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailMessage, EmailAttachment } from '../webmail.service';

export interface SecurityScanResult {
  isSecure: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  threats: SecurityThreat[];
  recommendations: string[];
  quarantineRequired: boolean;
  scanTimestamp: Date;
}

export interface SecurityThreat {
  type: 'virus' | 'phishing' | 'spam' | 'malware' | 'suspicious_link' | 'data_leak' | 'impersonation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  confidence: number;
  mitigation: string;
}

export interface PhishingAnalysis {
  isPhishing: boolean;
  confidence: number;
  indicators: PhishingIndicator[];
  suspiciousLinks: SuspiciousLink[];
  domainReputation: DomainReputation;
}

export interface PhishingIndicator {
  type: 'domain_spoofing' | 'urgent_language' | 'credential_request' | 'suspicious_attachment' | 'typosquatting';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SuspiciousLink {
  url: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  isBlacklisted: boolean;
  redirectChain?: string[];
}

export interface DomainReputation {
  domain: string;
  reputation: 'good' | 'neutral' | 'suspicious' | 'malicious';
  score: number;
  lastSeen: Date;
  categories: string[];
}

export interface AttachmentScanResult {
  filename: string;
  isSecure: boolean;
  threats: string[];
  fileType: string;
  size: number;
  hash: string;
  scanEngine: string;
  scanTimestamp: Date;
}

export interface DataLeakAnalysis {
  hasPersonalData: boolean;
  dataTypes: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  complianceIssues: string[];
}

@Injectable()
export class EmailSecurityService {
  private readonly logger = new Logger(EmailSecurityService.name);
  private readonly virusDefinitions: Set<string> = new Set();
  private readonly phishingDomains: Set<string> = new Set();
  private readonly trustedDomains: Set<string> = new Set();

  constructor(private readonly configService: ConfigService) {
    this.initializeSecurityData();
  }

  async performSecurityScan(email: EmailMessage): Promise<SecurityScanResult> {
    try {
      const threats: SecurityThreat[] = [];
      
      // Perform various security checks
      const virusCheck = await this.scanForViruses(email);
      const phishingCheck = await this.analyzePhishing(email);
      const spamCheck = await this.analyzeSpam(email);
      const linkCheck = await this.analyzeSuspiciousLinks(email);
      const attachmentCheck = await this.scanAttachments(email.attachments);
      const dataLeakCheck = await this.analyzeDataLeak(email);
      const impersonationCheck = await this.detectImpersonation(email);

      // Collect all threats
      if (virusCheck.length > 0) threats.push(...virusCheck);
      if (phishingCheck.isPhishing) {
        threats.push({
          type: 'phishing',
          severity: phishingCheck.confidence > 0.8 ? 'critical' : 'high',
          description: 'Potential phishing attempt detected',
          evidence: phishingCheck.indicators.map(i => i.description),
          confidence: phishingCheck.confidence,
          mitigation: 'Quarantine email and notify user',
        });
      }
      if (spamCheck.isSpam) {
        threats.push({
          type: 'spam',
          severity: 'medium',
          description: 'Email identified as spam',
          evidence: spamCheck.reasons,
          confidence: spamCheck.confidence,
          mitigation: 'Move to spam folder',
        });
      }

      // Add link and attachment threats
      threats.push(...linkCheck);
      threats.push(...attachmentCheck);
      threats.push(...dataLeakCheck);
      threats.push(...impersonationCheck);

      // Determine overall risk level
      const riskLevel = this.calculateRiskLevel(threats);
      const quarantineRequired = threats.some(t => t.severity === 'critical');

      return {
        isSecure: threats.length === 0,
        riskLevel,
        threats,
        recommendations: this.generateSecurityRecommendations(threats),
        quarantineRequired,
        scanTimestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to perform security scan:', error);
      return this.getDefaultSecurityResult();
    }
  }

  async analyzePhishing(email: EmailMessage): Promise<PhishingAnalysis> {
    try {
      const indicators: PhishingIndicator[] = [];
      const suspiciousLinks: SuspiciousLink[] = [];
      
      // Check for domain spoofing
      const domainSpoofing = this.checkDomainSpoofing(email.from);
      if (domainSpoofing) {
        indicators.push({
          type: 'domain_spoofing',
          description: 'Sender domain appears to be spoofed',
          severity: 'high',
        });
      }

      // Check for urgent language
      const urgentLanguage = this.detectUrgentLanguage(email.body);
      if (urgentLanguage) {
        indicators.push({
          type: 'urgent_language',
          description: 'Email contains urgent or threatening language',
          severity: 'medium',
        });
      }

      // Check for credential requests
      const credentialRequest = this.detectCredentialRequest(email.body);
      if (credentialRequest) {
        indicators.push({
          type: 'credential_request',
          description: 'Email requests sensitive information',
          severity: 'high',
        });
      }

      // Analyze links
      const links = this.extractLinks(email.body);
      for (const link of links) {
        const linkAnalysis = await this.analyzeSuspiciousLink(link);
        if (linkAnalysis.riskLevel !== 'low') {
          suspiciousLinks.push(linkAnalysis);
        }
      }

      // Check attachments
      if (email.attachments.length > 0) {
        const suspiciousAttachments = this.checkSuspiciousAttachments(email.attachments);
        if (suspiciousAttachments) {
          indicators.push({
            type: 'suspicious_attachment',
            description: 'Email contains potentially dangerous attachments',
            severity: 'high',
          });
        }
      }

      // Get domain reputation
      const senderDomain = email.from.split('@')[1];
      const domainReputation = await this.getDomainReputation(senderDomain);

      // Calculate phishing confidence
      const confidence = this.calculatePhishingConfidence(indicators, suspiciousLinks, domainReputation);

      return {
        isPhishing: confidence > 0.6,
        confidence,
        indicators,
        suspiciousLinks,
        domainReputation,
      };
    } catch (error) {
      this.logger.error('Failed to analyze phishing:', error);
      return this.getDefaultPhishingAnalysis();
    }
  }

  async scanAttachments(attachments: EmailAttachment[]): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];

    for (const attachment of attachments) {
      try {
        const scanResult = await this.scanSingleAttachment(attachment);
        
        if (!scanResult.isSecure) {
          threats.push({
            type: 'malware',
            severity: 'critical',
            description: `Malicious attachment detected: ${attachment.filename}`,
            evidence: scanResult.threats,
            confidence: 0.9,
            mitigation: 'Remove attachment and quarantine email',
          });
        }
      } catch (error) {
        this.logger.error(`Failed to scan attachment ${attachment.filename}:`, error);
      }
    }

    return threats;
  }

  async analyzeDataLeak(email: EmailMessage): Promise<SecurityThreat[]> {
    try {
      const analysis = await this.performDataLeakAnalysis(email);
      const threats: SecurityThreat[] = [];

      if (analysis.hasPersonalData && analysis.riskLevel === 'high') {
        threats.push({
          type: 'data_leak',
          severity: 'high',
          description: 'Email contains sensitive personal data',
          evidence: analysis.dataTypes,
          confidence: 0.8,
          mitigation: 'Review data handling policies and encrypt sensitive content',
        });
      }

      return threats;
    } catch (error) {
      this.logger.error('Failed to analyze data leak:', error);
      return [];
    }
  }

  async detectImpersonation(email: EmailMessage): Promise<SecurityThreat[]> {
    try {
      const threats: SecurityThreat[] = [];
      
      // Check for display name spoofing
      const displayNameSpoof = this.checkDisplayNameSpoofing(email);
      if (displayNameSpoof) {
        threats.push({
          type: 'impersonation',
          severity: 'high',
          description: 'Potential display name spoofing detected',
          evidence: ['Display name does not match email domain'],
          confidence: 0.7,
          mitigation: 'Verify sender identity before responding',
        });
      }

      // Check for executive impersonation
      const executiveImpersonation = this.checkExecutiveImpersonation(email);
      if (executiveImpersonation) {
        threats.push({
          type: 'impersonation',
          severity: 'critical',
          description: 'Potential executive impersonation detected',
          evidence: ['Email claims to be from company executive'],
          confidence: 0.8,
          mitigation: 'Verify through alternative communication channel',
        });
      }

      return threats;
    } catch (error) {
      this.logger.error('Failed to detect impersonation:', error);
      return [];
    }
  }

  // Private helper methods
  private initializeSecurityData(): void {
    // Initialize virus definitions (mock data)
    this.virusDefinitions.add('EICAR-Test-File');
    this.virusDefinitions.add('malware-signature-1');
    
    // Initialize phishing domains (mock data)
    this.phishingDomains.add('phishing-site.com');
    this.phishingDomains.add('fake-bank.net');
    
    // Initialize trusted domains
    this.trustedDomains.add('gmail.com');
    this.trustedDomains.add('outlook.com');
    this.trustedDomains.add('company.com');
  }

  private async scanForViruses(email: EmailMessage): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    const content = `${email.subject} ${email.body}`;
    
    // Mock virus scanning
    for (const signature of this.virusDefinitions) {
      if (content.includes(signature)) {
        threats.push({
          type: 'virus',
          severity: 'critical',
          description: `Virus detected: ${signature}`,
          evidence: [signature],
          confidence: 0.95,
          mitigation: 'Quarantine email immediately',
        });
      }
    }
    
    return threats;
  }

  private async analyzeSpam(email: EmailMessage): Promise<{ isSpam: boolean; confidence: number; reasons: string[] }> {
    const reasons: string[] = [];
    let spamScore = 0;
    
    // Check for spam indicators
    if (email.subject.includes('FREE') || email.subject.includes('WIN')) {
      reasons.push('Subject contains spam keywords');
      spamScore += 0.3;
    }
    
    if (email.body.includes('Click here now') || email.body.includes('Limited time offer')) {
      reasons.push('Body contains spam phrases');
      spamScore += 0.2;
    }
    
    if (email.from.includes('noreply') && email.body.includes('unsubscribe')) {
      reasons.push('Appears to be unsolicited marketing');
      spamScore += 0.2;
    }
    
    const excessiveCapitals = (email.subject + email.body).match(/[A-Z]/g)?.length || 0;
    const totalChars = (email.subject + email.body).length;
    if (excessiveCapitals / totalChars > 0.3) {
      reasons.push('Excessive use of capital letters');
      spamScore += 0.2;
    }
    
    return {
      isSpam: spamScore > 0.5,
      confidence: Math.min(spamScore, 1),
      reasons,
    };
  }

  private async analyzeSuspiciousLinks(email: EmailMessage): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    const links = this.extractLinks(email.body);
    
    for (const link of links) {
      const analysis = await this.analyzeSuspiciousLink(link);
      
      if (analysis.riskLevel === 'high' || analysis.riskLevel === 'critical') {
        threats.push({
          type: 'suspicious_link',
          severity: analysis.riskLevel === 'critical' ? 'critical' : 'high',
          description: `Suspicious link detected: ${link}`,
          evidence: analysis.reasons,
          confidence: 0.8,
          mitigation: 'Do not click the link and report to security team',
        });
      }
    }
    
    return threats;
  }

  private checkDomainSpoofing(fromAddress: string): boolean {
    const domain = fromAddress.split('@')[1];
    
    // Check for common spoofing patterns
    const spoofingPatterns = [
      'gmai1.com', // gmail spoofing
      'out1ook.com', // outlook spoofing
      'microsooft.com', // microsoft spoofing
    ];
    
    return spoofingPatterns.includes(domain);
  }

  private detectUrgentLanguage(body: string): boolean {
    const urgentPhrases = [
      'urgent action required',
      'immediate response needed',
      'account will be suspended',
      'verify your account now',
      'click here immediately',
    ];
    
    const bodyLower = body.toLowerCase();
    return urgentPhrases.some(phrase => bodyLower.includes(phrase));
  }

  private detectCredentialRequest(body: string): boolean {
    const credentialPhrases = [
      'enter your password',
      'verify your login',
      'update your credentials',
      'confirm your identity',
      'provide your social security',
    ];
    
    const bodyLower = body.toLowerCase();
    return credentialPhrases.some(phrase => bodyLower.includes(phrase));
  }

  private extractLinks(body: string): string[] {
    const linkRegex = /https?:\/\/[^\s<>"]+/gi;
    return body.match(linkRegex) || [];
  }

  private async analyzeSuspiciousLink(url: string): Promise<SuspiciousLink> {
    const reasons: string[] = [];
    let riskLevel: SuspiciousLink['riskLevel'] = 'low';
    
    try {
      const urlObj = new URL(url);
      
      // Check for suspicious domains
      if (this.phishingDomains.has(urlObj.hostname)) {
        reasons.push('Domain is on phishing blacklist');
        riskLevel = 'critical';
      }
      
      // Check for URL shorteners
      const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl'];
      if (shorteners.includes(urlObj.hostname)) {
        reasons.push('Uses URL shortener service');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }
      
      // Check for suspicious TLDs
      const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf'];
      if (suspiciousTlds.some(tld => urlObj.hostname.endsWith(tld))) {
        reasons.push('Uses suspicious top-level domain');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }
      
      // Check for IP addresses instead of domains
      if (/^\d+\.\d+\.\d+\.\d+/.test(urlObj.hostname)) {
        reasons.push('Uses IP address instead of domain name');
        riskLevel = 'high';
      }
      
    } catch (error) {
      reasons.push('Malformed URL');
      riskLevel = 'medium';
    }
    
    return {
      url,
      riskLevel,
      reasons,
      isBlacklisted: this.phishingDomains.has(new URL(url).hostname),
    };
  }

  private checkSuspiciousAttachments(attachments: EmailAttachment[]): boolean {
    const dangerousExtensions = ['.exe', '.scr', '.bat', '.com', '.pif', '.vbs', '.js'];
    
    return attachments.some(attachment => 
      dangerousExtensions.some(ext => attachment.filename.toLowerCase().endsWith(ext))
    );
  }

  private async getDomainReputation(domain: string): Promise<DomainReputation> {
    // Mock domain reputation check
    let reputation: DomainReputation['reputation'] = 'neutral';
    let score = 50;
    
    if (this.trustedDomains.has(domain)) {
      reputation = 'good';
      score = 90;
    } else if (this.phishingDomains.has(domain)) {
      reputation = 'malicious';
      score = 10;
    }
    
    return {
      domain,
      reputation,
      score,
      lastSeen: new Date(),
      categories: reputation === 'malicious' ? ['phishing', 'malware'] : ['email'],
    };
  }

  private calculatePhishingConfidence(
    indicators: PhishingIndicator[],
    suspiciousLinks: SuspiciousLink[],
    domainReputation: DomainReputation
  ): number {
    let confidence = 0;
    
    // Weight indicators
    indicators.forEach(indicator => {
      switch (indicator.severity) {
        case 'high': confidence += 0.3; break;
        case 'medium': confidence += 0.2; break;
        case 'low': confidence += 0.1; break;
      }
    });
    
    // Weight suspicious links
    suspiciousLinks.forEach(link => {
      switch (link.riskLevel) {
        case 'critical': confidence += 0.4; break;
        case 'high': confidence += 0.3; break;
        case 'medium': confidence += 0.2; break;
      }
    });
    
    // Weight domain reputation
    if (domainReputation.reputation === 'malicious') {
      confidence += 0.5;
    } else if (domainReputation.reputation === 'suspicious') {
      confidence += 0.3;
    }
    
    return Math.min(confidence, 1);
  }

  private async scanSingleAttachment(attachment: EmailAttachment): Promise<AttachmentScanResult> {
    // Mock virus scanning
    const isSecure = !this.checkSuspiciousAttachments([attachment]);
    const threats: string[] = [];
    
    if (!isSecure) {
      threats.push('Potentially dangerous file type');
    }
    
    return {
      filename: attachment.filename,
      isSecure,
      threats,
      fileType: attachment.contentType,
      size: attachment.size,
      hash: `sha256_${Date.now()}`, // Mock hash
      scanEngine: 'CubeCore Security Scanner v1.0',
      scanTimestamp: new Date(),
    };
  }

  private async performDataLeakAnalysis(email: EmailMessage): Promise<DataLeakAnalysis> {
    const content = `${email.subject} ${email.body}`;
    const dataTypes: string[] = [];
    let hasPersonalData = false;
    
    // Check for personal data patterns
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(content)) {
      dataTypes.push('Social Security Number');
      hasPersonalData = true;
    }
    
    if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(content)) {
      dataTypes.push('Credit Card Number');
      hasPersonalData = true;
    }
    
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content)) {
      dataTypes.push('Email Address');
    }
    
    if (/\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/.test(content)) {
      dataTypes.push('Phone Number');
    }
    
    const riskLevel = hasPersonalData ? 'high' : dataTypes.length > 0 ? 'medium' : 'low';
    
    return {
      hasPersonalData,
      dataTypes,
      riskLevel,
      recommendations: hasPersonalData ? 
        ['Encrypt sensitive data', 'Review data handling policies'] : 
        ['Monitor for data exposure'],
      complianceIssues: hasPersonalData ? ['GDPR', 'CCPA'] : [],
    };
  }

  private checkDisplayNameSpoofing(email: EmailMessage): boolean {
    // Mock display name spoofing check
    const fromDomain = email.from.split('@')[1];
    return !this.trustedDomains.has(fromDomain) && 
           (email.from.includes('CEO') || email.from.includes('Manager'));
  }

  private checkExecutiveImpersonation(email: EmailMessage): boolean {
    const executiveTitles = ['CEO', 'CFO', 'CTO', 'President', 'Director'];
    const content = `${email.subject} ${email.body}`.toLowerCase();
    
    return executiveTitles.some(title => 
      content.includes(title.toLowerCase()) && 
      (content.includes('urgent') || content.includes('confidential'))
    );
  }

  private calculateRiskLevel(threats: SecurityThreat[]): SecurityScanResult['riskLevel'] {
    if (threats.some(t => t.severity === 'critical')) return 'critical';
    if (threats.some(t => t.severity === 'high')) return 'high';
    if (threats.some(t => t.severity === 'medium')) return 'medium';
    return 'low';
  }

  private generateSecurityRecommendations(threats: SecurityThreat[]): string[] {
    const recommendations = new Set<string>();
    
    threats.forEach(threat => {
      recommendations.add(threat.mitigation);
      
      switch (threat.type) {
        case 'phishing':
          recommendations.add('Enable two-factor authentication');
          recommendations.add('Verify sender through alternative channel');
          break;
        case 'virus':
        case 'malware':
          recommendations.add('Update antivirus definitions');
          recommendations.add('Scan system for infections');
          break;
        case 'spam':
          recommendations.add('Update spam filters');
          recommendations.add('Block sender domain');
          break;
        case 'data_leak':
          recommendations.add('Review data classification policies');
          recommendations.add('Implement data loss prevention');
          break;
      }
    });
    
    return Array.from(recommendations);
  }

  private getDefaultSecurityResult(): SecurityScanResult {
    return {
      isSecure: true,
      riskLevel: 'low',
      threats: [],
      recommendations: [],
      quarantineRequired: false,
      scanTimestamp: new Date(),
    };
  }

  private getDefaultPhishingAnalysis(): PhishingAnalysis {
    return {
      isPhishing: false,
      confidence: 0,
      indicators: [],
      suspiciousLinks: [],
      domainReputation: {
        domain: 'unknown',
        reputation: 'neutral',
        score: 50,
        lastSeen: new Date(),
        categories: [],
      },
    };
  }
}
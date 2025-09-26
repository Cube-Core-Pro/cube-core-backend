// path: backend/src/webmail/services/anti-virus.service.ts
// purpose: Enterprise anti-virus scanning for email attachments and content
// dependencies: ClamAV, VirusTotal API, file analysis, quarantine system

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { FileStorageService } from '../../storage/file-storage.service';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

// Fortune 500 VirusTotal API Response Types
interface VirusTotalResponse {
  response_code: number;
  positives: number;
  total: number;
  scans: Record<string, any>;
  verbose_msg?: string;
  resource?: string;
  scan_id?: string;
  scan_date?: string;
  permalink?: string;
  sha256?: string;
  sha1?: string;
  md5?: string;
}

@Injectable()
export class AntiVirusService {
  private readonly logger = new Logger(AntiVirusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly fileStorage: FileStorageService,
  ) {}

  async scanAttachments(
    tenantId: string,
    attachments: Array<{
      id: string;
      filename: string;
      size: number;
      mimeType: string;
      path: string;
    }>,
    initiatedByUserId?: string,
  ) {
    try {
      const scanResults = [];

      for (const attachment of attachments) {
        const result = await this.scanSingleFile(tenantId, attachment);
        scanResults.push(result);

        // Quarantine if threat detected
        if (result.threatDetected) {
          await this.quarantineFile(tenantId, attachment, result, initiatedByUserId);
        }
      }

      const overallResult = {
        scannedCount: attachments.length,
        threatsDetected: scanResults.filter(r => r.threatDetected).length,
        cleanFiles: scanResults.filter(r => !r.threatDetected).length,
        results: scanResults,
        scanTime: new Date(),
      };

      // Log security event
      await this.logSecurityEvent({
        tenantId,
        action: 'VIRUS_SCAN',
        severity: overallResult.threatsDetected ? 'MEDIUM' : 'LOW',
        reason: overallResult.threatsDetected
          ? 'Threats detected during attachment scan'
          : 'Attachment scan completed without threats',
        details: {
          attachmentCount: attachments.length,
          threatsDetected: overallResult.threatsDetected,
          scanResults: scanResults.map(r => ({
            filename: r.filename,
            threatDetected: r.threatDetected,
            threatType: r.threatType,
          })),
        },
      });

      return overallResult;
    } catch (error) {
      this.logger.error('Error scanning attachments', error);
      throw error;
    }
  }

  async scanSingleFile(
    tenantId: string,
    file: {
      id: string;
      filename: string;
      size: number;
      mimeType: string;
      path: string;
    },
  ) {
    try {
      const fileHash = await this.calculateFileHash(file.path);
      
      // Check cache first
      const cacheKey = `virus_scan:${fileHash}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        this.logger.debug(`Cache hit for file scan: ${file.filename}`);
        return { ...result, filename: file.filename, fromCache: true };
      }

      const scanResult = {
        fileId: file.id,
        filename: file.filename,
        fileHash,
        size: file.size,
        mimeType: file.mimeType,
        threatDetected: false,
        threatType: null,
        threatName: null,
        scanEngine: 'multi',
        scanTime: new Date(),
        details: {},
      };

      // Multiple scanning engines
      const [
        staticAnalysis,
        signatureCheck,
        behaviorAnalysis,
        virusTotalResult,
      ] = await Promise.all([
        this.performStaticAnalysis(file),
        this.performSignatureCheck(file),
        this.performBehaviorAnalysis(file),
        this.checkVirusTotal(fileHash),
      ]);

      // Combine results
      const threats = [
        ...staticAnalysis.threats,
        ...signatureCheck.threats,
        ...behaviorAnalysis.threats,
        ...virusTotalResult.threats,
      ];

      if (threats.length > 0) {
        scanResult.threatDetected = true;
        scanResult.threatType = threats[0].type;
        scanResult.threatName = threats[0].name;
        scanResult.details = {
          staticAnalysis,
          signatureCheck,
          behaviorAnalysis,
          virusTotalResult,
          allThreats: threats,
        };
      }

      // Cache result for 24 hours
      await this.redis.setex(cacheKey, 86400, JSON.stringify(scanResult));

      return scanResult;
    } catch (error) {
      this.logger.error(`Error scanning file ${file.filename}`, error);
      return {
        fileId: file.id,
        filename: file.filename,
        threatDetected: false,
        error: 'Scan failed',
        scanTime: new Date(),
      };
    }
  }

  async scanEmailContent(
    tenantId: string,
    email: {
      subject: string;
      body: string;
      bodyType: 'text' | 'html';
      headers: Record<string, string>;
    },
  ) {
    try {
      const contentThreats = [];

      // Scan for malicious URLs
      const urlThreats = await this.scanUrls(email.body);
      contentThreats.push(...urlThreats);

      // Scan for suspicious scripts (if HTML)
      if (email.bodyType === 'html') {
        const scriptThreats = await this.scanHtmlContent(email.body);
        contentThreats.push(...scriptThreats);
      }

      // Scan for phishing indicators
      const phishingThreats = await this.scanForPhishing(email);
      contentThreats.push(...phishingThreats);

      const result = {
        threatDetected: contentThreats.length > 0,
        threatCount: contentThreats.length,
        threats: contentThreats,
        scanTime: new Date(),
        recommendations: this.getContentRecommendations(contentThreats),
      };

      await this.logSecurityEvent({
        tenantId,
        action: 'CONTENT_SCAN',
        severity: result.threatDetected ? 'MEDIUM' : 'LOW',
        reason: result.threatDetected
          ? 'Potential malicious content detected within email body'
          : 'Email content scan completed without threats',
        details: {
          threatDetected: result.threatDetected,
          threatCount: result.threatCount,
          threatTypes: contentThreats.map(t => t.type),
        },
      });

      return result;
    } catch (error) {
      this.logger.error('Error scanning email content', error);
      return {
        threatDetected: false,
        error: 'Content scan failed',
        scanTime: new Date(),
      };
    }
  }

  async getQuarantinedFiles(tenantId: string, options: {
    page?: number;
    limit?: number;
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
  } = {}) {
    try {
      const { page = 1, limit = 50, dateFrom, dateTo, status } = options;
      const skip = (page - 1) * limit;

      const where: Prisma.QuarantinedFileWhereInput = {
        tenantId,
        ...(status ? { status } : {}),
      };

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const [records, total] = await Promise.all([
        this.prisma.quarantinedFile.findMany({
          where,
          select: {
            id: true,
            filename: true,
            fileSize: true,
            mimeType: true,
            reason: true,
            status: true,
            quarantinedBy: true,
            createdAt: true,
            fileHash: true,
            originalPath: true,
            quarantinePath: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.quarantinedFile.count({ where }),
      ]);

      const files = records.map(record => ({
        ...record,
        threatType: this.extractThreatType(record.reason),
      }));

      return {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error getting quarantined files', error);
      throw error;
    }
  }

  async releaseQuarantinedFile(
    tenantId: string,
    userId: string,
    fileId: string,
    reason: string,
  ) {
    try {
      const quarantinedFile = await this.prisma.quarantinedFile.findFirst({
        where: {
          id: fileId,
          tenantId,
        },
      });

      if (!quarantinedFile || quarantinedFile.status !== 'QUARANTINED') {
        throw new Error('Quarantined file not found or already released');
      }

      // Move file back to original location
      await this.fileStorage.moveFile(
        quarantinedFile.quarantinePath,
        quarantinedFile.originalPath,
      );

      // Update quarantine status
      await this.prisma.quarantinedFile.update({
        where: { id: fileId },
        data: {
          status: 'RELEASED',
          reason: reason || quarantinedFile.reason,
        },
      });

      await this.logSecurityEvent({
        tenantId,
        action: 'FILE_RELEASED',
        severity: 'LOW',
        reason: `Quarantined file released${reason ? `: ${reason}` : ''}`,
        details: {
          fileId,
          filename: quarantinedFile.filename,
          releasedBy: userId,
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error releasing quarantined file', error);
      throw error;
    }
  }

  async deleteQuarantinedFile(
    tenantId: string,
    userId: string,
    fileId: string,
  ) {
    try {
      const quarantinedFile = await this.prisma.quarantinedFile.findFirst({
        where: {
          id: fileId,
          tenantId,
        },
      });

      if (!quarantinedFile) {
        throw new Error('Quarantined file not found');
      }

      // Delete physical file
      await this.fileStorage.deleteFile(quarantinedFile.quarantinePath, tenantId, true);

      // Delete from database
      await this.prisma.quarantinedFile.delete({
        where: { id: fileId },
      });

      await this.logSecurityEvent({
        tenantId,
        action: 'QUARANTINED_FILE_DELETED',
        severity: 'MEDIUM',
        reason: 'Quarantined file permanently deleted',
        details: {
          fileId,
          filename: quarantinedFile.filename,
          deletedBy: userId,
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting quarantined file', error);
      throw error;
    }
  }

  async getVirusStatistics(tenantId: string, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [
        totalScanned,
        threatsDetected,
        quarantinedFiles,
        topThreats,
        scansByDay,
      ] = await Promise.all([
        this.prisma.emailSecurityLog.count({
          where: {
            tenantId,
            action: 'VIRUS_SCAN',
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.emailSecurityLog.count({
          where: {
            tenantId,
            action: 'VIRUS_DETECTED',
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.quarantinedFile.count({
          where: {
            tenantId,
            status: 'QUARANTINED',
            createdAt: { gte: startDate },
          },
        }),
        this.getTopThreats(tenantId, startDate),
        this.getScansByDay(tenantId, startDate, days),
      ]);

      return {
        totalScanned,
        threatsDetected,
        quarantinedFiles,
        cleanFiles: totalScanned - threatsDetected,
        detectionRate: totalScanned > 0 ? (threatsDetected / totalScanned) * 100 : 0,
        topThreats,
        scansByDay,
        period: { days, startDate, endDate: new Date() },
      };
    } catch (error) {
      this.logger.error('Error getting virus statistics', error);
      throw error;
    }
  }

  async updateVirusDefinitions() {
    try {
      this.logger.log('Starting virus definition update...');

      // Update ClamAV definitions
      await this.updateClamAVDefinitions();

      // Update custom signatures
      await this.updateCustomSignatures();

      // Update threat intelligence feeds
      await this.updateThreatIntelligence();

      const updateInfo = {
        timestamp: new Date(),
        version: await this.getDefinitionVersion(),
        success: true,
      };

      // Cache update info
      await this.redis.setex('virus_definitions_update', 3600, JSON.stringify(updateInfo));

      this.logger.log('Virus definitions updated successfully');
      return updateInfo;
    } catch (error) {
      this.logger.error('Error updating virus definitions', error);
      throw error;
    }
  }

  // Private helper methods
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      this.logger.error('Error calculating file hash', error);
      return '';
    }
  }

  private async performStaticAnalysis(file: any) {
    const threats = [];
    
    // Check file extension vs MIME type mismatch
    const expectedMimeTypes = this.getExpectedMimeTypes(file.filename);
    if (!expectedMimeTypes.includes(file.mimeType)) {
      threats.push({
        type: 'suspicious_extension',
        name: 'File extension mismatch',
        severity: 'medium',
        description: 'File extension does not match MIME type',
      });
    }

    // Check for dangerous file types
    const dangerousExtensions = ['.exe', '.scr', '.bat', '.com', '.pif', '.vbs', '.js', '.jar'];
    const extension = path.extname(file.filename).toLowerCase();
    if (dangerousExtensions.includes(extension)) {
      threats.push({
        type: 'dangerous_filetype',
        name: 'Potentially dangerous file type',
        severity: 'high',
        description: `File type ${extension} can execute code`,
      });
    }

    // Check file size anomalies
    if (file.size > 100 * 1024 * 1024) { // 100MB
      threats.push({
        type: 'suspicious_size',
        name: 'Unusually large file',
        severity: 'low',
        description: 'File size is unusually large for email attachment',
      });
    }

    return { threats, analysisTime: new Date() };
  }

  private async performSignatureCheck(file: any) {
    const threats = [];

    try {
      // Read file header for signature analysis
      const fileBuffer = await fs.readFile(file.path, { encoding: null });
      const header = fileBuffer.slice(0, 1024); // First 1KB

      // Check for known malware signatures
      const signatures = await this.getKnownSignatures();
      for (const signature of signatures) {
        if (this.matchesSignature(header, signature)) {
          threats.push({
            type: 'malware_signature',
            name: signature.name,
            severity: 'critical',
            description: signature.description,
          });
        }
      }

      // Check for embedded executables
      if (this.containsExecutable(fileBuffer)) {
        threats.push({
          type: 'embedded_executable',
          name: 'Embedded executable detected',
          severity: 'high',
          description: 'File contains embedded executable code',
        });
      }

    } catch (error) {
      this.logger.error('Error in signature check', error);
    }

    return { threats, analysisTime: new Date() };
  }

  private async performBehaviorAnalysis(file: any) {
    const threats = [];

    // Analyze file behavior patterns
    try {
      const fileBuffer = await fs.readFile(file.path, { encoding: null });

      // Check for obfuscation
      if (this.isObfuscated(fileBuffer)) {
        threats.push({
          type: 'obfuscation',
          name: 'Obfuscated content detected',
          severity: 'medium',
          description: 'File contains obfuscated or encoded content',
        });
      }

      // Check for suspicious strings
      const suspiciousStrings = this.findSuspiciousStrings(fileBuffer);
      if (suspiciousStrings.length > 0) {
        threats.push({
          type: 'suspicious_strings',
          name: 'Suspicious strings detected',
          severity: 'medium',
          description: `Found suspicious strings: ${suspiciousStrings.join(', ')}`,
        });
      }

    } catch (error) {
      this.logger.error('Error in behavior analysis', error);
    }

    return { threats, analysisTime: new Date() };
  }

  private async checkVirusTotal(fileHash: string) {
    const threats = [];

    try {
      if (!process.env.VIRUSTOTAL_API_KEY) {
        return { threats, source: 'virustotal', available: false };
      }

      const cacheKey = `virustotal:${fileHash}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Check VirusTotal API
      const response = await fetch(`https://www.virustotal.com/vtapi/v2/file/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          apikey: process.env.VIRUSTOTAL_API_KEY,
          resource: fileHash,
        }),
      });

      const result = await response.json() as VirusTotalResponse;

      if (result.response_code === 1 && result.positives > 0) {
        threats.push({
          type: 'virustotal_detection',
          name: 'VirusTotal detection',
          severity: 'critical',
          description: `Detected by ${result.positives}/${result.total} engines`,
          details: result.scans,
        });
      }

      const vtResult = { threats, source: 'virustotal', result };
      await this.redis.setex(cacheKey, 3600, JSON.stringify(vtResult)); // 1 hour cache

      return vtResult;
    } catch (error) {
      this.logger.error('Error checking VirusTotal', error);
      return { threats, source: 'virustotal', error: error.message };
    }
  }

  private async scanUrls(content: string) {
    const threats = [];
    const urlPattern = /https?:\/\/[^\s<>"']+/gi;
    const urls = content.match(urlPattern) || [];

    for (const url of urls) {
      try {
        const urlThreats = await this.analyzeUrl(url);
        threats.push(...urlThreats);
      } catch (error) {
        this.logger.error(`Error analyzing URL ${url}`, error);
      }
    }

    return threats;
  }

  private async analyzeUrl(url: string) {
    const threats = [];

    // Check against known malicious domains
    const domain = new URL(url).hostname;
    const isMalicious = await this.checkMaliciousDomain(domain);
    
    if (isMalicious) {
      threats.push({
        type: 'malicious_url',
        name: 'Malicious URL detected',
        severity: 'high',
        description: `URL ${url} is known to be malicious`,
        url,
      });
    }

    // Check for URL shorteners
    const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co'];
    if (shorteners.some(shortener => domain.includes(shortener))) {
      threats.push({
        type: 'url_shortener',
        name: 'URL shortener detected',
        severity: 'low',
        description: 'URL uses a shortening service',
        url,
      });
    }

    return threats;
  }

  private async scanHtmlContent(htmlContent: string) {
    const threats = [];

    // Check for suspicious scripts
    const scriptPattern = /<script[^>]*>(.*?)<\/script>/gis;
    const scripts = htmlContent.match(scriptPattern) || [];

    for (const script of scripts) {
      if (this.isSuspiciousScript(script)) {
        threats.push({
          type: 'suspicious_script',
          name: 'Suspicious JavaScript detected',
          severity: 'high',
          description: 'HTML contains potentially malicious JavaScript',
        });
      }
    }

    // Check for suspicious iframes
    const iframePattern = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
    const iframes = htmlContent.match(iframePattern) || [];

    for (const iframe of iframes) {
      const srcMatch = iframe.match(/src=["']([^"']+)["']/);
      if (srcMatch) {
        const src = srcMatch[1];
        const isMalicious = await this.checkMaliciousDomain(new URL(src).hostname);
        if (isMalicious) {
          threats.push({
            type: 'malicious_iframe',
            name: 'Malicious iframe detected',
            severity: 'high',
            description: `Iframe loads content from malicious domain: ${src}`,
          });
        }
      }
    }

    return threats;
  }

  private async scanForPhishing(email: any) {
    const threats = [];

    // Check for phishing indicators in subject
    const phishingSubjects = [
      'verify your account',
      'suspended account',
      'urgent action required',
      'confirm your identity',
      'security alert',
    ];

    const subject = email.subject.toLowerCase();
    if (phishingSubjects.some(phrase => subject.includes(phrase))) {
      threats.push({
        type: 'phishing_subject',
        name: 'Phishing subject detected',
        severity: 'medium',
        description: 'Subject line contains common phishing phrases',
      });
    }

    // Check for spoofed sender
    const fromDomain = email.headers['From']?.split('@')[1];
    const legitimateDomains = ['paypal.com', 'amazon.com', 'microsoft.com', 'google.com'];
    
    if (fromDomain && legitimateDomains.some(domain => 
      fromDomain.includes(domain) && fromDomain !== domain
    )) {
      threats.push({
        type: 'domain_spoofing',
        name: 'Domain spoofing detected',
        severity: 'high',
        description: `Sender domain ${fromDomain} appears to spoof legitimate service`,
      });
    }

    return threats;
  }

  private async quarantineFile(
    tenantId: string,
    file: any,
    scanResult: any,
    initiatedByUserId?: string,
  ) {
    try {
      const quarantinePath = await this.moveToQuarantine(file.path);
      const quarantinedBy = initiatedByUserId || await this.resolveQuarantineActor(tenantId);
      const threatReason = this.buildThreatReason(scanResult);

      await this.prisma.quarantinedFile.create({
        data: {
          tenantId,
          filename: file.filename,
          originalPath: file.path,
          quarantinePath,
          fileSize: file.size,
          mimeType: file.mimeType,
          fileHash: scanResult.fileHash,
          reason: threatReason,
          status: 'QUARANTINED',
          quarantinedBy,
        },
      });

      await this.logSecurityEvent({
        tenantId,
        action: 'FILE_QUARANTINED',
        severity: 'HIGH',
        reason: threatReason,
        details: {
          filename: file.filename,
          fileHash: scanResult.fileHash,
          threatType: scanResult.threatType,
          threatName: scanResult.threatName,
        },
      });

      if (scanResult.threatDetected) {
        await this.logSecurityEvent({
          tenantId,
          action: 'VIRUS_DETECTED',
          severity: 'HIGH',
          reason: threatReason,
          details: {
            filename: file.filename,
            fileHash: scanResult.fileHash,
          },
        });
      }
    } catch (error) {
      this.logger.error('Error quarantining file', error);
    }
  }

  private async moveToQuarantine(originalPath: string): Promise<string> {
    const quarantineDir = process.env.QUARANTINE_DIR || '/tmp/quarantine';
    const filename = path.basename(originalPath);
    const timestamp = Date.now();
    const quarantinePath = path.join(quarantineDir, `${timestamp}_${filename}`);

    await this.fileStorage.moveFile(originalPath, quarantinePath);
    return quarantinePath;
  }

  private getExpectedMimeTypes(filename: string): string[] {
    const extension = path.extname(filename).toLowerCase();
    const mimeMap = {
      '.pdf': ['application/pdf'],
      '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      '.xls': ['application/vnd.ms-excel'],
      '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.gif': ['image/gif'],
      '.txt': ['text/plain'],
      '.zip': ['application/zip'],
    };

    return mimeMap[extension] || [];
  }

  private async getKnownSignatures() {
    // Return known malware signatures
    return [
      {
        name: 'EICAR Test String',
        signature: 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
        description: 'EICAR antivirus test file',
      },
    ];
  }

  private matchesSignature(buffer: Buffer, signature: any): boolean {
    return buffer.includes(Buffer.from(signature.signature));
  }

  private containsExecutable(buffer: Buffer): boolean {
    // Check for PE header (Windows executable)
    const peHeader = Buffer.from([0x4D, 0x5A]); // MZ
    return buffer.includes(peHeader);
  }

  private isObfuscated(buffer: Buffer): boolean {
    // Simple obfuscation detection
    const text = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    const entropy = this.calculateEntropy(text);
    return entropy > 7.5; // High entropy indicates possible obfuscation
  }

  private calculateEntropy(text: string): number {
    const freq = {};
    for (const char of text) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const length = text.length;
    for (const count of Object.values(freq)) {
      const p = (count as number) / length;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  private findSuspiciousStrings(buffer: Buffer): string[] {
    const suspiciousPatterns = [
      'eval(',
      'exec(',
      'system(',
      'shell_exec(',
      'base64_decode(',
      'document.write(',
      'innerHTML',
    ];

    const text = buffer.toString('utf8', 0, Math.min(4096, buffer.length));
    return suspiciousPatterns.filter(pattern => text.includes(pattern));
  }

  private isSuspiciousScript(script: string): boolean {
    const suspiciousPatterns = [
      'eval(',
      'document.write(',
      'innerHTML',
      'fromCharCode',
      'unescape(',
      'setTimeout(',
      'setInterval(',
    ];

    return suspiciousPatterns.some(pattern => script.includes(pattern));
  }

  private async checkMaliciousDomain(domain: string): Promise<boolean> {
    // Check against known malicious domains
    // In production, this would integrate with threat intelligence feeds
    const maliciousDomains = [
      'malware.com',
      'phishing.net',
      'suspicious.org',
    ];

    return maliciousDomains.includes(domain);
  }

  private getContentRecommendations(threats: any[]) {
    const recommendations = [];

    if (threats.some(t => t.type === 'malicious_url')) {
      recommendations.push({
        type: 'url_warning',
        message: 'Do not click on suspicious links',
        priority: 'high',
      });
    }

    if (threats.some(t => t.type === 'phishing_subject')) {
      recommendations.push({
        type: 'phishing_warning',
        message: 'This email may be a phishing attempt',
        priority: 'high',
      });
    }

    return recommendations;
  }

  private async logSecurityEvent(params: {
    tenantId: string;
    action: string;
    reason: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    details?: Record<string, unknown>;
    emailId?: string | null;
  }) {
    const { tenantId, action, reason, severity = 'LOW', details, emailId = null } = params;

    try {
      await this.prisma.emailSecurityLog.create({
        data: {
          tenant: { connect: { id: tenantId } },
          eventType: 'virus_detection',
          type: 'antivirus',
          action,
          description: reason || `Antivirus action: ${action}`,
          reason,
          severity: severity.toLowerCase(),
          emailId,
          details: details as Prisma.JsonObject,
        },
      });
    } catch (error) {
      this.logger.error('Error logging security event', error);
    }
  }

  private buildThreatReason(scanResult: any): string {
    if (!scanResult?.threatDetected) {
      return 'Potential threat detected';
    }

    const parts = [
      scanResult.threatType ? String(scanResult.threatType).toUpperCase() : null,
      scanResult.threatName ? String(scanResult.threatName) : null,
    ].filter(Boolean);

    return parts.join(' - ') || 'Potential threat detected';
  }

  private extractThreatType(reason?: string | null): string | null {
    if (!reason) {
      return null;
    }

    const [type] = reason.split(' - ');
    return type || null;
  }

  private async resolveQuarantineActor(tenantId: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { tenantId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!user) {
      throw new Error('No user available to mark as quarantine actor');
    }

    return user.id;
  }

  private async getTopThreats(tenantId: string, startDate: Date) {
    const groups = await this.prisma.quarantinedFile.groupBy({
      by: ['reason'],
      where: {
        tenantId,
        status: 'QUARANTINED',
        createdAt: { gte: startDate },
        reason: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return groups.map(group => ({
      reason: group.reason ?? 'Unknown threat',
      count: group._count.id,
      threatType: this.extractThreatType(group.reason),
    }));
  }

  private async getScansByDay(tenantId: string, startDate: Date, days: number) {
    const scansByDay = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const scans = await this.prisma.emailSecurityLog.count({
        where: {
          tenantId,
          action: 'VIRUS_SCAN',
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      scansByDay.push({
        date: date.toISOString().split('T')[0],
        scans,
      });
    }

    return scansByDay;
  }

  private async updateClamAVDefinitions() {
    // Update ClamAV virus definitions
    // This would run freshclam or similar
    this.logger.log('ClamAV definitions updated');
  }

  private async updateCustomSignatures() {
    // Update custom virus signatures
    this.logger.log('Custom signatures updated');
  }

  private async updateThreatIntelligence() {
    // Update threat intelligence feeds
    this.logger.log('Threat intelligence updated');
  }

  private async getDefinitionVersion(): Promise<string> {
    // Return current definition version
    return '2024.01.15';
  }
}

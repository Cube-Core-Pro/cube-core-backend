// path: backend/src/modules/video-conferencing/services/meeting-quality.service.ts
// purpose: Service for monitoring and managing video meeting quality with Fortune500 analytics
// dependencies: @nestjs/common, prisma, webrtc stats, network monitoring

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, VideoMeeting } from '@prisma/client';

export interface QualityMetrics {
  audio: AudioQualityMetrics;
  video: VideoQualityMetrics;
  network: NetworkQualityMetrics;
  overall: OverallQualityScore;
}

export interface AudioQualityMetrics {
  bitrate: number;
  packetLoss: number;
  jitter: number;
  roundTripTime: number;
  audioLevel: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface VideoQualityMetrics {
  bitrate: number;
  framerate: number;
  resolution: string;
  packetLoss: number;
  jitter: number;
  roundTripTime: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface NetworkQualityMetrics {
  bandwidth: number;
  latency: number;
  packetLoss: number;
  jitter: number;
  connectionType: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface OverallQualityScore {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];
  recommendations: string[];
}

export interface QualityReport {
  meetingId: string;
  participantId: string;
  timestamp: Date;
  duration: number;
  metrics: QualityMetrics;
  deviceInfo: DeviceInfo;
  networkInfo: NetworkInfo;
}

export interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
  audioInputDevice: string;
  audioOutputDevice: string;
  videoInputDevice: string;
}

export interface NetworkInfo {
  ip: string;
  isp: string;
  location: string;
  connectionType: string;
  bandwidth: number;
}

export interface QualityTrend {
  timestamp: Date;
  overallScore: number;
  audioScore: number;
  videoScore: number;
  networkScore: number;
  participants: number;
}

@Injectable()
export class MeetingQualityService {
  private readonly logger = new Logger(MeetingQualityService.name);
  private qualityData = new Map<string, QualityReport[]>();
  private qualityTrends = new Map<string, QualityTrend[]>();

  constructor(private prisma: PrismaService) {}

  async recordQualityMetrics(
    meetingId: string,
    participantId: string,
    metrics: QualityMetrics,
    deviceInfo: DeviceInfo,
    networkInfo: NetworkInfo,
  ): Promise<void> {
    try {
      const report: QualityReport = {
        meetingId,
        participantId,
        timestamp: new Date(),
        duration: 0, // Will be calculated from meeting start time
        metrics,
        deviceInfo,
        networkInfo,
      };

      // Store in memory for real-time access
      if (!this.qualityData.has(meetingId)) {
        this.qualityData.set(meetingId, []);
      }
      this.qualityData.get(meetingId)!.push(report);

      // Store in database for persistence
      await this.persistQualityReport(report);

      // Update quality trends
      await this.updateQualityTrends(meetingId, metrics);

      // Check for quality issues and send alerts if necessary
      await this.checkQualityIssues(meetingId, participantId, metrics);

      this.logger.log(`Quality metrics recorded for participant ${participantId} in meeting ${meetingId}`);
    } catch (error) {
      this.logger.error(`Error recording quality metrics: ${error.message}`);
    }
  }

  async getMeetingQualityOverview(meetingId: string): Promise<{
    averageQuality: OverallQualityScore;
    participantCount: number;
    qualityDistribution: Record<string, number>;
    trends: QualityTrend[];
  }> {
    try {
      const reports = this.qualityData.get(meetingId) || [];
      const trends = this.qualityTrends.get(meetingId) || [];

      if (reports.length === 0) {
        return {
          averageQuality: {
            score: 100,
            grade: 'A',
            issues: [],
            recommendations: [],
          },
          participantCount: 0,
          qualityDistribution: {},
          trends: [],
        };
      }

      // Calculate average quality
      const averageScore = reports.reduce((sum, report) => sum + report.metrics.overall.score, 0) / reports.length;
      const averageQuality = this.calculateOverallQuality({
        audio: this.calculateAverageAudioQuality(reports),
        video: this.calculateAverageVideoQuality(reports),
        network: this.calculateAverageNetworkQuality(reports),
        overall: { score: averageScore } as OverallQualityScore,
      });

      // Calculate quality distribution
      const qualityDistribution = reports.reduce((dist, report) => {
        const grade = report.metrics.overall.grade;
        dist[grade] = (dist[grade] || 0) + 1;
        return dist;
      }, {} as Record<string, number>);

      // Get unique participant count
      const uniqueParticipants = new Set(reports.map(r => r.participantId)).size;

      return {
        averageQuality,
        participantCount: uniqueParticipants,
        qualityDistribution,
        trends: trends.slice(-20), // Last 20 trend points
      };
    } catch (error) {
      this.logger.error(`Error getting meeting quality overview: ${error.message}`);
      throw error;
    }
  }

  async getParticipantQualityHistory(
    meetingId: string,
    participantId: string,
  ): Promise<QualityReport[]> {
    try {
      const reports = this.qualityData.get(meetingId) || [];
      return reports.filter(r => r.participantId === participantId);
    } catch (error) {
      this.logger.error(`Error getting participant quality history: ${error.message}`);
      throw error;
    }
  }

  async getQualityRecommendations(
    meetingId: string,
    participantId?: string,
  ): Promise<string[]> {
    try {
      const reports = this.qualityData.get(meetingId) || [];
      const filteredReports = participantId 
        ? reports.filter(r => r.participantId === participantId)
        : reports;

      const recommendations = new Set<string>();

      filteredReports.forEach(report => {
        const metrics = report.metrics;

        // Audio recommendations
        if (metrics.audio.quality === 'poor' || metrics.audio.quality === 'fair') {
          if (metrics.audio.packetLoss > 5) {
            recommendations.add('Check your internet connection - high packet loss detected');
          }
          if (metrics.audio.jitter > 30) {
            recommendations.add('Consider switching to a wired connection to reduce jitter');
          }
          if (metrics.audio.bitrate < 32000) {
            recommendations.add('Increase audio quality settings if bandwidth allows');
          }
        }

        // Video recommendations
        if (metrics.video.quality === 'poor' || metrics.video.quality === 'fair') {
          if (metrics.video.framerate < 15) {
            recommendations.add('Lower video resolution to improve framerate');
          }
          if (metrics.video.bitrate < 500000) {
            recommendations.add('Check bandwidth limitations affecting video quality');
          }
          if (metrics.video.packetLoss > 3) {
            recommendations.add('Consider turning off video temporarily to improve audio quality');
          }
        }

        // Network recommendations
        if (metrics.network.quality === 'poor' || metrics.network.quality === 'fair') {
          if (metrics.network.bandwidth < 1000000) {
            recommendations.add('Upgrade your internet connection for better meeting quality');
          }
          if (metrics.network.latency > 150) {
            recommendations.add('Close other applications using bandwidth');
          }
        }

        // Overall recommendations
        if (metrics.overall.score < 50) {
          recommendations.add('Consider joining by phone for audio-only participation');
          recommendations.add('Close unnecessary applications and browser tabs');
          recommendations.add('Move closer to your WiFi router or use ethernet');
        }
      });

      return Array.from(recommendations);
    } catch (error) {
      this.logger.error(`Error getting quality recommendations: ${error.message}`);
      throw error;
    }
  }

  async generateQualityReport(meetingId: string): Promise<{
    summary: any;
    participants: any[];
    issues: any[];
    recommendations: string[];
  }> {
    try {
      const overview = await this.getMeetingQualityOverview(meetingId);
      const reports = this.qualityData.get(meetingId) || [];
      
      // Group reports by participant
      const participantReports = reports.reduce((acc, report) => {
        if (!acc[report.participantId]) {
          acc[report.participantId] = [];
        }
        acc[report.participantId].push(report);
        return acc;
      }, {} as Record<string, QualityReport[]>);

      const participants = Object.entries(participantReports).map(([participantId, participantReports]) => {
        const averageScore = participantReports.reduce((sum, report) => sum + report.metrics.overall.score, 0) / participantReports.length;
        const issues = participantReports.flatMap(report => report.metrics.overall.issues);
        
        return {
          participantId,
          averageScore,
          grade: this.scoreToGrade(averageScore),
          reportCount: participantReports.length,
          issues: [...new Set(issues)],
          deviceInfo: participantReports[0]?.deviceInfo,
          networkInfo: participantReports[0]?.networkInfo,
        };
      });

      // Identify common issues
      const allIssues = reports.flatMap(report => report.metrics.overall.issues);
      const issueFrequency = allIssues.reduce((acc, issue) => {
        acc[issue] = (acc[issue] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const commonIssues = Object.entries(issueFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([issue, count]) => ({ issue, frequency: count, percentage: (count / reports.length) * 100 }));

      const recommendations = await this.getQualityRecommendations(meetingId);

      return {
        summary: overview,
        participants,
        issues: commonIssues,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Error generating quality report: ${error.message}`);
      throw error;
    }
  }

  private async persistQualityReport(report: QualityReport): Promise<void> {
    try {
      // Store in meeting metadata
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: report.meetingId },
      });

      if (!meeting) return;

      const metadata = this.getMeetingMetadata(meeting);
      const reports = Array.isArray(metadata.qualityReports)
        ? (metadata.qualityReports as unknown[])
        : [];

      reports.push(this.toJsonQualityReport(report));

      metadata.qualityReports = reports.slice(-100);

      await this.prisma.videoMeeting.update({
        where: { id: report.meetingId },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });
    } catch (error) {
      this.logger.error(`Error persisting quality report: ${error.message}`);
    }
  }

  private async updateQualityTrends(meetingId: string, metrics: QualityMetrics): Promise<void> {
    if (!this.qualityTrends.has(meetingId)) {
      this.qualityTrends.set(meetingId, []);
    }

    const trends = this.qualityTrends.get(meetingId)!;
    const now = new Date();

    // Add new trend point every minute
    const lastTrend = trends[trends.length - 1];
    if (!lastTrend || now.getTime() - lastTrend.timestamp.getTime() >= 60000) {
      const reports = this.qualityData.get(meetingId) || [];
      const currentParticipants = new Set(reports.filter(r => 
        now.getTime() - r.timestamp.getTime() < 60000
      ).map(r => r.participantId)).size;

      trends.push({
        timestamp: now,
        overallScore: metrics.overall.score,
        audioScore: this.qualityToScore(metrics.audio.quality),
        videoScore: this.qualityToScore(metrics.video.quality),
        networkScore: this.qualityToScore(metrics.network.quality),
        participants: currentParticipants,
      });

      // Keep only last 60 trend points (1 hour)
      if (trends.length > 60) {
        trends.splice(0, trends.length - 60);
      }
    }
  }

  private async checkQualityIssues(
    meetingId: string,
    participantId: string,
    metrics: QualityMetrics,
  ): Promise<void> {
    // Check for critical quality issues that require immediate attention
    const criticalIssues: string[] = [];

    if (metrics.overall.score < 30) {
      criticalIssues.push('Critical quality degradation detected');
    }

    if (metrics.audio.packetLoss > 10) {
      criticalIssues.push('Severe audio packet loss');
    }

    if (metrics.video.packetLoss > 5) {
      criticalIssues.push('Severe video packet loss');
    }

    if (metrics.network.latency > 300) {
      criticalIssues.push('High network latency');
    }

    if (criticalIssues.length > 0) {
      // In a real implementation, you would send these alerts to the meeting host
      // or quality monitoring dashboard
      this.logger.warn(`Critical quality issues for participant ${participantId}: ${criticalIssues.join(', ')}`);
    }
  }

  private calculateOverallQuality(metrics: Partial<QualityMetrics>): OverallQualityScore {
    const scores = [
      metrics.audio ? this.qualityToScore(metrics.audio.quality) : 100,
      metrics.video ? this.qualityToScore(metrics.video.quality) : 100,
      metrics.network ? this.qualityToScore(metrics.network.quality) : 100,
    ];

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (averageScore < 70) {
      issues.push('Overall quality below optimal');
      recommendations.push('Check your internet connection and close unnecessary applications');
    }

    return {
      score: Math.round(averageScore),
      grade: this.scoreToGrade(averageScore),
      issues,
      recommendations,
    };
  }

  private calculateAverageAudioQuality(reports: QualityReport[]): AudioQualityMetrics {
    const audioReports = reports.map(r => r.metrics.audio);
    return {
      bitrate: this.average(audioReports.map(a => a.bitrate)),
      packetLoss: this.average(audioReports.map(a => a.packetLoss)),
      jitter: this.average(audioReports.map(a => a.jitter)),
      roundTripTime: this.average(audioReports.map(a => a.roundTripTime)),
      audioLevel: this.average(audioReports.map(a => a.audioLevel)),
      quality: this.mostCommonQuality(audioReports.map(a => a.quality)),
    };
  }

  private calculateAverageVideoQuality(reports: QualityReport[]): VideoQualityMetrics {
    const videoReports = reports.map(r => r.metrics.video);
    return {
      bitrate: this.average(videoReports.map(v => v.bitrate)),
      framerate: this.average(videoReports.map(v => v.framerate)),
      resolution: this.mostCommon(videoReports.map(v => v.resolution)),
      packetLoss: this.average(videoReports.map(v => v.packetLoss)),
      jitter: this.average(videoReports.map(v => v.jitter)),
      roundTripTime: this.average(videoReports.map(v => v.roundTripTime)),
      quality: this.mostCommonQuality(videoReports.map(v => v.quality)),
    };
  }

  private calculateAverageNetworkQuality(reports: QualityReport[]): NetworkQualityMetrics {
    const networkReports = reports.map(r => r.metrics.network);
    return {
      bandwidth: this.average(networkReports.map(n => n.bandwidth)),
      latency: this.average(networkReports.map(n => n.latency)),
      packetLoss: this.average(networkReports.map(n => n.packetLoss)),
      jitter: this.average(networkReports.map(n => n.jitter)),
      connectionType: this.mostCommon(networkReports.map(n => n.connectionType)),
      quality: this.mostCommonQuality(networkReports.map(n => n.quality)),
    };
  }

  private qualityToScore(quality: 'excellent' | 'good' | 'fair' | 'poor'): number {
    const scoreMap = { excellent: 100, good: 80, fair: 60, poor: 40 };
    return scoreMap[quality] || 50;
  }

  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }

  private mostCommon<T>(items: T[]): T {
    const counts = items.reduce((acc, item) => {
      acc[String(item)] = (acc[String(item)] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonKey = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, '');
    return items.find(item => String(item) === mostCommonKey) || items[0];
  }

  private mostCommonQuality(qualities: ('excellent' | 'good' | 'fair' | 'poor')[]): 'excellent' | 'good' | 'fair' | 'poor' {
    return this.mostCommon(qualities);
  }

  private toJsonQualityReport(report: QualityReport): Prisma.InputJsonValue {
    return this.normalizeJson(report) as Prisma.InputJsonValue;
  }

  private getMeetingMetadata(meeting: any): Record<string, unknown> {
    if (!meeting || !meeting.metadata) {
      return {};
    }
    if (typeof meeting.metadata === 'object') {
      return { ...(meeting.metadata as Record<string, unknown>) };
    }
    if (typeof meeting.metadata === 'string') {
      try {
        const parsed = JSON.parse(meeting.metadata) as Record<string, unknown>;
        return { ...parsed };
      } catch {
        return {};
      }
    }
    return {};
  }

  private serializeMetadata(metadata: Record<string, unknown>): Prisma.InputJsonValue {
    return this.normalizeJson(metadata);
  }

  private normalizeJson(value: unknown): Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return value.map(item => this.normalizeJson(item));
    }
    if (typeof value === 'object') {
      const normalized: Record<string, Prisma.InputJsonValue> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const normalizedValue = this.normalizeJson(val);
        if (normalizedValue !== undefined) {
          normalized[key] = normalizedValue;
        }
      }
      return normalized;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    return null;
  }
}

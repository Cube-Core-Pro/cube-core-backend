import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Interfaces para análisis de sentimientos y emociones
export interface EmotionAnalysis {
  analysisId: string;
  userId: string;
  timestamp: Date;
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    trust: number;
    anticipation: number;
  };
  overallSentiment: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
  confidence: number;
  context: {
    source: 'TEXT' | 'VOICE' | 'BEHAVIOR' | 'INTERACTION';
    content?: string;
    metadata?: Record<string, any>;
  };
}

export interface UserMoodProfile {
  userId: string;
  currentMood: {
    primary: string;
    secondary: string;
    intensity: number;
    stability: 'STABLE' | 'FLUCTUATING' | 'VOLATILE';
  };
  moodHistory: {
    date: Date;
    mood: string;
    intensity: number;
    triggers?: string[];
  }[];
  patterns: {
    dailyPattern: { hour: number; averageMood: number }[];
    weeklyPattern: { day: string; averageMood: number }[];
    monthlyTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  };
  insights: {
    insight: string;
    confidence: number;
    actionable: boolean;
  }[];
  generatedAt: Date;
}

export interface TeamEmotionalHealth {
  teamId: string;
  overallHealth: {
    score: number;
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  };
  memberAnalysis: {
    userId: string;
    name: string;
    emotionalState: 'THRIVING' | 'STABLE' | 'STRUGGLING' | 'AT_RISK';
    riskFactors: string[];
    supportNeeded: string[];
  }[];
  teamDynamics: {
    collaboration: number;
    communication: number;
    trust: number;
    motivation: number;
    satisfaction: number;
  };
  recommendations: {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    expectedImpact: string;
    timeline: string;
  }[];
  generatedAt: Date;
}

export interface SentimentTrend {
  period: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  data: {
    timestamp: Date;
    sentiment: number;
    volume: number;
    topics: string[];
  }[];
  insights: {
    trendDirection: 'UPWARD' | 'DOWNWARD' | 'STABLE';
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    anomalies: {
      timestamp: Date;
      type: 'SPIKE' | 'DROP' | 'UNUSUAL_PATTERN';
      description: string;
    }[];
    predictions: {
      nextPeriod: number;
      confidence: number;
      factors: string[];
    };
  };
}

export interface EmotionalInsight {
  insightId: string;
  type: 'PERSONAL' | 'TEAM' | 'ORGANIZATIONAL';
  category: 'WELLBEING' | 'PRODUCTIVITY' | 'ENGAGEMENT' | 'RISK' | 'OPPORTUNITY';
  title: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  confidence: number;
  affectedUsers: string[];
  recommendations: string[];
  metrics: {
    impactScore: number;
    urgency: number;
    effort: number;
  };
  generatedAt: Date;
}

@Injectable()
export class EmotionAnalyticsService {
  private readonly logger = new Logger(EmotionAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Analiza las emociones de un texto o interacción
   */
  async analyzeEmotion(
    userId: string,
    content: string,
    source: 'TEXT' | 'VOICE' | 'BEHAVIOR' | 'INTERACTION',
    metadata?: Record<string, any>
  ): Promise<EmotionAnalysis> {
    try {
      this.logger.log(`Analyzing emotion for user ${userId}`);

      // En una implementación real, aquí se usaría un modelo de IA para análisis de sentimientos
      const emotions = this.simulateEmotionAnalysis(content);
      const overallSentiment = this.calculateOverallSentiment(emotions);

      const analysis: EmotionAnalysis = {
        analysisId: `emotion_${Date.now()}`,
        userId,
        timestamp: new Date(),
        emotions,
        overallSentiment,
        confidence: Math.random() * 0.3 + 0.7, // 70-100%
        context: {
          source,
          content: source === 'TEXT' ? content : undefined,
          metadata
        }
      };

      return analysis;
    } catch (error) {
      this.logger.error(`Error analyzing emotion:`, error);
      throw error;
    }
  }

  /**
   * Genera un perfil de estado de ánimo para un usuario
   */
  async generateUserMoodProfile(userId: string): Promise<UserMoodProfile> {
    try {
      this.logger.log(`Generating mood profile for user ${userId}`);

      // En una implementación real, aquí se consultarían los datos históricos
      const profile: UserMoodProfile = {
        userId,
        currentMood: {
          primary: this.getRandomMood(),
          secondary: this.getRandomMood(),
          intensity: Math.random() * 0.6 + 0.4, // 40-100%
          stability: this.getRandomStability()
        },
        moodHistory: this.generateMoodHistory(),
        patterns: {
          dailyPattern: this.generateDailyPattern(),
          weeklyPattern: this.generateWeeklyPattern(),
          monthlyTrend: this.getRandomTrend()
        },
        insights: [
          {
            insight: 'User shows higher productivity during morning hours',
            confidence: 0.85,
            actionable: true
          },
          {
            insight: 'Stress levels tend to increase on Mondays and Fridays',
            confidence: 0.78,
            actionable: true
          },
          {
            insight: 'Positive correlation between team interactions and mood',
            confidence: 0.92,
            actionable: true
          }
        ],
        generatedAt: new Date()
      };

      return profile;
    } catch (error) {
      this.logger.error(`Error generating mood profile:`, error);
      throw error;
    }
  }

  /**
   * Analiza la salud emocional de un equipo
   */
  async analyzeTeamEmotionalHealth(teamId: string): Promise<TeamEmotionalHealth> {
    try {
      this.logger.log(`Analyzing emotional health for team ${teamId}`);

      const overallScore = Math.random() * 40 + 60; // 60-100
      const health: TeamEmotionalHealth = {
        teamId,
        overallHealth: {
          score: overallScore,
          status: this.getHealthStatus(overallScore),
          trend: this.getRandomTrend()
        },
        memberAnalysis: this.generateMemberAnalysis(),
        teamDynamics: {
          collaboration: Math.random() * 30 + 70, // 70-100
          communication: Math.random() * 25 + 75, // 75-100
          trust: Math.random() * 35 + 65, // 65-100
          motivation: Math.random() * 40 + 60, // 60-100
          satisfaction: Math.random() * 30 + 70 // 70-100
        },
        recommendations: [
          {
            priority: 'HIGH',
            action: 'Implement regular team check-ins to improve communication',
            expectedImpact: 'Increase team satisfaction by 15-20%',
            timeline: '2-4 weeks'
          },
          {
            priority: 'MEDIUM',
            action: 'Organize team building activities to strengthen trust',
            expectedImpact: 'Improve collaboration scores by 10-15%',
            timeline: '1-2 months'
          },
          {
            priority: 'LOW',
            action: 'Introduce peer recognition program',
            expectedImpact: 'Boost motivation and engagement',
            timeline: '1-3 months'
          }
        ],
        generatedAt: new Date()
      };

      return health;
    } catch (error) {
      this.logger.error(`Error analyzing team emotional health:`, error);
      throw error;
    }
  }

  /**
   * Genera tendencias de sentimiento a lo largo del tiempo
   */
  async generateSentimentTrends(
    userId: string,
    period: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
    duration: number = 30
  ): Promise<SentimentTrend> {
    try {
      this.logger.log(`Generating sentiment trends for user ${userId}`);

      const data = this.generateTrendData(period, duration);
      const insights = this.analyzeTrendInsights(data);

      const trend: SentimentTrend = {
        period,
        data,
        insights
      };

      return trend;
    } catch (error) {
      this.logger.error(`Error generating sentiment trends:`, error);
      throw error;
    }
  }

  /**
   * Genera insights emocionales personalizados
   */
  async generateEmotionalInsights(
    scope: 'PERSONAL' | 'TEAM' | 'ORGANIZATIONAL',
    targetId: string
  ): Promise<EmotionalInsight[]> {
    try {
      this.logger.log(`Generating emotional insights for ${scope}: ${targetId}`);

      const insights: EmotionalInsight[] = [
        {
          insightId: `insight_${Date.now()}_1`,
          type: scope,
          category: 'WELLBEING',
          title: 'Stress Pattern Detected',
          description: 'Analysis shows elevated stress levels during specific time periods. Consider implementing stress management techniques.',
          severity: 'WARNING',
          confidence: 0.87,
          affectedUsers: [targetId],
          recommendations: [
            'Schedule regular breaks during high-stress periods',
            'Implement mindfulness exercises',
            'Consider workload redistribution'
          ],
          metrics: {
            impactScore: 0.75,
            urgency: 0.65,
            effort: 0.4
          },
          generatedAt: new Date()
        },
        {
          insightId: `insight_${Date.now()}_2`,
          type: scope,
          category: 'PRODUCTIVITY',
          title: 'Optimal Performance Window Identified',
          description: 'User shows peak performance and positive emotions during specific hours. Optimize scheduling accordingly.',
          severity: 'INFO',
          confidence: 0.92,
          affectedUsers: [targetId],
          recommendations: [
            'Schedule important tasks during peak hours',
            'Minimize meetings during low-energy periods',
            'Align deadlines with natural productivity cycles'
          ],
          metrics: {
            impactScore: 0.85,
            urgency: 0.3,
            effort: 0.2
          },
          generatedAt: new Date()
        },
        {
          insightId: `insight_${Date.now()}_3`,
          type: scope,
          category: 'ENGAGEMENT',
          title: 'Social Interaction Impact',
          description: 'Strong correlation between team interactions and positive emotional states. Encourage collaborative work.',
          severity: 'INFO',
          confidence: 0.79,
          affectedUsers: [targetId],
          recommendations: [
            'Increase collaborative project assignments',
            'Facilitate informal team interactions',
            'Create shared workspace opportunities'
          ],
          metrics: {
            impactScore: 0.7,
            urgency: 0.4,
            effort: 0.5
          },
          generatedAt: new Date()
        }
      ];

      return insights;
    } catch (error) {
      this.logger.error(`Error generating emotional insights:`, error);
      throw error;
    }
  }

  /**
   * Monitorea el bienestar emocional en tiempo real
   */
  async monitorRealTimeWellbeing(userId: string): Promise<{
    currentState: {
      emotion: string;
      intensity: number;
      stability: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    alerts: {
      type: 'POSITIVE' | 'NEUTRAL' | 'CONCERN' | 'URGENT';
      message: string;
      timestamp: Date;
      actionRequired: boolean;
    }[];
    recommendations: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
    supportResources: {
      type: 'SELF_HELP' | 'PEER_SUPPORT' | 'PROFESSIONAL' | 'EMERGENCY';
      resource: string;
      availability: string;
    }[];
  }> {
    try {
      this.logger.log(`Monitoring real-time wellbeing for user ${userId}`);

      const currentEmotion = this.getRandomMood();
      const intensity = Math.random();
      const riskLevel = this.assessRiskLevel(currentEmotion, intensity);

      const monitoring = {
        currentState: {
          emotion: currentEmotion,
          intensity,
          stability: this.getRandomStability(),
          riskLevel
        },
        alerts: this.generateWellbeingAlerts(riskLevel),
        recommendations: {
          immediate: this.getImmediateRecommendations(currentEmotion, riskLevel),
          shortTerm: [
            'Schedule regular check-ins with team lead',
            'Participate in wellness activities',
            'Maintain work-life balance'
          ],
          longTerm: [
            'Develop emotional intelligence skills',
            'Build resilience through training',
            'Create sustainable work practices'
          ]
        },
        supportResources: [
          {
            type: 'SELF_HELP' as const,
            resource: 'Mindfulness and meditation app',
            availability: '24/7'
          },
          {
            type: 'PEER_SUPPORT' as const,
            resource: 'Employee resource groups',
            availability: 'Business hours'
          },
          {
            type: 'PROFESSIONAL' as const,
            resource: 'Employee assistance program',
            availability: 'By appointment'
          },
          {
            type: 'EMERGENCY' as const,
            resource: 'Crisis support hotline',
            availability: '24/7'
          }
        ]
      };

      return monitoring;
    } catch (error) {
      this.logger.error(`Error monitoring real-time wellbeing:`, error);
      throw error;
    }
  }

  // Métodos auxiliares privados
  private simulateEmotionAnalysis(content: string): EmotionAnalysis['emotions'] {
    // Simular análisis de emociones basado en el contenido
    const baseEmotions = {
      joy: Math.random() * 0.8,
      sadness: Math.random() * 0.3,
      anger: Math.random() * 0.2,
      fear: Math.random() * 0.25,
      surprise: Math.random() * 0.4,
      disgust: Math.random() * 0.15,
      trust: Math.random() * 0.7,
      anticipation: Math.random() * 0.6
    };

    // Ajustar basado en palabras clave (simulación simple)
    if (content.toLowerCase().includes('happy') || content.toLowerCase().includes('great')) {
      baseEmotions.joy += 0.2;
    }
    if (content.toLowerCase().includes('sad') || content.toLowerCase().includes('disappointed')) {
      baseEmotions.sadness += 0.3;
    }
    if (content.toLowerCase().includes('angry') || content.toLowerCase().includes('frustrated')) {
      baseEmotions.anger += 0.4;
    }

    // Normalizar valores
    Object.keys(baseEmotions).forEach(key => {
      baseEmotions[key] = Math.min(baseEmotions[key], 1);
    });

    return baseEmotions;
  }

  private calculateOverallSentiment(emotions: EmotionAnalysis['emotions']): EmotionAnalysis['overallSentiment'] {
    const positiveScore = emotions.joy + emotions.trust + emotions.anticipation;
    const negativeScore = emotions.sadness + emotions.anger + emotions.fear + emotions.disgust;
    
    const netSentiment = positiveScore - negativeScore;
    
    if (netSentiment > 1.5) return 'VERY_POSITIVE';
    if (netSentiment > 0.5) return 'POSITIVE';
    if (netSentiment > -0.5) return 'NEUTRAL';
    if (netSentiment > -1.5) return 'NEGATIVE';
    return 'VERY_NEGATIVE';
  }

  private getRandomMood(): string {
    const moods = [
      'Happy', 'Content', 'Excited', 'Calm', 'Focused',
      'Stressed', 'Tired', 'Anxious', 'Frustrated', 'Motivated',
      'Confident', 'Overwhelmed', 'Relaxed', 'Energetic', 'Peaceful'
    ];
    return moods[Math.floor(Math.random() * moods.length)];
  }

  private getRandomStability(): 'STABLE' | 'FLUCTUATING' | 'VOLATILE' {
    const stabilities = ['STABLE', 'FLUCTUATING', 'VOLATILE'] as const;
    return stabilities[Math.floor(Math.random() * stabilities.length)];
  }

  private getRandomTrend(): 'IMPROVING' | 'DECLINING' | 'STABLE' {
    const trends = ['IMPROVING', 'DECLINING', 'STABLE'] as const;
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private generateMoodHistory(): UserMoodProfile['moodHistory'] {
    const history = [];
    for (let i = 0; i < 30; i++) {
      history.push({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        mood: this.getRandomMood(),
        intensity: Math.random(),
        triggers: i % 5 === 0 ? ['Work deadline', 'Team meeting'] : undefined
      });
    }
    return history;
  }

  private generateDailyPattern(): { hour: number; averageMood: number }[] {
    const pattern = [];
    for (let hour = 0; hour < 24; hour++) {
      // Simular patrón típico: bajo en la madrugada, alto en la mañana, declive en la tarde
      let mood = 0.5;
      if (hour >= 6 && hour <= 10) mood = 0.8; // Mañana alta
      if (hour >= 11 && hour <= 14) mood = 0.7; // Mediodía moderado
      if (hour >= 15 && hour <= 18) mood = 0.6; // Tarde declive
      if (hour >= 19 && hour <= 22) mood = 0.65; // Noche recuperación
      if (hour >= 23 || hour <= 5) mood = 0.4; // Madrugada baja
      
      pattern.push({
        hour,
        averageMood: mood + (Math.random() - 0.5) * 0.2 // Añadir variación
      });
    }
    return pattern;
  }

  private generateWeeklyPattern(): { day: string; averageMood: number }[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map(day => ({
      day,
      averageMood: Math.random() * 0.4 + 0.5 // 50-90%
    }));
  }

  private getHealthStatus(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 60) return 'FAIR';
    if (score >= 40) return 'POOR';
    return 'CRITICAL';
  }

  private generateMemberAnalysis(): TeamEmotionalHealth['memberAnalysis'] {
    const members = [];
    const memberCount = Math.floor(Math.random() * 8 + 3); // 3-10 members
    
    for (let i = 0; i < memberCount; i++) {
      members.push({
        userId: `user_${i + 1}`,
        name: `Team Member ${i + 1}`,
        emotionalState: this.getRandomEmotionalState(),
        riskFactors: this.getRandomRiskFactors(),
        supportNeeded: this.getRandomSupportNeeds()
      });
    }
    
    return members;
  }

  private getRandomEmotionalState(): 'THRIVING' | 'STABLE' | 'STRUGGLING' | 'AT_RISK' {
    const states = ['THRIVING', 'STABLE', 'STRUGGLING', 'AT_RISK'] as const;
    return states[Math.floor(Math.random() * states.length)];
  }

  private getRandomRiskFactors(): string[] {
    const factors = [
      'High workload', 'Lack of recognition', 'Poor work-life balance',
      'Communication issues', 'Unclear expectations', 'Limited growth opportunities'
    ];
    return factors.slice(0, Math.floor(Math.random() * 3 + 1));
  }

  private getRandomSupportNeeds(): string[] {
    const needs = [
      'Regular feedback', 'Skill development', 'Workload management',
      'Team integration', 'Career guidance', 'Stress management'
    ];
    return needs.slice(0, Math.floor(Math.random() * 2 + 1));
  }

  private generateTrendData(period: string, duration: number): SentimentTrend['data'] {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < duration; i++) {
      let timestamp: Date;
      switch (period) {
        case 'HOURLY':
          timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
          break;
        case 'DAILY':
          timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          break;
        case 'WEEKLY':
          timestamp = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'MONTHLY':
          timestamp = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
          break;
      }
      
      data.push({
        timestamp,
        sentiment: Math.random() * 2 - 1, // -1 to 1
        volume: Math.floor(Math.random() * 100 + 10),
        topics: ['work', 'team', 'project'].slice(0, Math.floor(Math.random() * 3 + 1))
      });
    }
    
    return data.reverse();
  }

  private analyzeTrendInsights(data: SentimentTrend['data']): SentimentTrend['insights'] {
    const sentiments = data.map(d => d.sentiment);
    const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
    const variance = sentiments.reduce((acc, val) => acc + Math.pow(val - avgSentiment, 2), 0) / sentiments.length;
    
    return {
      trendDirection: this.getTrendDirection(sentiments),
      volatility: variance > 0.5 ? 'HIGH' : variance > 0.2 ? 'MEDIUM' : 'LOW',
      anomalies: this.detectAnomalies(data),
      predictions: {
        nextPeriod: avgSentiment + (Math.random() - 0.5) * 0.2,
        confidence: Math.random() * 0.3 + 0.7,
        factors: ['Historical patterns', 'Current trends', 'External factors']
      }
    };
  }

  private getTrendDirection(sentiments: number[]): 'UPWARD' | 'DOWNWARD' | 'STABLE' {
    const firstHalf = sentiments.slice(0, Math.floor(sentiments.length / 2));
    const secondHalf = sentiments.slice(Math.floor(sentiments.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 0.1) return 'UPWARD';
    if (diff < -0.1) return 'DOWNWARD';
    return 'STABLE';
  }

  private detectAnomalies(data: SentimentTrend['data']): SentimentTrend['insights']['anomalies'] {
    const anomalies = [];
    const sentiments = data.map(d => d.sentiment);
    const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
    const stdDev = Math.sqrt(sentiments.reduce((acc, val) => acc + Math.pow(val - avgSentiment, 2), 0) / sentiments.length);
    
    data.forEach((point, index) => {
      if (Math.abs(point.sentiment - avgSentiment) > 2 * stdDev) {
        anomalies.push({
          timestamp: point.timestamp,
          type: point.sentiment > avgSentiment ? 'SPIKE' : 'DROP',
          description: `Unusual ${point.sentiment > avgSentiment ? 'positive' : 'negative'} sentiment detected`
        });
      }
    });
    
    return anomalies;
  }

  private assessRiskLevel(emotion: string, intensity: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    const negativeEmotions = ['Stressed', 'Anxious', 'Frustrated', 'Overwhelmed', 'Tired'];
    
    if (negativeEmotions.includes(emotion) && intensity > 0.7) return 'HIGH';
    if (negativeEmotions.includes(emotion) && intensity > 0.4) return 'MEDIUM';
    return 'LOW';
  }

  private generateWellbeingAlerts(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'): any[] {
    const alerts = [];
    
    if (riskLevel === 'HIGH') {
      alerts.push({
        type: 'URGENT',
        message: 'High stress levels detected. Immediate attention recommended.',
        timestamp: new Date(),
        actionRequired: true
      });
    } else if (riskLevel === 'MEDIUM') {
      alerts.push({
        type: 'CONCERN',
        message: 'Elevated stress indicators. Consider taking a break.',
        timestamp: new Date(),
        actionRequired: false
      });
    } else {
      alerts.push({
        type: 'POSITIVE',
        message: 'Emotional wellbeing appears stable.',
        timestamp: new Date(),
        actionRequired: false
      });
    }
    
    return alerts;
  }

  private getImmediateRecommendations(emotion: string, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'): string[] {
    if (riskLevel === 'HIGH') {
      return [
        'Take a 10-minute break from current tasks',
        'Practice deep breathing exercises',
        'Reach out to a colleague or supervisor for support',
        'Consider rescheduling non-urgent meetings'
      ];
    } else if (riskLevel === 'MEDIUM') {
      return [
        'Take a short walk or stretch',
        'Listen to calming music',
        'Review and prioritize current tasks',
        'Stay hydrated and take regular breaks'
      ];
    } else {
      return [
        'Maintain current positive momentum',
        'Share positive energy with team members',
        'Consider taking on a challenging task',
        'Document what\'s working well for future reference'
      ];
    }
  }
}
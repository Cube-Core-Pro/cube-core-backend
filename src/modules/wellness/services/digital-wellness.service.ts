import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Interfaces para análisis de bienestar digital
export interface DigitalWellnessMetrics {
  overallWellnessScore: number;
  screenTime: ScreenTimeMetrics;
  workLifeBalance: WorkLifeBalanceMetrics;
  stressIndicators: StressIndicatorMetrics;
  healthMetrics: HealthMetrics;
  socialConnectivity: SocialConnectivityMetrics;
  recommendations: WellnessRecommendation[];
}

export interface ScreenTimeMetrics {
  dailyAverage: number; // Horas
  weeklyTotal: number; // Horas
  breakdown: ScreenTimeBreakdown;
  trends: ScreenTimeTrend[];
  healthyLimits: ScreenTimeLimits;
  eyeStrainRisk: number; // 0-100
}

export interface ScreenTimeBreakdown {
  productive: number; // Porcentaje
  communication: number;
  entertainment: number;
  social: number;
  educational: number;
  other: number;
}

export interface ScreenTimeTrend {
  date: Date;
  hours: number;
  quality: 'productive' | 'neutral' | 'excessive';
}

export interface ScreenTimeLimits {
  recommended: number; // Horas por día
  current: number;
  exceeded: boolean;
  excessHours: number;
}

export interface WorkLifeBalanceMetrics {
  balanceScore: number; // 0-100
  workHours: WorkHoursMetrics;
  personalTime: PersonalTimeMetrics;
  boundaries: BoundaryMetrics;
  burnoutRisk: BurnoutRiskAssessment;
}

export interface WorkHoursMetrics {
  averageDaily: number;
  weeklyTotal: number;
  overtime: number;
  afterHoursActivity: number; // Actividad fuera del horario laboral
  weekendWork: number;
  vacationDays: number;
}

export interface PersonalTimeMetrics {
  familyTime: number; // Horas por semana
  hobbies: number;
  exercise: number;
  relaxation: number;
  socialActivities: number;
  sleepQuality: number; // 0-100
}

export interface BoundaryMetrics {
  workPersonalSeparation: number; // 0-100
  afterHoursEmails: number;
  weekendInterruptions: number;
  vacationDisconnection: number; // 0-100
  deviceFreeTime: number; // Horas por día
}

export interface BurnoutRiskAssessment {
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  score: number; // 0-100
  indicators: BurnoutIndicator[];
  earlyWarnings: string[];
  protectiveFactors: string[];
}

export interface BurnoutIndicator {
  category: 'emotional' | 'physical' | 'behavioral' | 'cognitive';
  indicator: string;
  severity: number; // 0-100
  trend: 'improving' | 'stable' | 'worsening';
}

export interface StressIndicatorMetrics {
  overallStressLevel: number; // 0-100
  stressTriggers: StressTrigger[];
  copingMechanisms: CopingMechanism[];
  physiologicalIndicators: PhysiologicalIndicators;
  behavioralPatterns: BehavioralPattern[];
}

export interface StressTrigger {
  trigger: string;
  frequency: number; // Veces por semana
  intensity: number; // 0-100
  context: string;
  mitigation: string[];
}

export interface CopingMechanism {
  mechanism: string;
  effectiveness: number; // 0-100
  frequency: number;
  healthiness: 'positive' | 'neutral' | 'negative';
}

export interface PhysiologicalIndicators {
  heartRateVariability?: number;
  sleepQuality: number; // 0-100
  energyLevels: number; // 0-100
  appetiteChanges: number; // -100 a 100
  physicalSymptoms: string[];
}

export interface BehavioralPattern {
  pattern: string;
  frequency: number;
  impact: 'positive' | 'neutral' | 'negative';
  correlation: string; // Con qué se correlaciona
}

export interface HealthMetrics {
  physicalHealth: PhysicalHealthMetrics;
  mentalHealth: MentalHealthMetrics;
  cognitiveHealth: CognitiveHealthMetrics;
  ergonomics: ErgonomicMetrics;
}

export interface PhysicalHealthMetrics {
  posture: PostureMetrics;
  eyeHealth: EyeHealthMetrics;
  movementActivity: MovementMetrics;
  hydration: HydrationMetrics;
  nutrition: NutritionMetrics;
}

export interface PostureMetrics {
  score: number; // 0-100
  timeInGoodPosture: number; // Porcentaje del día
  commonIssues: string[];
  improvements: string[];
  riskFactors: string[];
}

export interface EyeHealthMetrics {
  blinkRate: number; // Por minuto
  eyeStrainSymptoms: string[];
  screenDistance: number; // cm
  blueLight: number; // Horas de exposición
  breaks20_20_20: number; // Cumplimiento de la regla 20-20-20
}

export interface MovementMetrics {
  dailySteps: number;
  sedentaryTime: number; // Horas
  activeBreaks: number; // Por día
  exerciseMinutes: number; // Por semana
  movementReminders: number; // Cumplidas vs programadas
}

export interface HydrationMetrics {
  dailyIntake: number; // Litros
  recommended: number;
  adherence: number; // 0-100
  reminders: number;
}

export interface NutritionMetrics {
  mealRegularity: number; // 0-100
  healthyChoices: number; // 0-100
  energyLevels: number; // 0-100
  workSnacking: number; // Frecuencia
}

export interface MentalHealthMetrics {
  moodTracking: MoodMetrics;
  anxietyLevels: number; // 0-100
  depressionIndicators: number; // 0-100
  emotionalRegulation: number; // 0-100
  resilience: ResilienceMetrics;
}

export interface MoodMetrics {
  averageMood: number; // 0-100
  moodStability: number; // 0-100
  positiveEmotions: number; // Frecuencia
  negativeEmotions: number; // Frecuencia
  moodTriggers: string[];
}

export interface ResilienceMetrics {
  adaptability: number; // 0-100
  optimism: number; // 0-100
  socialSupport: number; // 0-100
  problemSolving: number; // 0-100
  selfEfficacy: number; // 0-100
}

export interface CognitiveHealthMetrics {
  focus: FocusMetrics;
  memory: MemoryMetrics;
  creativity: CreativityMetrics;
  decisionMaking: DecisionMakingMetrics;
}

export interface FocusMetrics {
  attentionSpan: number; // Minutos promedio
  distractionFrequency: number; // Por hora
  deepWorkCapacity: number; // Horas por día
  multitaskingImpact: number; // Impacto negativo en %
}

export interface MemoryMetrics {
  workingMemory: number; // 0-100
  informationRetention: number; // 0-100
  recallAccuracy: number; // 0-100
  cognitiveLoad: number; // 0-100
}

export interface CreativityMetrics {
  ideaGeneration: number; // Ideas por sesión
  originalityScore: number; // 0-100
  problemSolvingApproach: string;
  innovationIndex: number; // 0-100
}

export interface DecisionMakingMetrics {
  decisionSpeed: number; // Tiempo promedio
  decisionQuality: number; // 0-100
  confidenceLevel: number; // 0-100
  biasAwareness: number; // 0-100
}

export interface ErgonomicMetrics {
  workstationSetup: WorkstationMetrics;
  equipmentQuality: EquipmentMetrics;
  environmentalFactors: EnvironmentalMetrics;
  comfortLevel: number; // 0-100
}

export interface WorkstationMetrics {
  deskHeight: string; // 'optimal', 'too_high', 'too_low'
  chairSupport: number; // 0-100
  monitorPosition: string; // 'optimal', 'too_high', 'too_low', 'too_close', 'too_far'
  keyboardMouse: number; // Ergonomía 0-100
}

export interface EquipmentMetrics {
  chairQuality: number; // 0-100
  deskQuality: number; // 0-100
  monitorQuality: number; // 0-100
  lightingQuality: number; // 0-100
  accessoriesOptimization: number; // 0-100
}

export interface EnvironmentalMetrics {
  temperature: TemperatureMetrics;
  lighting: LightingMetrics;
  noise: NoiseMetrics;
  airQuality: AirQualityMetrics;
}

export interface TemperatureMetrics {
  current: number; // Celsius
  optimal: number;
  comfort: number; // 0-100
  productivity: number; // Impacto en productividad
}

export interface LightingMetrics {
  naturalLight: number; // Porcentaje del día
  artificialLight: number; // Lux
  blueLight: number; // Exposición
  circadianImpact: number; // 0-100
}

export interface NoiseMetrics {
  averageLevel: number; // dB
  distractionLevel: number; // 0-100
  sources: string[];
  mitigation: string[];
}

export interface AirQualityMetrics {
  co2Levels: number; // ppm
  humidity: number; // Porcentaje
  ventilation: number; // 0-100
  allergens: string[];
}

export interface SocialConnectivityMetrics {
  workRelationships: WorkRelationshipMetrics;
  personalConnections: PersonalConnectionMetrics;
  digitalSocialHealth: DigitalSocialMetrics;
  isolation: IsolationMetrics;
}

export interface WorkRelationshipMetrics {
  colleagueInteractions: number; // Por día
  teamCohesion: number; // 0-100
  managerRelationship: number; // 0-100
  mentorshipEngagement: number; // 0-100
  conflictResolution: number; // 0-100
}

export interface PersonalConnectionMetrics {
  familyTime: number; // Horas por semana
  friendInteractions: number; // Por semana
  communityInvolvement: number; // 0-100
  socialSupport: number; // 0-100
}

export interface DigitalSocialMetrics {
  socialMediaTime: number; // Horas por día
  onlineInteractions: number; // Por día
  digitalDetox: number; // Horas sin dispositivos
  onlineWellbeing: number; // 0-100
}

export interface IsolationMetrics {
  loneliness: number; // 0-100
  socialWithdrawal: number; // 0-100
  connectionQuality: number; // 0-100
  supportNetwork: number; // Tamaño y calidad
}

export interface WellnessRecommendation {
  category: 'screen_time' | 'work_life_balance' | 'stress_management' | 'physical_health' | 'mental_health' | 'social_connection';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  expectedBenefit: string;
  implementationSteps: string[];
  timeframe: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  evidence: string; // Base científica
  personalizedTips: string[];
}

export interface WellnessGoal {
  id: string;
  category: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  milestones: WellnessMilestone[];
}

export interface WellnessMilestone {
  id: string;
  title: string;
  target: number;
  achieved: boolean;
  achievedDate?: Date;
  reward?: string;
}

export interface WellnessAlert {
  type: 'reminder' | 'warning' | 'achievement' | 'insight';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  suggestedActions: string[];
  timestamp: Date;
}

@Injectable()
export class DigitalWellnessService {
  private readonly logger = new Logger(DigitalWellnessService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Analiza las métricas de bienestar digital de un usuario
   */
  async analyzeDigitalWellness(userId: string, timeframe: string = '7d'): Promise<DigitalWellnessMetrics> {
    try {
      this.logger.log(`Analyzing digital wellness for user ${userId} over ${timeframe}`);

      // En una implementación real, aquí se recopilarían datos de múltiples fuentes
      const mockMetrics = this.generateMockWellnessMetrics();
      
      // Personalizar métricas basándose en el perfil del usuario
      const personalizedMetrics = await this.personalizeWellnessMetrics(mockMetrics, userId);
      
      // Generar recomendaciones personalizadas
      const recommendations = await this.generateWellnessRecommendations(personalizedMetrics, userId);
      
      return {
        ...personalizedMetrics,
        recommendations
      };

    } catch (error) {
      this.logger.error(`Error analyzing digital wellness for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Monitorea indicadores de estrés en tiempo real
   */
  async monitorStressIndicators(userId: string): Promise<any> {
    try {
      // Mock real-time stress monitoring
      const stressData = {
        currentStressLevel: 35 + Math.random() * 30, // 35-65
        trend: Math.random() > 0.5 ? 'increasing' : 'decreasing',
        triggers: [
          { trigger: 'High email volume', intensity: 60, timeDetected: new Date() },
          { trigger: 'Back-to-back meetings', intensity: 75, timeDetected: new Date(Date.now() - 30 * 60 * 1000) }
        ],
        physiologicalSigns: {
          heartRateElevated: Math.random() > 0.7,
          keyboardIntensity: 'high', // Intensidad de tecleo
          mouseMovements: 'erratic', // Patrones de movimiento del mouse
          breakFrequency: 'low'
        },
        recommendations: [
          'Take a 5-minute breathing break',
          'Step away from the screen for 2 minutes',
          'Practice progressive muscle relaxation'
        ],
        nextBreakSuggestion: new Date(Date.now() + 15 * 60 * 1000)
      };

      return stressData;

    } catch (error) {
      this.logger.error(`Error monitoring stress indicators:`, error);
      throw error;
    }
  }

  /**
   * Evalúa la calidad del sueño basándose en patrones de uso
   */
  async assessSleepQuality(userId: string): Promise<any> {
    try {
      // Mock sleep quality assessment
      const sleepAssessment = {
        estimatedSleepHours: 6.5 + Math.random() * 2, // 6.5-8.5 horas
        sleepQualityScore: 70 + Math.random() * 25, // 70-95
        bedtimeConsistency: 75 + Math.random() * 20, // 75-95
        screenTimeBeforeBed: 1.5 + Math.random() * 2, // 1.5-3.5 horas
        blueLight: {
          eveningExposure: 2 + Math.random() * 3, // 2-5 horas
          impact: 'moderate',
          recommendation: 'Use blue light filter after 8 PM'
        },
        sleepDisruptors: [
          { factor: 'Late screen time', impact: 'high' },
          { factor: 'Irregular bedtime', impact: 'medium' },
          { factor: 'Work stress', impact: 'medium' }
        ],
        improvements: [
          'Establish consistent bedtime routine',
          'Reduce screen time 1 hour before bed',
          'Create relaxing evening environment'
        ],
        circadianRhythm: {
          alignment: 'moderate',
          naturalWakeTime: '07:30',
          optimalBedtime: '23:00',
          currentPattern: 'slightly delayed'
        }
      };

      return sleepAssessment;

    } catch (error) {
      this.logger.error(`Error assessing sleep quality:`, error);
      throw error;
    }
  }

  /**
   * Analiza patrones de trabajo y sugiere mejoras en el equilibrio vida-trabajo
   */
  async analyzeWorkLifeBalance(userId: string): Promise<any> {
    try {
      const balanceAnalysis = {
        overallScore: 65 + Math.random() * 25, // 65-90
        workPatterns: {
          averageWorkDay: 8.5 + Math.random() * 2, // 8.5-10.5 horas
          overtimeFrequency: 'moderate', // low, moderate, high
          weekendWork: 2 + Math.random() * 4, // 2-6 horas
          afterHoursEmails: 15 + Math.random() * 20, // 15-35 por semana
          vacationUtilization: 70 + Math.random() * 25 // 70-95%
        },
        personalTime: {
          familyTime: 10 + Math.random() * 15, // 10-25 horas por semana
          hobbies: 3 + Math.random() * 7, // 3-10 horas por semana
          exercise: 2 + Math.random() * 6, // 2-8 horas por semana
          socialActivities: 4 + Math.random() * 8 // 4-12 horas por semana
        },
        boundaries: {
          workPersonalSeparation: 60 + Math.random() * 30, // 60-90
          deviceFreeTime: 1 + Math.random() * 3, // 1-4 horas por día
          weekendDisconnection: 70 + Math.random() * 25 // 70-95%
        },
        burnoutRisk: {
          level: 'moderate',
          score: 40 + Math.random() * 30, // 40-70
          earlyWarnings: [
            'Increased irritability',
            'Difficulty concentrating',
            'Reduced job satisfaction'
          ],
          protectiveFactors: [
            'Strong social support',
            'Regular exercise routine',
            'Good sleep hygiene'
          ]
        },
        recommendations: [
          {
            category: 'Boundaries',
            action: 'Set specific work hours and stick to them',
            impact: 'high',
            difficulty: 'moderate'
          },
          {
            category: 'Recovery',
            action: 'Schedule regular digital detox periods',
            impact: 'medium',
            difficulty: 'easy'
          },
          {
            category: 'Personal Time',
            action: 'Block calendar time for personal activities',
            impact: 'high',
            difficulty: 'easy'
          }
        ]
      };

      return balanceAnalysis;

    } catch (error) {
      this.logger.error(`Error analyzing work-life balance:`, error);
      throw error;
    }
  }

  /**
   * Proporciona coaching de bienestar personalizado
   */
  async provideWellnessCoaching(userId: string, focus?: string): Promise<any> {
    try {
      const coachingSession = {
        sessionId: `coaching-${Date.now()}`,
        focus: focus || 'overall_wellness',
        personalizedInsights: [
          {
            insight: 'Your stress levels tend to spike during afternoon meetings. Consider scheduling buffer time between meetings.',
            category: 'stress_management',
            confidence: 0.85,
            actionable: true
          },
          {
            insight: 'You show better focus and creativity in the morning. Try scheduling important creative work before 11 AM.',
            category: 'productivity_optimization',
            confidence: 0.78,
            actionable: true
          },
          {
            insight: 'Your screen time has increased 15% this week. Consider implementing the 20-20-20 rule more consistently.',
            category: 'eye_health',
            confidence: 0.92,
            actionable: true
          }
        ],
        coachingTips: [
          {
            tip: 'Practice the 4-7-8 breathing technique when you feel stressed',
            category: 'stress_relief',
            howTo: 'Inhale for 4 counts, hold for 7, exhale for 8. Repeat 3-4 times.',
            frequency: 'As needed'
          },
          {
            tip: 'Use the Pomodoro Technique for better focus',
            category: 'focus_improvement',
            howTo: '25 minutes focused work, 5 minute break. After 4 cycles, take a 15-30 minute break.',
            frequency: 'Daily'
          },
          {
            tip: 'Practice gratitude journaling',
            category: 'mental_health',
            howTo: 'Write down 3 things you\'re grateful for each day, preferably in the evening.',
            frequency: 'Daily'
          }
        ],
        challenges: [
          {
            title: '7-Day Digital Sunset Challenge',
            description: 'No screens 1 hour before bedtime for 7 consecutive days',
            duration: '7 days',
            difficulty: 'moderate',
            expectedBenefits: ['Better sleep quality', 'Reduced eye strain', 'Improved evening relaxation']
          },
          {
            title: 'Mindful Monday',
            description: 'Start each Monday with 10 minutes of mindfulness meditation',
            duration: '4 weeks',
            difficulty: 'easy',
            expectedBenefits: ['Reduced stress', 'Better focus', 'Improved emotional regulation']
          }
        ],
        progressTracking: {
          currentStreak: 5, // días consecutivos siguiendo recomendaciones
          completedChallenges: 2,
          improvementAreas: ['sleep_quality', 'stress_management', 'work_life_balance'],
          strengths: ['physical_activity', 'social_connections', 'nutrition']
        }
      };

      return coachingSession;

    } catch (error) {
      this.logger.error(`Error providing wellness coaching:`, error);
      throw error;
    }
  }

  /**
   * Configura alertas de bienestar personalizadas
   */
  async configureWellnessAlerts(userId: string, alertConfig: any): Promise<void> {
    try {
      this.logger.log(`Configuring wellness alerts for user ${userId}`);
      
      // En una implementación real, aquí se configurarían las alertas
      // En una implementación real, aquí se guardaría la configuración
      // await this.prisma.user.update({
      //   where: { id: userId },
      //   data: {
      //     // metadata: {
      //     //   wellnessAlerts: alertConfig
      //     // }
      //   }
      // });
      
      this.logger.log(`Wellness alerts configured for user ${userId}`);

    } catch (error) {
      this.logger.error(`Error configuring wellness alerts:`, error);
      throw error;
    }
  }

  /**
   * Personaliza las métricas de bienestar basándose en el perfil del usuario
   */
  private async personalizeWellnessMetrics(baseMetrics: DigitalWellnessMetrics, userId: string): Promise<DigitalWellnessMetrics> {
    // Mock personalization - en producción se usarían datos del usuario y ML
    const personalizedMetrics = { ...baseMetrics };
    
    // Ajustar puntuaciones basándose en patrones simulados del usuario
    personalizedMetrics.overallWellnessScore = Math.min(100, baseMetrics.overallWellnessScore + Math.random() * 10 - 5);
    personalizedMetrics.workLifeBalance.balanceScore = Math.min(100, baseMetrics.workLifeBalance.balanceScore + Math.random() * 15 - 7.5);
    
    return personalizedMetrics;
  }

  /**
   * Genera recomendaciones de bienestar personalizadas
   */
  private async generateWellnessRecommendations(metrics: DigitalWellnessMetrics, userId: string): Promise<WellnessRecommendation[]> {
    const recommendations: WellnessRecommendation[] = [];

    // Recomendación basada en tiempo de pantalla
    if (metrics.screenTime.dailyAverage > 8) {
      recommendations.push({
        category: 'screen_time',
        priority: 'high',
        title: 'Reduce Daily Screen Time',
        description: 'Your daily screen time exceeds healthy recommendations. Consider implementing regular breaks and screen-free periods.',
        expectedBenefit: 'Reduced eye strain, better sleep quality, improved focus',
        implementationSteps: [
          'Set screen time limits on devices',
          'Use the 20-20-20 rule (every 20 minutes, look at something 20 feet away for 20 seconds)',
          'Implement screen-free meals',
          'Create a digital sunset routine 1 hour before bed'
        ],
        timeframe: '2-3 weeks to establish new habits',
        difficulty: 'moderate',
        evidence: 'Studies show that excessive screen time is linked to eye strain, sleep disruption, and decreased attention span.',
        personalizedTips: [
          'Based on your usage patterns, focus on reducing entertainment screen time first',
          'Your peak usage is in the evening - consider replacing with relaxing activities'
        ]
      });
    }

    // Recomendación basada en equilibrio vida-trabajo
    if (metrics.workLifeBalance.balanceScore < 70) {
      recommendations.push({
        category: 'work_life_balance',
        priority: 'high',
        title: 'Improve Work-Life Boundaries',
        description: 'Your work-life balance needs attention. Setting clearer boundaries can significantly improve your overall wellbeing.',
        expectedBenefit: 'Reduced stress, better relationships, increased job satisfaction, prevention of burnout',
        implementationSteps: [
          'Define specific work hours and communicate them to colleagues',
          'Create a dedicated workspace if working from home',
          'Establish end-of-workday rituals',
          'Schedule personal time as non-negotiable appointments'
        ],
        timeframe: '1-2 weeks to see initial improvements',
        difficulty: 'moderate',
        evidence: 'Research indicates that poor work-life balance is a major contributor to stress, burnout, and health issues.',
        personalizedTips: [
          'Your after-hours email activity is high - consider setting specific times for checking emails',
          'Block calendar time for personal activities to protect your personal time'
        ]
      });
    }

    // Recomendación basada en indicadores de estrés
    if (metrics.stressIndicators.overallStressLevel > 60) {
      recommendations.push({
        category: 'stress_management',
        priority: 'urgent',
        title: 'Implement Stress Management Techniques',
        description: 'Your stress levels are elevated. Immediate stress management interventions are recommended.',
        expectedBenefit: 'Reduced anxiety, better decision-making, improved physical health, enhanced resilience',
        implementationSteps: [
          'Practice daily mindfulness or meditation (start with 5 minutes)',
          'Implement regular breathing exercises during stressful moments',
          'Schedule regular physical activity',
          'Consider speaking with a mental health professional'
        ],
        timeframe: 'Immediate implementation, benefits within 1-2 weeks',
        difficulty: 'easy',
        evidence: 'Mindfulness and stress management techniques have been proven effective in reducing cortisol levels and improving overall wellbeing.',
        personalizedTips: [
          'Your stress peaks during afternoon meetings - try breathing exercises before meetings',
          'Consider using stress-tracking apps to identify patterns'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Genera métricas mock para demostración
   */
  private generateMockWellnessMetrics(): DigitalWellnessMetrics {
    return {
      overallWellnessScore: 70 + Math.random() * 25,
      screenTime: {
        dailyAverage: 6 + Math.random() * 4, // 6-10 horas
        weeklyTotal: 45 + Math.random() * 25, // 45-70 horas
        breakdown: {
          productive: 40 + Math.random() * 20,
          communication: 20 + Math.random() * 15,
          entertainment: 15 + Math.random() * 20,
          social: 10 + Math.random() * 15,
          educational: 10 + Math.random() * 10,
          other: 5 + Math.random() * 10
        },
        trends: [],
        healthyLimits: {
          recommended: 8,
          current: 8.5 + Math.random() * 2,
          exceeded: Math.random() > 0.4,
          excessHours: Math.random() * 3
        },
        eyeStrainRisk: 30 + Math.random() * 40
      },
      workLifeBalance: {
        balanceScore: 60 + Math.random() * 30,
        workHours: {
          averageDaily: 8 + Math.random() * 2,
          weeklyTotal: 42 + Math.random() * 15,
          overtime: 5 + Math.random() * 10,
          afterHoursActivity: 2 + Math.random() * 4,
          weekendWork: 3 + Math.random() * 5,
          vacationDays: 15 + Math.random() * 10
        },
        personalTime: {
          familyTime: 15 + Math.random() * 15,
          hobbies: 5 + Math.random() * 10,
          exercise: 3 + Math.random() * 5,
          relaxation: 7 + Math.random() * 8,
          socialActivities: 6 + Math.random() * 10,
          sleepQuality: 70 + Math.random() * 25
        },
        boundaries: {
          workPersonalSeparation: 60 + Math.random() * 30,
          afterHoursEmails: 20 + Math.random() * 30,
          weekendInterruptions: 5 + Math.random() * 15,
          vacationDisconnection: 70 + Math.random() * 25,
          deviceFreeTime: 2 + Math.random() * 4
        },
        burnoutRisk: {
          riskLevel: 'moderate',
          score: 40 + Math.random() * 30,
          indicators: [],
          earlyWarnings: [],
          protectiveFactors: []
        }
      },
      stressIndicators: {
        overallStressLevel: 40 + Math.random() * 35,
        stressTriggers: [],
        copingMechanisms: [],
        physiologicalIndicators: {
          sleepQuality: 70 + Math.random() * 25,
          energyLevels: 65 + Math.random() * 30,
          appetiteChanges: -10 + Math.random() * 20,
          physicalSymptoms: []
        },
        behavioralPatterns: []
      },
      healthMetrics: {
        physicalHealth: {
          posture: {
            score: 70 + Math.random() * 25,
            timeInGoodPosture: 60 + Math.random() * 30,
            commonIssues: [],
            improvements: [],
            riskFactors: []
          },
          eyeHealth: {
            blinkRate: 15 + Math.random() * 10,
            eyeStrainSymptoms: [],
            screenDistance: 50 + Math.random() * 20,
            blueLight: 6 + Math.random() * 4,
            breaks20_20_20: 40 + Math.random() * 40
          },
          movementActivity: {
            dailySteps: 5000 + Math.random() * 5000,
            sedentaryTime: 6 + Math.random() * 4,
            activeBreaks: 3 + Math.random() * 5,
            exerciseMinutes: 150 + Math.random() * 150,
            movementReminders: 70 + Math.random() * 25
          },
          hydration: {
            dailyIntake: 1.5 + Math.random() * 1.5,
            recommended: 2.5,
            adherence: 60 + Math.random() * 35,
            reminders: 8 + Math.random() * 4
          },
          nutrition: {
            mealRegularity: 70 + Math.random() * 25,
            healthyChoices: 65 + Math.random() * 30,
            energyLevels: 70 + Math.random() * 25,
            workSnacking: 3 + Math.random() * 5
          }
        },
        mentalHealth: {
          moodTracking: {
            averageMood: 70 + Math.random() * 25,
            moodStability: 75 + Math.random() * 20,
            positiveEmotions: 60 + Math.random() * 30,
            negativeEmotions: 30 + Math.random() * 25,
            moodTriggers: []
          },
          anxietyLevels: 30 + Math.random() * 40,
          depressionIndicators: 20 + Math.random() * 30,
          emotionalRegulation: 70 + Math.random() * 25,
          resilience: {
            adaptability: 75 + Math.random() * 20,
            optimism: 70 + Math.random() * 25,
            socialSupport: 80 + Math.random() * 15,
            problemSolving: 75 + Math.random() * 20,
            selfEfficacy: 80 + Math.random() * 15
          }
        },
        cognitiveHealth: {
          focus: {
            attentionSpan: 25 + Math.random() * 20,
            distractionFrequency: 8 + Math.random() * 12,
            deepWorkCapacity: 3 + Math.random() * 3,
            multitaskingImpact: 20 + Math.random() * 30
          },
          memory: {
            workingMemory: 75 + Math.random() * 20,
            informationRetention: 70 + Math.random() * 25,
            recallAccuracy: 80 + Math.random() * 15,
            cognitiveLoad: 60 + Math.random() * 30
          },
          creativity: {
            ideaGeneration: 5 + Math.random() * 10,
            originalityScore: 70 + Math.random() * 25,
            problemSolvingApproach: 'analytical',
            innovationIndex: 75 + Math.random() * 20
          },
          decisionMaking: {
            decisionSpeed: 15 + Math.random() * 20,
            decisionQuality: 75 + Math.random() * 20,
            confidenceLevel: 80 + Math.random() * 15,
            biasAwareness: 65 + Math.random() * 30
          }
        },
        ergonomics: {
          workstationSetup: {
            deskHeight: 'optimal',
            chairSupport: 80 + Math.random() * 15,
            monitorPosition: 'optimal',
            keyboardMouse: 85 + Math.random() * 10
          },
          equipmentQuality: {
            chairQuality: 75 + Math.random() * 20,
            deskQuality: 80 + Math.random() * 15,
            monitorQuality: 85 + Math.random() * 10,
            lightingQuality: 70 + Math.random() * 25,
            accessoriesOptimization: 75 + Math.random() * 20
          },
          environmentalFactors: {
            temperature: {
              current: 22 + Math.random() * 4,
              optimal: 23,
              comfort: 80 + Math.random() * 15,
              productivity: 85 + Math.random() * 10
            },
            lighting: {
              naturalLight: 60 + Math.random() * 30,
              artificialLight: 500 + Math.random() * 300,
              blueLight: 6 + Math.random() * 4,
              circadianImpact: 75 + Math.random() * 20
            },
            noise: {
              averageLevel: 40 + Math.random() * 20,
              distractionLevel: 30 + Math.random() * 40,
              sources: [],
              mitigation: []
            },
            airQuality: {
              co2Levels: 400 + Math.random() * 400,
              humidity: 40 + Math.random() * 20,
              ventilation: 70 + Math.random() * 25,
              allergens: []
            }
          },
          comfortLevel: 80 + Math.random() * 15
        }
      },
      socialConnectivity: {
        workRelationships: {
          colleagueInteractions: 15 + Math.random() * 15,
          teamCohesion: 75 + Math.random() * 20,
          managerRelationship: 80 + Math.random() * 15,
          mentorshipEngagement: 60 + Math.random() * 30,
          conflictResolution: 75 + Math.random() * 20
        },
        personalConnections: {
          familyTime: 20 + Math.random() * 20,
          friendInteractions: 5 + Math.random() * 10,
          communityInvolvement: 40 + Math.random() * 40,
          socialSupport: 80 + Math.random() * 15
        },
        digitalSocialHealth: {
          socialMediaTime: 2 + Math.random() * 3,
          onlineInteractions: 20 + Math.random() * 30,
          digitalDetox: 2 + Math.random() * 4,
          onlineWellbeing: 70 + Math.random() * 25
        },
        isolation: {
          loneliness: 20 + Math.random() * 30,
          socialWithdrawal: 15 + Math.random() * 25,
          connectionQuality: 80 + Math.random() * 15,
          supportNetwork: 75 + Math.random() * 20
        }
      },
      recommendations: [] // Se llenarán en generateWellnessRecommendations
    };
  }
}
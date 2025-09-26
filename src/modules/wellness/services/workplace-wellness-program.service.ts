import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Interfaces para programas de bienestar en el lugar de trabajo
export interface WorkplaceWellnessProgram {
  id: string;
  name: string;
  description: string;
  category: WellnessProgramCategory;
  type: 'fitness' | 'nutrition' | 'ergonomics' | 'mental_health' | 'preventive' | 'educational';
  duration: number; // días
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  participants: ProgramParticipant[];
  activities: WellnessActivity[];
  goals: ProgramGoal[];
  metrics: ProgramMetrics;
  budget: ProgramBudget;
  resources: ProgramResource[];
  facilitators: Facilitator[];
  location: ProgramLocation;
  requirements: ProgramRequirement[];
}

export interface WellnessProgramCategory {
  primary: string;
  secondary: string[];
  tags: string[];
}

export interface ProgramParticipant {
  employeeId: string;
  joinDate: Date;
  status: 'registered' | 'active' | 'completed' | 'dropped_out';
  progress: ParticipantProgress;
  attendance: AttendanceRecord[];
  feedback: ParticipantFeedback[];
  achievements: Achievement[];
}

export interface ParticipantProgress {
  completionPercentage: number;
  activitiesCompleted: number;
  totalActivities: number;
  currentLevel: string;
  pointsEarned: number;
  badges: Badge[];
  personalGoals: PersonalGoal[];
}

export interface AttendanceRecord {
  activityId: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  duration: number; // minutos
  notes?: string;
}

export interface ParticipantFeedback {
  date: Date;
  activityId?: string;
  rating: number; // 1-5
  comments: string;
  suggestions?: string;
  anonymous: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string;
  earnedDate: Date;
  points: number;
  badge?: Badge;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  criteria: string;
}

export interface PersonalGoal {
  id: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline: Date;
  status: 'active' | 'achieved' | 'missed';
}

export interface WellnessActivity {
  id: string;
  name: string;
  description: string;
  type: ActivityType;
  category: string;
  duration: number; // minutos
  schedule: ActivitySchedule;
  location: ActivityLocation;
  maxParticipants: number;
  currentParticipants: number;
  instructor: ActivityInstructor;
  equipment: Equipment[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  objectives: string[];
  materials: string[];
  safetyGuidelines: string[];
  modifications: ActivityModification[];
}

export interface ActivityType {
  primary: 'fitness' | 'nutrition' | 'education' | 'workshop' | 'screening' | 'counseling';
  subcategory: string;
  format: 'group' | 'individual' | 'online' | 'hybrid';
}

export interface ActivitySchedule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'one_time';
  days: string[];
  startTime: string;
  endTime: string;
  timezone: string;
  recurring: boolean;
  exceptions: Date[];
}

export interface ActivityLocation {
  type: 'on_site' | 'off_site' | 'virtual' | 'hybrid';
  name: string;
  address?: string;
  room?: string;
  capacity: number;
  facilities: string[];
  accessibility: AccessibilityFeature[];
}

export interface AccessibilityFeature {
  feature: string;
  available: boolean;
  description: string;
}

export interface ActivityInstructor {
  id: string;
  name: string;
  credentials: string[];
  specializations: string[];
  experience: number; // años
  rating: number; // 1-5
  bio: string;
  contact: InstructorContact;
}

export interface InstructorContact {
  email: string;
  phone?: string;
  availability: string;
}

export interface Equipment {
  name: string;
  quantity: number;
  required: boolean;
  providedByCompany: boolean;
  alternatives?: string[];
  safetyNotes?: string[];
}

export interface ActivityModification {
  condition: string;
  modification: string;
  equipment?: string[];
  supervision: boolean;
}

export interface ProgramGoal {
  id: string;
  description: string;
  type: 'participation' | 'outcome' | 'behavior_change' | 'satisfaction' | 'roi';
  metric: GoalMetric;
  target: number;
  current: number;
  deadline: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'on_track' | 'at_risk' | 'achieved' | 'missed';
}

export interface GoalMetric {
  name: string;
  unit: string;
  measurement_method: string;
  frequency: string;
}

export interface ProgramMetrics {
  participation: ParticipationMetrics;
  engagement: EngagementMetrics;
  health_outcomes: HealthOutcomeMetrics;
  satisfaction: SatisfactionMetrics;
  financial: FinancialMetrics;
}

export interface ParticipationMetrics {
  enrollment_rate: number; // %
  completion_rate: number; // %
  dropout_rate: number; // %
  attendance_rate: number; // %
  active_participants: number;
  demographics: ParticipantDemographics;
}

export interface ParticipantDemographics {
  age_groups: AgeGroup[];
  departments: DepartmentParticipation[];
  roles: RoleParticipation[];
  risk_levels: RiskLevelParticipation[];
}

export interface AgeGroup {
  range: string;
  count: number;
  percentage: number;
}

export interface DepartmentParticipation {
  department: string;
  enrolled: number;
  active: number;
  completion_rate: number;
}

export interface RoleParticipation {
  role: string;
  count: number;
  engagement_score: number;
}

export interface RiskLevelParticipation {
  risk_level: 'low' | 'medium' | 'high';
  count: number;
  improvement_rate: number;
}

export interface EngagementMetrics {
  average_session_duration: number; // minutos
  activities_per_participant: number;
  repeat_participation_rate: number; // %
  referral_rate: number; // %
  app_usage: AppUsageMetrics;
  social_interaction: SocialInteractionMetrics;
}

export interface AppUsageMetrics {
  daily_active_users: number;
  monthly_active_users: number;
  session_frequency: number;
  feature_usage: FeatureUsage[];
}

export interface FeatureUsage {
  feature: string;
  usage_rate: number;
  user_satisfaction: number;
}

export interface SocialInteractionMetrics {
  team_challenges_participation: number;
  peer_support_interactions: number;
  social_sharing_rate: number;
  community_engagement_score: number;
}

export interface HealthOutcomeMetrics {
  biometric_improvements: BiometricImprovement[];
  health_risk_reductions: RiskReduction[];
  lifestyle_changes: LifestyleChange[];
  clinical_outcomes: ClinicalOutcome[];
}

export interface BiometricImprovement {
  metric: string;
  baseline_average: number;
  current_average: number;
  improvement_percentage: number;
  participants_improved: number;
  statistical_significance: boolean;
}

export interface RiskReduction {
  risk_factor: string;
  baseline_prevalence: number;
  current_prevalence: number;
  reduction_percentage: number;
  participants_affected: number;
}

export interface LifestyleChange {
  behavior: string;
  baseline_percentage: number;
  current_percentage: number;
  change_percentage: number;
  sustainability_rate: number;
}

export interface ClinicalOutcome {
  outcome: string;
  improvement_rate: number;
  participants_improved: number;
  clinical_significance: boolean;
}

export interface SatisfactionMetrics {
  overall_satisfaction: number; // 1-5
  program_rating: number; // 1-5
  instructor_rating: number; // 1-5
  facility_rating: number; // 1-5
  recommendation_likelihood: number; // 0-10 NPS
  feedback_themes: FeedbackTheme[];
}

export interface FeedbackTheme {
  theme: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  frequency: number;
  examples: string[];
}

export interface FinancialMetrics {
  total_cost: number;
  cost_per_participant: number;
  roi_percentage: number;
  cost_savings: CostSaving[];
  budget_utilization: number; // %
}

export interface CostSaving {
  category: string;
  amount: number;
  source: string;
  calculation_method: string;
}

export interface ProgramBudget {
  total_allocated: number;
  spent_to_date: number;
  remaining: number;
  categories: BudgetCategory[];
  cost_centers: CostCenter[];
}

export interface BudgetCategory {
  category: string;
  allocated: number;
  spent: number;
  percentage_used: number;
}

export interface CostCenter {
  name: string;
  code: string;
  allocated_percentage: number;
  actual_percentage: number;
}

export interface ProgramResource {
  type: 'material' | 'digital' | 'human' | 'facility' | 'equipment';
  name: string;
  description: string;
  availability: ResourceAvailability;
  cost: ResourceCost;
  utilization: ResourceUtilization;
}

export interface ResourceAvailability {
  status: 'available' | 'limited' | 'unavailable' | 'maintenance';
  schedule: AvailabilitySchedule[];
  restrictions: string[];
}

export interface AvailabilitySchedule {
  day: string;
  start_time: string;
  end_time: string;
  capacity: number;
}

export interface ResourceCost {
  type: 'fixed' | 'variable' | 'per_use' | 'rental';
  amount: number;
  frequency: string;
  additional_fees: Fee[];
}

export interface Fee {
  name: string;
  amount: number;
  condition: string;
}

export interface ResourceUtilization {
  usage_percentage: number;
  peak_times: string[];
  maintenance_schedule: MaintenanceSchedule[];
  efficiency_score: number;
}

export interface MaintenanceSchedule {
  date: Date;
  type: string;
  duration: number;
  cost: number;
}

export interface Facilitator {
  id: string;
  name: string;
  role: 'coordinator' | 'instructor' | 'coach' | 'specialist';
  qualifications: Qualification[];
  responsibilities: string[];
  schedule: FacilitatorSchedule;
  performance: FacilitatorPerformance;
}

export interface Qualification {
  type: 'certification' | 'degree' | 'training' | 'experience';
  name: string;
  issuer: string;
  date_obtained: Date;
  expiration_date?: Date;
  verification_status: 'verified' | 'pending' | 'expired';
}

export interface FacilitatorSchedule {
  availability: AvailabilitySchedule[];
  assigned_activities: string[];
  workload_percentage: number;
}

export interface FacilitatorPerformance {
  participant_satisfaction: number; // 1-5
  program_effectiveness: number; // 1-5
  attendance_reliability: number; // %
  professional_development: string[];
}

export interface ProgramLocation {
  primary: ActivityLocation;
  alternatives: ActivityLocation[];
  virtual_platforms: VirtualPlatform[];
}

export interface VirtualPlatform {
  name: string;
  url: string;
  features: string[];
  capacity: number;
  technical_requirements: string[];
}

export interface ProgramRequirement {
  type: 'medical' | 'fitness' | 'administrative' | 'technical';
  description: string;
  mandatory: boolean;
  documentation_needed: string[];
  verification_process: string;
}

export interface FitnessProgram extends WorkplaceWellnessProgram {
  fitness_goals: FitnessGoal[];
  workout_plans: WorkoutPlan[];
  fitness_assessments: FitnessAssessment[];
  equipment_inventory: EquipmentInventory[];
}

export interface FitnessGoal {
  type: 'strength' | 'cardio' | 'flexibility' | 'balance' | 'weight_loss' | 'muscle_gain';
  description: string;
  measurement: string;
  baseline: number;
  target: number;
  timeline: number; // weeks
}

export interface WorkoutPlan {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // weeks
  sessions_per_week: number;
  exercises: Exercise[];
  progression: ProgressionPlan;
}

export interface Exercise {
  name: string;
  muscle_groups: string[];
  equipment_needed: string[];
  sets: number;
  reps: number;
  duration?: number; // seconds
  rest_time: number; // seconds
  modifications: ExerciseModification[];
  safety_tips: string[];
}

export interface ExerciseModification {
  condition: string;
  modification: string;
  intensity_adjustment: number; // %
}

export interface ProgressionPlan {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  progression_type: 'intensity' | 'volume' | 'complexity';
  milestones: ProgressionMilestone[];
}

export interface ProgressionMilestone {
  week: number;
  adjustments: string[];
  assessment_required: boolean;
}

export interface FitnessAssessment {
  id: string;
  type: 'baseline' | 'progress' | 'final';
  date: Date;
  tests: FitnessTest[];
  results: AssessmentResult[];
  recommendations: string[];
}

export interface FitnessTest {
  name: string;
  description: string;
  protocol: string;
  equipment: string[];
  safety_precautions: string[];
}

export interface AssessmentResult {
  test: string;
  value: number;
  unit: string;
  percentile: number;
  improvement: number;
  interpretation: string;
}

export interface EquipmentInventory {
  item: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'needs_replacement';
  maintenance_schedule: MaintenanceSchedule[];
  usage_tracking: EquipmentUsage[];
}

export interface EquipmentUsage {
  date: Date;
  hours_used: number;
  user_count: number;
  issues_reported: string[];
}

export interface NutritionProgram extends WorkplaceWellnessProgram {
  meal_plans: MealPlan[];
  nutrition_education: EducationModule[];
  cafeteria_initiatives: CafeteriaInitiative[];
  nutrition_assessments: NutritionAssessment[];
}

export interface MealPlan {
  id: string;
  name: string;
  type: 'weight_loss' | 'muscle_gain' | 'heart_healthy' | 'diabetic' | 'general';
  duration: number; // days
  calories_per_day: number;
  macronutrient_split: MacronutrientSplit;
  meals: Meal[];
  shopping_lists: ShoppingList[];
}

export interface MacronutrientSplit {
  protein_percentage: number;
  carbohydrate_percentage: number;
  fat_percentage: number;
  fiber_grams: number;
}

export interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipes: Recipe[];
  prep_time: number; // minutes
  difficulty: 'easy' | 'moderate' | 'hard';
  cost_estimate: number;
}

export interface Recipe {
  name: string;
  ingredients: Ingredient[];
  instructions: string[];
  nutrition_facts: NutritionFacts;
  servings: number;
  allergens: string[];
  dietary_restrictions: string[];
}

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  alternatives: string[];
  seasonal: boolean;
}

export interface NutritionFacts {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  vitamins: VitaminContent[];
}

export interface VitaminContent {
  vitamin: string;
  amount: number;
  unit: string;
  daily_value_percentage: number;
}

export interface ShoppingList {
  week: number;
  categories: ShoppingCategory[];
  estimated_cost: number;
  seasonal_notes: string[];
}

export interface ShoppingCategory {
  category: string;
  items: ShoppingItem[];
}

export interface ShoppingItem {
  name: string;
  quantity: number;
  unit: string;
  estimated_price: number;
  substitutes: string[];
}

export interface EducationModule {
  id: string;
  title: string;
  topic: string;
  format: 'workshop' | 'webinar' | 'self_paced' | 'interactive';
  duration: number; // minutes
  learning_objectives: string[];
  content: ModuleContent[];
  assessment: ModuleAssessment;
  resources: EducationResource[];
}

export interface ModuleContent {
  type: 'text' | 'video' | 'interactive' | 'quiz' | 'activity';
  title: string;
  content: string;
  duration: number;
  required: boolean;
}

export interface ModuleAssessment {
  type: 'quiz' | 'practical' | 'discussion';
  questions: AssessmentQuestion[];
  passing_score: number;
  retakes_allowed: number;
}

export interface AssessmentQuestion {
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correct_answer: string;
  explanation: string;
}

export interface EducationResource {
  type: 'document' | 'website' | 'app' | 'book';
  title: string;
  description: string;
  url?: string;
  cost: number;
  rating: number;
}

export interface CafeteriaInitiative {
  id: string;
  name: string;
  description: string;
  type: 'menu_modification' | 'labeling' | 'promotion' | 'education';
  start_date: Date;
  end_date?: Date;
  target_metrics: CafeteriaMetric[];
  current_metrics: CafeteriaMetric[];
  vendor_requirements: VendorRequirement[];
}

export interface CafeteriaMetric {
  metric: string;
  target_value: number;
  current_value: number;
  unit: string;
  measurement_frequency: string;
}

export interface VendorRequirement {
  requirement: string;
  mandatory: boolean;
  compliance_deadline: Date;
  verification_method: string;
}

export interface NutritionAssessment {
  id: string;
  participant_id: string;
  date: Date;
  type: 'baseline' | 'progress' | 'final';
  dietary_intake: DietaryIntake[];
  anthropometrics: Anthropometrics;
  biochemical_markers: BiochemicalMarker[];
  clinical_signs: ClinicalSign[];
  recommendations: NutritionRecommendation[];
}

export interface DietaryIntake {
  date: Date;
  meals: RecordedMeal[];
  total_calories: number;
  macronutrient_breakdown: MacronutrientSplit;
  micronutrient_analysis: MicronutrientAnalysis[];
}

export interface RecordedMeal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;
  foods: RecordedFood[];
  location: string;
  mood: string;
}

export interface RecordedFood {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  preparation_method: string;
}

export interface MicronutrientAnalysis {
  nutrient: string;
  intake: number;
  recommended_daily_value: number;
  percentage_of_rdv: number;
  status: 'deficient' | 'adequate' | 'excessive';
}

export interface Anthropometrics {
  weight: number;
  height: number;
  bmi: number;
  body_fat_percentage: number;
  waist_circumference: number;
  hip_circumference: number;
  waist_hip_ratio: number;
}

export interface BiochemicalMarker {
  marker: string;
  value: number;
  unit: string;
  reference_range: string;
  status: 'low' | 'normal' | 'high';
  clinical_significance: string;
}

export interface ClinicalSign {
  sign: string;
  present: boolean;
  severity: 'mild' | 'moderate' | 'severe';
  related_nutrient: string;
}

export interface NutritionRecommendation {
  category: 'caloric_intake' | 'macronutrients' | 'micronutrients' | 'meal_timing' | 'hydration';
  recommendation: string;
  rationale: string;
  implementation_steps: string[];
  monitoring_parameters: string[];
}

@Injectable()
export class WorkplaceWellnessProgramService {
  private readonly logger = new Logger(WorkplaceWellnessProgramService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo programa de bienestar
   */
  async createWellnessProgram(programData: Partial<WorkplaceWellnessProgram>): Promise<WorkplaceWellnessProgram> {
    try {
      this.logger.log(`Creating wellness program: ${programData.name}`);

      // En una implementación real, se guardaría en la base de datos
      const program = this.generateMockWellnessProgram(programData);
      
      this.logger.log(`Wellness program created: ${program.id}`);
      return program;

    } catch (error) {
      this.logger.error(`Error creating wellness program:`, error);
      throw error;
    }
  }

  /**
   * Gestiona la inscripción de empleados en programas
   */
  async enrollEmployee(programId: string, employeeId: string): Promise<void> {
    try {
      this.logger.log(`Enrolling employee ${employeeId} in program ${programId}`);

      // En una implementación real, se actualizaría la base de datos
      // await this.prisma.programParticipant.create({
      //   data: {
      //     programId,
      //     employeeId,
      //     joinDate: new Date(),
      //     status: 'registered'
      //   }
      // });

      this.logger.log(`Employee ${employeeId} enrolled in program ${programId}`);

    } catch (error) {
      this.logger.error(`Error enrolling employee ${employeeId} in program ${programId}:`, error);
      throw error;
    }
  }

  /**
   * Planifica actividades de bienestar
   */
  async scheduleWellnessActivity(programId: string, activityData: Partial<WellnessActivity>): Promise<WellnessActivity> {
    try {
      this.logger.log(`Scheduling wellness activity: ${activityData.name} for program ${programId}`);

      const activity = this.generateMockWellnessActivity(activityData);
      
      this.logger.log(`Wellness activity scheduled: ${activity.id}`);
      return activity;

    } catch (error) {
      this.logger.error(`Error scheduling wellness activity:`, error);
      throw error;
    }
  }

  /**
   * Rastrea la participación en actividades
   */
  async trackParticipation(activityId: string, employeeId: string, attendanceData: Partial<AttendanceRecord>): Promise<void> {
    try {
      this.logger.log(`Tracking participation for employee ${employeeId} in activity ${activityId}`);

      // En una implementación real, se registraría la asistencia
      // await this.prisma.attendanceRecord.create({
      //   data: {
      //     activityId,
      //     employeeId,
      //     ...attendanceData,
      //     date: new Date()
      //   }
      // });

      this.logger.log(`Participation tracked for employee ${employeeId}`);

    } catch (error) {
      this.logger.error(`Error tracking participation:`, error);
      throw error;
    }
  }

  /**
   * Genera reportes de efectividad del programa
   */
  async generateProgramReport(programId: string, reportType: string): Promise<any> {
    try {
      this.logger.log(`Generating ${reportType} report for program ${programId}`);

      const report = await this.buildProgramReport(programId, reportType);
      
      this.logger.log(`Program report generated for ${programId}`);
      return report;

    } catch (error) {
      this.logger.error(`Error generating program report:`, error);
      throw error;
    }
  }

  /**
   * Gestiona programas de fitness corporativo
   */
  async manageFitnessProgram(programId: string): Promise<FitnessProgram> {
    try {
      this.logger.log(`Managing fitness program ${programId}`);

      const fitnessProgram = await this.buildFitnessProgram(programId);
      
      this.logger.log(`Fitness program managed: ${programId}`);
      return fitnessProgram;

    } catch (error) {
      this.logger.error(`Error managing fitness program:`, error);
      throw error;
    }
  }

  /**
   * Gestiona programas de nutrición empresarial
   */
  async manageNutritionProgram(programId: string): Promise<NutritionProgram> {
    try {
      this.logger.log(`Managing nutrition program ${programId}`);

      const nutritionProgram = await this.buildNutritionProgram(programId);
      
      this.logger.log(`Nutrition program managed: ${programId}`);
      return nutritionProgram;

    } catch (error) {
      this.logger.error(`Error managing nutrition program:`, error);
      throw error;
    }
  }

  /**
   * Configura alertas de participación
   */
  async configureParticipationAlerts(programId: string, alertConfig: any): Promise<void> {
    try {
      this.logger.log(`Configuring participation alerts for program ${programId}`);

      // En una implementación real, se configurarían las alertas
      // await this.prisma.participationAlert.upsert({
      //   where: { programId },
      //   create: { programId, config: alertConfig },
      //   update: { config: alertConfig }
      // });

      this.logger.log(`Participation alerts configured for program ${programId}`);

    } catch (error) {
      this.logger.error(`Error configuring participation alerts:`, error);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private generateMockWellnessProgram(data: Partial<WorkplaceWellnessProgram>): WorkplaceWellnessProgram {
    return {
      id: `WP_${Date.now()}`,
      name: data.name || 'Corporate Wellness Program',
      description: data.description || 'Comprehensive workplace wellness initiative',
      category: {
        primary: 'Comprehensive Wellness',
        secondary: ['Fitness', 'Nutrition', 'Mental Health'],
        tags: ['employee-wellness', 'preventive-care', 'engagement']
      },
      type: data.type || 'fitness',
      duration: data.duration || 90,
      startDate: data.startDate || new Date(),
      endDate: data.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'active',
      participants: [],
      activities: [],
      goals: [
        {
          id: 'GOAL_1',
          description: 'Increase employee participation in wellness activities',
          type: 'participation',
          metric: {
            name: 'Participation Rate',
            unit: '%',
            measurement_method: 'Activity attendance tracking',
            frequency: 'Weekly'
          },
          target: 75,
          current: 45,
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          priority: 'high',
          status: 'on_track'
        }
      ],
      metrics: this.generateMockProgramMetrics(),
      budget: {
        total_allocated: 50000,
        spent_to_date: 15000,
        remaining: 35000,
        categories: [
          {
            category: 'Equipment',
            allocated: 20000,
            spent: 8000,
            percentage_used: 40
          },
          {
            category: 'Instructor Fees',
            allocated: 15000,
            spent: 5000,
            percentage_used: 33
          },
          {
            category: 'Materials',
            allocated: 10000,
            spent: 2000,
            percentage_used: 20
          },
          {
            category: 'Incentives',
            allocated: 5000,
            spent: 0,
            percentage_used: 0
          }
        ],
        cost_centers: [
          {
            name: 'Human Resources',
            code: 'HR001',
            allocated_percentage: 60,
            actual_percentage: 55
          },
          {
            name: 'Facilities',
            code: 'FAC001',
            allocated_percentage: 40,
            actual_percentage: 45
          }
        ]
      },
      resources: [],
      facilitators: [
        {
          id: 'FAC_001',
          name: 'Sarah Johnson',
          role: 'coordinator',
          qualifications: [
            {
              type: 'certification',
              name: 'Certified Wellness Coordinator',
              issuer: 'Wellness Council of America',
              date_obtained: new Date('2023-01-15'),
              verification_status: 'verified'
            }
          ],
          responsibilities: [
            'Program coordination',
            'Participant communication',
            'Progress tracking'
          ],
          schedule: {
            availability: [
              {
                day: 'Monday-Friday',
                start_time: '08:00',
                end_time: '17:00',
                capacity: 8
              }
            ],
            assigned_activities: [],
            workload_percentage: 75
          },
          performance: {
            participant_satisfaction: 4.5,
            program_effectiveness: 4.3,
            attendance_reliability: 98,
            professional_development: ['Advanced Wellness Coaching Certificate']
          }
        }
      ],
      location: {
        primary: {
          type: 'on_site',
          name: 'Corporate Fitness Center',
          address: '123 Corporate Blvd',
          room: 'Wellness Suite A',
          capacity: 50,
          facilities: ['Gym equipment', 'Changing rooms', 'Showers'],
          accessibility: [
            {
              feature: 'Wheelchair accessible',
              available: true,
              description: 'Full ADA compliance'
            }
          ]
        },
        alternatives: [],
        virtual_platforms: [
          {
            name: 'Zoom',
            url: 'https://zoom.us/wellness',
            features: ['Video conferencing', 'Screen sharing', 'Recording'],
            capacity: 100,
            technical_requirements: ['Internet connection', 'Webcam', 'Microphone']
          }
        ]
      },
      requirements: [
        {
          type: 'medical',
          description: 'Medical clearance for physical activities',
          mandatory: true,
          documentation_needed: ['Health assessment form'],
          verification_process: 'Review by occupational health nurse'
        }
      ]
    };
  }

  private generateMockWellnessActivity(data: Partial<WellnessActivity>): WellnessActivity {
    return {
      id: `WA_${Date.now()}`,
      name: data.name || 'Fitness Class',
      description: data.description || 'Group fitness session',
      type: {
        primary: 'fitness',
        subcategory: 'cardio',
        format: 'group'
      },
      category: 'Exercise',
      duration: data.duration || 60,
      schedule: {
        frequency: 'weekly',
        days: ['Monday', 'Wednesday', 'Friday'],
        startTime: '12:00',
        endTime: '13:00',
        timezone: 'UTC-5',
        recurring: true,
        exceptions: []
      },
      location: {
        type: 'on_site',
        name: 'Corporate Gym',
        capacity: 20,
        facilities: ['Sound system', 'Mirrors', 'Ventilation'],
        accessibility: [
          {
            feature: 'Wheelchair accessible',
            available: true,
            description: 'Accessible entrance and equipment'
          }
        ]
      },
      maxParticipants: 20,
      currentParticipants: 8,
      instructor: {
        id: 'INS_001',
        name: 'Mike Thompson',
        credentials: ['Certified Personal Trainer', 'Group Fitness Instructor'],
        specializations: ['Cardio', 'Strength Training'],
        experience: 5,
        rating: 4.7,
        bio: 'Experienced fitness instructor with focus on workplace wellness',
        contact: {
          email: 'mike.thompson@fitness.com',
          phone: '+1-555-0199',
          availability: 'Monday-Friday 6AM-6PM'
        }
      },
      equipment: [
        {
          name: 'Exercise mats',
          quantity: 20,
          required: true,
          providedByCompany: true,
          alternatives: ['Personal yoga mats']
        },
        {
          name: 'Light weights',
          quantity: 20,
          required: false,
          providedByCompany: true,
          alternatives: ['Resistance bands']
        }
      ],
      difficulty: 'intermediate',
      prerequisites: ['Basic fitness level'],
      objectives: [
        'Improve cardiovascular health',
        'Reduce workplace stress',
        'Build team camaraderie'
      ],
      materials: ['Water bottle', 'Comfortable workout clothes'],
      safetyGuidelines: [
        'Consult physician before starting',
        'Stay hydrated',
        'Listen to your body'
      ],
      modifications: [
        {
          condition: 'Lower back issues',
          modification: 'Avoid high-impact movements',
          equipment: ['Chair for support'],
          supervision: true
        }
      ]
    };
  }

  private generateMockProgramMetrics(): ProgramMetrics {
    return {
      participation: {
        enrollment_rate: 65,
        completion_rate: 78,
        dropout_rate: 12,
        attendance_rate: 82,
        active_participants: 156,
        demographics: {
          age_groups: [
            { range: '25-34', count: 45, percentage: 28.8 },
            { range: '35-44', count: 62, percentage: 39.7 },
            { range: '45-54', count: 38, percentage: 24.4 },
            { range: '55+', count: 11, percentage: 7.1 }
          ],
          departments: [
            {
              department: 'Engineering',
              enrolled: 45,
              active: 38,
              completion_rate: 84
            },
            {
              department: 'Sales',
              enrolled: 32,
              active: 28,
              completion_rate: 87
            },
            {
              department: 'Marketing',
              enrolled: 28,
              active: 22,
              completion_rate: 79
            }
          ],
          roles: [
            { role: 'Manager', count: 25, engagement_score: 4.2 },
            { role: 'Individual Contributor', count: 131, engagement_score: 3.9 }
          ],
          risk_levels: [
            { risk_level: 'low', count: 89, improvement_rate: 15 },
            { risk_level: 'medium', count: 52, improvement_rate: 35 },
            { risk_level: 'high', count: 15, improvement_rate: 67 }
          ]
        }
      },
      engagement: {
        average_session_duration: 45,
        activities_per_participant: 3.2,
        repeat_participation_rate: 72,
        referral_rate: 28,
        app_usage: {
          daily_active_users: 89,
          monthly_active_users: 156,
          session_frequency: 4.5,
          feature_usage: [
            { feature: 'Activity tracking', usage_rate: 85, user_satisfaction: 4.3 },
            { feature: 'Goal setting', usage_rate: 67, user_satisfaction: 4.1 }
          ]
        },
        social_interaction: {
          team_challenges_participation: 42,
          peer_support_interactions: 156,
          social_sharing_rate: 23,
          community_engagement_score: 3.8
        }
      },
      health_outcomes: {
        biometric_improvements: [
          {
            metric: 'BMI',
            baseline_average: 26.8,
            current_average: 25.9,
            improvement_percentage: 3.4,
            participants_improved: 98,
            statistical_significance: true
          }
        ],
        health_risk_reductions: [
          {
            risk_factor: 'Hypertension',
            baseline_prevalence: 28,
            current_prevalence: 22,
            reduction_percentage: 21.4,
            participants_affected: 9
          }
        ],
        lifestyle_changes: [
          {
            behavior: 'Regular exercise',
            baseline_percentage: 35,
            current_percentage: 67,
            change_percentage: 91.4,
            sustainability_rate: 78
          }
        ],
        clinical_outcomes: [
          {
            outcome: 'Blood pressure normalization',
            improvement_rate: 73,
            participants_improved: 11,
            clinical_significance: true
          }
        ]
      },
      satisfaction: {
        overall_satisfaction: 4.2,
        program_rating: 4.1,
        instructor_rating: 4.5,
        facility_rating: 3.8,
        recommendation_likelihood: 7.8,
        feedback_themes: [
          {
            theme: 'Convenient scheduling',
            sentiment: 'positive',
            frequency: 89,
            examples: ['Love the lunchtime sessions', 'Perfect timing for busy schedules']
          }
        ]
      },
      financial: {
        total_cost: 50000,
        cost_per_participant: 320,
        roi_percentage: 187,
        cost_savings: [
          {
            category: 'Reduced healthcare costs',
            amount: 93500,
            source: 'Insurance claims analysis',
            calculation_method: 'Year-over-year comparison'
          }
        ],
        budget_utilization: 70
      }
    };
  }

  private async buildProgramReport(programId: string, reportType: string): Promise<any> {
    // Mock implementation
    return {
      programId,
      reportType,
      generatedDate: new Date(),
      summary: {
        totalParticipants: 156,
        activitiesOffered: 12,
        completionRate: 78,
        satisfactionScore: 4.2
      },
      details: {
        participationTrends: 'Increasing engagement over time',
        healthOutcomes: 'Significant improvements in key metrics',
        costEffectiveness: 'ROI of 187% achieved',
        recommendations: [
          'Expand program to additional departments',
          'Add more virtual activity options',
          'Increase incentive programs'
        ]
      }
    };
  }

  private async buildFitnessProgram(programId: string): Promise<FitnessProgram> {
    const baseProgram = this.generateMockWellnessProgram({ type: 'fitness' });
    
    return {
      ...baseProgram,
      fitness_goals: [
        {
          type: 'cardio',
          description: 'Improve cardiovascular endurance',
          measurement: 'VO2 max',
          baseline: 35,
          target: 42,
          timeline: 12
        }
      ],
      workout_plans: [
        {
          id: 'WP_001',
          name: 'Beginner Cardio Program',
          level: 'beginner',
          duration: 8,
          sessions_per_week: 3,
          exercises: [
            {
              name: 'Treadmill Walk',
              muscle_groups: ['legs', 'cardiovascular'],
              equipment_needed: ['treadmill'],
              sets: 1,
              reps: 1,
              duration: 1800, // 30 minutes
              rest_time: 0,
              modifications: [
                {
                  condition: 'Knee problems',
                  modification: 'Use elliptical instead',
                  intensity_adjustment: 0
                }
              ],
              safety_tips: ['Start slow', 'Maintain proper posture']
            }
          ],
          progression: {
            frequency: 'weekly',
            progression_type: 'intensity',
            milestones: [
              {
                week: 2,
                adjustments: ['Increase duration by 5 minutes'],
                assessment_required: false
              },
              {
                week: 4,
                adjustments: ['Add incline', 'Increase speed'],
                assessment_required: true
              }
            ]
          }
        }
      ],
      fitness_assessments: [
        {
          id: 'FA_001',
          type: 'baseline',
          date: new Date(),
          tests: [
            {
              name: 'Cardiovascular Endurance Test',
              description: 'Step test protocol',
              protocol: '3-minute step test at 96 steps per minute',
              equipment: ['Step platform', 'Metronome', 'Heart rate monitor'],
              safety_precautions: ['Medical clearance required', 'Stop if experiencing chest pain']
            }
          ],
          results: [
            {
              test: 'Cardiovascular Endurance Test',
              value: 35,
              unit: 'ml/kg/min',
              percentile: 45,
              improvement: 0,
              interpretation: 'Below average for age group'
            }
          ],
          recommendations: [
            'Start with low-intensity cardio',
            'Focus on consistency over intensity',
            'Reassess in 4 weeks'
          ]
        }
      ],
      equipment_inventory: [
        {
          item: 'Treadmills',
          quantity: 8,
          condition: 'good',
          maintenance_schedule: [
            {
              date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              type: 'Routine maintenance',
              duration: 2,
              cost: 200
            }
          ],
          usage_tracking: [
            {
              date: new Date(),
              hours_used: 24,
              user_count: 45,
              issues_reported: []
            }
          ]
        }
      ]
    } as FitnessProgram;
  }

  private async buildNutritionProgram(programId: string): Promise<NutritionProgram> {
    const baseProgram = this.generateMockWellnessProgram({ type: 'nutrition' });
    
    return {
      ...baseProgram,
      meal_plans: [
        {
          id: 'MP_001',
          name: 'Heart Healthy Meal Plan',
          type: 'heart_healthy',
          duration: 7,
          calories_per_day: 1800,
          macronutrient_split: {
            protein_percentage: 25,
            carbohydrate_percentage: 45,
            fat_percentage: 30,
            fiber_grams: 35
          },
          meals: [
            {
              type: 'breakfast',
              recipes: [
                {
                  name: 'Oatmeal with Berries',
                  ingredients: [
                    { name: 'Rolled oats', quantity: 0.5, unit: 'cup', alternatives: ['Steel cut oats'], seasonal: false },
                    { name: 'Mixed berries', quantity: 0.5, unit: 'cup', alternatives: ['Banana'], seasonal: true }
                  ],
                  instructions: [
                    'Cook oats according to package directions',
                    'Top with berries',
                    'Add cinnamon to taste'
                  ],
                  nutrition_facts: {
                    calories: 320,
                    protein: 12,
                    carbohydrates: 58,
                    fat: 6,
                    fiber: 8,
                    sugar: 12,
                    sodium: 5,
                    vitamins: [
                      {
                        vitamin: 'Vitamin C',
                        amount: 45,
                        unit: 'mg',
                        daily_value_percentage: 75
                      }
                    ]
                  },
                  servings: 1,
                  allergens: ['gluten'],
                  dietary_restrictions: ['vegetarian', 'dairy-free']
                }
              ],
              prep_time: 10,
              difficulty: 'easy',
              cost_estimate: 3.50
            }
          ],
          shopping_lists: [
            {
              week: 1,
              categories: [
                {
                  category: 'Grains',
                  items: [
                    {
                      name: 'Rolled oats',
                      quantity: 1,
                      unit: 'container',
                      estimated_price: 4.99,
                      substitutes: ['Steel cut oats', 'Quick oats']
                    }
                  ]
                }
              ],
              estimated_cost: 85.50,
              seasonal_notes: ['Berries are in season - consider fresh over frozen']
            }
          ]
        }
      ],
      nutrition_education: [
        {
          id: 'NE_001',
          title: 'Heart Healthy Eating',
          topic: 'Cardiovascular nutrition',
          format: 'workshop',
          duration: 90,
          learning_objectives: [
            'Understand the relationship between diet and heart health',
            'Identify heart-healthy foods',
            'Learn to read nutrition labels'
          ],
          content: [
            {
              type: 'video',
              title: 'Introduction to Heart Health',
              content: 'Overview of cardiovascular disease and diet',
              duration: 15,
              required: true
            }
          ],
          assessment: {
            type: 'quiz',
            questions: [
              {
                question: 'Which type of fat is most beneficial for heart health?',
                type: 'multiple_choice',
                options: ['Saturated fat', 'Trans fat', 'Monounsaturated fat', 'All fats are equal'],
                correct_answer: 'Monounsaturated fat',
                explanation: 'Monounsaturated fats help reduce bad cholesterol levels'
              }
            ],
            passing_score: 80,
            retakes_allowed: 3
          },
          resources: [
            {
              type: 'website',
              title: 'American Heart Association - Healthy Eating',
              description: 'Comprehensive guide to heart-healthy nutrition',
              url: 'https://www.heart.org/en/healthy-living/healthy-eating',
              cost: 0,
              rating: 5
            }
          ]
        }
      ],
      cafeteria_initiatives: [
        {
          id: 'CI_001',
          name: 'Healthy Choice Menu Expansion',
          description: 'Add more nutritious options to cafeteria menu',
          type: 'menu_modification',
          start_date: new Date(),
          target_metrics: [
            {
              metric: 'Healthy option sales percentage',
              target_value: 40,
              current_value: 25,
              unit: '%',
              measurement_frequency: 'Weekly'
            }
          ],
          current_metrics: [
            {
              metric: 'Healthy option sales percentage',
              target_value: 40,
              current_value: 32,
              unit: '%',
              measurement_frequency: 'Weekly'
            }
          ],
          vendor_requirements: [
            {
              requirement: 'Provide detailed nutrition information for all menu items',
              mandatory: true,
              compliance_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              verification_method: 'Nutrition analysis review'
            }
          ]
        }
      ],
      nutrition_assessments: [
        {
          id: 'NA_001',
          participant_id: 'EMP_001',
          date: new Date(),
          type: 'baseline',
          dietary_intake: [
            {
              date: new Date(),
              meals: [
                {
                  type: 'breakfast',
                  time: '07:30',
                  foods: [
                    {
                      name: 'Coffee',
                      quantity: 2,
                      unit: 'cups',
                      calories: 10,
                      preparation_method: 'Black'
                    }
                  ],
                  location: 'Home',
                  mood: 'Rushed'
                }
              ],
              total_calories: 1650,
              macronutrient_breakdown: {
                protein_percentage: 18,
                carbohydrate_percentage: 52,
                fat_percentage: 30,
                fiber_grams: 22
              },
              micronutrient_analysis: [
                {
                  nutrient: 'Vitamin D',
                  intake: 8,
                  recommended_daily_value: 20,
                  percentage_of_rdv: 40,
                  status: 'deficient'
                }
              ]
            }
          ],
          anthropometrics: {
            weight: 75,
            height: 175,
            bmi: 24.5,
            body_fat_percentage: 18,
            waist_circumference: 85,
            hip_circumference: 98,
            waist_hip_ratio: 0.87
          },
          biochemical_markers: [
            {
              marker: 'Total Cholesterol',
              value: 185,
              unit: 'mg/dL',
              reference_range: '<200',
              status: 'normal',
              clinical_significance: 'Optimal for cardiovascular health'
            }
          ],
          clinical_signs: [
            {
              sign: 'Brittle nails',
              present: false,
              severity: 'mild',
              related_nutrient: 'Iron'
            }
          ],
          recommendations: [
            {
              category: 'micronutrients',
              recommendation: 'Increase vitamin D intake through supplementation or fortified foods',
              rationale: 'Current intake is below recommended levels',
              implementation_steps: [
                'Add vitamin D supplement (1000 IU daily)',
                'Include more fatty fish in diet',
                'Consider fortified dairy products'
              ],
              monitoring_parameters: ['Serum vitamin D levels', 'Dietary intake tracking']
            }
          ]
        }
      ]
    } as NutritionProgram;
  }
}
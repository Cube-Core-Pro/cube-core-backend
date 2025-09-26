import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Interfaces para gestión integral de salud de empleados
export interface EmployeeHealthProfile {
  employeeId: string;
  personalInfo: PersonalHealthInfo;
  medicalHistory: MedicalHistory;
  currentConditions: ChronicCondition[];
  riskAssessment: HealthRiskAssessment;
  preventiveCare: PreventiveCareTracking;
  emergencyContacts: EmergencyContact[];
  healthInsurance: HealthInsuranceInfo;
  lastUpdated: Date;
}

export interface PersonalHealthInfo {
  age: number;
  gender: string;
  height: number; // cm
  weight: number; // kg
  bloodType?: string;
  allergies: string[];
  medications: Medication[];
  smokingStatus: 'never' | 'former' | 'current';
  alcoholConsumption: 'none' | 'occasional' | 'moderate' | 'heavy';
  exerciseFrequency: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface MedicalHistory {
  chronicConditions: ChronicCondition[];
  surgeries: Surgery[];
  hospitalizations: Hospitalization[];
  familyHistory: FamilyMedicalHistory[];
  immunizations: Immunization[];
  allergicReactions: AllergicReaction[];
}

export interface ChronicCondition {
  id: string;
  condition: string;
  diagnosisDate: Date;
  severity: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'controlled' | 'remission' | 'resolved';
  medications: string[];
  restrictions: WorkRestriction[];
  accommodationsNeeded: string[];
  monitoringFrequency: string;
  nextCheckup: Date;
}

export interface Surgery {
  procedure: string;
  date: Date;
  hospital: string;
  surgeon: string;
  complications?: string;
  recoveryTime: number; // días
}

export interface Hospitalization {
  reason: string;
  admissionDate: Date;
  dischargeDate: Date;
  hospital: string;
  outcome: string;
}

export interface FamilyMedicalHistory {
  relationship: string;
  conditions: string[];
  ageAtDiagnosis?: number;
  ageAtDeath?: number;
  causeOfDeath?: string;
}

export interface Immunization {
  vaccine: string;
  date: Date;
  provider: string;
  lotNumber?: string;
  nextDueDate?: Date;
  required: boolean;
}

export interface AllergicReaction {
  allergen: string;
  reactionType: 'mild' | 'moderate' | 'severe' | 'anaphylaxis';
  symptoms: string[];
  treatment: string;
  dateOccurred: Date;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy: string;
  purpose: string;
  sideEffects?: string[];
}

export interface HealthRiskAssessment {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  biometricIndicators: BiometricIndicators;
  lifestyleRisks: LifestyleRisk[];
  workRelatedRisks: WorkRelatedRisk[];
  recommendations: HealthRecommendation[];
  nextAssessmentDate: Date;
}

export interface RiskFactor {
  factor: string;
  riskLevel: 'low' | 'medium' | 'high';
  impact: string;
  modifiable: boolean;
  interventions: string[];
}

export interface BiometricIndicators {
  bmi: number;
  bloodPressure: BloodPressure;
  cholesterol: CholesterolPanel;
  bloodSugar: BloodSugar;
  vitalSigns: VitalSigns;
  lastScreening: Date;
}

export interface BloodPressure {
  systolic: number;
  diastolic: number;
  category: 'normal' | 'elevated' | 'stage1' | 'stage2' | 'crisis';
  measurementDate: Date;
}

export interface CholesterolPanel {
  totalCholesterol: number;
  ldl: number;
  hdl: number;
  triglycerides: number;
  ratio: number;
  riskLevel: 'optimal' | 'borderline' | 'high' | 'very_high';
  testDate: Date;
}

export interface BloodSugar {
  fastingGlucose: number;
  hba1c?: number;
  category: 'normal' | 'prediabetes' | 'diabetes';
  testDate: Date;
}

export interface VitalSigns {
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  measurementDate: Date;
}

export interface LifestyleRisk {
  category: 'diet' | 'exercise' | 'sleep' | 'stress' | 'substance_use';
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  recommendations: string[];
}

export interface WorkRelatedRisk {
  hazardType: 'chemical' | 'biological' | 'physical' | 'ergonomic' | 'psychosocial';
  exposure: string;
  riskLevel: 'low' | 'medium' | 'high';
  protectionRequired: string[];
  monitoringNeeded: boolean;
  frequencyOfExposure: string;
}

export interface WorkRestriction {
  type: 'lifting' | 'standing' | 'sitting' | 'travel' | 'shifts' | 'exposure' | 'stress';
  description: string;
  limitations: string;
  accommodations: string[];
  temporaryOrPermanent: 'temporary' | 'permanent';
  reviewDate?: Date;
}

export interface HealthRecommendation {
  category: 'preventive' | 'lifestyle' | 'medical' | 'occupational';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recommendation: string;
  rationale: string;
  timeline: string;
  resources: string[];
  followUpRequired: boolean;
}

export interface PreventiveCareTracking {
  screenings: HealthScreening[];
  examinations: MedicalExamination[];
  vaccinationSchedule: VaccinationSchedule[];
  healthGoals: HealthGoal[];
  wellnessChallenges: WellnessChallenge[];
}

export interface HealthScreening {
  type: string;
  lastPerformed: Date;
  nextDue: Date;
  result: string;
  riskLevel: 'low' | 'medium' | 'high';
  followUpRequired: boolean;
  provider: string;
}

export interface MedicalExamination {
  type: 'annual_physical' | 'occupational_health' | 'pre_employment' | 'return_to_work';
  date: Date;
  provider: string;
  findings: string;
  recommendations: string[];
  restrictions: WorkRestriction[];
  nextExamDue: Date;
  fitnessForDuty: 'fit' | 'fit_with_restrictions' | 'temporarily_unfit' | 'permanently_unfit';
}

export interface VaccinationSchedule {
  vaccine: string;
  required: boolean;
  lastReceived?: Date;
  nextDue: Date;
  series: VaccinationSeries[];
  exemptions?: string[];
}

export interface VaccinationSeries {
  dose: number;
  date?: Date;
  completed: boolean;
  provider?: string;
}

export interface HealthGoal {
  id: string;
  category: 'weight' | 'fitness' | 'nutrition' | 'stress' | 'sleep' | 'habits';
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: Date;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: GoalProgress[];
  milestones: GoalMilestone[];
}

export interface GoalProgress {
  date: Date;
  value: number;
  note?: string;
}

export interface GoalMilestone {
  percentage: number;
  achieved: boolean;
  achievedDate?: Date;
  reward?: string;
}

export interface WellnessChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number; // días
  startDate: Date;
  endDate: Date;
  participants: string[];
  progress: ChallengeProgress[];
  rewards: ChallengeReward[];
}

export interface ChallengeProgress {
  participantId: string;
  progress: number; // 0-100%
  lastUpdate: Date;
  achievements: string[];
}

export interface ChallengeReward {
  tier: 'participation' | 'completion' | 'excellence';
  description: string;
  value: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  isPrimary: boolean;
}

export interface HealthInsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber: string;
  effectiveDate: Date;
  expirationDate: Date;
  coverage: InsuranceCoverage;
  dependents: Dependent[];
}

export interface InsuranceCoverage {
  medical: boolean;
  dental: boolean;
  vision: boolean;
  prescription: boolean;
  mentalHealth: boolean;
  preventiveCare: boolean;
  copayAmounts: CopayAmount[];
  deductibles: Deductible[];
}

export interface CopayAmount {
  service: string;
  amount: number;
}

export interface Deductible {
  type: 'individual' | 'family';
  amount: number;
  metAmount: number;
}

export interface Dependent {
  name: string;
  relationship: string;
  birthDate: Date;
  gender: string;
  studentStatus?: boolean;
}

export interface HealthComplianceReport {
  employeeId: string;
  complianceStatus: 'compliant' | 'non_compliant' | 'partially_compliant';
  requiredExams: ComplianceItem[];
  requiredVaccinations: ComplianceItem[];
  requiredScreenings: ComplianceItem[];
  overallComplianceScore: number;
  expiringItems: ExpiringItem[];
  recommendations: string[];
  lastUpdated: Date;
}

export interface ComplianceItem {
  item: string;
  required: boolean;
  status: 'current' | 'expired' | 'due_soon' | 'overdue' | 'not_started';
  lastCompleted?: Date;
  nextDue: Date;
  gracePeriod?: number; // días
}

export interface ExpiringItem {
  item: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class EmployeeHealthManagementService {
  private readonly logger = new Logger(EmployeeHealthManagementService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene el perfil completo de salud de un empleado
   */
  async getEmployeeHealthProfile(employeeId: string): Promise<EmployeeHealthProfile> {
    try {
      this.logger.log(`Getting health profile for employee ${employeeId}`);

      // En una implementación real, se obtendría de múltiples fuentes
      const mockProfile = this.generateMockHealthProfile(employeeId);
      
      this.logger.log(`Health profile retrieved for employee ${employeeId}`);
      return mockProfile;

    } catch (error) {
      this.logger.error(`Error getting health profile for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza información médica del empleado
   */
  async updateMedicalInformation(employeeId: string, medicalData: Partial<MedicalHistory>): Promise<void> {
    try {
      this.logger.log(`Updating medical information for employee ${employeeId}`);

      // En una implementación real, aquí se actualizaría la base de datos
      // await this.prisma.employeeHealth.update({
      //   where: { employeeId },
      //   data: { medicalHistory: medicalData }
      // });

      this.logger.log(`Medical information updated for employee ${employeeId}`);

    } catch (error) {
      this.logger.error(`Error updating medical information for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Programa y gestiona exámenes médicos
   */
  async scheduleHealthScreening(employeeId: string, screeningType: string, scheduledDate: Date): Promise<string> {
    try {
      this.logger.log(`Scheduling health screening for employee ${employeeId}: ${screeningType}`);

      // En una implementación real, se integraría con sistemas de citas médicas
      const appointmentId = `HS_${Date.now()}_${employeeId}`;
      
      // await this.prisma.healthScreening.create({
      //   data: {
      //     employeeId,
      //     type: screeningType,
      //     scheduledDate,
      //     status: 'scheduled',
      //     appointmentId
      //   }
      // });

      this.logger.log(`Health screening scheduled for employee ${employeeId}: ${appointmentId}`);
      return appointmentId;

    } catch (error) {
      this.logger.error(`Error scheduling health screening for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Evalúa el riesgo de salud de un empleado
   */
  async assessHealthRisk(employeeId: string): Promise<HealthRiskAssessment> {
    try {
      this.logger.log(`Assessing health risk for employee ${employeeId}`);

      // En una implementación real, se usarían algoritmos de evaluación de riesgo
      const riskAssessment = this.generateMockRiskAssessment(employeeId);

      this.logger.log(`Health risk assessment completed for employee ${employeeId}`);
      return riskAssessment;

    } catch (error) {
      this.logger.error(`Error assessing health risk for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Monitorea condiciones crónicas
   */
  async monitorChronicConditions(employeeId: string): Promise<ChronicCondition[]> {
    try {
      this.logger.log(`Monitoring chronic conditions for employee ${employeeId}`);

      // En una implementación real, se integraría con sistemas de monitoreo
      const conditions = await this.getActiveChronicConditions(employeeId);
      
      // Evaluar el estado de cada condición
      for (const condition of conditions) {
        await this.updateConditionStatus(condition);
      }

      this.logger.log(`Chronic conditions monitored for employee ${employeeId}`);
      return conditions;

    } catch (error) {
      this.logger.error(`Error monitoring chronic conditions for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Genera reporte de cumplimiento de salud
   */
  async generateComplianceReport(employeeId: string): Promise<HealthComplianceReport> {
    try {
      this.logger.log(`Generating compliance report for employee ${employeeId}`);

      const report = await this.buildComplianceReport(employeeId);

      this.logger.log(`Compliance report generated for employee ${employeeId}`);
      return report;

    } catch (error) {
      this.logger.error(`Error generating compliance report for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Configura alertas de salud personalizadas
   */
  async configureHealthAlerts(employeeId: string, alertConfig: any): Promise<void> {
    try {
      this.logger.log(`Configuring health alerts for employee ${employeeId}`);

      // En una implementación real, se configurarían las alertas en el sistema
      // await this.prisma.healthAlert.upsert({
      //   where: { employeeId },
      //   create: { employeeId, config: alertConfig },
      //   update: { config: alertConfig }
      // });

      this.logger.log(`Health alerts configured for employee ${employeeId}`);

    } catch (error) {
      this.logger.error(`Error configuring health alerts for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Gestiona programas de prevención
   */
  async managePreventionPrograms(employeeId: string): Promise<PreventiveCareTracking> {
    try {
      this.logger.log(`Managing prevention programs for employee ${employeeId}`);

      const preventiveCare = await this.buildPreventiveCareTracking(employeeId);

      this.logger.log(`Prevention programs managed for employee ${employeeId}`);
      return preventiveCare;

    } catch (error) {
      this.logger.error(`Error managing prevention programs for employee ${employeeId}:`, error);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private async getActiveChronicConditions(employeeId: string): Promise<ChronicCondition[]> {
    // Mock implementation
    return [
      {
        id: `CC_${employeeId}_1`,
        condition: 'Hypertension',
        diagnosisDate: new Date('2023-01-15'),
        severity: 'moderate',
        status: 'controlled',
        medications: ['Lisinopril 10mg', 'Hydrochlorothiazide 25mg'],
        restrictions: [],
        accommodationsNeeded: ['Regular blood pressure monitoring'],
        monitoringFrequency: 'Monthly',
        nextCheckup: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  private async updateConditionStatus(condition: ChronicCondition): Promise<void> {
    // Mock implementation - en producción se actualizaría el estado basado en datos médicos
    this.logger.log(`Updating status for condition: ${condition.condition}`);
  }

  private async buildComplianceReport(employeeId: string): Promise<HealthComplianceReport> {
    return {
      employeeId,
      complianceStatus: 'compliant',
      requiredExams: [
        {
          item: 'Annual Physical Examination',
          required: true,
          status: 'current',
          lastCompleted: new Date('2024-08-15'),
          nextDue: new Date('2025-08-15')
        }
      ],
      requiredVaccinations: [
        {
          item: 'Influenza Vaccine',
          required: true,
          status: 'current',
          lastCompleted: new Date('2024-09-01'),
          nextDue: new Date('2025-09-01')
        }
      ],
      requiredScreenings: [
        {
          item: 'Blood Pressure Screening',
          required: true,
          status: 'current',
          lastCompleted: new Date('2024-09-01'),
          nextDue: new Date('2024-12-01')
        }
      ],
      overallComplianceScore: 95,
      expiringItems: [],
      recommendations: ['Schedule annual eye exam', 'Update emergency contact information'],
      lastUpdated: new Date()
    };
  }

  private async buildPreventiveCareTracking(employeeId: string): Promise<PreventiveCareTracking> {
    return {
      screenings: [
        {
          type: 'Blood Pressure',
          lastPerformed: new Date('2024-09-01'),
          nextDue: new Date('2024-12-01'),
          result: 'Normal',
          riskLevel: 'low',
          followUpRequired: false,
          provider: 'Corporate Health Center'
        }
      ],
      examinations: [
        {
          type: 'annual_physical',
          date: new Date('2024-08-15'),
          provider: 'Dr. Smith',
          findings: 'Overall good health',
          recommendations: ['Increase physical activity', 'Maintain healthy diet'],
          restrictions: [],
          nextExamDue: new Date('2025-08-15'),
          fitnessForDuty: 'fit'
        }
      ],
      vaccinationSchedule: [
        {
          vaccine: 'Influenza',
          required: true,
          lastReceived: new Date('2024-09-01'),
          nextDue: new Date('2025-09-01'),
          series: [
            {
              dose: 1,
              date: new Date('2024-09-01'),
              completed: true,
              provider: 'Corporate Health Center'
            }
          ]
        }
      ],
      healthGoals: [
        {
          id: `HG_${employeeId}_1`,
          category: 'weight',
          title: 'Lose 10 pounds',
          description: 'Achieve healthy BMI through diet and exercise',
          targetValue: 170,
          currentValue: 180,
          unit: 'lbs',
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          status: 'active',
          progress: [
            {
              date: new Date(),
              value: 180,
              note: 'Starting weight'
            }
          ],
          milestones: [
            {
              percentage: 50,
              achieved: false
            },
            {
              percentage: 100,
              achieved: false
            }
          ]
        }
      ],
      wellnessChallenges: []
    };
  }

  private generateMockHealthProfile(employeeId: string): EmployeeHealthProfile {
    return {
      employeeId,
      personalInfo: {
        age: 32,
        gender: 'Male',
        height: 175,
        weight: 75,
        bloodType: 'O+',
        allergies: ['Peanuts'],
        medications: [],
        smokingStatus: 'never',
        alcoholConsumption: 'occasional',
        exerciseFrequency: 'moderate'
      },
      medicalHistory: {
        chronicConditions: [],
        surgeries: [],
        hospitalizations: [],
        familyHistory: [
          {
            relationship: 'Father',
            conditions: ['Hypertension', 'Diabetes Type 2'],
            ageAtDiagnosis: 45
          }
        ],
        immunizations: [
          {
            vaccine: 'COVID-19',
            date: new Date('2024-01-15'),
            provider: 'Corporate Health Center',
            nextDueDate: new Date('2025-01-15'),
            required: true
          }
        ],
        allergicReactions: [
          {
            allergen: 'Peanuts',
            reactionType: 'moderate',
            symptoms: ['Hives', 'Swelling'],
            treatment: 'Antihistamine',
            dateOccurred: new Date('2020-05-10')
          }
        ]
      },
      currentConditions: [],
      riskAssessment: this.generateMockRiskAssessment(employeeId),
      preventiveCare: {
        screenings: [],
        examinations: [],
        vaccinationSchedule: [],
        healthGoals: [],
        wellnessChallenges: []
      },
      emergencyContacts: [
        {
          name: 'Jane Doe',
          relationship: 'Spouse',
          phoneNumber: '+1-555-0123',
          email: 'jane.doe@email.com',
          isPrimary: true
        }
      ],
      healthInsurance: {
        provider: 'Corporate Health Plan',
        policyNumber: 'CHP-123456',
        groupNumber: 'GRP-789',
        effectiveDate: new Date('2024-01-01'),
        expirationDate: new Date('2024-12-31'),
        coverage: {
          medical: true,
          dental: true,
          vision: true,
          prescription: true,
          mentalHealth: true,
          preventiveCare: true,
          copayAmounts: [
            { service: 'Primary Care', amount: 20 },
            { service: 'Specialist', amount: 40 }
          ],
          deductibles: [
            { type: 'individual', amount: 1000, metAmount: 250 }
          ]
        },
        dependents: []
      },
      lastUpdated: new Date()
    };
  }

  private generateMockRiskAssessment(employeeId: string): HealthRiskAssessment {
    return {
      overallRiskLevel: 'low',
      riskFactors: [
        {
          factor: 'Family History of Diabetes',
          riskLevel: 'medium',
          impact: 'Increased risk of developing Type 2 diabetes',
          modifiable: false,
          interventions: ['Regular blood sugar monitoring', 'Healthy diet', 'Regular exercise']
        }
      ],
      biometricIndicators: {
        bmi: 24.5,
        bloodPressure: {
          systolic: 120,
          diastolic: 80,
          category: 'normal',
          measurementDate: new Date()
        },
        cholesterol: {
          totalCholesterol: 180,
          ldl: 100,
          hdl: 60,
          triglycerides: 120,
          ratio: 3.0,
          riskLevel: 'optimal',
          testDate: new Date('2024-08-15')
        },
        bloodSugar: {
          fastingGlucose: 90,
          hba1c: 5.4,
          category: 'normal',
          testDate: new Date('2024-08-15')
        },
        vitalSigns: {
          heartRate: 72,
          temperature: 98.6,
          respiratoryRate: 16,
          oxygenSaturation: 98,
          measurementDate: new Date()
        },
        lastScreening: new Date('2024-08-15')
      },
      lifestyleRisks: [
        {
          category: 'exercise',
          riskLevel: 'low',
          description: 'Moderate exercise routine',
          impact: 'Positive impact on cardiovascular health',
          recommendations: ['Continue current exercise routine', 'Consider strength training']
        }
      ],
      workRelatedRisks: [
        {
          hazardType: 'ergonomic',
          exposure: 'Prolonged computer use',
          riskLevel: 'low',
          protectionRequired: ['Ergonomic workstation setup'],
          monitoringNeeded: false,
          frequencyOfExposure: 'Daily'
        }
      ],
      recommendations: [
        {
          category: 'preventive',
          priority: 'medium',
          recommendation: 'Schedule annual eye exam',
          rationale: 'Regular monitoring for computer vision syndrome',
          timeline: 'Within 3 months',
          resources: ['Corporate eye care provider'],
          followUpRequired: true
        }
      ],
      nextAssessmentDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };
  }
}
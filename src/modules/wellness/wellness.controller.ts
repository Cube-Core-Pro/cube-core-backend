import { Controller, Get, Query, Param, Post, Body } from '@nestjs/common';
import { WellnessAnalyticsService } from './services/wellness-analytics.service';
import { CorporateWellnessComplianceService } from './services/corporate-wellness-compliance.service';
import { DigitalWellnessService } from './services/digital-wellness.service';
import { EmployeeHealthManagementService } from './services/employee-health-management.service';
import { WorkplaceWellnessProgramService } from './services/workplace-wellness-program.service';
import { MentalHealthSupportService } from './services/mental-health-support.service';

@Controller('wellness')
export class WellnessController {
  constructor(
    private readonly analytics: WellnessAnalyticsService,
    private readonly compliance: CorporateWellnessComplianceService,
    private readonly digital: DigitalWellnessService,
    private readonly health: EmployeeHealthManagementService,
    private readonly programs: WorkplaceWellnessProgramService,
    private readonly mental: MentalHealthSupportService,
  ) {}

  // Analytics
  @Get('analytics/overview')
  async analyticsOverview(@Query('orgId') orgId: string, @Query('timeframe') timeframe = '30d') {
    return this.analytics.getAnalyticsOverview(orgId, timeframe);
  }

  @Get('analytics/roi/:programId')
  async programRoi(@Param('programId') programId: string, @Query('timeframe') timeframe = 'YTD') {
    return this.analytics.calculateProgramROI(programId, timeframe);
  }

  @Get('analytics/trends')
  async trends(@Query('orgId') orgId: string, @Query('metric') metric = 'BMI', @Query('timeframe') timeframe = '90d') {
    return this.analytics.getPopulationHealthTrends(orgId, metric, timeframe);
  }

  @Get('analytics/risk')
  async risk(@Query('orgId') orgId: string) {
    return this.analytics.predictWellnessRisks(orgId);
  }

  @Get('analytics/dashboard')
  async dashboard(@Query('orgId') orgId: string) {
    return this.analytics.getDashboardData(orgId);
  }

  // Compliance
  @Get('compliance/overview')
  async complianceOverview(@Query('orgId') orgId: string) {
    return this.compliance.getComplianceOverview(orgId);
  }

  @Get('compliance/audit')
  async runAudit(@Query('orgId') orgId: string, @Query('scope') scope = 'wellness_programs') {
    return this.compliance.runComplianceAudit(orgId, scope);
  }

  @Get('compliance/report')
  async regulatoryReport(@Query('orgId') orgId: string, @Query('authority') authority: string, @Query('period') period: string) {
    return this.compliance.generateRegulatoryReport(orgId, authority, period);
  }

  // Digital wellness
  @Get('digital/analyze')
  async analyzeDigital(@Query('userId') userId: string, @Query('timeframe') timeframe = '7d') {
    return this.digital.analyzeDigitalWellness(userId, timeframe);
  }

  @Get('digital/stress')
  async digitalStress(@Query('userId') userId: string) {
    return this.digital.monitorStressIndicators(userId);
  }

  @Get('digital/sleep')
  async sleepQuality(@Query('userId') userId: string) {
    return this.digital.assessSleepQuality(userId);
  }

  @Get('digital/work-life')
  async workLife(@Query('userId') userId: string) {
    return this.digital.analyzeWorkLifeBalance(userId);
  }

  @Post('digital/coaching')
  async coaching(@Body() body: { userId: string; focus?: string }) {
    return this.digital.provideWellnessCoaching(body.userId, body.focus);
  }

  // Employee health
  @Get('employee/profile/:employeeId')
  async employeeProfile(@Param('employeeId') employeeId: string) {
    return this.health.getEmployeeHealthProfile(employeeId);
  }

  @Post('employee/medical/:employeeId')
  async updateMedical(@Param('employeeId') employeeId: string, @Body() medicalData: any) {
    return this.health.updateMedicalInformation(employeeId, medicalData);
  }

  @Post('employee/screening/:employeeId')
  async scheduleScreening(
    @Param('employeeId') employeeId: string,
    @Body() body: { screeningType: string; scheduledDate: string }
  ) {
    return this.health.scheduleHealthScreening(employeeId, body.screeningType, new Date(body.scheduledDate));
  }

  @Get('employee/risk/:employeeId')
  async healthRisk(@Param('employeeId') employeeId: string) {
    return this.health.assessHealthRisk(employeeId);
  }

  @Get('employee/chronic/:employeeId')
  async chronic(@Param('employeeId') employeeId: string) {
    return this.health.monitorChronicConditions(employeeId);
  }

  @Get('employee/compliance/:employeeId')
  async employeeCompliance(@Param('employeeId') employeeId: string) {
    return this.health.generateComplianceReport(employeeId);
  }

  // Workplace programs
  @Post('programs')
  async createProgram(@Body() data: any) {
    return this.programs.createWellnessProgram(data);
  }

  @Post('programs/:programId/enroll/:employeeId')
  async enroll(@Param('programId') programId: string, @Param('employeeId') employeeId: string) {
    return this.programs.enrollEmployee(programId, employeeId);
  }

  @Post('programs/:programId/activities')
  async scheduleActivity(@Param('programId') programId: string, @Body() data: any) {
    return this.programs.scheduleWellnessActivity(programId, data);
  }

  @Post('activities/:activityId/track/:employeeId')
  async track(@Param('activityId') activityId: string, @Param('employeeId') employeeId: string, @Body() attendance: any) {
    return this.programs.trackParticipation(activityId, employeeId, attendance);
  }

  @Get('programs/:programId/report')
  async programReport(@Param('programId') programId: string, @Query('type') type: string) {
    return this.programs.generateProgramReport(programId, type || 'summary');
  }

  // Mental health
  @Get('mental/profile/:employeeId')
  async mentalProfile(@Param('employeeId') employeeId: string) {
    return this.mental.getMentalHealthProfile(employeeId);
  }

  @Get('mental/burnout/:employeeId')
  async burnout(@Param('employeeId') employeeId: string) {
    return this.mental.assessBurnoutRisk(employeeId);
  }

  @Post('mental/mindfulness/:employeeId')
  async mindfulness(@Param('employeeId') employeeId: string, @Body() body: { programType: string }) {
    return this.mental.deployMindfulnessProgram(employeeId, body.programType);
  }

  @Post('mental/connect/:employeeId')
  async connect(@Param('employeeId') employeeId: string, @Body() body: { specialization: string; urgency: string }) {
    return this.mental.connectWithProfessional(employeeId, body.specialization, body.urgency);
  }

  @Get('mental/monitor/:employeeId')
  async mentalMonitor(@Param('employeeId') employeeId: string) {
    return this.mental.monitorMentalHealthIndicators(employeeId);
  }

  @Post('mental/crisis/:employeeId')
  async crisis(
    @Param('employeeId') employeeId: string,
    @Body() body: { crisisType: string; severity: string }
  ) {
    return this.mental.handleCrisisIntervention(employeeId, body.crisisType, body.severity);
  }
}

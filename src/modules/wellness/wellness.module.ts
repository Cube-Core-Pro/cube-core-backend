import { Module } from '@nestjs/common';
import { WellnessController } from './wellness.controller';
import { WellnessAnalyticsService } from './services/wellness-analytics.service';
import { CorporateWellnessComplianceService } from './services/corporate-wellness-compliance.service';
import { DigitalWellnessService } from './services/digital-wellness.service';
import { EmployeeHealthManagementService } from './services/employee-health-management.service';
import { WorkplaceWellnessProgramService } from './services/workplace-wellness-program.service';
import { MentalHealthSupportService } from './services/mental-health-support.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [WellnessController],
  providers: [
    PrismaService,
    WellnessAnalyticsService,
    CorporateWellnessComplianceService,
    DigitalWellnessService,
    EmployeeHealthManagementService,
    WorkplaceWellnessProgramService,
    MentalHealthSupportService,
  ],
  exports: [
    WellnessAnalyticsService,
    CorporateWellnessComplianceService,
    DigitalWellnessService,
    EmployeeHealthManagementService,
    WorkplaceWellnessProgramService,
    MentalHealthSupportService,
  ],
})
export class WellnessModule {}

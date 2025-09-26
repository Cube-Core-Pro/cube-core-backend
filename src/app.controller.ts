// path: backend/src/app.controller.ts
// purpose: Main application controller with system information endpoints
// dependencies: AppService, NestJS decorators

import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AppService } from "./app.service";

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get system information' })
  @ApiResponse({ status: 200, description: 'System information retrieved successfully' })
  getSystemInfo() {
    return this.appService.getSystemInfo();
  }

  @Get('version')
  @ApiOperation({ summary: 'Get application version' })
  @ApiResponse({ status: 200, description: 'Application version retrieved successfully' })
  getVersion() {
    return this.appService.getVersion();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get application status' })
  @ApiResponse({ status: 200, description: 'Application status retrieved successfully' })
  getStatus() {
    return this.appService.getStatus();
  }
}
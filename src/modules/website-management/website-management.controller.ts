// path: backend/src/modules/website-management/website-management.controller.ts
// purpose: Controller for website management API endpoints
// dependencies: @nestjs/common, @nestjs/swagger, guards, decorators

import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Logger,
  HttpException,
  HttpStatus,
  Request,
  Headers,
  Ip
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { WebsiteManagementService, LandingPageContent, WebsiteAnalytics } from './website-management.service';

export class LandingPageContentDto implements Partial<LandingPageContent> {
  hero?: {
    title: string;
    subtitle: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    backgroundImage?: string;
    videoUrl?: string;
  };
  features?: Array<{
    id?: string;
    icon: string;
    title: string;
    description: string;
    order: number;
  }>;
  modules?: Array<{
    id?: string;
    name: string;
    description: string;
    features: string[];
    icon?: string;
    order: number;
  }>;
  stats?: Array<{
    id?: string;
    label: string;
    value: string;
    order: number;
  }>;
  testimonials?: Array<{
    id?: string;
    company: string;
    quote: string;
    author: string;
    position: string;
    avatar?: string;
    companyLogo?: string;
    order: number;
  }>;
  pricing?: Array<{
    id?: string;
    name: string;
    price: string;
    description: string;
    features: string[];
    highlighted: boolean;
    order: number;
    currency?: string;
    billingCycle?: string;
  }>;
  footer?: {
    description: string;
    companyInfo: {
      name: string;
      address: string;
      phone: string;
      email: string;
    };
    socialLinks: Array<{
      platform: string;
      url: string;
      icon: string;
    }>;
    links: Array<{
      title: string;
      items: Array<{
        name: string;
        href: string;
      }>;
    }>;
  };
  seo?: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
  };
  settings?: {
    published: boolean;
    version: string;
    lastModified: Date;
    modifiedBy: string;
  };
}

@ApiTags('Website Management')
@Controller('api/website')
export class WebsiteManagementController {
  private readonly logger = new Logger(WebsiteManagementController.name);

  constructor(
    private readonly websiteManagementService: WebsiteManagementService,
  ) {}

  @Get('landing-page')
  @ApiOperation({ summary: 'Get public landing page content' })
  @ApiResponse({ 
    status: 200, 
    description: 'Landing page content retrieved successfully',
    type: Object
  })
  async getLandingPageContent(
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referrer?: string,
    @Ip() ip?: string
  ): Promise<{ success: boolean; data: LandingPageContent | null }> {
    try {
      // Track page view for analytics
      await this.websiteManagementService.trackPageView('/', userAgent, referrer, ip);

      const content = await this.websiteManagementService.getLandingPageContent();
      
      return {
        success: true,
        data: content
      };
    } catch (error) {
      this.logger.error(`Failed to get landing page content: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve landing page content',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('landing-page')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update landing page content (Admin only)' })
  @ApiBody({ type: LandingPageContentDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Landing page content updated successfully'
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Admin access required'
  })
  async updateLandingPageContent(
    @Body() content: LandingPageContentDto,
    @GetUser() user: any,
    @Request() req: any
  ): Promise<{ success: boolean; data: LandingPageContent; message: string }> {
    try {
      const tenantId = user.tenantId || req.tenantId;
      const userId = user.id;
      const userRole = user.role;

      const updatedContent = await this.websiteManagementService.updateLandingPageContent(
        tenantId,
        userId,
        content,
        userRole
      );

      this.logger.log(`Landing page updated by user ${userId} in tenant ${tenantId}`);

      return {
        success: true,
        data: updatedContent,
        message: 'Landing page content updated successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to update landing page content: ${error.message}`);
      
      if (error.message.includes('Insufficient permissions')) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      
      throw new HttpException(
        error.message || 'Failed to update landing page content',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Put('landing-page/:contentId/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a landing page version (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Landing page published successfully'
  })
  async publishLandingPage(
    @Param('contentId') contentId: string,
    @GetUser() user: any,
    @Request() req: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const tenantId = user.tenantId || req.tenantId;
      const userId = user.id;

      await this.websiteManagementService.publishLandingPage(tenantId, contentId, userId);

      this.logger.log(`Landing page published by user ${userId} - Content ID: ${contentId}`);

      return {
        success: true,
        message: 'Landing page published successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to publish landing page: ${error.message}`);
      throw new HttpException(
        'Failed to publish landing page',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('landing-page/versions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get landing page versions (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Landing page versions retrieved successfully'
  })
  async getLandingPageVersions(
    @GetUser() user: any,
    @Request() req: any
  ): Promise<{ success: boolean; data: Array<any> }> {
    try {
      const tenantId = user.tenantId || req.tenantId;

      const versions = await this.websiteManagementService.getLandingPageVersions(tenantId);

      return {
        success: true,
        data: versions
      };
    } catch (error) {
      this.logger.error(`Failed to get landing page versions: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve landing page versions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get website analytics (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Website analytics retrieved successfully'
  })
  async getWebsiteAnalytics(
    @GetUser() user: any,
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<{ success: boolean; data: WebsiteAnalytics }> {
    try {
      const tenantId = user.tenantId || req.tenantId;

      // Default to last 30 days if dates not provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const analytics = await this.websiteManagementService.getWebsiteAnalytics(tenantId, {
        start,
        end
      });

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      this.logger.error(`Failed to get website analytics: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve website analytics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('track/conversion')
  @ApiOperation({ summary: 'Track website conversion' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['signup', 'demo', 'contact'] },
        data: { type: 'object' }
      },
      required: ['type']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Conversion tracked successfully'
  })
  async trackConversion(
    @Body() body: { type: 'signup' | 'demo' | 'contact'; data?: any }
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.websiteManagementService.trackConversion(body.type, body.data);

      return {
        success: true,
        message: 'Conversion tracked successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to track conversion: ${error.message}`);
      throw new HttpException(
        'Failed to track conversion',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('track/page-view')
  @ApiOperation({ summary: 'Track page view for analytics' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        page: { type: 'string' }
      },
      required: ['page']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Page view tracked successfully'
  })
  async trackPageView(
    @Body() body: { page: string },
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referrer?: string,
    @Ip() ip?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.websiteManagementService.trackPageView(body.page, userAgent, referrer, ip);

      return {
        success: true,
        message: 'Page view tracked successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to track page view: ${error.message}`);
      throw new HttpException(
        'Failed to track page view',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Website management health check' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy'
  })
  async healthCheck(): Promise<{ success: boolean; status: string; timestamp: string }> {
    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }
}

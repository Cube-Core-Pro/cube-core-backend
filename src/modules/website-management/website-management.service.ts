// path: backend/src/modules/website-management/website-management.service.ts
// purpose: Service for managing public website content and landing page
// dependencies: @nestjs/common, prisma, redis

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface LandingPageContent {
  id?: string;
  hero: {
    title: string;
    subtitle: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    backgroundImage?: string;
    videoUrl?: string;
  };
  features: Array<{
    id?: string;
    icon: string;
    title: string;
    description: string;
    order: number;
  }>;
  modules: Array<{
    id?: string;
    name: string;
    description: string;
    features: string[];
    icon?: string;
    order: number;
  }>;
  stats: Array<{
    id?: string;
    label: string;
    value: string;
    order: number;
  }>;
  testimonials: Array<{
    id?: string;
    company: string;
    quote: string;
    author: string;
    position: string;
    avatar?: string;
    companyLogo?: string;
    order: number;
  }>;
  pricing: Array<{
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
  footer: {
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
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
  };
  settings: {
    published: boolean;
    version: string;
    lastModified: Date;
    modifiedBy: string;
  };
}

export interface WebsiteAnalytics {
  visitors: {
    total: number;
    unique: number;
    daily: Array<{ date: string; count: number }>;
  };
  conversions: {
    signups: number;
    demoRequests: number;
    contactForms: number;
  };
  performance: {
    pageLoadTime: number;
    bounceRate: number;
    timeOnPage: number;
  };
  traffic: {
    sources: Array<{ source: string; count: number; percentage: number }>;
    topPages: Array<{ page: string; views: number }>;
  };
}

@Injectable()
export class WebsiteManagementService {
  private readonly logger = new Logger(WebsiteManagementService.name);
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getLandingPageContent(): Promise<LandingPageContent | null> {
    try {
      // Try to get from cache first
      const cached = await this.redis.get('website:landing_page');
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const content = await this.prisma.landingPageContent.findFirst({
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        include: {
          features: { orderBy: { order: 'asc' } },
          modules: { orderBy: { order: 'asc' } },
          stats: { orderBy: { order: 'asc' } },
          testimonials: { orderBy: { order: 'asc' } },
          pricing: { orderBy: { order: 'asc' } }
        }
      });

      if (!content) {
        return null;
      }

      const formattedContent = this.formatContentForResponse(content);

      // Cache the result
      await this.redis.setex(
        'website:landing_page',
        this.CACHE_TTL,
        JSON.stringify(formattedContent)
      );

      return formattedContent;
    } catch (error) {
      this.logger.error(`Failed to get landing page content: ${error.message}`);
      throw error;
    }
  }

  async updateLandingPageContent(
    tenantId: string,
    userId: string,
    content: Partial<LandingPageContent>,
    userRole: string
  ): Promise<LandingPageContent> {
    try {
      // Check permissions
      if (!['admin', 'super_admin'].includes(userRole)) {
        throw new UnauthorizedException('Insufficient permissions to update landing page');
      }

      // Validate content structure
      this.validateLandingPageContent(content);

      // Get current version
      const currentContent = await this.prisma.landingPageContent.findFirst({
        where: { tenantId },
        orderBy: { version: 'desc' }
      });

      const newVersion = currentContent ? (parseInt(currentContent.version) + 1).toString() : '1';

      // Create new version
      const defaultFooter = content.footer || {
        description: '',
        companyInfo: { name: '', address: '', phone: '', email: '' },
        socialLinks: [],
        links: []
      };

      let updatedContent = await this.prisma.landingPageContent.create({
        data: {
          tenantId,
          version: newVersion,
          hero: (content.hero ?? {}) as Prisma.InputJsonValue,
          footer: defaultFooter as Prisma.InputJsonValue,
          seo: (content.seo ?? {}) as Prisma.InputJsonValue,
          createdBy: userId,
          features: {
            create: (content.features || []).map((feature, index) => ({
              icon: feature.icon,
              title: feature.title,
              description: feature.description,
              order: feature.order ?? index
            }))
          },
          modules: {
            create: (content.modules || []).map((module, index) => ({
              name: module.name,
              description: module.description,
              features: module.features as unknown as Prisma.InputJsonValue,
              icon: module.icon,
              order: module.order ?? index
            }))
          },
          stats: {
            create: (content.stats || []).map((stat, index) => ({
              label: stat.label,
              value: stat.value,
              order: stat.order ?? index
            }))
          },
          testimonials: {
            create: (content.testimonials || []).map((testimonial, index) => ({
              company: testimonial.company,
              quote: testimonial.quote,
              author: testimonial.author,
              position: testimonial.position,
              avatar: testimonial.avatar,
              companyLogo: testimonial.companyLogo,
              order: testimonial.order ?? index
            }))
          },
          pricing: {
            create: (content.pricing || []).map((plan, index) => ({
              name: plan.name,
              price: plan.price,
              description: plan.description,
              features: plan.features,
              highlighted: plan.highlighted,
              currency: plan.currency || 'USD',
              billingCycle: plan.billingCycle || 'monthly',
              order: plan.order ?? index
            }))
          }
        },
        include: {
          features: { orderBy: { order: 'asc' } },
          modules: { orderBy: { order: 'asc' } },
          stats: { orderBy: { order: 'asc' } },
          testimonials: { orderBy: { order: 'asc' } },
          pricing: { orderBy: { order: 'asc' } }
        }
      });

      // Clear cache
      await this.redis.del('website:landing_page');

      // If published, update the published version
      if (content.settings?.published) {
        await this.publishLandingPage(tenantId, updatedContent.id, userId);
        updatedContent = await this.prisma.landingPageContent.findUnique({
          where: { id: updatedContent.id },
          include: {
            features: { orderBy: { order: 'asc' } },
            modules: { orderBy: { order: 'asc' } },
            stats: { orderBy: { order: 'asc' } },
            testimonials: { orderBy: { order: 'asc' } },
            pricing: { orderBy: { order: 'asc' } }
          }
        }) as typeof updatedContent;
      }

      const formattedContent = this.formatContentForResponse(updatedContent);

      this.logger.log(`Landing page content updated - Version: ${newVersion}, User: ${userId}`);
      
      return formattedContent;
    } catch (error) {
      this.logger.error(`Failed to update landing page content: ${error.message}`);
      throw error;
    }
  }

  async publishLandingPage(tenantId: string, contentId: string, userId: string): Promise<void> {
    try {
      // Unpublish current published version
      await this.prisma.landingPageContent.updateMany({
        where: { tenantId, published: true },
        data: { published: false }
      });

      // Publish new version
      await this.prisma.landingPageContent.update({
        where: { id: contentId },
        data: { 
          published: true,
          publishedAt: new Date(),
          publishedBy: userId
        }
      });

      // Clear cache to force refresh
      await this.redis.del('website:landing_page');

      this.logger.log(`Landing page published - Content ID: ${contentId}, User: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to publish landing page: ${error.message}`);
      throw error;
    }
  }

  async getLandingPageVersions(tenantId: string): Promise<Array<{ id: string; version: string; published: boolean; createdAt: Date; createdBy: string }>> {
    try {
      const versions = await this.prisma.landingPageContent.findMany({
        where: { tenantId },
        select: {
          id: true,
          version: true,
          published: true,
          createdAt: true,
          createdBy: true
        },
        orderBy: { version: 'desc' }
      });

      return versions;
    } catch (error) {
      this.logger.error(`Failed to get landing page versions: ${error.message}`);
      throw error;
    }
  }

  async getWebsiteAnalytics(tenantId: string, dateRange: { start: Date; end: Date }): Promise<WebsiteAnalytics> {
    try {
      // In a real implementation, this would integrate with analytics services
      // like Google Analytics, Adobe Analytics, or custom tracking
      
      const analytics: WebsiteAnalytics = {
        visitors: {
          total: 15420,
          unique: 12350,
          daily: this.generateDailyVisitorData(dateRange)
        },
        conversions: {
          signups: 245,
          demoRequests: 89,
          contactForms: 156
        },
        performance: {
          pageLoadTime: 1.2,
          bounceRate: 0.35,
          timeOnPage: 145
        },
        traffic: {
          sources: [
            { source: 'Organic Search', count: 6789, percentage: 44.0 },
            { source: 'Direct', count: 4320, percentage: 28.0 },
            { source: 'Social Media', count: 2156, percentage: 14.0 },
            { source: 'Paid Ads', count: 1543, percentage: 10.0 },
            { source: 'Referral', count: 612, percentage: 4.0 }
          ],
          topPages: [
            { page: '/', views: 8920 },
            { page: '/features', views: 3456 },
            { page: '/pricing', views: 2134 },
            { page: '/contact', views: 1890 },
            { page: '/demo', views: 1567 }
          ]
        }
      };

      return analytics;
    } catch (error) {
      this.logger.error(`Failed to get website analytics: ${error.message}`);
      throw error;
    }
  }

  async trackPageView(page: string, userAgent?: string, referrer?: string, ip?: string): Promise<void> {
    try {
      // Store page view data for analytics
      const pageViewData = {
        page,
        timestamp: new Date(),
        userAgent,
        referrer,
        ip: this.anonymizeIP(ip)
      };

      // Store in Redis for real-time analytics
      await this.redis.lpush('website:page_views', JSON.stringify(pageViewData));
      
      // Keep only last 10000 page views in Redis
      await this.redis.ltrim('website:page_views', 0, 9999);

      // Increment daily counter
      const today = new Date().toISOString().split('T')[0];
      await this.redis.incr(`website:daily_views:${today}`);
      await this.redis.expire(`website:daily_views:${today}`, 86400 * 30); // Keep for 30 days

    } catch (error) {
      this.logger.error(`Failed to track page view: ${error.message}`);
    }
  }

  async trackConversion(type: 'signup' | 'demo' | 'contact', data?: any): Promise<void> {
    try {
      const conversionData = {
        type,
        timestamp: new Date(),
        data: data || {}
      };

      // Store conversion data
      await this.redis.lpush('website:conversions', JSON.stringify(conversionData));
      
      // Increment conversion counter
      const today = new Date().toISOString().split('T')[0];
      await this.redis.incr(`website:conversions:${type}:${today}`);
      await this.redis.expire(`website:conversions:${type}:${today}`, 86400 * 30);

      this.logger.log(`Conversion tracked: ${type}`);
    } catch (error) {
      this.logger.error(`Failed to track conversion: ${error.message}`);
    }
  }

  private validateLandingPageContent(content: Partial<LandingPageContent>): void {
    // Basic validation - expand as needed
    if (content.hero && (!content.hero.title || !content.hero.description)) {
      throw new Error('Hero section must include title and description');
    }

    if (content.features && content.features.some(f => !f.title || !f.description)) {
      throw new Error('All features must have title and description');
    }

    if (content.seo && !content.seo.title) {
      throw new Error('SEO title is required');
    }
  }

  private formatContentForResponse(content: any): LandingPageContent {
    return {
      id: content.id,
      hero: content.hero,
      features: content.features || [],
      modules: content.modules || [],
      stats: content.stats || [],
      testimonials: content.testimonials || [],
      pricing: content.pricing || [],
      footer: content.footer || {
        description: '',
        companyInfo: { name: '', address: '', phone: '', email: '' },
        socialLinks: [],
        links: []
      },
      seo: content.seo || { title: '', description: '', keywords: [] },
      settings: {
        published: content.published,
        version: content.version,
        lastModified: content.updatedAt,
        modifiedBy: content.createdBy
      }
    };
  }

  private generateDailyVisitorData(dateRange: { start: Date; end: Date }): Array<{ date: string; count: number }> {
    const data = [];
    const currentDate = new Date(dateRange.start);
    
    while (currentDate <= dateRange.end) {
      data.push({
        date: currentDate.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 500) + 300 // Random data for demo
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  private anonymizeIP(ip?: string): string | undefined {
    if (!ip) return undefined;
    
    // Simple IP anonymization - remove last octet for IPv4
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    
    return ip;
  }
}

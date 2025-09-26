// path: backend/src/crm/services/contacts.service.ts
// purpose: Service for managing CRM contacts using existing crm_contacts model
// dependencies: PrismaService, RedisService

import { Injectable, Logger, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { ContactStats } from "../interfaces/stats.interface";

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  source?: string;
  tags?: string[];
  customFields?: any;
  assignedUserId?: string;
}

export interface UpdateContactDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  leadScore?: number;
  lifecycle?: string;
  source?: string;
  tags?: string[];
  customFields?: any;
  assignedUserId?: string;
  nextFollowUp?: Date;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(createContactDto: CreateContactDto, tenantId: string) {
    try {
      // Check if contact with email already exists
      const existingContact = await this.prisma.crm_contacts.findFirst({
        where: { 
          email: createContactDto.email,
          tenantId 
        },
      });

      if (existingContact) {
        throw new ConflictException('Contact with this email already exists');
      }

      const contact = await this.prisma.crm_contacts.create({
        data: {
          id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          firstName: createContactDto.firstName,
          lastName: createContactDto.lastName,
          email: createContactDto.email,
          phone: createContactDto.phone,
          company: createContactDto.company,
          position: createContactDto.position,
          source: createContactDto.source,
          tags: createContactDto.tags || [],
          customFields: createContactDto.customFields,
          assignedUserId: createContactDto.assignedUserId,
          updatedAt: new Date(),
        },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Clear cache
      await this.redis.del(`contacts:stats:${tenantId}`);
      await this.redis.del(`crm:dashboard:stats:${tenantId}`);

      this.logger.log(`Contact created: ${contact.id}`);
      return contact;
    } catch (error) {
      this.logger.error(`Failed to create contact: ${error.message}`);
      throw error;
    }
  }

  async findAll(tenantId: string, page = 1, limit = 10, search?: string) {
    try {
      const skip = (page - 1) * limit;
      
      const where: any = { tenantId };
      
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [contacts, total] = await Promise.all([
        this.prisma.crm_contacts.findMany({
          where,
          skip,
          take: limit,
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.crm_contacts.count({ where }),
      ]);

      return {
        data: contacts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch contacts: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, tenantId: string) {
    try {
      const contact = await this.prisma.crm_contacts.findFirst({
        where: { id, tenantId },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          crm_activities: {
            select: {
              id: true,
              type: true,
              subject: true,
              description: true,
              status: true,
              scheduledAt: true,
              completedAt: true,
              createdAt: true,
              users: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          crm_opportunities: {
            select: {
              id: true,
              name: true,
              value: true,
              currency: true,
              stage: true,
              probability: true,
              expectedCloseDate: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!contact) {
        throw new NotFoundException('Contact not found');
      }

      return contact;
    } catch (error) {
      this.logger.error(`Failed to fetch contact: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateContactDto: UpdateContactDto, tenantId: string) {
    try {
      const existingContact = await this.findOne(id, tenantId);

      // Check email uniqueness if email is being updated
      if (updateContactDto.email && updateContactDto.email !== existingContact.email) {
        const emailExists = await this.prisma.crm_contacts.findFirst({
          where: { 
            email: updateContactDto.email,
            tenantId,
            id: { not: id }
          },
        });

        if (emailExists) {
          throw new ConflictException('Contact with this email already exists');
        }
      }

      const contact = await this.prisma.crm_contacts.update({
        where: { id },
        data: {
          ...updateContactDto,
          updatedAt: new Date(),
        },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Clear cache
      await this.redis.del(`contacts:stats:${tenantId}`);
      await this.redis.del(`crm:dashboard:stats:${tenantId}`);

      this.logger.log(`Contact updated: ${contact.id}`);
      return contact;
    } catch (error) {
      this.logger.error(`Failed to update contact: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string, tenantId: string) {
    try {
      await this.findOne(id, tenantId);

      // Check if contact has related opportunities or activities
      const [opportunitiesCount, activitiesCount] = await Promise.all([
        this.prisma.crm_opportunities.count({ where: { contactId: id } }),
        this.prisma.crm_activities.count({ where: { contactId: id } }),
      ]);

      if (opportunitiesCount > 0 || activitiesCount > 0) {
        throw new ConflictException('Cannot delete contact with related opportunities or activities');
      }

      await this.prisma.crm_contacts.delete({
        where: { id },
      });

      // Clear cache
      await this.redis.del(`contacts:stats:${tenantId}`);
      await this.redis.del(`crm:dashboard:stats:${tenantId}`);

      this.logger.log(`Contact deleted: ${id}`);
      return { message: 'Contact deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete contact: ${error.message}`);
      throw error;
    }
  }

  async getContactStats(tenantId: string): Promise<ContactStats> {
    try {
      const cacheKey = `contacts:stats:${tenantId}`;
      const cached = await this.redis.getJson(cacheKey);
      
      if (cached) {
        return cached as ContactStats;
      }

      const [
        totalContacts,
        activeContacts,
        newThisMonth,
      ] = await Promise.all([
        this.prisma.crm_contacts.count({ where: { tenantId } }),
        this.prisma.crm_contacts.count({ 
          where: { 
            tenantId,
            lifecycle: { in: ['CUSTOMER', 'QUALIFIED_LEAD'] }
          } 
        }),
        this.prisma.crm_contacts.count({
          where: {
            tenantId,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]);

      const stats: ContactStats = {
        total: totalContacts,
        active: activeContacts,
        newThisMonth,
      };

      // Cache for 5 minutes
      await this.redis.setJson(cacheKey, stats, 300);

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get contact stats: ${error.message}`);
      throw error;
    }
  }

  async updateLeadScore(id: string, score: number, _tenantId: string) {
    try {
      const contact = await this.prisma.crm_contacts.update({
        where: { id },
        data: {
          leadScore: score,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Lead score updated for contact: ${id}, new score: ${score}`);
      return contact;
    } catch (error) {
      this.logger.error(`Failed to update lead score: ${error.message}`);
      throw error;
    }
  }

  async updateLifecycle(id: string, lifecycle: string, _tenantId: string) {
    try {
      const contact = await this.prisma.crm_contacts.update({
        where: { id },
        data: {
          lifecycle,
          updatedAt: new Date(),
        },
      });

      // Clear cache
      await this.redis.del(`contacts:stats:${_tenantId}`);
      await this.redis.del(`crm:dashboard:stats:${_tenantId}`);

      this.logger.log(`Lifecycle updated for contact: ${id}, new lifecycle: ${lifecycle}`);
      return contact;
    } catch (error) {
      this.logger.error(`Failed to update lifecycle: ${error.message}`);
      throw error;
    }
  }
}

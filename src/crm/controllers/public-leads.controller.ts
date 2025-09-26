// path: backend/src/crm/controllers/public-leads.controller.ts
// purpose: Public endpoint to create marketing leads as CRM contacts (and optional opportunity)

import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactsService, CreateContactDto } from '../services/contacts.service';
import { OpportunitiesService } from '../services/opportunities.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../email/email.service';
import axios from 'axios';

class PublicLeadDto {
  firstName!: string;
  lastName!: string;
  email!: string;
  phone?: string;
  company?: string;
  message?: string;
  interest?: string; // product interest
  source?: string;   // e.g., 'website-contact' | 'website-demo'
  budget?: number;
}

@ApiTags('Public Leads')
@Controller('public/leads')
export class PublicLeadsController {
  constructor(
    private readonly contacts: ContactsService,
    private readonly opps: OpportunitiesService,
    private readonly cfg: ConfigService,
    private readonly email: EmailService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a public marketing lead (contact + optional opportunity)' })
  @ApiResponse({ status: 201, description: 'Lead created' })
  async createLead(@Body() body: PublicLeadDto) {
    const tenantId = this.cfg.get<string>('PUBLIC_TENANT_ID') || this.cfg.get<string>('DEFAULT_TENANT_ID') || 'public-tenant';

    const dto: CreateContactDto = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      company: body.company,
      source: body.source || 'website',
      customFields: {
        message: body.message || null,
        interest: body.interest || null,
        budget: body.budget ?? null,
      },
    };

    const contact = await this.contacts.create(dto, tenantId);

    // Optional: create an opportunity if interest/budget provided
    let opportunity: any = null;
    if (body.interest || body.budget) {
      opportunity = await this.opps.create({
        contactId: contact.id,
        name: body.interest ? `Interest: ${body.interest}` : `New Lead ${contact.email}`,
        value: typeof body.budget === 'number' ? body.budget : 0,
        currency: 'USD',
        stage: 'PROSPECTING',
        probability: 10,
        source: body.source || 'website',
        description: body.message || undefined,
      }, tenantId);
    }

    // Notifications
    try {
      const sales = this.cfg.get<string>('SALES_EMAIL') || this.cfg.get<string>('SMTP_USER');
      if (sales) {
        await this.email.sendEmail({
          to: sales,
          subject: `New Lead: ${body.firstName} ${body.lastName}`,
          html: `
            <h2>New Lead from ${body.source || 'website'}</h2>
            <ul>
              <li><b>Name:</b> ${body.firstName} ${body.lastName}</li>
              <li><b>Email:</b> ${body.email}</li>
              <li><b>Phone:</b> ${body.phone || '-'}</li>
              <li><b>Company:</b> ${body.company || '-'}</li>
              <li><b>Interest:</b> ${body.interest || '-'}</li>
              <li><b>Budget:</b> ${body.budget ?? '-'}</li>
            </ul>
            <p>${(body.message||'').replace(/</g,'&lt;')}</p>
          `,
        });
      }
      const slack = this.cfg.get<string>('SLACK_WEBHOOK_LEADS_URL');
      if (slack) {
        await axios.post(slack, {
          text: `New Lead: ${body.firstName} ${body.lastName} <${body.email}>\nSource: ${body.source || 'website'} | Interest: ${body.interest || '-'} | Budget: ${body.budget ?? '-'} | Company: ${body.company || '-'}`
        });
      }
    } catch {}

    return { contact, opportunity };
  }
}

// path: backend/src/crm/crm.module.ts
// purpose: CRM module configuration
// dependencies: All CRM services and controllers

import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { RedisModule } from "../redis/redis.module";
import { EmailModule } from "../email/email.module";
import { PrismaModule } from "../prisma/prisma.module";

// Controllers
import { CrmController } from "./crm.controller";
import { ContactsController } from "./controllers/contacts.controller";
import { OpportunitiesController } from "./controllers/opportunities.controller";
import { PublicLeadsController } from "./controllers/public-leads.controller";
import { ActivitiesController } from "./controllers/activities.controller";

// Services
import { CrmService } from "./crm.service";
import { ContactsService } from "./services/contacts.service";
import { OpportunitiesService } from "./services/opportunities.service";
import { ActivitiesService } from "./services/activities.service";

@Module({
  imports: [
    PrismaModule,
    DatabaseModule,
    RedisModule,
    EmailModule,
  ],
  controllers: [
    CrmController,
    ContactsController,
    OpportunitiesController,
    PublicLeadsController,
    ActivitiesController,
  ],
  providers: [
    CrmService,
    ContactsService,
    OpportunitiesService,
    ActivitiesService,
  ],
  exports: [
    CrmService,
    ContactsService,
    OpportunitiesService,
    ActivitiesService,
  ],
})
export class CrmModule {}

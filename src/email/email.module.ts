// path: backend/src/email/email.module.ts
// purpose: Email module for sending emails
// dependencies: EmailService

import { Module, Global } from "@nestjs/common";
import { EmailService } from "./email.service";

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
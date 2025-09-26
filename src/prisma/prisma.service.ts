import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  // Compatibility aliases for legacy model names used across modules
  // Note: These return `any` to keep compile-time flexible while we normalize modules.
  get chatMessage(): any { return (this as any).chat_messages; }
  get chatChannel(): any { return (this as any).chatChannel; }
  get sharedFile(): any { return (this as any).sharedFile; }
  get shareLink(): any { return (this as any).shareLink; }
  get fileFolder(): any { return (this as any).officeFolder; }
  get integration(): any { return (this as any).integrations; }
  get integrationExecution(): any { return (this as any).integrationExecution; }
  get scheduledTask(): any { return (this as any).scheduledTask; }
  get taskExecution(): any { return (this as any).taskExecution; }
  get workflowDefinition(): any { return (this as any).workflowDefinition; }
  get workflowExecution(): any { return (this as any).workflowExecution; }
  get businessRule(): any { return (this as any).businessRule; }
  get ruleExecution(): any { return (this as any).ruleExecution; }
  get businessProcess(): any { return (this as any).businessProcess; }
  get processInstance(): any { return (this as any).processInstance; }
  get team(): any { return (this as any).team; }
  get teamInvitation(): any { return (this as any).teamInvitation; }
  get workspace(): any { return (this as any).workspace; }
}
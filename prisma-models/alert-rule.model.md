// Add this to your Prisma schema (schema.prisma)
// AlertRule model for storing automation alert rules

model AlertRule {
  id          String    @id @default(cuid())
  tenantId    String?
  name        String
  metric      String
  condition   String    // 'gt', 'gte', 'lt', 'lte', 'eq', 'ne'
  threshold   Float
  duration    Int       // seconds
  severity    String    // 'info', 'warning', 'error', 'critical'
  enabled     Boolean   @default(true)
  definition  Json?     // Full alert rule definition
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  tenant      Tenant?   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("alert_rules")
  @@index([tenantId])
  @@index([metric])
  @@index([enabled])
}
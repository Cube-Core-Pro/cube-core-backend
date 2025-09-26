-- AlterTable
ALTER TABLE "SiatFlow" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "executionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "generatedCode" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastExecutedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "steps" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'WORKFLOW',
ALTER COLUMN "config" SET DEFAULT '{}';

-- CreateTable
CREATE TABLE "MfaDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_SETUP',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "secretEncrypted" TEXT,
    "iv" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "MfaDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaBackupCode" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "MfaBackupCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiatExecution" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "inputData" JSONB NOT NULL DEFAULT '{}',
    "outputData" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "executedBy" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiatExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiatTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "template" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SiatTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiatPrompt" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "generatedCode" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiatPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "templateId" TEXT,
    "folderId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "allowCollaboration" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "size" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OfficeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT NOT NULL,
    "parentId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OfficeFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCollaborator" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changes" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentComment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseEmail" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "htmlBody" TEXT,
    "from" TEXT NOT NULL,
    "to" TEXT[],
    "cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bcc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "replyTo" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "type" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "folderId" TEXT,
    "requestReadReceipt" BOOLEAN NOT NULL DEFAULT false,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "hasVirus" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "templateId" TEXT,
    "templateVariables" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EnterpriseEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmailFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "htmlBody" TEXT,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "category" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoMeeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "meetingId" TEXT NOT NULL,
    "password" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 60,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "joinUrl" TEXT NOT NULL,
    "hostUrl" TEXT NOT NULL,
    "participants" JSONB NOT NULL DEFAULT '[]',
    "recurrence" JSONB,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "agenda" TEXT,
    "recordingUrl" TEXT,
    "tenantId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakoutRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "participants" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreakoutRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingRecording" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "format" TEXT NOT NULL DEFAULT 'mp4',
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemoteSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sessionId" TEXT NOT NULL,
    "targetHost" TEXT,
    "targetPort" INTEGER,
    "username" TEXT,
    "operatingSystem" TEXT,
    "instanceSize" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 480,
    "connectionUrl" TEXT NOT NULL,
    "vncPort" INTEGER,
    "rdpPort" INTEGER,
    "sshPort" INTEGER,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "allowedUsers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "environmentVariables" JSONB NOT NULL DEFAULT '{}',
    "securitySettings" JSONB NOT NULL DEFAULT '{}',
    "containerId" TEXT,
    "instanceId" TEXT,
    "recordingUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemoteSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MfaDevice_userId_method_idx" ON "MfaDevice"("userId", "method");

-- CreateIndex
CREATE INDEX "MfaBackupCode_deviceId_used_idx" ON "MfaBackupCode"("deviceId", "used");

-- CreateIndex
CREATE INDEX "SiatExecution_flowId_idx" ON "SiatExecution"("flowId");

-- CreateIndex
CREATE INDEX "SiatExecution_tenantId_idx" ON "SiatExecution"("tenantId");

-- CreateIndex
CREATE INDEX "SiatExecution_executedBy_idx" ON "SiatExecution"("executedBy");

-- CreateIndex
CREATE INDEX "SiatExecution_status_idx" ON "SiatExecution"("status");

-- CreateIndex
CREATE INDEX "SiatExecution_startedAt_idx" ON "SiatExecution"("startedAt");

-- CreateIndex
CREATE INDEX "SiatTemplate_tenantId_idx" ON "SiatTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "SiatTemplate_createdBy_idx" ON "SiatTemplate"("createdBy");

-- CreateIndex
CREATE INDEX "SiatTemplate_type_idx" ON "SiatTemplate"("type");

-- CreateIndex
CREATE INDEX "SiatTemplate_deletedAt_idx" ON "SiatTemplate"("deletedAt");

-- CreateIndex
CREATE INDEX "SiatPrompt_tenantId_idx" ON "SiatPrompt"("tenantId");

-- CreateIndex
CREATE INDEX "SiatPrompt_userId_idx" ON "SiatPrompt"("userId");

-- CreateIndex
CREATE INDEX "SiatPrompt_type_idx" ON "SiatPrompt"("type");

-- CreateIndex
CREATE INDEX "SiatPrompt_createdAt_idx" ON "SiatPrompt"("createdAt");

-- CreateIndex
CREATE INDEX "OfficeDocument_tenantId_idx" ON "OfficeDocument"("tenantId");

-- CreateIndex
CREATE INDEX "OfficeDocument_createdBy_idx" ON "OfficeDocument"("createdBy");

-- CreateIndex
CREATE INDEX "OfficeDocument_type_idx" ON "OfficeDocument"("type");

-- CreateIndex
CREATE INDEX "OfficeDocument_folderId_idx" ON "OfficeDocument"("folderId");

-- CreateIndex
CREATE INDEX "OfficeDocument_deletedAt_idx" ON "OfficeDocument"("deletedAt");

-- CreateIndex
CREATE INDEX "OfficeFolder_tenantId_idx" ON "OfficeFolder"("tenantId");

-- CreateIndex
CREATE INDEX "OfficeFolder_parentId_idx" ON "OfficeFolder"("parentId");

-- CreateIndex
CREATE INDEX "OfficeFolder_deletedAt_idx" ON "OfficeFolder"("deletedAt");

-- CreateIndex
CREATE INDEX "DocumentCollaborator_documentId_idx" ON "DocumentCollaborator"("documentId");

-- CreateIndex
CREATE INDEX "DocumentCollaborator_userId_idx" ON "DocumentCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCollaborator_documentId_userId_key" ON "DocumentCollaborator"("documentId", "userId");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE INDEX "DocumentVersion_version_idx" ON "DocumentVersion"("version");

-- CreateIndex
CREATE INDEX "DocumentComment_documentId_idx" ON "DocumentComment"("documentId");

-- CreateIndex
CREATE INDEX "DocumentComment_userId_idx" ON "DocumentComment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseEmail_messageId_key" ON "EnterpriseEmail"("messageId");

-- CreateIndex
CREATE INDEX "EnterpriseEmail_tenantId_idx" ON "EnterpriseEmail"("tenantId");

-- CreateIndex
CREATE INDEX "EnterpriseEmail_userId_idx" ON "EnterpriseEmail"("userId");

-- CreateIndex
CREATE INDEX "EnterpriseEmail_type_idx" ON "EnterpriseEmail"("type");

-- CreateIndex
CREATE INDEX "EnterpriseEmail_isRead_idx" ON "EnterpriseEmail"("isRead");

-- CreateIndex
CREATE INDEX "EnterpriseEmail_isSpam_idx" ON "EnterpriseEmail"("isSpam");

-- CreateIndex
CREATE INDEX "EnterpriseEmail_sentAt_idx" ON "EnterpriseEmail"("sentAt");

-- CreateIndex
CREATE INDEX "EnterpriseEmail_folderId_idx" ON "EnterpriseEmail"("folderId");

-- CreateIndex
CREATE INDEX "EnterpriseEmail_deletedAt_idx" ON "EnterpriseEmail"("deletedAt");

-- CreateIndex
CREATE INDEX "EmailFolder_tenantId_idx" ON "EmailFolder"("tenantId");

-- CreateIndex
CREATE INDEX "EmailFolder_userId_idx" ON "EmailFolder"("userId");

-- CreateIndex
CREATE INDEX "EmailFolder_parentId_idx" ON "EmailFolder"("parentId");

-- CreateIndex
CREATE INDEX "EmailFolder_deletedAt_idx" ON "EmailFolder"("deletedAt");

-- CreateIndex
CREATE INDEX "EmailTemplate_tenantId_idx" ON "EmailTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "EmailTemplate_createdBy_idx" ON "EmailTemplate"("createdBy");

-- CreateIndex
CREATE INDEX "EmailTemplate_category_idx" ON "EmailTemplate"("category");

-- CreateIndex
CREATE INDEX "EmailTemplate_deletedAt_idx" ON "EmailTemplate"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoMeeting_meetingId_key" ON "VideoMeeting"("meetingId");

-- CreateIndex
CREATE INDEX "VideoMeeting_tenantId_idx" ON "VideoMeeting"("tenantId");

-- CreateIndex
CREATE INDEX "VideoMeeting_hostId_idx" ON "VideoMeeting"("hostId");

-- CreateIndex
CREATE INDEX "VideoMeeting_status_idx" ON "VideoMeeting"("status");

-- CreateIndex
CREATE INDEX "VideoMeeting_startTime_idx" ON "VideoMeeting"("startTime");

-- CreateIndex
CREATE INDEX "VideoMeeting_meetingId_idx" ON "VideoMeeting"("meetingId");

-- CreateIndex
CREATE INDEX "BreakoutRoom_meetingId_idx" ON "BreakoutRoom"("meetingId");

-- CreateIndex
CREATE INDEX "BreakoutRoom_tenantId_idx" ON "BreakoutRoom"("tenantId");

-- CreateIndex
CREATE INDEX "BreakoutRoom_createdBy_idx" ON "BreakoutRoom"("createdBy");

-- CreateIndex
CREATE INDEX "MeetingRecording_meetingId_idx" ON "MeetingRecording"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingRecording_tenantId_idx" ON "MeetingRecording"("tenantId");

-- CreateIndex
CREATE INDEX "MeetingRecording_createdAt_idx" ON "MeetingRecording"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RemoteSession_sessionId_key" ON "RemoteSession"("sessionId");

-- CreateIndex
CREATE INDEX "RemoteSession_tenantId_idx" ON "RemoteSession"("tenantId");

-- CreateIndex
CREATE INDEX "RemoteSession_userId_idx" ON "RemoteSession"("userId");

-- CreateIndex
CREATE INDEX "RemoteSession_status_idx" ON "RemoteSession"("status");

-- CreateIndex
CREATE INDEX "RemoteSession_type_idx" ON "RemoteSession"("type");

-- CreateIndex
CREATE INDEX "RemoteSession_sessionId_idx" ON "RemoteSession"("sessionId");

-- CreateIndex
CREATE INDEX "RemoteSession_startedAt_idx" ON "RemoteSession"("startedAt");

-- CreateIndex
CREATE INDEX "SiatFlow_tenantId_idx" ON "SiatFlow"("tenantId");

-- CreateIndex
CREATE INDEX "SiatFlow_createdBy_idx" ON "SiatFlow"("createdBy");

-- CreateIndex
CREATE INDEX "SiatFlow_type_idx" ON "SiatFlow"("type");

-- CreateIndex
CREATE INDEX "SiatFlow_status_idx" ON "SiatFlow"("status");

-- CreateIndex
CREATE INDEX "SiatFlow_deletedAt_idx" ON "SiatFlow"("deletedAt");

-- AddForeignKey
ALTER TABLE "MfaDevice" ADD CONSTRAINT "MfaDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaBackupCode" ADD CONSTRAINT "MfaBackupCode_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "MfaDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiatFlow" ADD CONSTRAINT "SiatFlow_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiatExecution" ADD CONSTRAINT "SiatExecution_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "SiatFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiatExecution" ADD CONSTRAINT "SiatExecution_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiatExecution" ADD CONSTRAINT "SiatExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiatTemplate" ADD CONSTRAINT "SiatTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiatTemplate" ADD CONSTRAINT "SiatTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiatPrompt" ADD CONSTRAINT "SiatPrompt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiatPrompt" ADD CONSTRAINT "SiatPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeDocument" ADD CONSTRAINT "OfficeDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeDocument" ADD CONSTRAINT "OfficeDocument_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeDocument" ADD CONSTRAINT "OfficeDocument_lastModifiedBy_fkey" FOREIGN KEY ("lastModifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeDocument" ADD CONSTRAINT "OfficeDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OfficeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeDocument" ADD CONSTRAINT "OfficeDocument_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "OfficeFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeFolder" ADD CONSTRAINT "OfficeFolder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeFolder" ADD CONSTRAINT "OfficeFolder_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeFolder" ADD CONSTRAINT "OfficeFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OfficeFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCollaborator" ADD CONSTRAINT "DocumentCollaborator_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OfficeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCollaborator" ADD CONSTRAINT "DocumentCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OfficeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OfficeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseEmail" ADD CONSTRAINT "EnterpriseEmail_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseEmail" ADD CONSTRAINT "EnterpriseEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseEmail" ADD CONSTRAINT "EnterpriseEmail_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "EmailFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseEmail" ADD CONSTRAINT "EnterpriseEmail_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailFolder" ADD CONSTRAINT "EmailFolder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailFolder" ADD CONSTRAINT "EmailFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailFolder" ADD CONSTRAINT "EmailFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EmailFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoMeeting" ADD CONSTRAINT "VideoMeeting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoMeeting" ADD CONSTRAINT "VideoMeeting_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakoutRoom" ADD CONSTRAINT "BreakoutRoom_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "VideoMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakoutRoom" ADD CONSTRAINT "BreakoutRoom_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakoutRoom" ADD CONSTRAINT "BreakoutRoom_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRecording" ADD CONSTRAINT "MeetingRecording_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "VideoMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRecording" ADD CONSTRAINT "MeetingRecording_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemoteSession" ADD CONSTRAINT "RemoteSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemoteSession" ADD CONSTRAINT "RemoteSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

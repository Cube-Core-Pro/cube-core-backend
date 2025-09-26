-- path: backend/prisma/migrations/20250112000000_add_enterprise_collaboration_models/migration.sql
-- purpose: Add missing models for enterprise collaboration modules
-- dependencies: Existing schema, Office, Video, WebMail, RDP modules

-- Office Suite additional models
CREATE TABLE IF NOT EXISTS "document_permissions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'READ',
    "expires_at" TIMESTAMP(3),
    "granted_by" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "collaboration_sessions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cursor" JSONB,
    "selection" JSONB,
    "expires_at" TIMESTAMP(3),
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "collaboration_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "collaboration_invitations" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "message" TEXT,
    "expires_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "tenant_id" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "document_activities" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "document_changes" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "document_changes_pkey" PRIMARY KEY ("id")
);

-- Video Conferencing additional models
CREATE TABLE IF NOT EXISTS "meeting_participants" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'attendee',
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "duration" INTEGER DEFAULT 0,
    "is_muted" BOOLEAN DEFAULT false,
    "is_video_on" BOOLEAN DEFAULT true,
    "is_screen_sharing" BOOLEAN DEFAULT false,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "meeting_chat_messages" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "recipient_id" TEXT,
    "metadata" JSONB,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "meeting_polls" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "multiple_choice" BOOLEAN DEFAULT false,
    "anonymous" BOOLEAN DEFAULT false,
    "duration" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "tenant_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),

    CONSTRAINT "meeting_polls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "meeting_poll_responses" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "selected_options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_poll_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "meeting_quality_metrics" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "audio_quality" DOUBLE PRECISION,
    "video_quality" DOUBLE PRECISION,
    "network_latency" DOUBLE PRECISION,
    "packet_loss" DOUBLE PRECISION,
    "bandwidth_usage" DOUBLE PRECISION,
    "cpu_usage" DOUBLE PRECISION,
    "memory_usage" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "meeting_quality_metrics_pkey" PRIMARY KEY ("id")
);

-- WebMail additional models
CREATE TABLE IF NOT EXISTS "email_filters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB NOT NULL,
    "logic" TEXT NOT NULL DEFAULT 'and',
    "actions" JSONB NOT NULL,
    "priority" INTEGER DEFAULT 50,
    "is_active" BOOLEAN DEFAULT true,
    "apply_to_existing" BOOLEAN DEFAULT false,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_filters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_attachments" (
    "id" TEXT NOT NULL,
    "email_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "checksum" TEXT,
    "is_inline" BOOLEAN DEFAULT false,
    "content_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "imap_settings" JSONB NOT NULL,
    "smtp_settings" JSONB NOT NULL,
    "sync_settings" JSONB,
    "security_settings" JSONB,
    "is_default" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "last_sync" TIMESTAMP(3),
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_signatures" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "text_content" TEXT,
    "is_default" BOOLEAN DEFAULT false,
    "use_for_replies" BOOLEAN DEFAULT true,
    "use_for_forwards" BOOLEAN DEFAULT true,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_signatures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "blocked_senders" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_senders_pkey" PRIMARY KEY ("id")
);

-- Remote Desktop additional models
CREATE TABLE IF NOT EXISTS "vdi_instances" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "os_type" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "cpu_cores" INTEGER NOT NULL,
    "ram_gb" INTEGER NOT NULL,
    "storage_gb" INTEGER NOT NULL,
    "network_settings" JSONB,
    "auto_start" BOOLEAN DEFAULT false,
    "auto_shutdown_minutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'stopped',
    "instance_id" TEXT,
    "ip_address" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vdi_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "session_permissions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_level" TEXT NOT NULL DEFAULT 'view_only',
    "expires_at" TIMESTAMP(3),
    "granted_by" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "session_recordings" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER DEFAULT 0,
    "duration" INTEGER DEFAULT 0,
    "format" TEXT DEFAULT 'mp4',
    "status" TEXT DEFAULT 'processing',
    "tenant_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_recordings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "session_metrics" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "cpu_usage" DOUBLE PRECISION,
    "memory_usage" DOUBLE PRECISION,
    "network_latency" DOUBLE PRECISION,
    "bandwidth_usage" DOUBLE PRECISION,
    "screen_resolution" TEXT,
    "frame_rate" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "session_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "session_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "category" TEXT,
    "is_shared" BOOLEAN DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tenant_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_templates_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "document_permissions_document_id_user_id_key" ON "document_permissions"("document_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "collaboration_sessions_document_id_user_id_key" ON "collaboration_sessions"("document_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "meeting_participants_meeting_id_user_id_key" ON "meeting_participants"("meeting_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "meeting_poll_responses_poll_id_user_id_key" ON "meeting_poll_responses"("poll_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "email_accounts_user_id_email_key" ON "email_accounts"("user_id", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "blocked_senders_user_id_email_key" ON "blocked_senders"("user_id", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "session_permissions_session_id_user_id_key" ON "session_permissions"("session_id", "user_id");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "document_permissions_document_id_idx" ON "document_permissions"("document_id");
CREATE INDEX IF NOT EXISTS "document_permissions_user_id_idx" ON "document_permissions"("user_id");
CREATE INDEX IF NOT EXISTS "document_permissions_tenant_id_idx" ON "document_permissions"("tenant_id");

CREATE INDEX IF NOT EXISTS "collaboration_sessions_document_id_idx" ON "collaboration_sessions"("document_id");
CREATE INDEX IF NOT EXISTS "collaboration_sessions_user_id_idx" ON "collaboration_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "collaboration_sessions_is_active_idx" ON "collaboration_sessions"("is_active");
CREATE INDEX IF NOT EXISTS "collaboration_sessions_tenant_id_idx" ON "collaboration_sessions"("tenant_id");

CREATE INDEX IF NOT EXISTS "meeting_participants_meeting_id_idx" ON "meeting_participants"("meeting_id");
CREATE INDEX IF NOT EXISTS "meeting_participants_user_id_idx" ON "meeting_participants"("user_id");
CREATE INDEX IF NOT EXISTS "meeting_participants_tenant_id_idx" ON "meeting_participants"("tenant_id");

CREATE INDEX IF NOT EXISTS "meeting_chat_messages_meeting_id_idx" ON "meeting_chat_messages"("meeting_id");
CREATE INDEX IF NOT EXISTS "meeting_chat_messages_user_id_idx" ON "meeting_chat_messages"("user_id");
CREATE INDEX IF NOT EXISTS "meeting_chat_messages_tenant_id_idx" ON "meeting_chat_messages"("tenant_id");

CREATE INDEX IF NOT EXISTS "email_filters_user_id_idx" ON "email_filters"("user_id");
CREATE INDEX IF NOT EXISTS "email_filters_tenant_id_idx" ON "email_filters"("tenant_id");
CREATE INDEX IF NOT EXISTS "email_filters_is_active_idx" ON "email_filters"("is_active");

CREATE INDEX IF NOT EXISTS "email_attachments_email_id_idx" ON "email_attachments"("email_id");
CREATE INDEX IF NOT EXISTS "email_attachments_tenant_id_idx" ON "email_attachments"("tenant_id");

CREATE INDEX IF NOT EXISTS "vdi_instances_user_id_idx" ON "vdi_instances"("user_id");
CREATE INDEX IF NOT EXISTS "vdi_instances_tenant_id_idx" ON "vdi_instances"("tenant_id");
CREATE INDEX IF NOT EXISTS "vdi_instances_status_idx" ON "vdi_instances"("status");

CREATE INDEX IF NOT EXISTS "session_permissions_session_id_idx" ON "session_permissions"("session_id");
CREATE INDEX IF NOT EXISTS "session_permissions_user_id_idx" ON "session_permissions"("user_id");
CREATE INDEX IF NOT EXISTS "session_permissions_tenant_id_idx" ON "session_permissions"("tenant_id");

-- Add foreign key constraints
ALTER TABLE "document_permissions" ADD CONSTRAINT "document_permissions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "OfficeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_permissions" ADD CONSTRAINT "document_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_permissions" ADD CONSTRAINT "document_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_permissions" ADD CONSTRAINT "document_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collaboration_sessions" ADD CONSTRAINT "collaboration_sessions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "OfficeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_sessions" ADD CONSTRAINT "collaboration_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_sessions" ADD CONSTRAINT "collaboration_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collaboration_invitations" ADD CONSTRAINT "collaboration_invitations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "OfficeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_invitations" ADD CONSTRAINT "collaboration_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_invitations" ADD CONSTRAINT "collaboration_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_activities" ADD CONSTRAINT "document_activities_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "OfficeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_activities" ADD CONSTRAINT "document_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_activities" ADD CONSTRAINT "document_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_changes" ADD CONSTRAINT "document_changes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "OfficeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_changes" ADD CONSTRAINT "document_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_changes" ADD CONSTRAINT "document_changes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "VideoMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_chat_messages" ADD CONSTRAINT "meeting_chat_messages_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "VideoMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_chat_messages" ADD CONSTRAINT "meeting_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_chat_messages" ADD CONSTRAINT "meeting_chat_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meeting_chat_messages" ADD CONSTRAINT "meeting_chat_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_polls" ADD CONSTRAINT "meeting_polls_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "VideoMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_polls" ADD CONSTRAINT "meeting_polls_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_polls" ADD CONSTRAINT "meeting_polls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_poll_responses" ADD CONSTRAINT "meeting_poll_responses_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "meeting_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_poll_responses" ADD CONSTRAINT "meeting_poll_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_poll_responses" ADD CONSTRAINT "meeting_poll_responses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_quality_metrics" ADD CONSTRAINT "meeting_quality_metrics_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "VideoMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_quality_metrics" ADD CONSTRAINT "meeting_quality_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_quality_metrics" ADD CONSTRAINT "meeting_quality_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_filters" ADD CONSTRAINT "email_filters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_filters" ADD CONSTRAINT "email_filters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "EnterpriseEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "blocked_senders" ADD CONSTRAINT "blocked_senders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocked_senders" ADD CONSTRAINT "blocked_senders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vdi_instances" ADD CONSTRAINT "vdi_instances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vdi_instances" ADD CONSTRAINT "vdi_instances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_permissions" ADD CONSTRAINT "session_permissions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "RemoteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_permissions" ADD CONSTRAINT "session_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_permissions" ADD CONSTRAINT "session_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_permissions" ADD CONSTRAINT "session_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "RemoteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_metrics" ADD CONSTRAINT "session_metrics_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "RemoteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_metrics" ADD CONSTRAINT "session_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_templates" ADD CONSTRAINT "session_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_templates" ADD CONSTRAINT "session_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Augment executions table for advanced task scheduler telemetry
ALTER TABLE "executions"
    ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN "executedQuantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "executedPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "metadata" JSONB,
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

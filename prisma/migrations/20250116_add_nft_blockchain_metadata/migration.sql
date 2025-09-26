-- Add blockchain metadata to NFT domain tables
ALTER TABLE "nft_collections"
  ADD COLUMN IF NOT EXISTS "contract_address" TEXT;

ALTER TABLE "nfts"
  ADD COLUMN IF NOT EXISTS "contract_address" TEXT,
  ADD COLUMN IF NOT EXISTS "token_id" TEXT,
  ADD COLUMN IF NOT EXISTS "transaction_hash" TEXT;

-- NOTE: `tenant_id` receives a temporary default; backfill existing rows with the correct tenant before promoting this migration beyond staging.
ALTER TABLE "nft_listings"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "reserve_price" TEXT;

ALTER TABLE "nft_offers"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT '';

ALTER TABLE "nft_transfers"
  ADD COLUMN IF NOT EXISTS "from_address" TEXT,
  ADD COLUMN IF NOT EXISTS "to_address" TEXT;

ALTER TABLE "nft_sales"
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT '';

-- Indexes to support new access patterns
CREATE INDEX IF NOT EXISTS "nfts_contract_address_idx" ON "nfts"("contract_address");
CREATE INDEX IF NOT EXISTS "nfts_token_id_idx" ON "nfts"("token_id");
CREATE INDEX IF NOT EXISTS "nft_listings_tenant_id_idx" ON "nft_listings"("tenant_id");
CREATE INDEX IF NOT EXISTS "nft_offers_tenant_id_idx" ON "nft_offers"("tenant_id");
CREATE INDEX IF NOT EXISTS "nft_sales_tenant_id_idx" ON "nft_sales"("tenant_id");

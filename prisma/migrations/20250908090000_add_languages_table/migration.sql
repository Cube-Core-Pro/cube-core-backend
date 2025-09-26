-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "lang_code" TEXT NOT NULL,
    "lang_key" TEXT NOT NULL,
    "lang_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "languages_lang_code_lang_key_key" ON "languages"("lang_code", "lang_key");
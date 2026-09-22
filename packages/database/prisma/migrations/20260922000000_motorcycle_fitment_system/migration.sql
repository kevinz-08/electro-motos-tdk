-- Sistema de compatibilidad por modelo de moto (docs/seo/, Fase 2).
--
-- Migracion ADITIVA y reversible: crea dos enums, cuatro tablas y cuatro columnas
-- nuevas en "Product". No borra ni modifica ninguna columna, tabla o fila
-- existente. `MotorcycleCompatibility` y `ProductCompatibilityItem` se quedan
-- donde estan.
--
-- Para revertirla basta con:
--   DROP TABLE "Fitment", "OemReference", "MotorcycleModel", "MotorcycleBrand";
--   DROP TYPE "FitmentPosition", "PartType";
--   ALTER TABLE "Product" DROP COLUMN "mpn", DROP COLUMN "partBrand",
--                         DROP COLUMN "partType", DROP COLUMN "warrantyMonths";

-- ── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "FitmentPosition" AS ENUM ('DELANTERA', 'TRASERA', 'AMBAS');

CREATE TYPE "PartType" AS ENUM ('ORIGINAL', 'HOMOLOGADO', 'GENERICO');

-- ── Columnas nuevas de Product (todas opcionales) ───────────────────────────

ALTER TABLE "Product" ADD COLUMN "mpn" TEXT;
ALTER TABLE "Product" ADD COLUMN "partBrand" TEXT;
ALTER TABLE "Product" ADD COLUMN "partType" "PartType";
ALTER TABLE "Product" ADD COLUMN "warrantyMonths" INTEGER;

-- ── Marcas de moto ──────────────────────────────────────────────────────────

CREATE TABLE "MotorcycleBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotorcycleBrand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MotorcycleBrand_name_key" ON "MotorcycleBrand"("name");
CREATE UNIQUE INDEX "MotorcycleBrand_slug_key" ON "MotorcycleBrand"("slug");
CREATE INDEX "MotorcycleBrand_isActive_order_idx" ON "MotorcycleBrand"("isActive", "order");

-- ── Modelos de moto ─────────────────────────────────────────────────────────

CREATE TABLE "MotorcycleModel" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cc" INTEGER,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "intro" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotorcycleModel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MotorcycleModel_slug_idx" ON "MotorcycleModel"("slug");
CREATE INDEX "MotorcycleModel_isActive_idx" ON "MotorcycleModel"("isActive");
CREATE UNIQUE INDEX "MotorcycleModel_brandId_slug_key" ON "MotorcycleModel"("brandId", "slug");
CREATE UNIQUE INDEX "MotorcycleModel_brandId_name_key" ON "MotorcycleModel"("brandId", "name");

ALTER TABLE "MotorcycleModel" ADD CONSTRAINT "MotorcycleModel_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "MotorcycleBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Fitments (producto ↔ modelo) ────────────────────────────────────────────

CREATE TABLE "Fitment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "position" "FitmentPosition" NOT NULL DEFAULT 'AMBAS',
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "notes" TEXT,
    "source" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fitment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Fitment_modelId_verified_idx" ON "Fitment"("modelId", "verified");
CREATE INDEX "Fitment_productId_verified_idx" ON "Fitment"("productId", "verified");
CREATE UNIQUE INDEX "Fitment_productId_modelId_position_key" ON "Fitment"("productId", "modelId", "position");

ALTER TABLE "Fitment" ADD CONSTRAINT "Fitment_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Fitment" ADD CONSTRAINT "Fitment_modelId_fkey"
    FOREIGN KEY ("modelId") REFERENCES "MotorcycleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Referencias OEM ─────────────────────────────────────────────────────────

CREATE TABLE "OemReference" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "manufacturer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OemReference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OemReference_normalized_idx" ON "OemReference"("normalized");
CREATE UNIQUE INDEX "OemReference_productId_normalized_key" ON "OemReference"("productId", "normalized");

ALTER TABLE "OemReference" ADD CONSTRAINT "OemReference_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

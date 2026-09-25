-- Fase 5 (docs/seo/): revisores tecnicos (H-21) y guias de mantenimiento por modelo (H-20).
-- Migracion aditiva y reversible: tres tablas nuevas. Rollback:
--   DROP TABLE "MaintenanceItem";
--   DROP TABLE "MaintenanceGuide";
--   DROP TABLE "TechnicalReviewer";

CREATE TABLE "TechnicalReviewer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT,
    "yearsExperience" INTEGER,
    "bio" TEXT NOT NULL,
    "credentials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photoUrl" TEXT,
    "photoPublicId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalReviewer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TechnicalReviewer_years_range" CHECK ("yearsExperience" IS NULL OR ("yearsExperience" >= 0 AND "yearsExperience" <= 80))
);

CREATE UNIQUE INDEX "TechnicalReviewer_slug_key" ON "TechnicalReviewer"("slug");
CREATE INDEX "TechnicalReviewer_isActive_idx" ON "TechnicalReviewer"("isActive");

CREATE TABLE "MaintenanceGuide" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceGuide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaintenanceGuide_modelId_key" ON "MaintenanceGuide"("modelId");
CREATE INDEX "MaintenanceGuide_reviewerId_idx" ON "MaintenanceGuide"("reviewerId");

ALTER TABLE "MaintenanceGuide" ADD CONSTRAINT "MaintenanceGuide_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "MotorcycleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceGuide" ADD CONSTRAINT "MaintenanceGuide_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "TechnicalReviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MaintenanceItem" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "intervalKm" INTEGER,
    "intervalMonths" INTEGER,
    "notes" TEXT,
    "productId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MaintenanceItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MaintenanceItem_has_interval" CHECK ("intervalKm" IS NOT NULL OR "intervalMonths" IS NOT NULL),
    CONSTRAINT "MaintenanceItem_km_positive" CHECK ("intervalKm" IS NULL OR "intervalKm" > 0),
    CONSTRAINT "MaintenanceItem_months_positive" CHECK ("intervalMonths" IS NULL OR "intervalMonths" > 0)
);

CREATE UNIQUE INDEX "MaintenanceItem_guideId_label_key" ON "MaintenanceItem"("guideId", "label");
CREATE INDEX "MaintenanceItem_guideId_order_idx" ON "MaintenanceItem"("guideId", "order");
CREATE INDEX "MaintenanceItem_productId_idx" ON "MaintenanceItem"("productId");

ALTER TABLE "MaintenanceItem" ADD CONSTRAINT "MaintenanceItem_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "MaintenanceGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceItem" ADD CONSTRAINT "MaintenanceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

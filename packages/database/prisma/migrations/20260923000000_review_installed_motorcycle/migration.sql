-- Reseñas: "¿en qué moto lo instalaste?" (docs/seo/ Fase 4). Migración aditiva y reversible:
-- dos columnas nullable, un índice y una FK. Rollback:
--   ALTER TABLE "ProductReview" DROP CONSTRAINT "ProductReview_installedModelId_fkey";
--   DROP INDEX "ProductReview_installedModelId_idx";
--   ALTER TABLE "ProductReview" DROP COLUMN "installedModelId", DROP COLUMN "installedCity";

ALTER TABLE "ProductReview" ADD COLUMN "installedModelId" TEXT;
ALTER TABLE "ProductReview" ADD COLUMN "installedCity" TEXT;

CREATE INDEX "ProductReview_installedModelId_idx" ON "ProductReview"("installedModelId");

ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_installedModelId_fkey"
  FOREIGN KEY ("installedModelId") REFERENCES "MotorcycleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

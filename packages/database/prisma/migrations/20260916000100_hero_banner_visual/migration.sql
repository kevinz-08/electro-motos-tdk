-- Hero Banner puramente visual con imagen desktop + mobile (Fase 2 CRO, README §22.2)

-- Imagen única → variante desktop
ALTER TABLE "HeroBanner" RENAME COLUMN "imageUrl" TO "desktopImageUrl";
ALTER TABLE "HeroBanner" RENAME COLUMN "imagePublicId" TO "desktopImagePublicId";

-- Variante mobile: se inicializa con la misma imagen; el admin sube luego la vertical.
ALTER TABLE "HeroBanner" ADD COLUMN "mobileImageUrl" TEXT;
ALTER TABLE "HeroBanner" ADD COLUMN "mobileImagePublicId" TEXT;
UPDATE "HeroBanner" SET "mobileImageUrl" = "desktopImageUrl", "mobileImagePublicId" = "desktopImagePublicId";
ALTER TABLE "HeroBanner" ALTER COLUMN "mobileImageUrl" SET NOT NULL;
ALTER TABLE "HeroBanner" ALTER COLUMN "mobileImagePublicId" SET NOT NULL;

-- El título deja de mostrarse pero se conserva como texto alternativo.
ALTER TABLE "HeroBanner" ADD COLUMN "altText" TEXT;
UPDATE "HeroBanner" SET "altText" = "title";
ALTER TABLE "HeroBanner" ALTER COLUMN "altText" SET NOT NULL;

-- El botón CTA pasa a ser obligatorio.
UPDATE "HeroBanner" SET "ctaLabel" = 'Comprar ahora' WHERE "ctaLabel" IS NULL OR "ctaLabel" = '';
ALTER TABLE "HeroBanner" ALTER COLUMN "ctaLabel" SET DEFAULT 'Comprar ahora';
ALTER TABLE "HeroBanner" ALTER COLUMN "ctaLabel" SET NOT NULL;
UPDATE "HeroBanner" SET "ctaUrl" = '/catalogo' WHERE "ctaUrl" IS NULL OR "ctaUrl" = '';
ALTER TABLE "HeroBanner" ALTER COLUMN "ctaUrl" SET NOT NULL;

-- Sin texto superpuesto
ALTER TABLE "HeroBanner" DROP COLUMN "title";
ALTER TABLE "HeroBanner" DROP COLUMN "description";

-- Fase 5 (docs/seo/): articulos (item 1) e Indice de Precios (item 4).
-- Migracion aditiva y reversible: dos enums y dos tablas nuevas. Rollback:
--   DROP TABLE "PriceIndexSnapshot";
--   DROP TABLE "Article";
--   DROP TYPE "ArticleKind";
--   DROP TYPE "ArticleStatus";

CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED');
CREATE TYPE "ArticleKind" AS ENUM ('GUIA', 'COMPARATIVA');

CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "ArticleKind" NOT NULL DEFAULT 'GUIA',
    "directAnswer" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metaDescription" TEXT,
    "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorName" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "modelId" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id"),
    -- Defensa en profundidad de la regla del dominio: publicado implica revisor y fecha de revision.
    CONSTRAINT "Article_published_needs_review" CHECK ("status" <> 'PUBLISHED' OR ("reviewerId" IS NOT NULL AND "reviewedAt" IS NOT NULL))
);

CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
CREATE INDEX "Article_status_idx" ON "Article"("status");
CREATE INDEX "Article_reviewerId_idx" ON "Article"("reviewerId");
CREATE INDEX "Article_modelId_idx" ON "Article"("modelId");

ALTER TABLE "Article" ADD CONSTRAINT "Article_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "TechnicalReviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "Article_modelId_fkey"
  FOREIGN KEY ("modelId") REFERENCES "MotorcycleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PriceIndexSnapshot" (
    "id" TEXT NOT NULL,
    "cutoffDate" DATE NOT NULL,
    "methodologyVersion" INTEGER NOT NULL,
    "productCount" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceIndexSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PriceIndexSnapshot_cutoffDate_key" ON "PriceIndexSnapshot"("cutoffDate");
CREATE INDEX "PriceIndexSnapshot_isPublished_cutoffDate_idx" ON "PriceIndexSnapshot"("isPublished", "cutoffDate");

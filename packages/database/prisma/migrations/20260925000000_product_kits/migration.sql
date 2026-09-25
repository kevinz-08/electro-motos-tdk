-- Kits de productos (docs/seo/plan-kits.md). Migracion aditiva y reversible: dos tablas nuevas.
-- Rollback:
--   DROP TABLE "KitItem";
--   DROP TABLE "Kit";

CREATE TABLE "Kit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "modelId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Kit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Kit_discountCents_non_negative" CHECK ("discountCents" >= 0)
);

CREATE UNIQUE INDEX "Kit_slug_key" ON "Kit"("slug");
CREATE INDEX "Kit_isActive_deletedAt_idx" ON "Kit"("isActive", "deletedAt");
CREATE INDEX "Kit_modelId_idx" ON "Kit"("modelId");

ALTER TABLE "Kit" ADD CONSTRAINT "Kit_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "MotorcycleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "KitItem" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KitItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "KitItem_quantity_positive" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "KitItem_kitId_productId_key" ON "KitItem"("kitId", "productId");
CREATE INDEX "KitItem_kitId_order_idx" ON "KitItem"("kitId", "order");
CREATE INDEX "KitItem_productId_idx" ON "KitItem"("productId");

ALTER TABLE "KitItem" ADD CONSTRAINT "KitItem_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitItem" ADD CONSTRAINT "KitItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

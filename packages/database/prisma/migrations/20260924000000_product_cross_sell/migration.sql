-- Venta cruzada (docs/seo/plan-venta-cruzada.md). Migracion aditiva y reversible: una tabla nueva.
-- Rollback:
--   DROP TABLE "ProductCrossSell";

CREATE TABLE "ProductCrossSell" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "reason" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCrossSell_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductCrossSell_no_self_link" CHECK ("productId" <> "relatedId")
);

CREATE UNIQUE INDEX "ProductCrossSell_productId_relatedId_key" ON "ProductCrossSell"("productId", "relatedId");
CREATE INDEX "ProductCrossSell_productId_order_idx" ON "ProductCrossSell"("productId", "order");
CREATE INDEX "ProductCrossSell_relatedId_idx" ON "ProductCrossSell"("relatedId");

ALTER TABLE "ProductCrossSell" ADD CONSTRAINT "ProductCrossSell_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCrossSell" ADD CONSTRAINT "ProductCrossSell_relatedId_fkey" FOREIGN KEY ("relatedId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

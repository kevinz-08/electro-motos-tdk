-- Reseñas verificadas + solicitud de reseña por correo (Fase 6 CRO, README §22.6)

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "recommends" BOOLEAN NOT NULL,
    "comment" TEXT,
    "authorName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductReview_rating_range" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX "ProductReview_orderItemId_key" ON "ProductReview"("orderItemId");
CREATE INDEX "ProductReview_productId_status_createdAt_idx" ON "ProductReview"("productId", "status", "createdAt");
CREATE INDEX "ProductReview_status_createdAt_idx" ON "ProductReview"("status", "createdAt");

ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "reviewRequestedAt" TIMESTAMP(3);
ALTER TABLE "EmailQueue" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'ORDER_CONFIRMATION';

-- No pedir reseñas de pedidos entregados hace más de 30 días al desplegar
-- (evita una ráfaga de correos a clientes antiguos).
UPDATE "Order" SET "reviewRequestedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'DELIVERED' AND "createdAt" < CURRENT_TIMESTAMP - INTERVAL '30 days';

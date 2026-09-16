-- Contador de unidades vendidas para prueba social (Fase 3 CRO, README §22.3)

ALTER TABLE "Product" ADD COLUMN "soldCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill: unidades de pedidos confirmados (el stock ya se descontó para ellos).
UPDATE "Product" p
SET "soldCount" = sub.total
FROM (
  SELECT oi."productId", SUM(oi."quantity")::INTEGER AS total
  FROM "OrderItem" oi
  JOIN "Order" o ON o."id" = oi."orderId"
  WHERE o."status" IN ('PAID', 'SHIPPED', 'DELIVERED')
  GROUP BY oi."productId"
) sub
WHERE p."id" = sub."productId";

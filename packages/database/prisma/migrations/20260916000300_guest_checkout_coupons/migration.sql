-- Guest checkout + reglas de cupones para invitados (Fases 4 y 5 CRO, README §22.4 y §22.5)

-- ── Order: userId opcional, email de contacto y documento normalizado ─────────
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN "contactEmail" TEXT;
UPDATE "Order" o SET "contactEmail" = lower(u."email") FROM "User" u WHERE u."id" = o."userId";
UPDATE "Order" SET "contactEmail" = '' WHERE "contactEmail" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "contactEmail" SET NOT NULL;

ALTER TABLE "Order" ADD COLUMN "buyerIdKey" TEXT NOT NULL DEFAULT '';
-- Misma normalización que normalizeBuyerIdKey() en packages/domain/src/entities/Order.ts
UPDATE "Order" o
SET "buyerIdKey" = CASE WHEN k.core = '' THEN '' ELSE o."buyerIdType" || ':' || k.core END
FROM (
  SELECT "id",
    CASE "buyerIdType"
      WHEN 'CC'  THEN regexp_replace("buyerIdNumber", '[^0-9]', '', 'g')
      WHEN 'NIT' THEN regexp_replace(split_part("buyerIdNumber", '-', 1), '[^0-9]', '', 'g')
      ELSE upper(regexp_replace("buyerIdNumber", '[^a-zA-Z0-9]', '', 'g'))
    END AS core
  FROM "Order"
) k
WHERE k."id" = o."id";

CREATE INDEX "Order_buyerIdKey_idx" ON "Order"("buyerIdKey");
CREATE INDEX "Order_contactEmail_idx" ON "Order"("contactEmail");

-- ── Coupon: permitir invitados ─────────────────────────────────────────────
ALTER TABLE "Coupon" ADD COLUMN "allowGuest" BOOLEAN NOT NULL DEFAULT false;

-- ── CouponRedemption ───────────────────────────────────────────────────────
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "buyerIdKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "activeUniqueKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");
CREATE UNIQUE INDEX "CouponRedemption_activeUniqueKey_key" ON "CouponRedemption"("activeUniqueKey");
CREATE INDEX "CouponRedemption_couponId_buyerIdKey_status_idx" ON "CouponRedemption"("couponId", "buyerIdKey", "status");
CREATE INDEX "CouponRedemption_couponId_userId_status_idx" ON "CouponRedemption"("couponId", "userId", "status");

ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: un uso por cada pedido histórico con cupón.
-- activeUniqueKey solo para el primer uso activo por (cupón, documento) en cupones con
-- restricción por cliente — evita que duplicados históricos rompan el índice único.
INSERT INTO "CouponRedemption" ("id", "couponId", "orderId", "userId", "buyerIdKey", "status", "activeUniqueKey", "updatedAt")
SELECT
  'cr_' || md5(o."id"),
  c."id",
  o."id",
  o."userId",
  o."buyerIdKey",
  CASE
    WHEN o."status" = 'CANCELLED' THEN 'RELEASED'
    WHEN o."status" = 'PENDING'   THEN 'RESERVED'
    ELSE 'CONFIRMED'
  END,
  CASE
    WHEN o."status" <> 'CANCELLED'
     AND c."restriction" <> 'NONE'
     AND o."buyerIdKey" <> ''
     AND ROW_NUMBER() OVER (
           PARTITION BY c."id", o."buyerIdKey", (o."status" <> 'CANCELLED')
           ORDER BY o."createdAt"
         ) = 1
    THEN c."id" || ':' || o."buyerIdKey"
    ELSE NULL
  END,
  CURRENT_TIMESTAMP
FROM "Order" o
JOIN "Coupon" c ON c."code" = o."couponCode"
WHERE o."couponCode" IS NOT NULL;

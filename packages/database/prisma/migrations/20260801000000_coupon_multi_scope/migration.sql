-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('STORE', 'CATEGORY', 'PRODUCT');

-- AlterTable: add scope column (default PRODUCT for backward compat)
ALTER TABLE "Coupon" ADD COLUMN "scope" "CouponScope" NOT NULL DEFAULT 'PRODUCT';

-- Data migration: coupons with categoryId → scope = CATEGORY
UPDATE "Coupon" SET "scope" = 'CATEGORY' WHERE "categoryId" IS NOT NULL;

-- CreateTable: CouponCategory join table
CREATE TABLE "CouponCategory" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "CouponCategory_pkey" PRIMARY KEY ("id")
);

-- Data migration: move existing categoryId values into CouponCategory rows
INSERT INTO "CouponCategory" ("id", "couponId", "categoryId")
SELECT gen_random_uuid(), "id", "categoryId"
FROM "Coupon"
WHERE "categoryId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CouponCategory_couponId_categoryId_key" ON "CouponCategory"("couponId", "categoryId");
CREATE INDEX "CouponCategory_couponId_idx" ON "CouponCategory"("couponId");

-- AddForeignKey
ALTER TABLE "CouponCategory" ADD CONSTRAINT "CouponCategory_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponCategory" ADD CONSTRAINT "CouponCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old categoryId FK and column from Coupon
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "Coupon_categoryId_fkey";
ALTER TABLE "Coupon" DROP COLUMN "categoryId";

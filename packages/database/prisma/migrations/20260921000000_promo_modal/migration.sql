-- Pop-up promocional de la home (README §25.1)

CREATE TABLE "PromoModal" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "desktopImageUrl" TEXT NOT NULL,
    "desktopImagePublicId" TEXT NOT NULL,
    "mobileImageUrl" TEXT NOT NULL,
    "mobileImagePublicId" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "ctaUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoModal_pkey" PRIMARY KEY ("id")
);

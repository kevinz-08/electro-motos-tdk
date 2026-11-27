-- Imágenes opcionales del kit (desktop y mobile). Aditiva: columnas nulables.
ALTER TABLE "Kit" ADD COLUMN "desktopImageUrl" TEXT,
ADD COLUMN "desktopImagePublicId" TEXT,
ADD COLUMN "mobileImageUrl" TEXT,
ADD COLUMN "mobileImagePublicId" TEXT;

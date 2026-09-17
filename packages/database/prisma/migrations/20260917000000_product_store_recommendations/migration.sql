-- Recomendaciones de clientes de la tienda física, ingresadas desde el admin (README §22.3)
ALTER TABLE "Product" ADD COLUMN "storeRecommendations" INTEGER NOT NULL DEFAULT 0;

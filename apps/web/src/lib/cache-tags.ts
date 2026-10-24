export const CACHE_TAGS = {
  products: 'products',
  categories: 'categories',
  home: 'home',
  catalog: 'catalog',
  orders: 'orders',
  hero: 'hero',
  /** Pop-up promocional de la home (README §25.1). */
  promo: 'promo',
  /** Settings de prueba social / estimación de entrega (README §22.3). */
  settings: 'settings',
  /**
   * Catálogo de motos y compatibilidades (docs/seo/ Fase 2). Invalidarlo afecta a
   * los hubs de modelo, al selector "¿Qué moto tienes?" y a la tabla
   * "Compatible con" de la ficha de producto.
   */
  fitments: 'fitments',
  /** Kits de productos (docs/seo/plan-kits.md, Fase 4 ítem 8). */
  kits: 'kits',
  /** Revisores técnicos y guías de mantenimiento (docs/seo/, Fase 5). */
  guides: 'guides',
  /** Cortes del Índice de Precios (docs/seo/, Fase 5 ítem 4). */
  priceIndex: 'price-index',
  /** Catálogo de ciudades de Vendelo (lo carga un script; nada lo invalida desde la tienda). */
  vendeloCities: 'vendelo-cities',
} as const

/**
 * Tag de la ficha de un producto. Una venta solo cambia el stock de esa ficha:
 * el API invalida `product:<slug>` en vez de `products`, que regeneraría todo el
 * catálogo (README §27). El mismo formato está en
 * apps/api/src/infrastructure/services/StorefrontCacheService.ts.
 */
export const productTag = (slug: string) => `product:${slug}`

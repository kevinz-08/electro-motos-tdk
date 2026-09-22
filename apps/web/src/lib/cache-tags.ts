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
} as const

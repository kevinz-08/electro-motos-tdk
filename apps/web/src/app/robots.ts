/**
 * robots.txt generado — Fase 1 del proyecto SEO (docs/seo/).
 *
 * Antes de esto `/robots.txt` devolvía 404: nada declaraba el sitemap ni
 * protegía las áreas privadas.
 *
 * Criterio:
 *
 *   1. SE PERMITE EXPLÍCITAMENTE a los buscadores y a los crawlers de IA.
 *      Que H2R aparezca en ChatGPT, Perplexity, Gemini y Copilot cuando alguien
 *      pregunta dónde comprar repuestos en Colombia es un objetivo del proyecto
 *      (GEO), así que se nombran uno por uno en vez de dejarlo al comodín.
 *      `Google-Extended` no rastrea: solo controla si Gemini y los AI Overviews
 *      pueden usar el contenido. Permitirlo es deliberado.
 *
 *   2. SE BLOQUEA lo transaccional y lo privado: carrito, checkout, pedidos,
 *      reseñas por pedido, cuenta, panel de administración y los endpoints
 *      internos. Esas rutas ya llevan `noindex`; el robots evita además que se
 *      gaste presupuesto de rastreo en ellas.
 *
 *   3. SE BLOQUEA la búsqueda interna (`?search=`) porque acepta texto libre:
 *      es espacio de rastreo infinito.
 *
 *   4. NO se bloquean los demás filtros del catálogo (`?minPrice=`, `?inStock=`,
 *      `?showAll=`…). Esas URLs se controlan con `noindex, follow` desde
 *      `catalogSeo()` en `lib/seo.ts`, y para que un buscador VEA ese `noindex`
 *      tiene que poder rastrear la página. Bloquearlas aquí sería
 *      contraproducente.
 */
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/** Rutas privadas o transaccionales: no aportan nada al índice. */
const PRIVATE_PATHS = [
  '/admin',
  '/api/',
  '/auth/',
  '/carrito',
  '/checkout',
  '/pedido/',
  '/pedidos',
  '/resena/',
]

/** Búsqueda interna: texto libre = infinitas URLs. */
const SEARCH_PATHS = ['/catalogo?*search=', '/*?search=']

/** Buscadores y crawlers de IA que interesan al negocio (ver docs/seo/00-auditoria.md §6). */
const ALLOWED_BOTS = [
  'Googlebot',
  'Googlebot-Image',
  'Google-Extended',
  'Bingbot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Applebot',
  'DuckDuckBot',
]

export default function robots(): MetadataRoute.Robots {
  const disallow = [...PRIVATE_PATHS, ...SEARCH_PATHS]

  return {
    rules: [
      { userAgent: ALLOWED_BOTS, allow: '/', disallow },
      { userAgent: '*', allow: '/', disallow },
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap-paginas.xml`,
      `${SITE_URL}/sitemap-categorias.xml`,
      `${SITE_URL}/sitemap-productos.xml`,
      `${SITE_URL}/sitemap-modelos.xml`,
      `${SITE_URL}/sitemap-kits.xml`,
      `${SITE_URL}/sitemap-guias.xml`,
    ],
    host: SITE_URL,
  }
}

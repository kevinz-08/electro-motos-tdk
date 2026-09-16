/**
 * Imágenes de OpenGraph por categoría (README §23).
 *
 * Al compartir /catalogo?category=<slug>, la vista previa muestra la imagen de esa
 * categoría o subcategoría. Si el slug no tiene imagen propia se usa la global.
 *
 * El mapa es explícito (no se deriva del slug) porque varios archivos no coinciden
 * con su slug en la BD — ej. `repuestos` → `respuestos.jpg`.
 *
 * Las rutas son relativas: Next las vuelve absolutas con `metadataBase` (layout raíz).
 */
import type { Metadata } from 'next'

type OgImage = { url: string; width: number; height: number; alt: string }

const OG_DIR = '/assets/opengraph'
const SITE_NAME = 'H2R Online Store'

export const DEFAULT_OG_IMAGE: OgImage = {
  url: `${OG_DIR}/op-image.jpg`,
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — Repuestos y accesorios para motos`,
}

/** Todas las imágenes de categoría miden 1280 × 560 (JPEG). */
const CATEGORY_OG_SIZE = { width: 1280, height: 560 } as const

/** slug de categoría o subcategoría → archivo en public/assets/opengraph. */
export const CATEGORY_OG_IMAGES: Readonly<Record<string, string>> = {
  // Categorías raíz
  'accesorios':        'accesorios.jpg',
  'aceites':           'aceites.jpg',
  'llantas':           'llantas.jpg',
  'repuestos':         'respuestos.jpg',
  'sistema-electrico': 'sistema-electrico.jpg',
  // Subcategorías
  'baterias':          'baterias.jpg',
  'bombillas-led':     'bombillos-led.jpg',
  'espejos':           'espejos.jpg',
  'exploradores':      'exploradoras.jpg',
  'filtros-de-aire':   'filtros-aire-alto-flujo.jpg',
  'slider':            'sliders.jpg',
}

/**
 * Imagen de OpenGraph para una categoría/subcategoría.
 * Sin slug o sin imagen registrada → DEFAULT_OG_IMAGE (no hereda la del padre).
 */
export function getCategoryOgImage(slug: string | null | undefined, categoryName?: string): OgImage {
  const file = slug ? CATEGORY_OG_IMAGES[slug] : undefined
  if (!file) return DEFAULT_OG_IMAGE
  return {
    url: `${OG_DIR}/${file}`,
    ...CATEGORY_OG_SIZE,
    alt: categoryName ? `${categoryName} | ${SITE_NAME}` : SITE_NAME,
  }
}

/**
 * Metadata social completa (OpenGraph + Twitter) para una página.
 *
 * Necesario porque en Next el `openGraph` de una página REEMPLAZA el del layout
 * en vez de fusionarse — sin esto se perderían type, locale y siteName.
 */
export function buildSocialMetadata(opts: {
  title: string
  description: string
  image?: OgImage
  /** Ruta relativa de la página (ej. "/catalogo?category=llantas"). */
  url?: string
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = opts.image ?? DEFAULT_OG_IMAGE
  return {
    openGraph: {
      type: 'website',
      locale: 'es_CO',
      siteName: SITE_NAME,
      title: opts.title,
      description: opts.description,
      ...(opts.url && { url: opts.url }),
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
      images: [image.url],
    },
  }
}

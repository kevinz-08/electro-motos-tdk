/**
 * Datos estructurados (JSON-LD) — Fase 3 del proyecto SEO (docs/seo/).
 *
 * Antes de esto, el marcado se escribía a mano dentro de cada página: `Product`
 * en la ficha y, desde la Fase 2, `BreadcrumbList` e `ItemList` en las rutas de
 * modelo. Eso hace fácil que el marcado y lo que se ve se desincronicen, y
 * imposible validarlo de una vez. Aquí se construye todo, tipado y en un sitio.
 *
 * DOS REGLAS QUE GOBIERNAN ESTE ARCHIVO
 *
 *   1. **Nada que no se pueda sostener.** Un `OfferShippingDetails` con tiempos
 *      inventados es peor que no tenerlo: Google lo contrasta con la realidad
 *      del envío y penaliza la diferencia. Por eso cada campo opcional sale de
 *      la base de datos, de `Settings` o de una página legal publicada, y si el
 *      dato no existe **el campo se omite**, nunca se rellena con un valor
 *      plausible.
 *
 *   2. **El marcado refleja lo visible.** Las migas, el FAQ y las listas se
 *      generan de los mismos datos que pinta la página, no de una copia
 *      paralela que pueda quedar desfasada.
 *
 * De dónde sale cada dato del negocio está anotado en `ORGANIZATION`.
 */
import type {
  FitmentWithModel,
  MotorcycleModelWithBrand,
  OemReference,
  Product,
} from '@h2r/domain'
import { formatYearRange } from '@h2r/domain'
import { absoluteUrl, SITE_NAME, SITE_URL } from './seo'

/** Un nodo JSON-LD cualquiera. Se mantiene laxo a propósito: schema.org es abierto. */
export type JsonLdNode = Record<string, unknown>

/**
 * Serializa el JSON-LD para meterlo en un `<script>`.
 *
 * El escape de `<` no es cosmético: sin él, una descripción de producto que
 * contenga `</script>` cerraría la etiqueta antes de tiempo y rompería la
 * página (o algo peor).
 */
export function serializeJsonLd(data: JsonLdNode | JsonLdNode[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/** Quita las claves `undefined` para no emitir campos vacíos. */
function compact<T extends JsonLdNode>(node: T): T {
  return Object.fromEntries(Object.entries(node).filter(([, v]) => v !== undefined)) as T
}

// ── Datos del negocio ────────────────────────────────────────────────────────

/**
 * Identidad de H2R. Es la fuente de la coherencia de entidad que pide el brief:
 * el mismo nombre, NIT, dirección y teléfono aquí, en el pie de página y en las
 * páginas legales. Un motor generativo que vea tres variantes de la dirección no
 * reconoce una sola empresa.
 *
 * Procedencia de cada dato:
 *   - Razón social, NIT, dirección, teléfono y email → brief (docs/seo/AGENT-BRIEF.md §2).
 *   - Perfiles sociales → los tres que ya publica el pie de página del sitio,
 *     verificados uno por uno (responden 200). Mercado Libre queda fuera a
 *     propósito: la URL del brief devuelve 404 y, confirmado el 2026-09-22,
 *     no se va a agregar por ahora (tarea H-12, cerrada con esa decisión).
 */
export const ORGANIZATION = {
  name: SITE_NAME,
  legalName: 'H2R Online Store',
  taxId: '1007784964-5',
  email: 'h2ronlinestore@gmail.com',
  telephone: '+57 315 292 6609',
  address: {
    street: 'Carrera 21 #21-58',
    locality: 'Bucaramanga',
    region: 'Santander',
    country: 'CO',
  },
  sameAs: [
    'https://www.instagram.com/h2r.onlinestore/',
    'https://www.facebook.com/h2ronlinestore',
    'https://www.tiktok.com/@h2ronlinestore',
  ],
} as const

const ORGANIZATION_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

// ── Organization y WebSite (layout raíz) ─────────────────────────────────────

/**
 * `Organization` con NIT, dirección real y cobertura nacional.
 *
 * `@type` declara **los dos tipos a la vez** (`Organization` y `LocalBusiness`):
 * confirmado el 2026-09-22 que hay un punto físico real en la dirección
 * registrada y que ahí se pueden recoger pedidos (tarea H-10, cerrada).
 * `LocalBusiness` no exige horario de atención ni coordenadas geográficas para
 * ser válido — esos dos datos no están confirmados, así que se omiten en vez
 * de estimarlos; se pueden añadir después sin tocar el resto del nodo.
 */
export function organizationJsonLd(): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness'],
    '@id': ORGANIZATION_ID,
    name: ORGANIZATION.name,
    legalName: ORGANIZATION.legalName,
    taxID: ORGANIZATION.taxId,
    url: SITE_URL,
    logo: absoluteUrl('/assets/logo.webp'),
    email: ORGANIZATION.email,
    telephone: ORGANIZATION.telephone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: ORGANIZATION.address.street,
      addressLocality: ORGANIZATION.address.locality,
      addressRegion: ORGANIZATION.address.region,
      addressCountry: ORGANIZATION.address.country,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: ORGANIZATION.telephone,
      email: ORGANIZATION.email,
      areaServed: 'CO',
      availableLanguage: 'es',
    },
    areaServed: { '@type': 'Country', name: 'Colombia' },
    sameAs: [...ORGANIZATION.sameAs],
  }
}

/**
 * `WebSite` + `SearchAction` hacia el buscador interno.
 *
 * La URL de búsqueda es `/catalogo?search=`, que es la que existe de verdad.
 * Ojo con la coherencia: esas URLs llevan `noindex` (Fase 1) porque son espacio
 * de rastreo infinito, pero eso no impide declarar la acción de búsqueda — son
 * cosas distintas: una es para el usuario, la otra para el índice.
 */
export function webSiteJsonLd(): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'es-CO',
    publisher: { '@id': ORGANIZATION_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/catalogo?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

// ── Producto ─────────────────────────────────────────────────────────────────

export interface ProductJsonLdInput {
  product: Product & {
    mpn?: string | null
    partBrand?: string | null
    warrantyMonths?: number | null
  }
  /** Descripción efectiva ya resuelta por la página. */
  description: string
  /** URLs absolutas de las imágenes. */
  images: string[]
  /** Compatibilidades **verificadas**. Las no verificadas no llegan aquí. */
  fitments: FitmentWithModel[]
  oemReferences: OemReference[]
  /** Solo si supera el umbral de reseñas reales aprobadas. */
  rating?: { average: number; count: number } | null
  /** Ventana de entrega en días hábiles, leída de `Settings`. */
  deliveryDays?: { min: number; max: number } | null
}

/**
 * Entidad `Motorcycle` por cada moto compatible verificada.
 *
 * Esto es lo que permite que un motor generativo responda "¿qué pastillas le
 * sirven a una XR190L?": sin ello, la compatibilidad solo existe como texto en
 * una tabla. `vehicleModelDate` se declara únicamente cuando hay años
 * confirmados, del fitment o del modelo.
 */
function motorcycleNode(fitment: FitmentWithModel): JsonLdNode {
  const model: MotorcycleModelWithBrand = fitment.model
  const years =
    formatYearRange({ yearFrom: fitment.yearFrom, yearTo: fitment.yearTo }) ??
    formatYearRange({ yearFrom: model.yearFrom, yearTo: model.yearTo })

  return compact({
    '@type': 'Motorcycle',
    name: `${model.brand.name} ${model.name}`,
    brand: { '@type': 'Brand', name: model.brand.name },
    model: model.name,
    vehicleModelDate: years ?? undefined,
    vehicleEngine:
      model.cc !== null
        ? { '@type': 'EngineSpecification', engineDisplacement: { '@type': 'QuantitativeValue', value: model.cc, unitCode: 'CMQ' } }
        : undefined,
    url: absoluteUrl(`/repuestos/${model.brand.slug}/${model.slug}`),
  })
}

/**
 * Detalles de envío.
 *
 * Solo se declara la **ventana de entrega**, que sale de `Settings` (el mismo
 * dato que la ficha muestra al comprador). **No se declara `shippingRate`**: el
 * flete se cotiza por ciudad con la transportadora y no existe una tarifa plana
 * que se pueda afirmar. Cuando el negocio confirme costos reales por ciudad
 * (tarea H-13) se añade aquí.
 */
function shippingDetailsNode(days: { min: number; max: number }): JsonLdNode {
  return {
    '@type': 'OfferShippingDetails',
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'CO' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: days.min,
        maxValue: days.max,
        unitCode: 'DAY',
      },
    },
  }
}

/**
 * Política de devoluciones.
 *
 * Los 5 días salen de la página legal publicada (`/legal/politica-de-cambios`)
 * y fueron reconfirmados el 2026-09-22 (siguen vigentes, tarea H-15 cerrada).
 *
 * **`returnFees` se sigue omitiendo, ahora por un motivo distinto**: no es que
 * el dato falte, es que la política real **no es un valor fijo** — quién paga
 * el flete de devolución se evalúa caso por caso por WhatsApp según la
 * gravedad (a veces el cliente, a veces H2R). El enum de schema.org
 * (`FreeReturn`, `ReturnFeesCustomerResponsibility`…) no tiene una opción para
 * "depende"; declarar cualquiera de esos valores sería afirmar una regla fija
 * que no existe. Se mantiene fuera del JSON-LD a propósito.
 *
 * También confirmado (H-16): **no existe** la política "si no le sirve a tu
 * moto, te lo cambiamos" — nunca se publicó, y no hay que agregarla.
 */
function returnPolicyNode(): JsonLdNode {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'CO',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 5,
    returnMethod: 'https://schema.org/ReturnByMail',
    merchantReturnLink: absoluteUrl('/legal/politica-de-cambios'),
  }
}

export function productJsonLd({
  product,
  description,
  images,
  fitments,
  oemReferences,
  rating,
  deliveryDays,
}: ProductJsonLdInput): JsonLdNode {
  const url = absoluteUrl(`/producto/${product.slug}`)

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    // `mpn` y `brand` solo si el producto los tiene cargados (tarea H-18).
    mpn: product.mpn ?? undefined,
    brand: product.partBrand ? { '@type': 'Brand', name: product.partBrand } : undefined,
    image: images,
    description: description.slice(0, 500),
    url,
    // Referencias originales: quien busca por número de parte las reconoce.
    ...(oemReferences.length > 0
      ? { isSimilarTo: oemReferences.map((r) => ({ '@type': 'Product', name: r.reference })) }
      : {}),
    // El corazón del negocio: para qué motos sirve este repuesto.
    ...(fitments.length > 0
      ? { isAccessoryOrSparePartFor: fitments.map(motorcycleNode) }
      : {}),
    offers: compact({
      '@type': 'Offer',
      url,
      priceCurrency: 'COP',
      price: (product.price / 100).toFixed(0),
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': ORGANIZATION_ID },
      shippingDetails: deliveryDays ? shippingDetailsNode(deliveryDays) : undefined,
      hasMerchantReturnPolicy: returnPolicyNode(),
    }),
    // AggregateRating solo con reseñas reales aprobadas por encima del umbral:
    // un rating sin reseñas visibles es motivo de penalización, además de mentira.
    aggregateRating: rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: rating.average,
          reviewCount: rating.count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
  })
}

// ── Kits (docs/seo/plan-kits.md, Fase 4 ítem 8) ──────────────────────────────

export interface KitJsonLdInput {
  name: string
  slug: string
  description: string | null
  /** Centavos COP. */
  price: number
  availableUnits: number
  images: string[]
}

/**
 * `Product` de un kit. Mismo criterio que `productJsonLd`: solo se llama para
 * kits ya visibles (disponibilidad > 0), así que `availability` es siempre
 * `InStock` — un kit sin disponibilidad no se publica y no llega aquí.
 */
export function kitJsonLd(kit: KitJsonLdInput): JsonLdNode {
  const url = absoluteUrl(`/kits/${kit.slug}`)
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: kit.name,
    image: kit.images,
    description: (kit.description ?? kit.name).slice(0, 500),
    url,
    offers: compact({
      '@type': 'Offer',
      url,
      priceCurrency: 'COP',
      price: (kit.price / 100).toFixed(0),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': ORGANIZATION_ID },
      hasMerchantReturnPolicy: returnPolicyNode(),
    }),
  })
}

/** `ItemList` de `/kits`, en el orden en que se ven. */
export function kitItemListJsonLd(kits: { name: string; slug: string }[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Kits de mantenimiento',
    numberOfItems: kits.length,
    itemListElement: kits.map((kit, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(`/kits/${kit.slug}`),
      name: kit.name,
    })),
  }
}

// ── Revisores y guías de mantenimiento (docs/seo/, Fase 5) ────────────────────

export interface PersonJsonLdInput {
  name: string
  slug: string
  headline: string | null
  bio: string
  credentials: string[]
  photoUrl: string | null
}

/**
 * `Person` de un revisor técnico (`/autores/[slug]`). Solo lleva lo que el
 * administrador escribió: los años de experiencia van en el texto visible, no
 * como propiedad, porque schema.org no tiene un campo estándar para ellos y
 * inventar uno sería marcado que no corresponde a nada.
 */
export function personJsonLd(person: PersonJsonLdInput): JsonLdNode {
  const url = absoluteUrl(`/autores/${person.slug}`)
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${url}#person`,
    name: person.name,
    url,
    jobTitle: person.headline ?? undefined,
    description: person.bio.slice(0, 500),
    image: person.photoUrl ?? undefined,
    hasCredential:
      person.credentials.length > 0
        ? person.credentials.map((c) => ({ '@type': 'EducationalOccupationalCredential', name: c }))
        : undefined,
    worksFor: { '@id': ORGANIZATION_ID },
  })
}

export interface MaintenanceGuideJsonLdInput {
  brandSlug: string
  modelSlug: string
  title: string
  description: string
  /** ISO. */
  reviewedAt: string
  reviewer: { name: string; slug: string }
  itemLabels: string[]
}

/**
 * `WebPage` de una guía de mantenimiento con `reviewedBy` y `lastReviewed`:
 * las dos propiedades estándar de schema.org para "esta página la revisó
 * alguien con nombre, en esta fecha" — el marcado de E-E-A-T de la Fase 5. La
 * fecha sale de la revisión que registró el administrador, no de la de hoy.
 */
export function maintenanceGuideJsonLd(guide: MaintenanceGuideJsonLdInput): JsonLdNode {
  const url = absoluteUrl(`/guias/mantenimiento/${guide.brandSlug}/${guide.modelSlug}`)
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url,
    url,
    name: guide.title,
    description: guide.description,
    inLanguage: 'es-CO',
    lastReviewed: guide.reviewedAt.slice(0, 10),
    dateModified: guide.reviewedAt,
    reviewedBy: { '@id': `${absoluteUrl(`/autores/${guide.reviewer.slug}`)}#person`, '@type': 'Person', name: guide.reviewer.name },
    publisher: { '@id': ORGANIZATION_ID },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Puntos de control de mantenimiento',
      numberOfItems: guide.itemLabels.length,
      itemListElement: guide.itemLabels.map((name, index) => ({ '@type': 'ListItem', position: index + 1, name })),
    },
  }
}

// ── Migas, listados y FAQ ────────────────────────────────────────────────────

export interface BreadcrumbEntry {
  label: string
  /** Sin `href` = página actual. */
  href?: string
}

export function breadcrumbJsonLd(items: BreadcrumbEntry[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) =>
      compact({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: item.href ? absoluteUrl(item.href) : undefined,
      }),
    ),
  }
}

/** `ItemList` de un listado. Recibe los productos **en el orden en que se ven**. */
export function itemListJsonLd(
  name: string,
  products: Pick<Product, 'name' | 'slug'>[],
): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(`/producto/${product.slug}`),
      name: product.name,
    })),
  }
}

/**
 * `FAQPage`. Se construye con las mismas preguntas que pinta el acordeón: el
 * marcado tiene que coincidir con el contenido visible, o Google lo trata como
 * spam estructurado.
 */
export function faqPageJsonLd(items: { q: string; a: string }[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
}

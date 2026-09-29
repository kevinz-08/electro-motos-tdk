/**
 * Feed de Google Merchant Center (docs/seo/, Fase 7).
 *
 * TypeScript puro: decide, producto por producto, si entra al feed y con qué
 * datos, o por qué queda fuera. La web lo serializa a XML; el panel muestra los
 * excluidos con su motivo para que el negocio sepa qué completar.
 *
 * Reglas (ROADMAP Fase 7):
 *   - Solo productos activos, con stock, precio y al menos una imagen: un feed
 *     con productos agotados o sin foto se rechaza entero.
 *   - Marca obligatoria (`partBrand`, H-18). Sin marca el producto se excluye:
 *     inventar una ("H2R", "genérico") viola las políticas de Google.
 *   - Sin MPN el producto entra con `identifier_exists = no` y un aviso: Google
 *     puede limitar su visibilidad.
 *   - Título: "[Repuesto] [marca] para [Marca Modelo cc]" con las motos de las
 *     compatibilidades VERIFICADAS (máx. 150 caracteres).
 *   - `product_type`: "Marca > Modelo > Categoría" desde la primera
 *     compatibilidad verificada; sin ninguna, "Categoría padre > Categoría".
 */

export const MERCHANT_TITLE_MAX_LENGTH = 150
export const MERCHANT_DESCRIPTION_MAX_LENGTH = 5000
export const MERCHANT_MAX_ADDITIONAL_IMAGES = 10

/**
 * Categoría de Google por slug de categoría del catálogo. IDs tomados de la
 * taxonomía oficial (taxonomy-with-ids.es-ES.txt, septiembre 2026). Una
 * subcategoría sin entrada usa la de su padre; si tampoco hay, la genérica 899.
 */
export const GOOGLE_PRODUCT_CATEGORY_BY_SLUG: Readonly<Record<string, number>> = {
  // Piezas para vehículos motorizados > Sistemas eléctricos
  'sistema-electrico': 8231, baterias: 8231, cdi: 8231, bobinas: 8231, estatores: 8231, 'motores-de-arranque': 8231,
  motores: 8231, ramales: 8231, reguladores: 8231, conectores: 8231,
  sensores: 8234, // Sensores e indicadores
  // Luces
  'bombillas-led': 3318, stop: 3318, exploradores: 3318,
  espejos: 2642, // Espejos
  // Neumáticos para motocicletas
  llantas: 6091, sky: 6091, kontrol: 6091, dunlop: 6091,
  // Aceite de motor
  aceites: 3044, liquimoly: 3044, castrol: 3044,
  // Piezas del motor
  repuestos: 899, 'repuestos-motor': 2820, bujias: 2820, 'filtro-de-aire': 2820, 'filtros-de-aire': 2820,
  frenos: 2977, // Frenos
  // Carrocería y chasis
  fender: 8227, slider: 8227,
  // Equipo de protección para motociclistas
  balaclavas: 5547, seguridad: 5547,
  accesorios: 899, 'accesorios-generales': 899,
}
export const DEFAULT_GOOGLE_PRODUCT_CATEGORY = 899 // Piezas para vehículos motorizados

export interface MerchantFitmentRef {
  brandName: string
  modelName: string
  cc: number | null
}

export interface MerchantProductInput {
  sku: string
  name: string
  slug: string
  description: string
  /** Centavos COP. */
  price: number
  compareAtPrice: number | null
  stock: number
  /** URLs absolutas ya resueltas (Cloudinary). */
  imageUrls: string[]
  isActive: boolean
  deleted: boolean
  category: { slug: string; name: string }
  parentCategory: { slug: string; name: string } | null
  partBrand: string | null
  mpn: string | null
  /** Solo compatibilidades verificadas. */
  fitments: MerchantFitmentRef[]
}

export interface MerchantFeedItem {
  id: string
  title: string
  description: string
  link: string
  imageLink: string
  additionalImageLinks: string[]
  availability: 'in_stock'
  /** "123000.00 COP" */
  price: string
  salePrice: string | null
  condition: 'new'
  brand: string
  mpn: string | null
  identifierExists: boolean
  googleProductCategory: number
  productType: string
}

export type MerchantFeedDecision =
  | { included: true; item: MerchantFeedItem; warnings: string[] }
  | { included: false; reasons: string[] }

/** "12300000" centavos → "123000.00 COP". */
export function formatMerchantPrice(cents: number): string {
  return `${(Math.round(cents) / 100).toFixed(2)} COP`
}

/** Quita etiquetas HTML y espacios repetidos. */
export function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

const SMALL_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'o', 'para', 'con', 'en', 'a', 'al', 'por', 'sin'])

/**
 * Google rechaza títulos con uso excesivo de mayúsculas, y el catálogo tiene
 * los nombres en MAYÚSCULAS. Si más del 70 % de las letras son mayúsculas, se
 * pasa a formato título conservando lo que parece sigla o código: palabras con
 * dígitos (6P, 2007-2012, CB190) y palabras de hasta 3 letras que no sean
 * artículos o preposiciones (XTZ, CDI, LED, NGK). Un nombre ya escrito con
 * mayúsculas y minúsculas no se toca.
 */
export function normalizeTitleCase(name: string): string {
  const letters = name.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '')
  if (!letters) return name
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, '').length
  if (upper / letters.length <= 0.7) return name

  return name
    .split(/(\s+)/)
    .map((word, i) => {
      if (/^\s+$/.test(word) || /\d/.test(word)) return word
      const lower = word.toLocaleLowerCase('es-CO')
      const bare = lower.replace(/[^a-záéíóúüñ]/g, '')
      if (i > 0 && SMALL_WORDS.has(bare)) return lower
      if (bare.length > 0 && bare.length <= 3 && !SMALL_WORDS.has(bare)) return word
      return lower.charAt(0).toLocaleUpperCase('es-CO') + lower.slice(1)
    })
    .join('')
}

const fitmentLabel = (f: MerchantFitmentRef) => `${f.brandName} ${f.modelName}${f.cc && !f.modelName.includes(String(f.cc)) ? ` ${f.cc}cc` : ''}`

/**
 * "[Repuesto] [marca] para [Marca Modelo cc]". La marca no se repite si el
 * nombre ya la dice; las motos se agregan mientras quepan en 150 caracteres.
 */
export function buildMerchantTitle(name: string, brand: string, fitments: MerchantFitmentRef[]): string {
  const base = normalizeTitleCase(name.trim())
  const withBrand = base.toLowerCase().includes(brand.toLowerCase()) ? base : `${base} ${brand}`
  let title = withBrand
  const models = [...new Set(fitments.map(fitmentLabel))]
  for (let i = 0; i < models.length; i++) {
    const candidate = `${withBrand} para ${models.slice(0, i + 1).join(', ')}`
    if (candidate.length > MERCHANT_TITLE_MAX_LENGTH) break
    title = candidate
  }
  return title.slice(0, MERCHANT_TITLE_MAX_LENGTH)
}

export function googleCategoryFor(category: { slug: string }, parent: { slug: string } | null): number {
  return (
    GOOGLE_PRODUCT_CATEGORY_BY_SLUG[category.slug] ??
    (parent ? GOOGLE_PRODUCT_CATEGORY_BY_SLUG[parent.slug] : undefined) ??
    DEFAULT_GOOGLE_PRODUCT_CATEGORY
  )
}

export function buildProductType(input: Pick<MerchantProductInput, 'fitments' | 'category' | 'parentCategory'>): string {
  const [first] = input.fitments
  if (first) return `${first.brandName} > ${first.modelName} > ${input.category.name}`
  return input.parentCategory ? `${input.parentCategory.name} > ${input.category.name}` : input.category.name
}

export function evaluateMerchantProduct(product: MerchantProductInput, siteUrl: string): MerchantFeedDecision {
  const reasons: string[] = []
  if (!product.isActive || product.deleted) reasons.push('Producto inactivo o en la papelera')
  if (!(product.price > 0)) reasons.push('Sin precio')
  if (product.stock <= 0) reasons.push('Agotado')
  if (product.imageUrls.length === 0) reasons.push('Sin imagen')
  const brand = product.partBrand?.trim()
  if (!brand) reasons.push('Falta la marca del repuesto (H-18)')
  if (reasons.length > 0 || !brand) return { included: false, reasons }

  const warnings: string[] = []
  const mpn = product.mpn?.trim() || null
  if (!mpn) warnings.push('Sin MPN: entra con identifier_exists = no y Google puede limitar su visibilidad')
  if (product.fitments.length === 0) warnings.push('Sin compatibilidades verificadas: el título no dice para qué moto es')

  const description = toPlainText(product.description) || product.name
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price

  return {
    included: true,
    warnings,
    item: {
      id: product.sku,
      title: buildMerchantTitle(product.name, brand, product.fitments),
      description: description.slice(0, MERCHANT_DESCRIPTION_MAX_LENGTH),
      link: `${siteUrl.replace(/\/$/, '')}/producto/${product.slug}`,
      imageLink: product.imageUrls[0]!,
      additionalImageLinks: product.imageUrls.slice(1, 1 + MERCHANT_MAX_ADDITIONAL_IMAGES),
      availability: 'in_stock',
      price: formatMerchantPrice(onSale ? product.compareAtPrice! : product.price),
      salePrice: onSale ? formatMerchantPrice(product.price) : null,
      condition: 'new',
      brand,
      mpn,
      identifierExists: mpn !== null,
      googleProductCategory: googleCategoryFor(product.category, product.parentCategory),
      productType: buildProductType(product),
    },
  }
}

export interface MerchantFeedReport {
  items: MerchantFeedItem[]
  included: Array<{ sku: string; name: string; warnings: string[] }>
  excluded: Array<{ sku: string; name: string; reasons: string[] }>
  /** Cuántos productos quedan fuera por cada motivo. */
  reasonCounts: Record<string, number>
}

export function buildMerchantFeed(products: MerchantProductInput[], siteUrl: string): MerchantFeedReport {
  const report: MerchantFeedReport = { items: [], included: [], excluded: [], reasonCounts: {} }
  for (const product of products) {
    const decision = evaluateMerchantProduct(product, siteUrl)
    if (decision.included) {
      report.items.push(decision.item)
      report.included.push({ sku: product.sku, name: product.name, warnings: decision.warnings })
    } else {
      report.excluded.push({ sku: product.sku, name: product.name, reasons: decision.reasons })
      for (const reason of decision.reasons) report.reasonCounts[reason] = (report.reasonCounts[reason] ?? 0) + 1
    }
  }
  return report
}

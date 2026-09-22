/**
 * Entidades del sistema de compatibilidad por modelo de moto (docs/seo/, Fase 2).
 *
 * En repuestos de moto, la compra gira alrededor de una sola pregunta:
 * "¿esto le sirve a mi moto?". Estas entidades son la respuesta estructurada a
 * esa pregunta, y de ellas salen los hubs de modelo, la tabla "Compatible con"
 * de la ficha y el badge de compatibilidad.
 *
 * REGLA CENTRAL, que atraviesa todo el módulo: **solo se publica un `Fitment`
 * con `verified === true`**. Una compatibilidad equivocada genera una devolución
 * y destruye la confianza del comprador, así que el dato sin verificar puede
 * existir (cargado de un CSV, pendiente de revisión) pero nunca se muestra ni se
 * indexa. Esa decisión vive en `isPublishable()`, no repartida por la UI.
 *
 * Sin Prisma ni ninguna dependencia externa: TypeScript puro.
 */

/** Posición de montaje. Relevante en frenos, llantas, rines y suspensión. */
export type FitmentPosition = 'DELANTERA' | 'TRASERA' | 'AMBAS'

/** Tipo de repuesto respecto al fabricante de la moto. */
export type PartType = 'ORIGINAL' | 'HOMOLOGADO' | 'GENERICO'

/** Marca de motocicleta. Ej: AKT, Bajaj, Honda. */
export interface MotorcycleBrand {
  id: string
  /** Nombre comercial. Ej: "AKT" */
  name: string
  /** Slug de la URL /repuestos/<slug>. Ej: "akt" */
  slug: string
  order: number
  isActive: boolean
}

/** Modelo concreto. Ej: AKT NKD 125. */
export interface MotorcycleModel {
  id: string
  brandId: string
  /** Nombre sin la marca. Ej: "NKD 125" */
  name: string
  /** Slug único dentro de la marca. Ej: "nkd-125" */
  slug: string
  /** Cilindrada en cc. `null` mientras no esté confirmada — nunca se estima. */
  cc: number | null
  yearFrom: number | null
  yearTo: number | null
  /** Cómo lo escribe la gente: ["NKD", "AK125NKD", "NKD 125 EIII"]. */
  aliases: string[]
  /** Introducción del hub, escrita por un humano. `null` = el hub va sin introducción. */
  intro: string | null
  isActive: boolean
}

/** Modelo con su marca resuelta — lo que consumen las rutas y el selector. */
export interface MotorcycleModelWithBrand extends MotorcycleModel {
  brand: MotorcycleBrand
}

/** Compatibilidad de un producto con un modelo. */
export interface Fitment {
  id: string
  productId: string
  modelId: string
  position: FitmentPosition
  /** Acota la compatibilidad a un rango de años. `null` = todos los años del modelo. */
  yearFrom: number | null
  yearTo: number | null
  /** Matiz de versión. Ej: "solo versión carburada". */
  notes: string | null
  /** De dónde sale el dato. Obligatorio: sin fuente no hay verificación posible. */
  source: string
  verified: boolean
  verifiedAt: Date | null
  verifiedBy: string | null
}

/** Fitment con el modelo y la marca resueltos, para pintar "Compatible con". */
export interface FitmentWithModel extends Fitment {
  model: MotorcycleModelWithBrand
}

/** Referencia original del fabricante. */
export interface OemReference {
  id: string
  productId: string
  /** Tal como la imprime el fabricante, con sus guiones. Ej: "5VL-F5121-00" */
  reference: string
  /** En mayúsculas y sin separadores, para buscar. Ej: "5VLF512100" */
  normalized: string
  manufacturer: string | null
}

// ── Reglas de negocio ────────────────────────────────────────────────────────

/**
 * ¿Esta compatibilidad se puede mostrar al público?
 *
 * Única puerta de publicación de todo el sistema. Un fitment sin verificar es
 * una hipótesis, no un dato: existe en la base de datos para que alguien lo
 * revise, pero no se muestra en la ficha, no genera hub, no entra al sitemap y
 * no alimenta el badge de compatibilidad.
 */
export function isPublishable(fitment: Pick<Fitment, 'verified'>): boolean {
  return fitment.verified === true
}

/**
 * ¿El fitment aplica al año de moto que tiene el comprador?
 *
 * Sin rango declarado, aplica a todos los años del modelo. Con rango, se
 * comprueba el año contra los límites que existan (cualquiera de los dos puede
 * ser abierto).
 *
 * Si el comprador no dice el año (`year === null`), la respuesta es `true`: no
 * se le puede negar una compatibilidad por un dato que no dio.
 */
export function fitsYear(
  fitment: Pick<Fitment, 'yearFrom' | 'yearTo'>,
  year: number | null,
): boolean {
  if (year === null) return true
  if (fitment.yearFrom !== null && year < fitment.yearFrom) return false
  if (fitment.yearTo !== null && year > fitment.yearTo) return false
  return true
}

/**
 * Rango de años legible de un modelo: "2018-2024", "desde 2018", "hasta 2015".
 * Devuelve `null` si no hay ningún año confirmado — en cuyo caso no se escribe
 * nada, en vez de inventar un rango.
 */
export function formatYearRange(
  model: Pick<MotorcycleModel, 'yearFrom' | 'yearTo'>,
): string | null {
  const { yearFrom, yearTo } = model
  if (yearFrom !== null && yearTo !== null) {
    return yearFrom === yearTo ? `${yearFrom}` : `${yearFrom}-${yearTo}`
  }
  if (yearFrom !== null) return `desde ${yearFrom}`
  if (yearTo !== null) return `hasta ${yearTo}`
  return null
}

/** Etiqueta en español de la posición. `null` para AMBAS: no aporta nada mostrarlo. */
export function positionLabel(position: FitmentPosition): string | null {
  if (position === 'DELANTERA') return 'Delantera'
  if (position === 'TRASERA') return 'Trasera'
  return null
}

/** Etiqueta en español del tipo de repuesto. */
export function partTypeLabel(type: PartType): string {
  const labels: Record<PartType, string> = {
    ORIGINAL: 'Original',
    HOMOLOGADO: 'Homologado',
    GENERICO: 'Genérico',
  }
  return labels[type]
}

/**
 * Nombre completo del modelo para títulos y textos: "AKT NKD 125".
 * El cilindraje solo se añade si está confirmado y no aparece ya en el nombre.
 */
export function fullModelName(model: MotorcycleModelWithBrand): string {
  return `${model.brand.name} ${model.name}`
}

/**
 * Normaliza una referencia OEM para poder buscarla sin depender de cómo la
 * escriba el usuario: "5vl-f5121-00", "5VL F5121 00" y "5VLF512100" son la
 * misma referencia.
 */
export function normalizeOemReference(reference: string): string {
  return reference.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Slug de un nombre de marca o modelo: "NKD 125" → "nkd-125".
 * Quita tildes, pasa a minúsculas y une con guiones.
 */
export function toMotorcycleSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Todos los términos con los que se puede encontrar un modelo: su nombre, sus
 * alias y el nombre completo con la marca. Alimenta el buscador interno, de modo
 * que "pastillas nkd" o "kit arrastre boxer" encuentren el producto.
 */
export function modelSearchTerms(model: MotorcycleModelWithBrand): string[] {
  return [
    model.name,
    ...model.aliases,
    `${model.brand.name} ${model.name}`,
    model.brand.name,
  ].filter((t) => t.trim().length > 0)
}

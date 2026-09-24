import { fitsYear } from './Motorcycle'

/**
 * Venta cruzada (docs/seo/plan-venta-cruzada.md, Fase 4 ítem 7).
 *
 * Un administrador vincula, a mano, productos que "normalmente se cambian junto
 * con" otro. El vínculo es DIRIGIDO: A → B se muestra en la ficha de A. Que B
 * sugiera A es otro vínculo (el admin puede pedirlo con "también sugerir en
 * sentido inverso").
 *
 * Nada se calcula ni se deduce: cada vínculo lo firma una persona del negocio.
 * Sin vínculos cargados no se muestra nada.
 */

/** Sugerencias máximas por producto: ni un bloque vacío ni uno sobrecargado. */
export const MAX_CROSS_SELLS = 4

export const CROSS_SELL_REASON_MAX_LENGTH = 120

/** Vínculo guardado: en la ficha de `productId` se sugiere `relatedId`. */
export interface CrossSellLink {
  productId: string
  relatedId: string
  /** "Se cambia junto con las pastillas". Null = sin motivo, solo el título. */
  reason: string | null
  /** Posición en el bloque (menor primero). */
  order: number
}

// ── Títulos del bloque ───────────────────────────────────────────────────────

/**
 * Títulos que rotan entre productos para que el sitio no repita la misma frase
 * en cada ficha. Son neutros a propósito: no afirman ventas ni estadísticas
 * ("suele comprarse", "el más vendido") porque el vínculo es una recomendación
 * del negocio, no un dato de ventas (Ley 1480 — publicidad no engañosa).
 */
export const CROSS_SELL_HEADINGS: readonly string[] = [
  'Normalmente se cambia junto con…',
  'Funciona mejor con…',
  'Va bien con…',
  'Completa tu compra con…',
  'Aprovecha y lleva también…',
  'Combínalo con…',
  'Recomendado para usar con…',
  'Piensa también en…',
  'Para dejarlo listo, suma…',
  'Otros repuestos que van con este…',
]

/**
 * Elige un título de forma DETERMINISTA a partir de una semilla (el id del
 * producto). Varía entre productos, pero es el mismo en cada carga de la misma
 * ficha: un título aleatorio por render descuadraría el HTML prerenderizado con
 * el del cliente (error de hidratación) y cambiaría en cada visita.
 */
export function pickCrossSellHeading(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return CROSS_SELL_HEADINGS[hash % CROSS_SELL_HEADINGS.length]!
}

// ── Visibilidad ──────────────────────────────────────────────────────────────

/** Lo mínimo del producto sugerido para decidir si se puede mostrar. */
export interface CrossSellCandidate {
  isActive: boolean
  deletedAt?: Date | string | null
  stock: number
}

/** Solo se sugiere lo que se puede comprar hoy: activo, no borrado y con stock. */
export function isCrossSellVisible(c: CrossSellCandidate): boolean {
  return c.isActive && !c.deletedAt && c.stock > 0
}

/** Modelo con compatibilidad verificada del producto sugerido. */
export interface CrossSellModelRef {
  brandSlug: string
  modelSlug: string
  yearFrom: number | null
  yearTo: number | null
}

/** La moto que el comprador eligió en "¿Qué moto tienes?". */
export interface CrossSellMotorcycle {
  brandSlug: string
  modelSlug: string
  year: number | null
}

/**
 * ¿Se le puede mostrar esta sugerencia a quien tiene esta moto?
 *
 *   - Sin moto elegida → sí.
 *   - El producto sugerido NO tiene fitments verificados → sí. No se puede
 *     afirmar que no le sirve: la mayoría del catálogo aún no tiene
 *     compatibilidades cargadas y hay productos universales (aceites,
 *     accesorios). Tratar "sin dato" como "incompatible" vaciaría el bloque.
 *   - Tiene fitments verificados → solo si alguno coincide con la moto (y año).
 */
export function isCrossSellCompatible(
  models: readonly CrossSellModelRef[],
  moto: CrossSellMotorcycle | null,
): boolean {
  if (!moto) return true
  if (models.length === 0) return true
  return models.some(
    (m) =>
      m.brandSlug === moto.brandSlug &&
      m.modelSlug === moto.modelSlug &&
      fitsYear({ yearFrom: m.yearFrom, yearTo: m.yearTo }, moto.year),
  )
}

// ── Carrito ──────────────────────────────────────────────────────────────────

/** Sugerencias de un producto del carrito, ya filtradas por visibilidad. */
export interface CartCrossSellGroup<T extends { id: string }> {
  productId: string
  suggestions: readonly T[]
}

/**
 * Junta las sugerencias de todos los productos del carrito: quita lo que ya
 * está en el carrito, no repite un producto sugerido por dos del carrito y corta
 * en `MAX_CROSS_SELLS`. Respeta el orden del carrito y el de cada lista.
 */
export function mergeCartCrossSells<T extends { id: string }>(
  groups: readonly CartCrossSellGroup<T>[],
  cartProductIds: readonly string[],
  max: number = MAX_CROSS_SELLS,
): T[] {
  const inCart = new Set(cartProductIds)
  const seen = new Set<string>()
  const result: T[] = []
  for (const group of groups) {
    for (const s of group.suggestions) {
      if (inCart.has(s.id) || seen.has(s.id)) continue
      seen.add(s.id)
      result.push(s)
      if (result.length >= max) return result
    }
  }
  return result
}

import { fitsYear } from './Motorcycle'

/**
 * Kit de productos (docs/seo/plan-kits.md, Fase 4 ítem 8).
 *
 * Lo arma un administrador desde `/admin/kits`. NUNCA es un producto con stock
 * propio: su precio y su disponibilidad se calculan siempre en vivo a partir de
 * los productos que lo componen. Agregarlo al carrito expande sus ítems en
 * líneas normales — el checkout, el pago y el stock no saben que existen los
 * kits, así que no hay riesgo sobre ese flujo ya probado.
 */

export const MIN_KIT_ITEMS = 2
export const MAX_KIT_ITEMS = 8

/** Un producto dentro de un kit, con su cantidad. */
export interface KitItem {
  productId: string
  /** Entero >= 1. */
  quantity: number
  /** Posición en la tarjeta del kit (menor primero). */
  order: number
}

export interface Kit {
  id: string
  name: string
  slug: string
  description: string | null
  /** Centavos COP a descontar de la suma de los ítems. 0 = sin descuento. */
  discountCents: number
  /** Modelo de moto al que se asocia. Null = kit genérico (no depende de una moto). */
  modelId: string | null
  isActive: boolean
  createdAt: Date
  deletedAt: Date | null
  items: KitItem[]
}

// ── Precio ────────────────────────────────────────────────────────────────────

/**
 * Reglas del descuento: entero, 0 o positivo, y estrictamente menor que la suma
 * de los ítems — un kit nunca puede costar $0 ni negativo.
 * Espejo de `validateProductPricing` para `compareAtPrice`, pero al revés: aquí
 * el "precio ancla" es la suma (se tacha en la tarjeta) y el precio de venta es
 * la suma menos el descuento.
 */
export function validateKitPricing(itemsTotal: number, discountCents: number): string | null {
  if (!Number.isInteger(discountCents) || discountCents < 0) {
    return 'El descuento debe ser un entero mayor o igual a 0 (centavos COP)'
  }
  if (discountCents >= itemsTotal) {
    return 'El descuento debe ser menor que la suma de los productos del kit'
  }
  return null
}

/** Precio final del kit: suma de los ítems menos el descuento. Nunca se guarda; se calcula en cada lectura. */
export function computeKitPrice(itemsTotal: number, discountCents: number): number {
  return Math.max(0, itemsTotal - discountCents)
}

// ── Disponibilidad ───────────────────────────────────────────────────────────

/** Lo mínimo de un producto del kit para calcular cuántos kits se pueden armar hoy. */
export interface KitItemStock {
  quantity: number
  stock: number
  isActive: boolean
  deletedAt?: Date | string | null
}

/**
 * Cuántos kits completos se pueden armar hoy: el mínimo, entre todos los
 * ítems, de `floor(stock / quantity)`. Si algún producto está inactivo,
 * borrado, o `items` está vacío, la disponibilidad es 0 — un kit sin ítems no
 * es un kit vendible.
 */
export function computeKitAvailability(items: readonly KitItemStock[]): number {
  if (items.length === 0) return 0
  let min = Infinity
  for (const item of items) {
    if (!item.isActive || item.deletedAt) return 0
    min = Math.min(min, Math.floor(item.stock / item.quantity))
  }
  return Math.max(0, min)
}

/** Un kit solo se muestra si está activo, no borrado y se puede armar al menos una unidad. */
export function isKitVisible(kit: { isActive: boolean; deletedAt?: Date | string | null }, availableUnits: number): boolean {
  return kit.isActive && !kit.deletedAt && availableUnits > 0
}

// ── Compatibilidad con la moto del comprador ─────────────────────────────────

/** Modelo con compatibilidad verificada de UN producto del kit. */
export interface KitModelRef {
  brandSlug: string
  modelSlug: string
  yearFrom: number | null
  yearTo: number | null
}

export interface KitMotorcycle {
  brandSlug: string
  modelSlug: string
  year: number | null
}

/**
 * Igual criterio que la venta cruzada (`isCrossSellCompatible`): sin moto
 * elegida, o sin fitments verificados para ESE producto, se considera
 * compatible (no se afirma que no sirve). Se usa tanto para avisar en el
 * editor del admin como para decidir si se oculta un kit en la tienda.
 */
export function isKitItemCompatible(models: readonly KitModelRef[], moto: KitMotorcycle | null): boolean {
  if (!moto) return true
  if (models.length === 0) return true
  return models.some(
    (m) =>
      m.brandSlug === moto.brandSlug &&
      m.modelSlug === moto.modelSlug &&
      fitsYear({ yearFrom: m.yearFrom, yearTo: m.yearTo }, moto.year),
  )
}

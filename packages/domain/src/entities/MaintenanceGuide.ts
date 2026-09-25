import type { TechnicalReviewer } from './TechnicalReviewer'

/**
 * Guía de mantenimiento por modelo de moto (docs/seo/, Fase 5 — tarea H-20).
 *
 * Una por modelo (`MotorcycleModel`). La registra el administrador desde
 * `/admin/mantenimiento` y se publica sola en cuanto existe con al menos un
 * punto de control Y con un revisor técnico activo que la firme (H-21):
 *
 *   - Sin guía guardada → la ruta pública responde 404 y el hub del modelo no
 *     enseña ningún enlace. No hay página genérica ni texto de relleno.
 *   - Cada guía cita su FUENTE (manual, taller…) y su REVISOR: ninguno de los
 *     dos es opcional. Es la regla del proyecto — los intervalos no se
 *     inventan, y ninguna pieza de contenido se publica sin alguien que la
 *     firme.
 *
 * Nunca se rellena un intervalo por defecto: las etiquetas sugeridas del
 * editor solo insertan el NOMBRE del punto de control; los números los escribe
 * el administrador.
 */

export const MIN_MAINTENANCE_ITEMS = 1
export const MAX_MAINTENANCE_ITEMS = 12
export const MAINTENANCE_LABEL_MAX_LENGTH = 80
export const MAINTENANCE_NOTES_MAX_LENGTH = 300
export const MAINTENANCE_SOURCE_MAX_LENGTH = 300
export const MAINTENANCE_GUIDE_NOTES_MAX_LENGTH = 1000
export const MAX_INTERVAL_KM = 200_000
export const MAX_INTERVAL_MONTHS = 240

/** Puntos de control que el ROADMAP menciona. Solo sugieren el nombre, nunca el intervalo. */
export const SUGGESTED_MAINTENANCE_LABELS: readonly string[] = [
  'Aceite de motor',
  'Filtro de aceite',
  'Filtro de aire',
  'Bujía',
  'Kit de arrastre',
  'Pastillas de freno',
  'Llantas',
]

export interface MaintenanceItem {
  label: string
  /** Cada cuántos kilómetros. Null si el intervalo es solo por tiempo. */
  intervalKm: number | null
  /** Cada cuántos meses. Null si el intervalo es solo por kilometraje. */
  intervalMonths: number | null
  notes: string | null
  /** Repuesto exacto de H2R para este punto de control (opcional). */
  productId: string | null
  order: number
}

export interface MaintenanceGuide {
  id: string
  modelId: string
  /** De dónde salen los intervalos. Obligatorio. */
  source: string
  /** Quien revisa y firma la guía. Obligatorio. */
  reviewerId: string
  notes: string | null
  /** Fecha de la última revisión, visible en la página como "revisado el…". */
  reviewedAt: Date
  items: MaintenanceItem[]
}

/** Devuelve el error de un punto de control, o null si es válido. */
export function validateMaintenanceItem(
  item: Pick<MaintenanceItem, 'label' | 'intervalKm' | 'intervalMonths' | 'notes'>,
): string | null {
  const label = item.label.trim()
  if (!label) return 'Cada punto de control necesita un nombre'
  if (label.length > MAINTENANCE_LABEL_MAX_LENGTH) {
    return `El nombre de un punto de control admite máximo ${MAINTENANCE_LABEL_MAX_LENGTH} caracteres`
  }

  const { intervalKm: km, intervalMonths: months } = item
  if (km === null && months === null) {
    return `"${label}": indica el intervalo en kilómetros, en meses o en ambos`
  }
  if (km !== null && (!Number.isInteger(km) || km < 1 || km > MAX_INTERVAL_KM)) {
    return `"${label}": los kilómetros deben ser un entero entre 1 y ${MAX_INTERVAL_KM}`
  }
  if (months !== null && (!Number.isInteger(months) || months < 1 || months > MAX_INTERVAL_MONTHS)) {
    return `"${label}": los meses deben ser un entero entre 1 y ${MAX_INTERVAL_MONTHS}`
  }
  if (item.notes && item.notes.trim().length > MAINTENANCE_NOTES_MAX_LENGTH) {
    return `"${label}": el detalle admite máximo ${MAINTENANCE_NOTES_MAX_LENGTH} caracteres`
  }
  return null
}

/**
 * ¿Se puede mostrar esta guía al público? Necesita al menos un punto de control
 * y un revisor ACTIVO: si el administrador desactiva al revisor, sus guías
 * dejan de publicarse en vez de quedar firmadas por una página que ya no existe.
 */
export function isMaintenanceGuidePublishable(
  guide: Pick<MaintenanceGuide, 'items'> | null,
  reviewer: Pick<TechnicalReviewer, 'isActive'> | null,
): boolean {
  return guide !== null && guide.items.length >= MIN_MAINTENANCE_ITEMS && reviewer !== null && reviewer.isActive
}

/** "3.000 km" — formato es-CO con separador de miles. */
export function formatKm(km: number): string {
  return `${km.toLocaleString('es-CO')} km`
}

/** "6 meses" / "1 mes". */
export function formatMonths(months: number): string {
  return `${months} ${months === 1 ? 'mes' : 'meses'}`
}

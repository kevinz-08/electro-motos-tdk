/**
 * Configuración de prueba social y estimación de entrega (README §22.3).
 *
 * Los valores viven en la tabla `Settings` (clave → string) y se editan desde
 * /admin/configuracion. Si la fila no existe o el valor es inválido se usa el default.
 */

export const CRO_SETTING_KEYS = {
  socialProofMinSold: 'SOCIAL_PROOF_MIN_SOLD',
  reviewsMinCount: 'REVIEWS_MIN_COUNT',
  lowStockThreshold: 'LOW_STOCK_URGENCY_THRESHOLD',
  shippingEtaMinDays: 'SHIPPING_ETA_MIN_DAYS',
  shippingEtaMaxDays: 'SHIPPING_ETA_MAX_DAYS',
  shippingCutoffHour: 'SHIPPING_CUTOFF_HOUR',
  freeShippingThreshold: 'FREE_SHIPPING_THRESHOLD',
} as const

export type CroSettingName = keyof typeof CRO_SETTING_KEYS
export type CroSettings = Record<CroSettingName, number>

export const CRO_SETTING_DEFAULTS: CroSettings = {
  /** Mínimo de unidades vendidas para mostrar "🔥 X personas han comprado". */
  socialProofMinSold: 5,
  /** Mínimo de reseñas aprobadas para mostrar estrellas y % de recomendación. */
  reviewsMinCount: 3,
  /** Se muestra "¡Solo quedan X unidades!" cuando 0 < stock < este valor. */
  lowStockThreshold: 5,
  shippingEtaMinDays: 2,
  shippingEtaMaxDays: 5,
  shippingCutoffHour: 14,
  /**
   * Compra mínima (centavos COP) para envío gratis. 0 = sin umbral: la ficha y el
   * carrito no prometen envío gratis. El default replica lo que el sitio ya decía
   * a mano ($500.000); confirmar que sigue vigente es la tarea H-14.
   */
  freeShippingThreshold: 50_000_000,
}

/** Rangos válidos por setting — usados tanto al leer (fallback) como al validar en la API. */
export const CRO_SETTING_RANGES: Record<CroSettingName, { min: number; max: number }> = {
  socialProofMinSold: { min: 0, max: 100_000 },
  reviewsMinCount: { min: 1, max: 1_000 },
  lowStockThreshold: { min: 0, max: 1_000 },
  shippingEtaMinDays: { min: 0, max: 60 },
  shippingEtaMaxDays: { min: 0, max: 60 },
  shippingCutoffHour: { min: 0, max: 24 },
  freeShippingThreshold: { min: 0, max: 100_000_000_000 },
}

/**
 * Convierte filas de Settings a CroSettings con defaults y rangos aplicados.
 * Garantiza shippingEtaMaxDays >= shippingEtaMinDays.
 */
export function parseCroSettings(rows: ReadonlyArray<{ key: string; value: string }>): CroSettings {
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  const result = { ...CRO_SETTING_DEFAULTS }

  for (const name of Object.keys(CRO_SETTING_KEYS) as CroSettingName[]) {
    const raw = byKey.get(CRO_SETTING_KEYS[name])
    if (raw === undefined) continue
    const n = Number(raw)
    const { min, max } = CRO_SETTING_RANGES[name]
    if (Number.isInteger(n) && n >= min && n <= max) result[name] = n
  }

  if (result.shippingEtaMaxDays < result.shippingEtaMinDays) {
    result.shippingEtaMaxDays = result.shippingEtaMinDays
  }
  return result
}

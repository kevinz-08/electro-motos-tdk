/**
 * Estimación de la ventana de entrega ("Cómpralo hoy y recíbelo entre el X y el Y").
 * README §22.3.
 *
 * Todo el cálculo trabaja con fechas de calendario de Colombia (UTC-5, sin horario
 * de verano) representadas como `Date` a las 12:00 UTC del día — así el día nunca se
 * corre al formatear. Para mostrar: `toLocaleDateString('es-CO', { timeZone: 'UTC', ... })`.
 *
 * Días hábiles = lunes a viernes que no sean festivo nacional colombiano.
 */

/** Colombia no usa horario de verano: siempre UTC-5. */
export const COLOMBIA_UTC_OFFSET_HOURS = -5

const DAY_MS = 24 * 60 * 60 * 1000

/** Fecha de calendario (año, mes 1-12, día) → Date a mediodía UTC. */
function calendarDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12))
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Domingo de Pascua (algoritmo gregoriano anónimo de Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return calendarDate(year, month, day)
}

/** Ley Emiliani: si el festivo no cae lunes, se traslada al lunes siguiente. */
function nextMonday(date: Date): Date {
  const dow = date.getUTCDay() // 0 = domingo
  const delta = (8 - dow) % 7
  return addDays(date, delta)
}

/**
 * Festivos nacionales de Colombia para un año (Ley 51 de 1983).
 * Retorna las fechas ya trasladadas, ordenadas.
 */
export function colombianHolidays(year: number): Date[] {
  const easter = easterSunday(year)
  const fixed = [
    calendarDate(year, 1, 1),   // Año Nuevo
    calendarDate(year, 5, 1),   // Día del Trabajo
    calendarDate(year, 7, 20),  // Independencia
    calendarDate(year, 8, 7),   // Batalla de Boyacá
    calendarDate(year, 12, 8),  // Inmaculada Concepción
    calendarDate(year, 12, 25), // Navidad
    addDays(easter, -3),        // Jueves Santo
    addDays(easter, -2),        // Viernes Santo
  ]
  const movable = [
    calendarDate(year, 1, 6),   // Reyes Magos
    calendarDate(year, 3, 19),  // San José
    calendarDate(year, 6, 29),  // San Pedro y San Pablo
    calendarDate(year, 8, 15),  // Asunción de la Virgen
    calendarDate(year, 10, 12), // Día de la Raza
    calendarDate(year, 11, 1),  // Todos los Santos
    calendarDate(year, 11, 11), // Independencia de Cartagena
    addDays(easter, 39),        // Ascensión del Señor
    addDays(easter, 60),        // Corpus Christi
    addDays(easter, 68),        // Sagrado Corazón
  ].map(nextMonday)

  return [...fixed, ...movable].sort((x, y) => x.getTime() - y.getTime())
}

const holidayCache = new Map<number, Set<string>>()

export function isColombianBusinessDay(date: Date): boolean {
  const dow = date.getUTCDay()
  if (dow === 0 || dow === 6) return false
  const year = date.getUTCFullYear()
  let holidays = holidayCache.get(year)
  if (!holidays) {
    holidays = new Set(colombianHolidays(year).map(dateKey))
    holidayCache.set(year, holidays)
  }
  return !holidays.has(dateKey(date))
}

export function addColombianBusinessDays(start: Date, days: number): Date {
  return addBusinessDays(start, Math.max(0, Math.floor(days)))
}

function addBusinessDays(start: Date, days: number): Date {
  let current = start
  let remaining = days
  while (remaining > 0) {
    current = addDays(current, 1)
    if (isColombianBusinessDay(current)) remaining--
  }
  return current
}

export interface DeliveryEstimateOptions {
  /** Días hábiles mínimos desde el despacho hasta la entrega. */
  minDays: number
  /** Días hábiles máximos desde el despacho hasta la entrega. */
  maxDays: number
  /** Hora local (0-23) desde la cual un pedido ya no se despacha el mismo día. */
  cutoffHour: number
}

export interface DeliveryWindow {
  /** Día hábil en que sale el pedido (mediodía UTC de la fecha colombiana). */
  dispatchDate: Date
  /** Último día hábil en que podría salir el pedido (despacho + 1 hábil). */
  dispatchTo: Date
  /** Primer día posible de entrega. */
  from: Date
  /** Último día estimado de entrega. */
  to: Date
}

/**
 * Calcula la ventana de entrega para un pedido hecho en `now`.
 *
 *   1. Se convierte `now` a la fecha/hora de Colombia.
 *   2. Si hoy es hábil y aún no pasó la hora de corte, despacha hoy;
 *      si no, despacha el siguiente día hábil.
 *   3. from = despacho + minDays hábiles; to = despacho + maxDays hábiles.
 *      dispatchTo = despacho + 1 hábil (la ventana "se despacha entre X y Y").
 *
 * Valores inválidos se normalizan (min ≥ 0, max ≥ min, cutoff en 0-24).
 */
export function estimateDeliveryWindow(now: Date, options: DeliveryEstimateOptions): DeliveryWindow {
  const minDays = Math.max(0, Math.floor(options.minDays))
  const maxDays = Math.max(minDays, Math.floor(options.maxDays))
  const cutoffHour = Math.min(24, Math.max(0, options.cutoffHour))

  const local = new Date(now.getTime() + COLOMBIA_UTC_OFFSET_HOURS * 60 * 60 * 1000)
  const today = calendarDate(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate())
  const localHour = local.getUTCHours() + local.getUTCMinutes() / 60

  const dispatchDate = isColombianBusinessDay(today) && localHour < cutoffHour
    ? today
    : addBusinessDays(today, 1)

  return {
    dispatchDate,
    dispatchTo: addBusinessDays(dispatchDate, 1),
    from: addBusinessDays(dispatchDate, minDays),
    to: addBusinessDays(dispatchDate, maxDays),
  }
}

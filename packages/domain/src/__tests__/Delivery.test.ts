import { describe, it, expect } from 'vitest'
import {
  colombianHolidays,
  easterSunday,
  estimateDeliveryWindow,
  isColombianBusinessDay,
} from '@/domain/shared/delivery'
import { parseCroSettings, CRO_SETTING_DEFAULTS } from '@/domain/shared/croSettings'

const iso = (d: Date) => d.toISOString().slice(0, 10)
/** Hora de Colombia → instante UTC (Colombia = UTC-5). */
const bogota = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h + 5, min))

describe('easterSunday', () => {
  it('calcula el domingo de Pascua', () => {
    expect(iso(easterSunday(2025))).toBe('2025-04-20')
    expect(iso(easterSunday(2026))).toBe('2026-04-05')
    expect(iso(easterSunday(2027))).toBe('2027-03-28')
  })
})

describe('colombianHolidays', () => {
  it('coincide con el calendario oficial 2026 (Ley Emiliani aplicada)', () => {
    expect(colombianHolidays(2026).map(iso)).toEqual([
      '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03',
      '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29',
      '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02',
      '2026-11-16', '2026-12-08', '2026-12-25',
    ])
  })

  it('tiene 18 festivos en 2025', () => {
    expect(colombianHolidays(2025)).toHaveLength(18)
  })
})

describe('isColombianBusinessDay', () => {
  it('excluye fines de semana y festivos', () => {
    expect(isColombianBusinessDay(new Date('2026-09-16T12:00:00Z'))).toBe(true)  // miércoles
    expect(isColombianBusinessDay(new Date('2026-09-19T12:00:00Z'))).toBe(false) // sábado
    expect(isColombianBusinessDay(new Date('2026-10-12T12:00:00Z'))).toBe(false) // festivo
  })
})

describe('estimateDeliveryWindow', () => {
  const opts = { minDays: 2, maxDays: 5, cutoffHour: 14 }

  it('antes de la hora de corte despacha hoy', () => {
    const w = estimateDeliveryWindow(bogota(2026, 9, 16, 10), opts) // miércoles 10am
    expect(iso(w.dispatchDate)).toBe('2026-09-16')
    expect(iso(w.from)).toBe('2026-09-18') // viernes
    expect(iso(w.to)).toBe('2026-09-23')   // miércoles siguiente
  })

  it('después de la hora de corte despacha el siguiente día hábil', () => {
    const w = estimateDeliveryWindow(bogota(2026, 9, 16, 15), opts)
    expect(iso(w.dispatchDate)).toBe('2026-09-17')
    expect(iso(w.from)).toBe('2026-09-21')
  })

  it('usa la hora de Colombia, no la UTC (23:30 local = día siguiente en UTC)', () => {
    const w = estimateDeliveryWindow(bogota(2026, 9, 16, 23, 30), opts)
    expect(iso(w.dispatchDate)).toBe('2026-09-17')
  })

  it('salta fines de semana y festivos', () => {
    // viernes 9 oct 2026 16:00 → despacho martes 13 (lunes 12 es festivo)
    const w = estimateDeliveryWindow(bogota(2026, 10, 9, 16), opts)
    expect(iso(w.dispatchDate)).toBe('2026-10-13')
    expect(iso(w.from)).toBe('2026-10-15')
  })

  it('normaliza max < min', () => {
    const w = estimateDeliveryWindow(bogota(2026, 9, 16, 10), { minDays: 3, maxDays: 1, cutoffHour: 14 })
    expect(iso(w.from)).toBe(iso(w.to))
  })
})

describe('parseCroSettings', () => {
  it('usa defaults cuando no hay filas', () => {
    expect(parseCroSettings([])).toEqual(CRO_SETTING_DEFAULTS)
  })

  it('aplica valores válidos e ignora inválidos', () => {
    const s = parseCroSettings([
      { key: 'SOCIAL_PROOF_MIN_SOLD', value: '10' },
      { key: 'SHIPPING_CUTOFF_HOUR', value: '99' },
      { key: 'REVIEWS_MIN_COUNT', value: 'abc' },
    ])
    expect(s.socialProofMinSold).toBe(10)
    expect(s.shippingCutoffHour).toBe(CRO_SETTING_DEFAULTS.shippingCutoffHour)
    expect(s.reviewsMinCount).toBe(CRO_SETTING_DEFAULTS.reviewsMinCount)
  })

  it('garantiza max >= min en días de envío', () => {
    const s = parseCroSettings([
      { key: 'SHIPPING_ETA_MIN_DAYS', value: '6' },
      { key: 'SHIPPING_ETA_MAX_DAYS', value: '3' },
    ])
    expect(s.shippingEtaMaxDays).toBe(6)
  })
})

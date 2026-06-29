import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VendeloService } from '../infrastructure/services/VendeloService'
import type { VendeloHttpClient } from '../infrastructure/services/VendeloHttpClient'
import type { VendeloQuoteInput } from '@h2r/domain'

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_INPUT: VendeloQuoteInput = {
  shippingCityCode: '11001000',
  shippingSubdivisionCode: '11',
  items: [{ productId: 'prod-1', quantity: 2 }],
  paymentMethod: 'EXTERNAL_PAYMENT',
}

function makeHttpClientMock(response: unknown) {
  return { post: vi.fn().mockResolvedValue(response) } as unknown as VendeloHttpClient
}

describe('VendeloService — quoteOrder', () => {
  beforeEach(() => {
    process.env['VENDELO_STORE_CITY_CODE'] = '05001000'
    process.env['VENDELO_STORE_SUBDIVISION_CODE'] = '02'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env['VENDELO_STORE_CITY_CODE']
    delete process.env['VENDELO_STORE_SUBDIVISION_CODE']
  })

  it('convierte la respuesta de Vendelo (pesos) a centavos COP', async () => {
    const http = makeHttpClientMock({ assumed_shipping_total: 0, quoted_shipping_total: 9000 })
    const service = new VendeloService(http)

    const result = await service.quoteOrder(BASE_INPUT)

    expect(result).toEqual({ quotedShippingTotal: 900000, assumedShippingTotal: 0 })
  })

  it('llama al endpoint de cotización con pickup_info, shipping_info y line_items correctos', async () => {
    const http = makeHttpClientMock({ assumed_shipping_total: 0, quoted_shipping_total: 9000 })
    const service = new VendeloService(http)

    await service.quoteOrder(BASE_INPUT)

    expect(http.post).toHaveBeenCalledWith(
      '/v1/admin/orders/quotation',
      expect.objectContaining({
        pickup_info: expect.objectContaining({ city_code: '05001000', subdivision_code: '02' }),
        shipping_info: expect.objectContaining({ city_code: '11001000', subdivision_code: '11' }),
        line_items: [expect.objectContaining({ quantity: 2, weight_unit: 'kg', dimensions_unit: 'cm' })],
        payment_method_code: 'EXTERNAL_PAYMENT',
      }),
    )
  })

  it('no pasa retryOn5xx:false — la cotización es idempotente y mantiene el retry por defecto', async () => {
    const http = makeHttpClientMock({ assumed_shipping_total: 0, quoted_shipping_total: 9000 })
    const service = new VendeloService(http)

    await service.quoteOrder(BASE_INPUT)

    expect(http.post).toHaveBeenCalledWith('/v1/admin/orders/quotation', expect.anything())
    expect((http.post as ReturnType<typeof vi.fn>).mock.calls[0]).toHaveLength(2)
  })

  it('propaga el error si Vendelo falla (lo maneja el use case, no el service)', async () => {
    const http = { post: vi.fn().mockRejectedValue(new Error('Vendelo API 503: timeout')) } as unknown as VendeloHttpClient
    const service = new VendeloService(http)

    await expect(service.quoteOrder(BASE_INPUT)).rejects.toThrow('Vendelo API 503')
  })
})

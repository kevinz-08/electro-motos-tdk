import { describe, expect, it } from 'vitest'
import {
  WHATSAPP_TEMPLATES,
  buildConfirmationSupportMessage,
  buildCustomerSupportMessage,
  buildPaymentFailedSupportMessage,
  buildWhatsAppUrl,
  normalizeColombianPhone,
  renderTemplate,
} from './whatsapp'

describe('normalizeColombianPhone', () => {
  it.each([
    ['3001234567', '573001234567'],
    ['300 123 4567', '573001234567'],
    ['+57 300 123 4567', '573001234567'],
    ['57-300-123-4567', '573001234567'],
    ['(300) 123-4567', '573001234567'],
  ])('acepta %s', (raw, expected) => {
    expect(normalizeColombianPhone(raw)).toBe(expected)
  })

  it.each([['' ], ['123'], ['2001234567'], ['30012345'], ['300123456789'], ['abc']])(
    'rechaza %j',
    (raw) => {
      expect(normalizeColombianPhone(raw)).toBeNull()
    },
  )

  it('rechaza valores que no son texto', () => {
    expect(normalizeColombianPhone(undefined)).toBeNull()
    expect(normalizeColombianPhone(3001234567)).toBeNull()
  })
})

describe('renderTemplate', () => {
  const vars = { nombre: 'Ana', pedido: '#AB12CD34', total: '$ 100.000', estado: 'Pendiente' }

  it('sustituye todas las variables, incluso repetidas', () => {
    expect(renderTemplate('{nombre} {pedido} {total} {estado} {nombre}', vars)).toBe(
      'Ana #AB12CD34 $ 100.000 Pendiente Ana',
    )
  })

  it('deja intactas las variables desconocidas', () => {
    expect(renderTemplate('Hola {otra}', vars)).toBe('Hola {otra}')
  })
})

describe('buildWhatsAppUrl', () => {
  it('codifica tildes, signos de apertura y saltos de línea', () => {
    const url = buildWhatsAppUrl('573001234567', '¿Hola? ¡Sí!\nok')
    expect(url.startsWith('https://wa.me/573001234567?text=')).toBe(true)
    expect(decodeURIComponent(url.split('?text=')[1])).toBe('¿Hola? ¡Sí!\nok')
    expect(url).not.toContain(' ')
  })
})

describe('WHATSAPP_TEMPLATES', () => {
  it('incluye el mensaje obligatorio de soporte', () => {
    const soporte = WHATSAPP_TEMPLATES.find((t) => t.id === 'soporte')
    expect(soporte?.body).toBe(
      'Hola! Hablas con el soporte de Tiendah2r, ¿presentas algún problema con tu pedido? ¿en qué podemos ayudarte?',
    )
  })

  it('tiene ids únicos', () => {
    const ids = WHATSAPP_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('buildCustomerSupportMessage', () => {
  const base = { orderId: 'cabcdefgh12cd34xx', fullName: 'Ana María Pérez', total: '$ 250.000' }
  const now = new Date('2026-11-24T12:00:00Z')

  it('pago pendiente y anticipo piden ayuda con el pago', () => {
    for (const status of ['PENDING', 'AWAITING_DEPOSIT']) {
      const m = buildCustomerSupportMessage({ ...base, status })
      expect(m).toContain('Hola, soy Ana.')
      expect(m).toContain('pagar')
    }
  })

  it('incluye pedido, estado y total', () => {
    const m = buildCustomerSupportMessage({ ...base, status: 'PAID' })
    expect(m).toContain('#12CD34XX')
    expect(m).toContain('Pagado')
    expect(m).toContain('$ 250.000')
  })

  it('enviado incluye la guía solo si existe', () => {
    expect(buildCustomerSupportMessage({ ...base, status: 'SHIPPED', trackingNumber: '999' })).toContain('Guía: 999.')
    expect(buildCustomerSupportMessage({ ...base, status: 'SHIPPED' })).not.toContain('Guía')
  })

  it('entregado: dentro de 30 días ofrece el botón, fuera no', () => {
    const recent = new Date('2026-11-10T00:00:00Z')
    const old = new Date('2026-09-01T00:00:00Z')
    expect(buildCustomerSupportMessage({ ...base, status: 'DELIVERED', deliveredAt: recent, now })).toContain('problema')
    expect(buildCustomerSupportMessage({ ...base, status: 'DELIVERED', deliveredAt: old, now })).toBeNull()
  })

  it('cancelado o desconocido: sin botón', () => {
    expect(buildCustomerSupportMessage({ ...base, status: 'CANCELLED' })).toBeNull()
    expect(buildCustomerSupportMessage({ ...base, status: 'OTRO' })).toBeNull()
  })

  it('no filtra datos personales sensibles y usa solo el primer nombre', () => {
    const m = buildCustomerSupportMessage({ ...base, status: 'PAID' })!
    expect(m).not.toContain('Pérez')
  })

  it('nombre vacío cae a "cliente"', () => {
    expect(buildCustomerSupportMessage({ ...base, fullName: '  ', status: 'PAID' })).toContain('soy cliente.')
  })
})

describe('mensajes de confirmación y pago fallido', () => {
  const i = { orderId: 'cabcdefgh12cd34xx', fullName: 'Luis Gómez', total: '$ 90.000' }
  it('confirmación', () => {
    expect(buildConfirmationSupportMessage(i)).toBe(
      'Hola, soy Luis. Acabo de hacer el pedido #12CD34XX ($ 90.000) y tengo una duda.',
    )
  })
  it('pago fallido', () => {
    expect(buildPaymentFailedSupportMessage(i)).toBe(
      'Hola, soy Luis. No pude pagar mi pedido #12CD34XX por $ 90.000, ¿me ayudan?',
    )
  })
})

import { describe, expect, it } from 'vitest'
import {
  WHATSAPP_TEMPLATES,
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

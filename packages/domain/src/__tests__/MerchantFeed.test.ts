import { describe, it, expect } from 'vitest'
import {
  buildMerchantFeed,
  buildMerchantTitle,
  buildProductType,
  evaluateMerchantProduct,
  formatMerchantPrice,
  googleCategoryFor,
  normalizeTitleCase,
  toPlainText,
  MERCHANT_TITLE_MAX_LENGTH,
  type MerchantProductInput,
} from '@/domain/entities/MerchantFeed'

const SITE = 'https://www.tiendah2r.com'
const base: MerchantProductInput = {
  sku: '9-G3856',
  name: 'Batería MF MAGX7L-BS',
  slug: 'bateria-magna-mf-magx7l-bs',
  description: '<p>Batería <strong>libre de mantenimiento</strong>&nbsp;12V</p>',
  price: 12_000_000,
  compareAtPrice: null,
  stock: 3,
  imageUrls: ['https://res.cloudinary.com/x/1.jpg', 'https://res.cloudinary.com/x/2.jpg'],
  isActive: true,
  deleted: false,
  category: { slug: 'baterias', name: 'Baterías' },
  parentCategory: { slug: 'sistema-electrico', name: 'Sistema Eléctrico' },
  partBrand: 'Magna',
  mpn: 'MAGX7L-BS',
  fitments: [{ brandName: 'Bajaj', modelName: 'Pulsar NS 200', cc: 200 }],
}

describe('evaluateMerchantProduct', () => {
  it('arma un ítem completo', () => {
    const d = evaluateMerchantProduct(base, SITE)
    if (!d.included) throw new Error('debía entrar')
    expect(d.warnings).toEqual([])
    expect(d.item).toMatchObject({
      id: '9-G3856',
      title: 'Batería MF MAGX7L-BS Magna para Bajaj Pulsar NS 200',
      description: 'Batería libre de mantenimiento 12V',
      link: 'https://www.tiendah2r.com/producto/bateria-magna-mf-magx7l-bs',
      imageLink: 'https://res.cloudinary.com/x/1.jpg',
      additionalImageLinks: ['https://res.cloudinary.com/x/2.jpg'],
      availability: 'in_stock',
      price: '120000.00 COP',
      salePrice: null,
      condition: 'new',
      brand: 'Magna',
      mpn: 'MAGX7L-BS',
      identifierExists: true,
      googleProductCategory: 8231,
      productType: 'Bajaj > Pulsar NS 200 > Baterías',
    })
  })
  it('excluye con todos los motivos a la vez', () => {
    const d = evaluateMerchantProduct({ ...base, isActive: false, price: 0, stock: 0, imageUrls: [], partBrand: '  ' }, SITE)
    expect(d.included).toBe(false)
    if (!d.included) expect(d.reasons).toHaveLength(5)
  })
  it('sin MPN entra con identifier_exists = no y un aviso', () => {
    const d = evaluateMerchantProduct({ ...base, mpn: null }, SITE)
    if (!d.included) throw new Error('debía entrar')
    expect(d.item.identifierExists).toBe(false)
    expect(d.warnings[0]).toMatch(/MPN/)
  })
  it('con precio ancla: price = el ancla y sale_price = el precio real', () => {
    const d = evaluateMerchantProduct({ ...base, compareAtPrice: 15_000_000 }, SITE)
    if (!d.included) throw new Error('debía entrar')
    expect(d.item.price).toBe('150000.00 COP')
    expect(d.item.salePrice).toBe('120000.00 COP')
  })
  it('sin compatibilidades avisa y usa la categoría como tipo; descripción vacía → nombre', () => {
    const d = evaluateMerchantProduct({ ...base, fitments: [], description: '<p> </p>' }, SITE)
    if (!d.included) throw new Error('debía entrar')
    expect(d.warnings.some((w) => /compatibilidades/.test(w))).toBe(true)
    expect(d.item.productType).toBe('Sistema Eléctrico > Baterías')
    expect(d.item.description).toBe(base.name)
  })
})

describe('buildMerchantTitle', () => {
  it('no repite la marca si el nombre ya la dice y agrega el cilindraje si el modelo no lo trae', () => {
    expect(buildMerchantTitle('Bujía NGK CR7HSA', 'NGK', [{ brandName: 'AKT', modelName: 'NKD', cc: 125 }])).toBe(
      'Bujía NGK CR7HSA para AKT NKD 125cc',
    )
  })
  it('agrega motos mientras quepan en 150 caracteres', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ brandName: 'Yamaha', modelName: `Modelo ${i}`, cc: null }))
    const title = buildMerchantTitle('Pastillas de freno delanteras', 'Brembo', many)
    expect(title.length).toBeLessThanOrEqual(MERCHANT_TITLE_MAX_LENGTH)
    expect(title).toMatch(/^Pastillas de freno delanteras Brembo para Yamaha Modelo 0, /)
  })
})

describe('utilidades', () => {
  it('formatMerchantPrice', () => {
    expect(formatMerchantPrice(12_345_600)).toBe('123456.00 COP')
  })
  it('toPlainText', () => {
    expect(toPlainText('<ul><li>A &amp; B</li></ul>')).toBe('A & B')
  })
  it('googleCategoryFor: propia, del padre o genérica', () => {
    expect(googleCategoryFor({ slug: 'sky' }, null)).toBe(6091)
    expect(googleCategoryFor({ slug: 'nueva-sub' }, { slug: 'aceites' })).toBe(3044)
    expect(googleCategoryFor({ slug: 'otra' }, null)).toBe(899)
  })
  it('buildProductType sin padre', () => {
    expect(buildProductType({ fitments: [], category: { slug: 'aceites', name: 'Aceites' }, parentCategory: null })).toBe('Aceites')
  })
})

describe('buildMerchantFeed', () => {
  it('separa incluidos y excluidos y cuenta los motivos', () => {
    const report = buildMerchantFeed(
      [base, { ...base, sku: 'B', partBrand: null }, { ...base, sku: 'C', partBrand: null, stock: 0 }],
      SITE,
    )
    expect(report.items.map((i) => i.id)).toEqual(['9-G3856'])
    expect(report.excluded.map((e) => e.sku)).toEqual(['B', 'C'])
    expect(report.reasonCounts).toEqual({ 'Falta la marca del repuesto (H-18)': 2, Agotado: 1 })
  })
})

describe('normalizeTitleCase', () => {
  it('pasa MAYÚSCULAS a formato título conservando siglas y códigos', () => {
    expect(normalizeTitleCase('RAMAL ELECTRICO XTZ 125 ESTARTER M. 2007-2012')).toBe('Ramal Electrico XTZ 125 Estarter M. 2007-2012')
    expect(normalizeTitleCase('MODULO LED 6P MORADO')).toBe('Modulo LED 6P Morado')
    expect(normalizeTitleCase('CABLE DE ALTA NGK')).toBe('Cable de Alta NGK')
    expect(normalizeTitleCase('BATERÍA MAGNA PARA NS')).toBe('Batería Magna para NS')
  })
  it('no toca un nombre que ya usa mayúsculas y minúsculas', () => {
    expect(normalizeTitleCase('Bujía NGK CR7HSA')).toBe('Bujía NGK CR7HSA')
  })
  it('el título del feed sale normalizado', () => {
    expect(buildMerchantTitle('FILTRO AIRE CB 190', 'K&N', [])).toBe('Filtro Aire CB 190 K&N')
  })
})

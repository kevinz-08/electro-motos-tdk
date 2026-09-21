import { describe, it, expect } from 'vitest'
import {
  normalizeText,
  tokenize,
  tokenizeQuery,
  stem,
  editDistance,
  maxTypos,
  buildSearchDoc,
  searchDocs,
  type SearchableProduct,
} from '../index'

let seq = 0
function product(over: Partial<SearchableProduct> & { name: string }): SearchableProduct {
  seq += 1
  return {
    id: `p${seq}`,
    sku: `SKU-${seq}`,
    description: '',
    categoryId: 'cat-x',
    categoryName: null,
    parentCategoryName: null,
    price: 10_000_00,
    stock: 5,
    isActive: true,
    createdAt: seq,
    ...over,
  }
}

const catalog = [
  product({
    name: 'RAMAL ELECTRICO LIBERO 125  2014-2018',
    sku: 'RAM-LIB125',
    categoryId: 'ramales',
    categoryName: 'Ramales',
    parentCategoryName: 'Sistema eléctrico',
  }),
  product({
    name: 'Filtro de aire',
    sku: 'FIL-0042',
    categoryId: 'repuestos',
    categoryName: 'Filtros',
    parentCategoryName: 'Repuestos',
    tags: ['Bajaj', 'Pulsar NS 200'],
  }),
  product({
    name: 'Bujía NGK CR8E',
    sku: 'NGK-CR8E',
    categoryId: 'repuestos',
    categoryName: 'Bujías',
    parentCategoryName: 'Repuestos',
  }),
  product({
    name: 'Aceite Liquimoly 10W-40 sintético',
    sku: 'LM-2340',
    categoryId: 'aceites',
    categoryName: 'Aceites',
    description: 'Lubricante para motores de cuatro tiempos.',
  }),
  product({
    name: 'Llanta 90/90-17 Kontrol',
    sku: 'LL-9090',
    categoryId: 'llantas',
    categoryName: 'Llantas',
  }),
  product({
    name: 'Kit de arrastre NS 250',
    sku: 'KIT-NS250',
    categoryId: 'repuestos',
    categoryName: 'Transmisión',
    parentCategoryName: 'Repuestos',
  }),
].map((p) => ({ raw: p, doc: buildSearchDoc(p) }))

const docs = catalog.map((c) => c.doc)
const names = (query: string) =>
  searchDocs(docs, query).map((h) => catalog.find((c) => c.raw.id === h.id)!.raw.name)

describe('normalizeText / tokenize', () => {
  it('ignora tildes, mayúsculas, símbolos y espacios extra', () => {
    expect(normalizeText('  Bujía   NGK-CR7/HSA ')).toBe('bujia ngk cr7 hsa')
    expect(normalizeText('ÑANDÚ')).toBe('nandu')
  })

  it('separa letras de números para que pegado y separado coincidan', () => {
    expect(tokenize('ns200')).toEqual(['ns', '200'])
    expect(tokenize('NS 200')).toEqual(['ns', '200'])
    expect(tokenize('10w40')).toEqual(tokenize('10W-40'))
  })

  it('descarta stopwords de la consulta pero no si es lo único que hay', () => {
    expect(tokenizeQuery('filtro de aire')).toEqual(['filtro', 'aire'])
    expect(tokenizeQuery('de la')).toEqual(['de', 'la'])
  })

  it('acota la cantidad de tokens', () => {
    expect(tokenizeQuery('a b c d e f g h i j k')).toHaveLength(8)
  })
})

describe('stem / editDistance', () => {
  it('unifica singular y plural', () => {
    expect(stem('ramales')).toBe(stem('ramal'))
    expect(stem('aceites')).toBe(stem('aceite'))
    expect(stem('llantas')).toBe(stem('llanta'))
    expect(stem('estatores')).toBe(stem('estator'))
  })

  it('no toca números ni palabras cortas', () => {
    expect(stem('200')).toBe('200')
    expect(stem('cdi')).toBe('cdi')
    expect(stem('led')).toBe('led')
  })

  it('calcula distancia con transposiciones y corta al superar el máximo', () => {
    expect(editDistance('filtro', 'filtro', 1)).toBe(0)
    expect(editDistance('filtro', 'fitlro', 2)).toBe(1)
    expect(editDistance('bujia', 'bugia', 1)).toBe(1)
    expect(editDistance('aceite', 'llanta', 1)).toBeGreaterThan(1)
    expect(editDistance('a', 'abcdef', 1)).toBeGreaterThan(1)
  })

  it('tolera más errores en palabras largas', () => {
    expect(maxTypos('cdi')).toBe(0)
    expect(maxTypos('filtr')).toBe(1)
    expect(maxTypos('lubricant')).toBe(2)
  })
})

describe('searchDocs — bug de categorías', () => {
  it('"ramales" encuentra los ramales aunque el producto diga "RAMAL"', () => {
    expect(names('ramales')).toEqual(['RAMAL ELECTRICO LIBERO 125  2014-2018'])
  })

  it('encuentra por subcategoría y por categoría padre', () => {
    expect(names('bujias')).toEqual(['Bujía NGK CR8E'])
    expect(names('sistema electrico')).toEqual(['RAMAL ELECTRICO LIBERO 125  2014-2018'])
    expect(names('repuestos')).toHaveLength(3)
  })

  it('un producto de una categoría recién creada es buscable sin tocar código', () => {
    const nuevo = buildSearchDoc(
      product({ name: 'Manigueta', categoryName: 'Palancas', parentCategoryName: 'Accesorios' }),
    )
    expect(searchDocs([nuevo], 'palancas')).toHaveLength(1)
  })
})

describe('searchDocs — normalización y tolerancia', () => {
  it('"ns200" y "ns 200" devuelven lo mismo (vía etiquetas de compatibilidad)', () => {
    expect(names('ns200')).toEqual(names('ns 200'))
    expect(names('ns200')).toContain('Filtro de aire')
  })

  it('un número distinto no coincide por fuzzy ("200" ≠ "250")', () => {
    expect(names('ns 200')).not.toContain('Kit de arrastre NS 250')
    expect(names('ns 250')).toEqual(['Kit de arrastre NS 250'])
  })

  it('ignora tildes y mayúsculas', () => {
    expect(names('BUJÍA ngk')).toEqual(['Bujía NGK CR8E'])
  })

  it('tolera errores de tipeo en nombre y categoría', () => {
    expect(names('bugia')).toEqual(['Bujía NGK CR8E'])
    expect(names('fitlro')).toEqual(['Filtro de aire'])
    expect(names('aseite')).toEqual(['Aceite Liquimoly 10W-40 sintético'])
    expect(names('aceyte')).toEqual(['Aceite Liquimoly 10W-40 sintético'])
  })

  it('el fuzzy exige la misma primera letra (evita falsos positivos)', () => {
    expect(names('pujia')).toEqual([])
  })

  it('no aplica fuzzy a palabras de 3 letras o menos', () => {
    expect(names('nga')).toEqual([])
  })

  it('SKU pegado, separado y parcial', () => {
    expect(names('lm2340')).toEqual(['Aceite Liquimoly 10W-40 sintético'])
    expect(names('lm 2340')).toEqual(['Aceite Liquimoly 10W-40 sintético'])
    expect(names('ngk-cr8e')).toEqual(['Bujía NGK CR8E'])
    expect(names('ns25')).toEqual(['Kit de arrastre NS 250'])
  })

  it('viscosidad pegada o separada', () => {
    expect(names('10w40')).toEqual(['Aceite Liquimoly 10W-40 sintético'])
    expect(names('10 w 40')).toEqual(['Aceite Liquimoly 10W-40 sintético'])
  })

  it('prefijo mientras se escribe', () => {
    expect(names('ram')).toEqual(['RAMAL ELECTRICO LIBERO 125  2014-2018'])
  })

  it('sinónimos del negocio', () => {
    expect(names('neumatico')).toEqual(['Llanta 90/90-17 Kontrol'])
    expect(names('lubricantes')).toContain('Aceite Liquimoly 10W-40 sintético')
  })

  it('exige todas las palabras (AND) y descarta stopwords', () => {
    expect(names('filtro de aire bajaj')).toEqual(['Filtro de aire'])
    expect(names('filtro llanta')).toEqual([])
  })

  it('consulta vacía o solo símbolos → sin resultados', () => {
    expect(searchDocs(docs, '')).toEqual([])
    expect(searchDocs(docs, ' -- / ')).toEqual([])
  })
})

describe('searchDocs — ranking y filtros', () => {
  it('nombre pesa más que la descripción', () => {
    const enNombre = product({ name: 'Bomba de aceite' })
    const enDescripcion = product({ name: 'Empaque', description: 'Sirve para la bomba de aceite' })
    const hits = searchDocs([enDescripcion, enNombre].map(buildSearchDoc), 'bomba aceite')
    expect(hits.map((h) => h.id)).toEqual([enNombre.id, enDescripcion.id])
  })

  it('la frase completa contigua sube el resultado', () => {
    const contigua = product({ name: 'Kit NS 200 completo' })
    const separada = product({ name: 'NS 150 con tapa 200 cc' })
    const hits = searchDocs([separada, contigua].map(buildSearchDoc), 'ns200')
    expect(hits[0]!.id).toBe(contigua.id)
  })

  it('a igual relevancia, primero con stock y luego el más nuevo', () => {
    const agotado = product({ name: 'Espejo', stock: 0, createdAt: 99 })
    const viejo = product({ name: 'Espejo', stock: 3, createdAt: 1 })
    const nuevo = product({ name: 'Espejo', stock: 3, createdAt: 50 })
    const hits = searchDocs([agotado, viejo, nuevo].map(buildSearchDoc), 'espejo')
    expect(hits.map((h) => h.id)).toEqual([nuevo.id, viejo.id, agotado.id])
  })

  it('aplica filter y limit', () => {
    const soloRepuestos = searchDocs(docs, 'repuestos', { filter: (d) => d.categoryId === 'repuestos' })
    expect(soloRepuestos).toHaveLength(3)
    expect(searchDocs(docs, 'repuestos', { limit: 2 })).toHaveLength(2)
    expect(searchDocs(docs, 'repuestos', { filter: () => false })).toEqual([])
  })
})

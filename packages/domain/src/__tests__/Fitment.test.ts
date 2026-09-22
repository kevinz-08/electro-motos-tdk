/**
 * Tests del sistema de compatibilidad (docs/seo/, Fase 2).
 *
 * Lo que se prueba aquí no es código de adorno: de estas reglas depende que a un
 * comprador se le diga "esto le sirve a tu moto". Un falso positivo acaba en una
 * devolución, así que las reglas de publicación y de años se prueban por sus dos
 * lados.
 */
import { describe, it, expect } from 'vitest'
import {
  fitsYear,
  formatYearRange,
  fullModelName,
  isPublishable,
  modelSearchTerms,
  normalizeOemReference,
  partTypeLabel,
  positionLabel,
  toMotorcycleSlug,
  type Fitment,
  type MotorcycleModelWithBrand,
} from '../entities/Motorcycle'
import { parseFitmentCsv, parseCsvLine } from '../use-cases/fitment/ParseFitmentCsv'
import { ImportFitments } from '../use-cases/fitment/ImportFitments'
import { GetModelHub } from '../use-cases/fitment/GetModelHub'
import { FindByOemReference } from '../use-cases/fitment/FindByOemReference'
import type { ModelHub } from '../repositories/IFitmentRepository'

// ── Datos de apoyo ───────────────────────────────────────────────────────────

const nkd: MotorcycleModelWithBrand = {
  id: 'model-nkd',
  brandId: 'brand-akt',
  name: 'NKD 125',
  slug: 'nkd-125',
  cc: 125,
  yearFrom: 2018,
  yearTo: null,
  aliases: ['NKD', 'AK125NKD'],
  intro: null,
  isActive: true,
  brand: { id: 'brand-akt', name: 'AKT', slug: 'akt', order: 0, isActive: true },
}

const baseFitment: Fitment = {
  id: 'f1',
  productId: 'p1',
  modelId: 'model-nkd',
  position: 'AMBAS',
  yearFrom: null,
  yearTo: null,
  notes: null,
  source: 'Manual AKT 2023',
  verified: true,
  verifiedAt: new Date('2026-09-01'),
  verifiedBy: 'taller@h2r',
}

// ── Reglas de publicación ────────────────────────────────────────────────────

describe('isPublishable', () => {
  it('publica solo los fitments verificados', () => {
    expect(isPublishable({ verified: true })).toBe(true)
    expect(isPublishable({ verified: false })).toBe(false)
  })
})

describe('fitsYear', () => {
  it('sin rango declarado aplica a todos los años', () => {
    expect(fitsYear({ yearFrom: null, yearTo: null }, 2015)).toBe(true)
    expect(fitsYear({ yearFrom: null, yearTo: null }, 2026)).toBe(true)
  })

  it('respeta el límite inferior', () => {
    expect(fitsYear({ yearFrom: 2018, yearTo: null }, 2017)).toBe(false)
    expect(fitsYear({ yearFrom: 2018, yearTo: null }, 2018)).toBe(true)
  })

  it('respeta el límite superior', () => {
    expect(fitsYear({ yearFrom: null, yearTo: 2020 }, 2021)).toBe(false)
    expect(fitsYear({ yearFrom: null, yearTo: 2020 }, 2020)).toBe(true)
  })

  it('respeta un rango cerrado por ambos lados', () => {
    const range = { yearFrom: 2018, yearTo: 2022 }
    expect(fitsYear(range, 2017)).toBe(false)
    expect(fitsYear(range, 2020)).toBe(true)
    expect(fitsYear(range, 2023)).toBe(false)
  })

  it('no niega la compatibilidad si el comprador no dio el año', () => {
    expect(fitsYear({ yearFrom: 2018, yearTo: 2022 }, null)).toBe(true)
  })
})

// ── Presentación ─────────────────────────────────────────────────────────────

describe('formatYearRange', () => {
  it('formatea los cuatro casos posibles', () => {
    expect(formatYearRange({ yearFrom: 2018, yearTo: 2022 })).toBe('2018-2022')
    expect(formatYearRange({ yearFrom: 2018, yearTo: 2018 })).toBe('2018')
    expect(formatYearRange({ yearFrom: 2018, yearTo: null })).toBe('desde 2018')
    expect(formatYearRange({ yearFrom: null, yearTo: 2015 })).toBe('hasta 2015')
  })

  it('devuelve null si no hay ningún año confirmado, en vez de inventarlo', () => {
    expect(formatYearRange({ yearFrom: null, yearTo: null })).toBeNull()
  })
})

describe('etiquetas', () => {
  it('solo etiqueta la posición cuando aporta información', () => {
    expect(positionLabel('DELANTERA')).toBe('Delantera')
    expect(positionLabel('TRASERA')).toBe('Trasera')
    expect(positionLabel('AMBAS')).toBeNull()
  })

  it('traduce el tipo de repuesto', () => {
    expect(partTypeLabel('ORIGINAL')).toBe('Original')
    expect(partTypeLabel('HOMOLOGADO')).toBe('Homologado')
    expect(partTypeLabel('GENERICO')).toBe('Genérico')
  })

  it('arma el nombre completo del modelo', () => {
    expect(fullModelName(nkd)).toBe('AKT NKD 125')
  })
})

describe('normalizeOemReference', () => {
  it('iguala las formas de escribir la misma referencia', () => {
    const esperado = '5VLF512100'
    expect(normalizeOemReference('5VL-F5121-00')).toBe(esperado)
    expect(normalizeOemReference('5vl f5121 00')).toBe(esperado)
    expect(normalizeOemReference('5VLF512100')).toBe(esperado)
  })
})

describe('toMotorcycleSlug', () => {
  it('genera slugs de URL limpios', () => {
    expect(toMotorcycleSlug('NKD 125')).toBe('nkd-125')
    expect(toMotorcycleSlug('Boxer CT100')).toBe('boxer-ct100')
    expect(toMotorcycleSlug('  Pulsar NS 200  ')).toBe('pulsar-ns-200')
  })
})

describe('modelSearchTerms', () => {
  it('incluye nombre, alias, marca y nombre completo', () => {
    const terms = modelSearchTerms(nkd)
    expect(terms).toContain('NKD 125')
    expect(terms).toContain('NKD')
    expect(terms).toContain('AK125NKD')
    expect(terms).toContain('AKT NKD 125')
    expect(terms).toContain('AKT')
  })
})

// ── CSV ──────────────────────────────────────────────────────────────────────

describe('parseCsvLine', () => {
  it('respeta las comas dentro de comillas', () => {
    expect(parseCsvLine('3-MAG7L,Bajaj,"Manual Bajaj, pág. 42",si')).toEqual([
      '3-MAG7L',
      'Bajaj',
      'Manual Bajaj, pág. 42',
      'si',
    ])
  })

  it('entiende las comillas escapadas', () => {
    expect(parseCsvLine('a,"dice ""hola""",b')).toEqual(['a', 'dice "hola"', 'b'])
  })
})

const CABECERA = 'sku,marca_moto,modelo_moto,posicion,anio_desde,anio_hasta,fuente,notas,verificado'

describe('parseFitmentCsv', () => {
  it('lee una fila válida completa', () => {
    const { rows, errors } = parseFitmentCsv(
      `${CABECERA}\n3-MAG7L,AKT,NKD 125,delantera,2018,2022,Manual AKT 2023,solo carburada,si`,
    )

    expect(errors).toEqual([])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      line: 2,
      sku: '3-MAG7L',
      brandName: 'AKT',
      modelName: 'NKD 125',
      position: 'DELANTERA',
      yearFrom: 2018,
      yearTo: 2022,
      notes: 'solo carburada',
      source: 'Manual AKT 2023',
      verified: true,
    })
  })

  it('aplica los valores por defecto: posición ambas y sin verificar', () => {
    const { rows } = parseFitmentCsv(`${CABECERA}\n3-MAG7L,AKT,NKD 125,,,,Catálogo proveedor,,`)
    expect(rows[0].position).toBe('AMBAS')
    expect(rows[0].verified).toBe(false)
    expect(rows[0].yearFrom).toBeNull()
    expect(rows[0].notes).toBeNull()
  })

  it('rechaza la fila sin fuente: sin fuente no hay verificación posible', () => {
    const { rows, errors } = parseFitmentCsv(`${CABECERA}\n3-MAG7L,AKT,NKD 125,ambas,,,,,si`)
    expect(rows).toHaveLength(0)
    expect(errors[0].line).toBe(2)
    expect(errors[0].message).toContain('fuente')
  })

  it('rechaza años imposibles y rangos invertidos', () => {
    const { errors } = parseFitmentCsv(
      `${CABECERA}\n` +
        `A,AKT,NKD 125,ambas,1800,,Manual,,no\n` +
        `B,AKT,NKD 125,ambas,2022,2018,Manual,,no`,
    )
    expect(errors).toHaveLength(2)
    expect(errors[0].message).toContain('fuera de rango')
    expect(errors[1].message).toContain('posterior')
  })

  it('rechaza posiciones y verificados que no reconoce', () => {
    const { errors } = parseFitmentCsv(
      `${CABECERA}\n` +
        `A,AKT,NKD 125,lateral,,,Manual,,no\n` +
        `B,AKT,NKD 125,ambas,,,Manual,,quizás`,
    )
    expect(errors[0].message).toContain('posición no reconocida')
    expect(errors[1].message).toContain('verificado no reconocido')
  })

  it('detecta filas duplicadas dentro del mismo archivo', () => {
    const fila = '3-MAG7L,AKT,NKD 125,ambas,,,Manual,,si'
    const { rows, errors } = parseFitmentCsv(`${CABECERA}\n${fila}\n${fila}`)
    expect(rows).toHaveLength(1)
    expect(errors[0].message).toContain('duplicada')
  })

  it('avisa de las columnas obligatorias que falten', () => {
    const { rows, errors } = parseFitmentCsv('sku,marca_moto\n3-MAG7L,AKT')
    expect(rows).toHaveLength(0)
    expect(errors[0].message).toContain('modelo_moto')
    expect(errors[0].message).toContain('fuente')
  })

  it('soporta el BOM que mete Excel y el archivo vacío', () => {
    const { rows } = parseFitmentCsv(`﻿${CABECERA}\n3-MAG7L,AKT,NKD 125,,,,Manual,,si`)
    expect(rows).toHaveLength(1)
    expect(parseFitmentCsv('').errors[0].message).toContain('vacío')
  })

  it('sigue procesando el resto del archivo cuando una fila falla', () => {
    const { rows, errors } = parseFitmentCsv(
      `${CABECERA}\n` +
        `,AKT,NKD 125,ambas,,,Manual,,si\n` +
        `3-MAG7L,AKT,NKD 125,ambas,,,Manual,,si`,
    )
    expect(rows).toHaveLength(1)
    expect(errors).toHaveLength(1)
  })
})

// ── Importación ──────────────────────────────────────────────────────────────

function makeRepos(overrides: { productBySku?: string[] } = {}) {
  const skus = new Set(overrides.productBySku ?? ['3-MAG7L'])
  const upserts: unknown[] = []

  const motorcycleRepo = {
    findAllModels: async () => [nkd],
    findBrands: async () => [],
    findModelsByBrand: async () => [],
    findModel: async () => null,
    getModelHub: async () => null,
    findModelsWithVerifiedFitments: async () => [],
  }

  const fitmentRepo = {
    findVerifiedByProduct: async () => [],
    findAllByProductUnverified: async () => [],
    findProductIdsByModel: async () => [],
    countVerified: async () => 0,
    upsert: async (f: unknown) => {
      upserts.push(f)
      return { fitment: { ...baseFitment }, created: true }
    },
  }

  const productRepo = {
    findBySku: async (sku: string) => (skus.has(sku) ? { id: `prod-${sku}`, sku } : null),
  }

  return { motorcycleRepo, fitmentRepo, productRepo, upserts }
}

describe('ImportFitments', () => {
  const row = {
    line: 2,
    sku: '3-MAG7L',
    brandName: 'AKT',
    modelName: 'NKD 125',
    position: 'AMBAS' as const,
    yearFrom: null,
    yearTo: null,
    notes: null,
    source: 'Manual AKT 2023',
    verified: true,
  }

  it('importa una fila válida y la marca como verificada por quien importa', async () => {
    const { motorcycleRepo, fitmentRepo, productRepo, upserts } = makeRepos()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new ImportFitments(motorcycleRepo as any, fitmentRepo as any, productRepo as any)

    const result = await useCase.execute({ rows: [row], importedBy: 'santiago' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toMatchObject({ created: 1, updated: 0, failed: 0, verified: 1 })
    expect(upserts[0]).toMatchObject({ verifiedBy: 'santiago', verified: true })
  })

  it('resuelve el modelo por alias', async () => {
    const { motorcycleRepo, fitmentRepo, productRepo } = makeRepos()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new ImportFitments(motorcycleRepo as any, fitmentRepo as any, productRepo as any)

    const result = await useCase.execute({
      rows: [{ ...row, modelName: 'ak125nkd' }],
      importedBy: 'santiago',
    })

    expect(result.ok && result.value.created).toBe(1)
  })

  it('rechaza el SKU que no existe en el catálogo', async () => {
    const { motorcycleRepo, fitmentRepo, productRepo } = makeRepos()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new ImportFitments(motorcycleRepo as any, fitmentRepo as any, productRepo as any)

    const result = await useCase.execute({ rows: [{ ...row, sku: 'NO-EXISTE' }], importedBy: 's' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.failed).toBe(1)
    expect(result.value.errors[0].message).toContain('NO-EXISTE')
  })

  it('no inventa modelos que no estén dados de alta', async () => {
    const { motorcycleRepo, fitmentRepo, productRepo } = makeRepos()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new ImportFitments(motorcycleRepo as any, fitmentRepo as any, productRepo as any)

    const result = await useCase.execute({
      rows: [{ ...row, brandName: 'Suzuki', modelName: 'DR150' }],
      importedBy: 's',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.failed).toBe(1)
    expect(result.value.errors[0].message).toContain('no inventa modelos')
  })

  it('aplica las filas buenas aunque otras fallen', async () => {
    const { motorcycleRepo, fitmentRepo, productRepo } = makeRepos()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new ImportFitments(motorcycleRepo as any, fitmentRepo as any, productRepo as any)

    const result = await useCase.execute({
      rows: [row, { ...row, line: 3, sku: 'NO-EXISTE' }],
      importedBy: 's',
    })

    expect(result.ok && result.value.created).toBe(1)
    expect(result.ok && result.value.failed).toBe(1)
  })

  it('con cero filas no hace nada y no falla', async () => {
    const { motorcycleRepo, fitmentRepo, productRepo } = makeRepos()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new ImportFitments(motorcycleRepo as any, fitmentRepo as any, productRepo as any)

    const result = await useCase.execute({ rows: [], importedBy: 's' })
    expect(result.ok && result.value.created).toBe(0)
  })
})

// ── Hub de modelo ────────────────────────────────────────────────────────────

const hubConProductos: ModelHub = {
  model: nkd,
  categories: [
    { categoryId: 'c1', categoryName: 'Frenos', categorySlug: 'frenos', productCount: 3 },
    { categoryId: 'c2', categoryName: 'Aceites', categorySlug: 'aceites', productCount: 0 },
  ],
  totalProducts: 3,
}

describe('GetModelHub', () => {
  it('devuelve el hub cuando hay productos compatibles', async () => {
    const repo = { getModelHub: async () => hubConProductos }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await new GetModelHub(repo as any).execute({ brandSlug: 'akt', modelSlug: 'nkd-125' })

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.totalProducts).toBe(3)
  })

  it('404 si el modelo no existe', async () => {
    const repo = { getModelHub: async () => null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await new GetModelHub(repo as any).execute({ brandSlug: 'akt', modelSlug: 'xx' })

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe('NOT_FOUND')
  })

  it('404 si el modelo no tiene repuestos verificados — no se publican hubs vacíos', async () => {
    const repo = { getModelHub: async () => ({ ...hubConProductos, totalProducts: 0 }) }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await new GetModelHub(repo as any).execute({ brandSlug: 'akt', modelSlug: 'nkd-125' })

    expect(!result.ok && result.error.code).toBe('NOT_FOUND')
  })

  it('404 si la categoría pedida no tiene productos para ese modelo', async () => {
    const repo = { getModelHub: async () => hubConProductos }
    const result = await new GetModelHub(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo as any,
    ).execute({ brandSlug: 'akt', modelSlug: 'nkd-125', categorySlug: 'aceites' })

    expect(!result.ok && result.error.code).toBe('NOT_FOUND')
  })

  it('devuelve el hub si la categoría pedida sí tiene productos', async () => {
    const repo = { getModelHub: async () => hubConProductos }
    const result = await new GetModelHub(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo as any,
    ).execute({ brandSlug: 'akt', modelSlug: 'nkd-125', categorySlug: 'frenos' })

    expect(result.ok).toBe(true)
  })

  it('envuelve los errores de infraestructura en INTERNAL_ERROR', async () => {
    const repo = { getModelHub: async () => { throw new Error('db caída') } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await new GetModelHub(repo as any).execute({ brandSlug: 'akt', modelSlug: 'nkd-125' })

    expect(!result.ok && result.error.code).toBe('INTERNAL_ERROR')
  })
})

// ── Referencia OEM ───────────────────────────────────────────────────────────

describe('FindByOemReference', () => {
  it('encuentra los productos de una referencia, escrita como sea', async () => {
    const repo = {
      findProductIdsByReference: async (n: string) => (n === '5VLF512100' ? ['p1', 'p2'] : []),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await new FindByOemReference(repo as any).execute({ reference: '5vl-f5121-00' })

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.productIds).toEqual(['p1', 'p2'])
    expect(result.ok && result.value.normalized).toBe('5VLF512100')
  })

  it('rechaza referencias demasiado cortas', async () => {
    const repo = { findProductIdsByReference: async () => [] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await new FindByOemReference(repo as any).execute({ reference: 'ab' })

    expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
  })

  it('404 si ningún producto tiene esa referencia — no se generan páginas vacías', async () => {
    const repo = { findProductIdsByReference: async () => [] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await new FindByOemReference(repo as any).execute({ reference: 'ABC-123' })

    expect(!result.ok && result.error.code).toBe('NOT_FOUND')
  })
})

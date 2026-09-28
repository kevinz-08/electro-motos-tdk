import { describe, it, expect } from 'vitest'
import {
  normalizeProductIdentifiers,
  parseIdentifiersCsv,
  validateProductIdentifiers,
} from '@/domain/entities/ProductIdentifiers'

const empty = { partBrand: null, mpn: null, partType: null, warrantyMonths: null }

describe('validateProductIdentifiers', () => {
  it('acepta todo vacío y datos completos', () => {
    expect(validateProductIdentifiers(empty)).toBeNull()
    expect(validateProductIdentifiers({ partBrand: 'Magna', mpn: 'MAGX7L-BS', partType: 'HOMOLOGADO', warrantyMonths: 6 })).toBeNull()
  })
  it('rechaza "genérico", "sin marca" y similares como marca (con o sin tildes)', () => {
    for (const brand of ['Genérico', 'GENERICO', 'sin marca', 'N/A', ' Varios ']) {
      expect(validateProductIdentifiers({ ...empty, partBrand: brand })).toMatch(/no es una marca/)
    }
  })
  it('rechaza textos solo con espacios o demasiado largos', () => {
    expect(validateProductIdentifiers({ ...empty, partBrand: '  ' })).not.toBeNull()
    expect(validateProductIdentifiers({ ...empty, mpn: ' ' })).not.toBeNull()
    expect(validateProductIdentifiers({ ...empty, partBrand: 'x'.repeat(71) })).not.toBeNull()
    expect(validateProductIdentifiers({ ...empty, mpn: 'x'.repeat(71) })).not.toBeNull()
  })
  it('valida el tipo y la garantía', () => {
    expect(validateProductIdentifiers({ ...empty, partType: 'REPLICA' as never })).not.toBeNull()
    expect(validateProductIdentifiers({ ...empty, warrantyMonths: -1 })).not.toBeNull()
    expect(validateProductIdentifiers({ ...empty, warrantyMonths: 121 })).not.toBeNull()
    expect(validateProductIdentifiers({ ...empty, warrantyMonths: 2.5 })).not.toBeNull()
    expect(validateProductIdentifiers({ ...empty, warrantyMonths: 0 })).toBeNull()
  })
  it('normaliza: recorta y convierte vacíos en null', () => {
    expect(normalizeProductIdentifiers({ partBrand: ' Bosch ', mpn: '', partType: 'ORIGINAL', warrantyMonths: 12 })).toEqual({
      partBrand: 'Bosch', mpn: null, partType: 'ORIGINAL', warrantyMonths: 12,
    })
  })
})

describe('parseIdentifiersCsv', () => {
  it('lee filas completas y acepta alias de tipo sin tildes ni mayúsculas', () => {
    const { rows, errors } = parseIdentifiersCsv('sku,marca,mpn,tipo,garantia_meses\n9-G3856,Magna,MAGX7L-BS,Homologado,6\n6-ECU,Bosch,0 986,ORIGINAL,12\n')
    expect(errors).toEqual([])
    expect(rows).toEqual([
      { line: 2, sku: '9-G3856', partBrand: 'Magna', mpn: 'MAGX7L-BS', partType: 'HOMOLOGADO', warrantyMonths: 6 },
      { line: 3, sku: '6-ECU', partBrand: 'Bosch', mpn: '0 986', partType: 'ORIGINAL', warrantyMonths: 12 },
    ])
  })
  it('celda vacía = no tocar; "-" = borrar', () => {
    const { rows } = parseIdentifiersCsv('sku,marca,mpn,tipo,garantia_meses\nA-1,Magna,,-,\n')
    expect(rows[0]).toEqual({ line: 2, sku: 'A-1', partBrand: 'Magna', mpn: undefined, partType: null })
    expect('warrantyMonths' in rows[0]!).toBe(false)
  })
  it('acepta un CSV parcial (solo algunas columnas) y con BOM de Excel', () => {
    const { rows, errors } = parseIdentifiersCsv('﻿sku,marca\r\nA-1,NGK\r\n')
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({ sku: 'A-1', partBrand: 'NGK' })
  })
  it('reporta errores por línea sin abortar el archivo', () => {
    const csv = [
      'sku,marca,mpn,tipo,garantia_meses',
      ',Magna,,,',
      'A-1,Genérico,,,',
      'A-2,Magna,,replica,',
      'A-3,Magna,,,seis',
      'A-4,,,,',
      'A-5,NGK,CR7HSA,original,6',
      'A-5,NGK,,,',
    ].join('\n')
    const { rows, errors } = parseIdentifiersCsv(csv)
    expect(rows.map((r) => r.sku)).toEqual(['A-5'])
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4, 5, 6, 8])
  })
  it('sin columna sku no procesa nada', () => {
    const { rows, errors } = parseIdentifiersCsv('marca,mpn\nMagna,X\n')
    expect(rows).toEqual([])
    expect(errors[0]!.message).toMatch(/sku/)
  })
})

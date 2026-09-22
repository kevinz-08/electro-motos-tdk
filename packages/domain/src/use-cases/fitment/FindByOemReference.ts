/**
 * Búsqueda por referencia original del fabricante (docs/seo/, Fase 2).
 *
 * Resuelve `/referencia/[oem]`. Mucha gente del gremio no busca "pastillas de
 * freno", busca el número de parte que trae la pieza vieja: "5VL-F5121-00".
 *
 * La referencia se normaliza antes de buscar, así que da igual cómo la escriba
 * el usuario: `5vl-f5121-00`, `5VL F5121 00` y `5VLF512100` son la misma.
 *
 * Como en el hub de modelo, **una referencia sin productos asociados no genera
 * página**: devuelve `NOT_FOUND` para que la ruta responda 404 en vez de dejar
 * una URL vacía indexable por cada combinación de caracteres que alguien teclee.
 */
import type { IOemReferenceRepository } from '../../repositories/IFitmentRepository'
import { Result, ok, err, AppError } from '../../shared/Result'
import { normalizeOemReference } from '../../entities/Motorcycle'

export interface FindByOemReferenceInput {
  reference: string
}

export interface OemSearchResult {
  /** Referencia normalizada con la que se buscó. */
  normalized: string
  productIds: string[]
}

export class FindByOemReference {
  constructor(private readonly oemRepo: IOemReferenceRepository) {}

  async execute({ reference }: FindByOemReferenceInput): Promise<Result<OemSearchResult>> {
    const normalized = normalizeOemReference(reference)

    // Dos caracteres no son una referencia: es ruido, y buscarlo devolvería
    // medio catálogo.
    if (normalized.length < 3) {
      return err(new AppError('VALIDATION_ERROR', 'La referencia es demasiado corta'))
    }

    try {
      const productIds = await this.oemRepo.findProductIdsByReference(normalized)

      if (productIds.length === 0) {
        return err(new AppError('NOT_FOUND', `Ningún producto tiene la referencia ${reference}`))
      }

      return ok({ normalized, productIds })
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'Error al buscar por referencia OEM', e))
    }
  }
}

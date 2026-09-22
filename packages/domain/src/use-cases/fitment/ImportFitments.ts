/**
 * Importación masiva de compatibilidades desde CSV (docs/seo/, Fase 2).
 *
 * Toma las filas ya validadas por `parseFitmentCsv`, resuelve cada SKU contra el
 * catálogo y cada "marca + modelo" contra el catálogo de motos, y da de alta o
 * actualiza los fitments.
 *
 * Decisiones deliberadas:
 *
 *   1. **No crea marcas ni modelos que no existan.** Si el CSV trae "Bajaj
 *      Boxer CT 100" y en el catálogo está como "Boxer CT100", la fila se
 *      rechaza con un mensaje claro en vez de crear un modelo duplicado. Los
 *      modelos los da de alta un humano; el CSV solo los referencia.
 *   2. **Resuelve el modelo por nombre o por alias**, sin tildes ni mayúsculas,
 *      para que "NKD", "nkd 125" y "NKD 125 EIII" lleguen al mismo sitio.
 *   3. **Informa de todo**: cuántas filas se dieron de alta, cuántas se
 *      actualizaron y cuántas fallaron con su línea y su motivo. El importador
 *      no es un sitio donde los errores se pierdan en silencio.
 *   4. **Una fila que falla no aborta la importación.** Se aplica lo bueno y se
 *      informa de lo malo; así el equipo corrige solo lo que falta.
 */
import type { IFitmentRepository, IMotorcycleRepository } from '../../repositories/IFitmentRepository'
import type { IProductRepository } from '../../repositories/IProductRepository'
import { Result, ok, err, AppError } from '../../shared/Result'
import { modelSearchTerms } from '../../entities/Motorcycle'
import type { FitmentCsvRow, FitmentCsvError } from './ParseFitmentCsv'

export interface ImportFitmentsInput {
  rows: FitmentCsvRow[]
  /** Quién importa: queda como `verifiedBy` en las filas marcadas verificadas. */
  importedBy: string
}

export interface ImportFitmentsReport {
  created: number
  updated: number
  failed: number
  /** Cuántas de las aplicadas quedaron publicables (verificadas). */
  verified: number
  errors: FitmentCsvError[]
}

/** Clave de búsqueda insensible a tildes, mayúsculas y separadores. */
function searchKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export class ImportFitments {
  constructor(
    private readonly motorcycleRepo: IMotorcycleRepository,
    private readonly fitmentRepo: IFitmentRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  async execute({ rows, importedBy }: ImportFitmentsInput): Promise<Result<ImportFitmentsReport>> {
    const report: ImportFitmentsReport = {
      created: 0,
      updated: 0,
      failed: 0,
      verified: 0,
      errors: [],
    }

    if (rows.length === 0) return ok(report)

    try {
      // Índice de modelos en memoria: una consulta para todo el archivo, en vez
      // de una por fila. El catálogo de modelos es de decenas de filas.
      const models = await this.motorcycleRepo.findAllModels()
      const modelsByKey = new Map<string, string>()

      for (const model of models) {
        const brandKey = searchKey(model.brand.name)
        for (const term of modelSearchTerms(model)) {
          // Se indexa "marca+término" y también el término solo, porque el CSV
          // puede traer el modelo con o sin la marca repetida.
          modelsByKey.set(`${brandKey}|${searchKey(term)}`, model.id)
        }
      }

      for (const row of rows) {
        const product = await this.productRepo.findBySku(row.sku)
        if (!product) {
          report.failed++
          report.errors.push({ line: row.line, message: `no existe ningún producto con SKU "${row.sku}"` })
          continue
        }

        const modelId = modelsByKey.get(`${searchKey(row.brandName)}|${searchKey(row.modelName)}`)
        if (!modelId) {
          report.failed++
          report.errors.push({
            line: row.line,
            message:
              `no existe el modelo "${row.brandName} ${row.modelName}" en el catálogo de motos. ` +
              `Créalo primero (o añade ese nombre como alias) — el importador no inventa modelos`,
          })
          continue
        }

        const { created } = await this.fitmentRepo.upsert({
          productId: product.id,
          modelId,
          position: row.position,
          yearFrom: row.yearFrom,
          yearTo: row.yearTo,
          notes: row.notes,
          source: row.source,
          verified: row.verified,
          verifiedAt: row.verified ? new Date() : null,
          verifiedBy: row.verified ? importedBy : null,
        })

        if (created) report.created++
        else report.updated++
        if (row.verified) report.verified++
      }

      return ok(report)
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'Error al importar las compatibilidades', e))
    }
  }
}

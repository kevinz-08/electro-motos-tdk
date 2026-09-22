/**
 * Hub de un modelo de moto (docs/seo/, Fase 2).
 *
 * Resuelve `/repuestos/[marca]/[modelo]`: el modelo, sus categorías con conteo
 * de productos compatibles y el total.
 *
 * La regla que hace de este caso de uso algo más que un `findOne`:
 * **un hub sin productos compatibles verificados no existe**. Devuelve
 * `NOT_FOUND`, la ruta responde 404 y la URL no entra al sitemap. Publicar hubs
 * vacíos —una página por modelo que solo cambia el nombre— es exactamente la
 * definición de doorway page que el proyecto tiene prohibida, y además sería una
 * mala experiencia: el comprador llega buscando repuestos para su moto y no
 * encuentra ninguno.
 */
import type { IMotorcycleRepository, ModelHub } from '../../repositories/IFitmentRepository'
import { Result, ok, err, AppError } from '../../shared/Result'

export interface GetModelHubInput {
  brandSlug: string
  modelSlug: string
  /** Categoría concreta, para `/repuestos/[marca]/[modelo]/[categoria]`. */
  categorySlug?: string
}

export class GetModelHub {
  constructor(private readonly motorcycleRepo: IMotorcycleRepository) {}

  async execute({ brandSlug, modelSlug, categorySlug }: GetModelHubInput): Promise<Result<ModelHub>> {
    try {
      const hub = await this.motorcycleRepo.getModelHub(brandSlug, modelSlug)

      if (!hub) {
        return err(new AppError('NOT_FOUND', `No existe el modelo ${brandSlug}/${modelSlug}`))
      }

      if (hub.totalProducts === 0) {
        return err(
          new AppError(
            'NOT_FOUND',
            `El modelo ${brandSlug}/${modelSlug} no tiene repuestos compatibles verificados`,
          ),
        )
      }

      if (categorySlug) {
        const category = hub.categories.find((c) => c.categorySlug === categorySlug)
        if (!category || category.productCount === 0) {
          return err(
            new AppError(
              'NOT_FOUND',
              `El modelo ${brandSlug}/${modelSlug} no tiene repuestos de la categoría ${categorySlug}`,
            ),
          )
        }
      }

      return ok(hub)
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'Error al obtener el hub del modelo', e))
    }
  }
}

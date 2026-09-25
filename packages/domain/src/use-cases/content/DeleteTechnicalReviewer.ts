import type { ITechnicalReviewerRepository } from '@/domain/repositories/ITechnicalReviewerRepository'
import { Result, ok, err, AppError } from '@/domain/shared/Result'

/**
 * Use case: eliminar un revisor técnico.
 *
 * Se rechaza si todavía firma guías de mantenimiento: borrarlo dejaría
 * contenido publicado sin revisor, que es justo lo que la regla H-21 prohíbe.
 * El administrador debe reasignar esas guías a otro revisor (o desactivar a
 * este, lo que las oculta) antes de poder eliminarlo.
 *
 * Devuelve el `photoPublicId` para que quien llama borre la foto en Cloudinary.
 */
export class DeleteTechnicalReviewer {
  constructor(private readonly repo: ITechnicalReviewerRepository) {}

  async execute(id: string): Promise<Result<{ photoPublicId: string | null }>> {
    try {
      const reviewer = await this.repo.findById(id)
      if (!reviewer) return err(new AppError('NOT_FOUND', 'Revisor no encontrado'))

      const guides = await this.repo.countGuides(id)
      if (guides > 0) {
        return err(
          new AppError(
            'VALIDATION_ERROR',
            `Este revisor firma ${guides} ${guides === 1 ? 'guía' : 'guías'} de mantenimiento. ` +
              'Reasígnalas a otro revisor antes de eliminarlo, o desactívalo para ocultarlas.',
          ),
        )
      }

      await this.repo.delete(id)
      return ok({ photoPublicId: reviewer.photoPublicId })
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'No se pudo eliminar el revisor', e))
    }
  }
}

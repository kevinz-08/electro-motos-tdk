import type { ITechnicalReviewerRepository } from '@/domain/repositories/ITechnicalReviewerRepository'
import { validateReviewerProfile, type TechnicalReviewer } from '@/domain/entities/TechnicalReviewer'
import { Result, ok, err, AppError } from '@/domain/shared/Result'

export interface SaveTechnicalReviewerInput {
  /** Presente = editar; ausente = crear. */
  id?: string
  name: string
  slug: string
  headline?: string | null
  yearsExperience?: number | null
  bio: string
  credentials?: readonly string[]
  photoUrl?: string | null
  photoPublicId?: string | null
  isActive: boolean
}

/**
 * Use case: crear o actualizar un revisor técnico (H-21).
 *
 * Reglas: nombre, slug y trayectoria obligatorios; años de experiencia enteros
 * entre 0 y 80 (o sin declarar); hasta 10 certificaciones; slug único.
 * Nunca lanza: devuelve `Result`.
 */
export class SaveTechnicalReviewer {
  constructor(private readonly repo: ITechnicalReviewerRepository) {}

  async execute(input: SaveTechnicalReviewerInput): Promise<Result<TechnicalReviewer>> {
    const validationError = validateReviewerProfile(input)
    if (validationError) return err(new AppError('VALIDATION_ERROR', validationError))

    const slug = input.slug.trim()
    try {
      if (input.id && !(await this.repo.findById(input.id))) {
        return err(new AppError('NOT_FOUND', 'Revisor no encontrado'))
      }
      if (await this.repo.slugExists(slug, input.id)) {
        return err(new AppError('VALIDATION_ERROR', 'Ya existe un revisor con ese slug'))
      }

      const reviewer = await this.repo.save({
        id: input.id,
        name: input.name.trim(),
        slug,
        headline: input.headline?.trim() || null,
        yearsExperience: input.yearsExperience ?? null,
        bio: input.bio.trim(),
        credentials: (input.credentials ?? []).map((c) => c.trim()).filter(Boolean),
        photoUrl: input.photoUrl ?? null,
        photoPublicId: input.photoPublicId ?? null,
        isActive: input.isActive,
      })
      return ok(reviewer)
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'No se pudo guardar el revisor', e))
    }
  }
}

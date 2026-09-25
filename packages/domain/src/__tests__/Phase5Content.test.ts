import { describe, it, expect, vi } from 'vitest'
import {
  formatExperience,
  validateReviewerProfile,
} from '@/domain/entities/TechnicalReviewer'
import {
  MAX_MAINTENANCE_ITEMS,
  SUGGESTED_MAINTENANCE_LABELS,
  formatKm,
  formatMonths,
  isMaintenanceGuidePublishable,
  validateMaintenanceItem,
} from '@/domain/entities/MaintenanceGuide'
import { SaveTechnicalReviewer } from '@/domain/use-cases/content/SaveTechnicalReviewer'
import { DeleteTechnicalReviewer } from '@/domain/use-cases/content/DeleteTechnicalReviewer'
import { SetMaintenanceGuide } from '@/domain/use-cases/content/SetMaintenanceGuide'
import type { ITechnicalReviewerRepository } from '@/domain/repositories/ITechnicalReviewerRepository'
import type { IMaintenanceGuideRepository } from '@/domain/repositories/IMaintenanceGuideRepository'

// ── Revisor técnico ──────────────────────────────────────────────────────────

const validProfile = { name: 'Carlos Pérez', slug: 'carlos-perez', bio: 'Mecánico de motos.' }

describe('validateReviewerProfile', () => {
  it('acepta un perfil mínimo válido', () => {
    expect(validateReviewerProfile(validProfile)).toBeNull()
  })
  it('exige nombre, slug y trayectoria', () => {
    expect(validateReviewerProfile({ ...validProfile, name: ' ' })).not.toBeNull()
    expect(validateReviewerProfile({ ...validProfile, slug: '' })).not.toBeNull()
    expect(validateReviewerProfile({ ...validProfile, bio: '  ' })).not.toBeNull()
  })
  it('valida los años de experiencia: entero 0–80 o sin declarar', () => {
    expect(validateReviewerProfile({ ...validProfile, yearsExperience: null })).toBeNull()
    expect(validateReviewerProfile({ ...validProfile, yearsExperience: 0 })).toBeNull()
    expect(validateReviewerProfile({ ...validProfile, yearsExperience: 12 })).toBeNull()
    expect(validateReviewerProfile({ ...validProfile, yearsExperience: -1 })).not.toBeNull()
    expect(validateReviewerProfile({ ...validProfile, yearsExperience: 81 })).not.toBeNull()
    expect(validateReviewerProfile({ ...validProfile, yearsExperience: 3.5 })).not.toBeNull()
  })
  it('limita la cantidad y el largo de las certificaciones', () => {
    const many = Array.from({ length: 11 }, (_, i) => `Cert ${i}`)
    expect(validateReviewerProfile({ ...validProfile, credentials: many })).not.toBeNull()
    expect(validateReviewerProfile({ ...validProfile, credentials: ['x'.repeat(121)] })).not.toBeNull()
    expect(validateReviewerProfile({ ...validProfile, credentials: ['SENA — mecánica de motos'] })).toBeNull()
  })
})

describe('formatExperience', () => {
  it('singular, plural y sin declarar', () => {
    expect(formatExperience(1)).toBe('1 año de experiencia')
    expect(formatExperience(12)).toBe('12 años de experiencia')
    expect(formatExperience(null)).toBeNull()
  })
})

function makeReviewerRepo(opts: { existing?: boolean; slugTaken?: boolean; guides?: number } = {}) {
  return {
    save: vi.fn().mockImplementation(async (input) => ({ id: input.id ?? 'r1', createdAt: new Date(), ...input })),
    findById: vi.fn().mockResolvedValue(opts.existing === false ? null : { id: 'r1', photoPublicId: 'folder/photo-1' }),
    slugExists: vi.fn().mockResolvedValue(opts.slugTaken ?? false),
    countGuides: vi.fn().mockResolvedValue(opts.guides ?? 0),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as ITechnicalReviewerRepository
}

describe('SaveTechnicalReviewer', () => {
  const input = { ...validProfile, isActive: true, credentials: [' SENA ', ''], headline: '  Mecánico  ' }

  it('guarda normalizando textos y omitiendo certificaciones vacías', async () => {
    const repo = makeReviewerRepo()
    const r = await new SaveTechnicalReviewer(repo).execute(input)
    expect(r.ok).toBe(true)
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: ['SENA'], headline: 'Mecánico', yearsExperience: null }),
    )
  })
  it('rechaza un perfil inválido sin tocar la base', async () => {
    const repo = makeReviewerRepo()
    const r = await new SaveTechnicalReviewer(repo).execute({ ...input, name: '' })
    expect(r.ok).toBe(false)
    expect(repo.save).not.toHaveBeenCalled()
  })
  it('rechaza un slug ya usado', async () => {
    const repo = makeReviewerRepo({ slugTaken: true })
    const r = await new SaveTechnicalReviewer(repo).execute(input)
    expect(r.ok).toBe(false)
    expect(repo.save).not.toHaveBeenCalled()
  })
  it('NOT_FOUND al editar uno que no existe', async () => {
    const repo = makeReviewerRepo({ existing: false })
    const r = await new SaveTechnicalReviewer(repo).execute({ ...input, id: 'no-existe' })
    expect(!r.ok && r.error.code).toBe('NOT_FOUND')
  })
})

describe('DeleteTechnicalReviewer', () => {
  it('elimina y devuelve la foto para borrarla de Cloudinary', async () => {
    const repo = makeReviewerRepo()
    const r = await new DeleteTechnicalReviewer(repo).execute('r1')
    expect(r.ok && r.value.photoPublicId).toBe('folder/photo-1')
    expect(repo.delete).toHaveBeenCalledWith('r1')
  })
  it('se niega si todavía firma guías: nunca deja contenido sin revisor', async () => {
    const repo = makeReviewerRepo({ guides: 2 })
    const r = await new DeleteTechnicalReviewer(repo).execute('r1')
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error.message).toContain('2 guías')
    expect(repo.delete).not.toHaveBeenCalled()
  })
  it('NOT_FOUND si no existe', async () => {
    const r = await new DeleteTechnicalReviewer(makeReviewerRepo({ existing: false })).execute('x')
    expect(!r.ok && r.error.code).toBe('NOT_FOUND')
  })
})

// ── Guía de mantenimiento ────────────────────────────────────────────────────

describe('validateMaintenanceItem', () => {
  it('acepta km, meses o ambos', () => {
    expect(validateMaintenanceItem({ label: 'Aceite', intervalKm: 3000, intervalMonths: null, notes: null })).toBeNull()
    expect(validateMaintenanceItem({ label: 'Aceite', intervalKm: null, intervalMonths: 6, notes: null })).toBeNull()
    expect(validateMaintenanceItem({ label: 'Aceite', intervalKm: 3000, intervalMonths: 6, notes: null })).toBeNull()
  })
  it('exige nombre y al menos un intervalo, nunca inventa uno por defecto', () => {
    expect(validateMaintenanceItem({ label: ' ', intervalKm: 3000, intervalMonths: null, notes: null })).not.toBeNull()
    expect(validateMaintenanceItem({ label: 'Aceite', intervalKm: null, intervalMonths: null, notes: null })).not.toBeNull()
  })
  it('rechaza intervalos no enteros, cero, negativos o exagerados', () => {
    const base = { label: 'Bujía', notes: null, intervalMonths: null }
    for (const km of [0, -5, 2.5, 200_001]) {
      expect(validateMaintenanceItem({ ...base, intervalKm: km })).not.toBeNull()
    }
    expect(validateMaintenanceItem({ label: 'Bujía', notes: null, intervalKm: null, intervalMonths: 0 })).not.toBeNull()
    expect(validateMaintenanceItem({ label: 'Bujía', notes: null, intervalKm: null, intervalMonths: 241 })).not.toBeNull()
  })
})

describe('isMaintenanceGuidePublishable', () => {
  const guide = { items: [{}] as never[] }
  it('necesita al menos un ítem y un revisor activo', () => {
    expect(isMaintenanceGuidePublishable(guide, { isActive: true })).toBe(true)
    expect(isMaintenanceGuidePublishable(guide, { isActive: false })).toBe(false)
    expect(isMaintenanceGuidePublishable(guide, null)).toBe(false)
    expect(isMaintenanceGuidePublishable({ items: [] }, { isActive: true })).toBe(false)
    expect(isMaintenanceGuidePublishable(null, { isActive: true })).toBe(false)
  })
})

describe('formato de intervalos', () => {
  it('km con separador de miles y meses en singular/plural', () => {
    expect(formatKm(3000)).toMatch(/^3[.,\s]?000 km$/)
    expect(formatMonths(1)).toBe('1 mes')
    expect(formatMonths(6)).toBe('6 meses')
  })
  it('las etiquetas sugeridas solo traen nombres, ningún número', () => {
    for (const label of SUGGESTED_MAINTENANCE_LABELS) expect(label).not.toMatch(/\d/)
  })
})

function makeGuideRepo(opts: { modelExists?: boolean; reviewer?: { id: string; isActive: boolean } | null; products?: string[] } = {}) {
  return {
    findByModelId: vi.fn(),
    save: vi.fn().mockImplementation(async (input) => ({ id: 'g1', ...input })),
    deleteByModelId: vi.fn(),
    modelExists: vi.fn().mockResolvedValue(opts.modelExists ?? true),
    findReviewer: vi.fn().mockResolvedValue(opts.reviewer === undefined ? { id: 'r1', isActive: true } : opts.reviewer),
    findExistingProductIds: vi.fn().mockImplementation(async (ids: string[]) => ids.filter((i) => (opts.products ?? ['p1', 'p2']).includes(i))),
  } as unknown as IMaintenanceGuideRepository
}

const guideInput = {
  modelId: 'm1',
  source: 'Manual del propietario AKT NKD 125, pág. 34',
  reviewerId: 'r1',
  items: [
    { label: 'Aceite de motor', intervalKm: 3000, intervalMonths: 6, productId: 'p1' },
    { label: 'Bujía', intervalKm: 8000 },
  ],
}

describe('SetMaintenanceGuide', () => {
  it('guarda la guía con los ítems en orden y normalizados', async () => {
    const repo = makeGuideRepo()
    const r = await new SetMaintenanceGuide(repo).execute(guideInput)
    expect(r.ok).toBe(true)
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'm1',
        reviewerId: 'r1',
        items: [
          { label: 'Aceite de motor', intervalKm: 3000, intervalMonths: 6, notes: null, productId: 'p1', order: 0 },
          { label: 'Bujía', intervalKm: 8000, intervalMonths: null, notes: null, productId: null, order: 1 },
        ],
      }),
    )
  })

  it('la fuente es obligatoria — los intervalos no se inventan', async () => {
    const repo = makeGuideRepo()
    const r = await new SetMaintenanceGuide(repo).execute({ ...guideInput, source: '   ' })
    expect(r.ok).toBe(false)
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('el revisor es obligatorio, existe y está activo — sin firma no se publica', async () => {
    const missing = makeGuideRepo({ reviewer: null })
    expect((await new SetMaintenanceGuide(missing).execute(guideInput)).ok).toBe(false)
    const inactive = makeGuideRepo({ reviewer: { id: 'r1', isActive: false } })
    expect((await new SetMaintenanceGuide(inactive).execute(guideInput)).ok).toBe(false)
    expect(missing.save).not.toHaveBeenCalled()
    expect(inactive.save).not.toHaveBeenCalled()
  })

  it(`exige entre 1 y ${MAX_MAINTENANCE_ITEMS} puntos de control, sin repetidos (ignorando mayúsculas)`, async () => {
    const repo = makeGuideRepo()
    const uc = new SetMaintenanceGuide(repo)
    expect((await uc.execute({ ...guideInput, items: [] })).ok).toBe(false)
    const tooMany = Array.from({ length: MAX_MAINTENANCE_ITEMS + 1 }, (_, i) => ({ label: `Punto ${i}`, intervalKm: 1000 }))
    expect((await uc.execute({ ...guideInput, items: tooMany })).ok).toBe(false)
    const dup = [{ label: 'Bujía', intervalKm: 1000 }, { label: 'BUJÍA', intervalKm: 2000 }]
    expect((await uc.execute({ ...guideInput, items: dup })).ok).toBe(false)
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('rechaza un ítem sin intervalo', async () => {
    const repo = makeGuideRepo()
    const r = await new SetMaintenanceGuide(repo).execute({ ...guideInput, items: [{ label: 'Aceite' }] })
    expect(r.ok).toBe(false)
  })

  it('NOT_FOUND si el modelo no existe; rechaza repuestos enlazados inexistentes', async () => {
    const noModel = await new SetMaintenanceGuide(makeGuideRepo({ modelExists: false })).execute(guideInput)
    expect(!noModel.ok && noModel.error.code).toBe('NOT_FOUND')
    const badProduct = await new SetMaintenanceGuide(makeGuideRepo({ products: [] })).execute(guideInput)
    expect(badProduct.ok).toBe(false)
  })

  it('rechaza una fecha de revisión futura', async () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    const r = await new SetMaintenanceGuide(makeGuideRepo()).execute({ ...guideInput, reviewedAt: future })
    expect(r.ok).toBe(false)
  })

  it('un fallo de la base devuelve INTERNAL_ERROR sin lanzar', async () => {
    const repo = makeGuideRepo()
    ;(repo.save as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db'))
    const r = await new SetMaintenanceGuide(repo).execute(guideInput)
    expect(!r.ok && r.error.code).toBe('INTERNAL_ERROR')
  })
})

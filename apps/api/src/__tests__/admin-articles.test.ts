import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@h2r/database', () => ({
  prisma: { client: {} },
  PrismaClient: vi.fn(),
}))

import { HttpException, NotFoundException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { AdminArticlesController } from '../admin/admin-articles.controller'
import { SaveArticleDto } from '../admin/dto/save-article.dto'
import { PrismaTechnicalReviewerRepository } from '../infrastructure/repositories/PrismaTechnicalReviewerRepository'

// ── Artículos (Fase 5, ítem 1) ───────────────────────────────────────────────

const words = (n: number) => Array.from({ length: n }, () => 'palabra').join(' ')
const dto = {
  title: 'Original vs genérico', slug: 'original-vs-generico', kind: 'COMPARATIVA' as const, status: 'DRAFT' as const,
  authorName: 'Equipo H2R',
}

describe('AdminArticlesController', () => {
  const repo = { save: vi.fn(), findById: vi.fn(), slugExists: vi.fn(), modelExists: vi.fn(), delete: vi.fn() }
  const reviewerRepo = { findById: vi.fn() }
  const prisma = { client: { article: { findMany: vi.fn() } } }
  let controller: AdminArticlesController

  beforeEach(() => {
    vi.resetAllMocks()
    repo.slugExists.mockResolvedValue(false)
    repo.save.mockImplementation(async (r: object) => ({ ...r, id: 'a1' }))
    controller = new AdminArticlesController(repo as never, reviewerRepo as never, prisma as never)
  })

  it('create: guarda un borrador', async () => {
    const saved = await controller.create(dto)
    expect(saved).toMatchObject({ id: 'a1', status: 'DRAFT', publishedAt: null })
  })

  it('create: publicar sin revisor responde 422 con el motivo', async () => {
    const error = await controller
      .create({ ...dto, status: 'PUBLISHED', directAnswer: words(50), body: 'Texto', sources: ['Manual'] })
      .catch((e: HttpException) => e)
    expect(error).toBeInstanceOf(HttpException)
    expect((error as HttpException).getStatus()).toBe(422)
    expect((error as HttpException).message).toMatch(/revisor/)
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('getOne y remove: 404 si no existe', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(controller.getOne('x')).rejects.toBeInstanceOf(NotFoundException)
    await expect(controller.remove('x')).rejects.toBeInstanceOf(NotFoundException)
    expect(repo.delete).not.toHaveBeenCalled()
  })
})

describe('SaveArticleDto', () => {
  it('acepta un borrador y convierte la fecha de revisión', async () => {
    const instance = plainToInstance(SaveArticleDto, { ...dto, reviewedAt: '2026-09-26' })
    expect(await validate(instance)).toHaveLength(0)
    expect(instance.reviewedAt).toBeInstanceOf(Date)
  })
  it('rechaza slug inválido, estado y tipo desconocidos', async () => {
    const errors = await validate(plainToInstance(SaveArticleDto, { ...dto, slug: 'Con Espacios', status: 'LIVE', kind: 'X' }))
    expect(errors.map((e) => e.property).sort()).toEqual(['kind', 'slug', 'status'])
  })
})

describe('PrismaTechnicalReviewerRepository.countGuides', () => {
  it('suma guías de mantenimiento y artículos (con cualquiera, el revisor no se puede borrar)', async () => {
    const prisma = {
      client: { maintenanceGuide: { count: vi.fn().mockResolvedValue(1) }, article: { count: vi.fn().mockResolvedValue(2) } },
    }
    expect(await new PrismaTechnicalReviewerRepository(prisma as never).countGuides('r1')).toBe(3)
  })
})

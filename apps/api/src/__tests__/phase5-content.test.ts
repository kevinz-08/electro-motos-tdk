import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@h2r/database', () => ({
  prisma: { client: {} },
  PrismaClient: vi.fn(),
}))

import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common'
import type { IMaintenanceGuideRepository, ITechnicalReviewerRepository } from '@h2r/domain'
import { AdminReviewersController } from '../admin/admin-reviewers.controller'
import { AdminMaintenanceController } from '../admin/admin-maintenance.controller'

// ── Revisores técnicos (H-21) ────────────────────────────────────────────────

const reviewerDto = { name: 'Carlos Pérez', slug: 'carlos-perez', bio: 'Mecánico de motos.', isActive: true }

describe('AdminReviewersController', () => {
  const repo = { save: vi.fn(), findById: vi.fn(), slugExists: vi.fn(), countGuides: vi.fn(), delete: vi.fn() }
  const prisma = { client: { technicalReviewer: { findMany: vi.fn() } } }
  const cloudinary = { uploadReviewerPhoto: vi.fn(), deleteImage: vi.fn() }
  let controller: AdminReviewersController

  beforeEach(() => {
    vi.resetAllMocks()
    cloudinary.deleteImage.mockResolvedValue(undefined)
    controller = new AdminReviewersController(repo as unknown as ITechnicalReviewerRepository, prisma as never, cloudinary as never)
  })

  it('list: agrega cuántas guías firma cada revisor', async () => {
    prisma.client.technicalReviewer.findMany.mockResolvedValue([{ id: 'r1', name: 'Carlos', _count: { guides: 3 } }])
    expect(await controller.list()).toEqual([{ id: 'r1', name: 'Carlos', guideCount: 3 }])
  })

  it('getOne: 404 si no existe', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(controller.getOne('x')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('uploadImage: sube la foto con el slug y devuelve url y publicId', async () => {
    cloudinary.uploadReviewerPhoto.mockResolvedValue({ secureUrl: 'https://cdn/x.jpg', publicId: 'h2r/reviewers/x' })
    const out = await controller.uploadImage({ buffer: Buffer.from('x') }, 'carlos-perez')
    expect(cloudinary.uploadReviewerPhoto).toHaveBeenCalledWith(expect.any(Buffer), 'carlos-perez')
    expect(out).toEqual({ url: 'https://cdn/x.jpg', publicId: 'h2r/reviewers/x' })
  })

  it('uploadImage: rechaza si no llega un archivo válido', async () => {
    await expect(controller.uploadImage(undefined, 'x')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('create: guarda a través de SaveTechnicalReviewer', async () => {
    repo.slugExists.mockResolvedValue(false)
    repo.save.mockImplementation(async (i) => ({ ...i, id: 'r1', createdAt: new Date() }))
    const out = await controller.create(reviewerDto)
    expect(out).toMatchObject({ id: 'r1', name: 'Carlos Pérez' })
  })

  it('create: un error de dominio se traduce a HTTP 422', async () => {
    repo.slugExists.mockResolvedValue(true)
    await expect(controller.create(reviewerDto)).rejects.toMatchObject({ constructor: HttpException, status: 422 })
  })

  it('update: al cambiar la foto borra la anterior en Cloudinary', async () => {
    repo.findById.mockResolvedValue({ id: 'r1', photoPublicId: 'viejo/foto' })
    repo.slugExists.mockResolvedValue(false)
    repo.save.mockImplementation(async (i) => ({ ...i, id: 'r1', createdAt: new Date() }))
    await controller.update('r1', { ...reviewerDto, photoUrl: 'https://cdn/nueva.jpg', photoPublicId: 'nuevo/foto' })
    expect(cloudinary.deleteImage).toHaveBeenCalledWith('viejo/foto')
  })

  it('update: si la foto no cambia no toca Cloudinary', async () => {
    repo.findById.mockResolvedValue({ id: 'r1', photoPublicId: 'misma/foto' })
    repo.slugExists.mockResolvedValue(false)
    repo.save.mockImplementation(async (i) => ({ ...i, id: 'r1', createdAt: new Date() }))
    await controller.update('r1', { ...reviewerDto, photoPublicId: 'misma/foto' })
    expect(cloudinary.deleteImage).not.toHaveBeenCalled()
  })

  it('remove: se rechaza con 422 si todavía firma guías, y no borra nada', async () => {
    repo.findById.mockResolvedValue({ id: 'r1', photoPublicId: 'x/foto' })
    repo.countGuides.mockResolvedValue(2)
    await expect(controller.remove('r1')).rejects.toMatchObject({ constructor: HttpException, status: 422 })
    expect(repo.delete).not.toHaveBeenCalled()
    expect(cloudinary.deleteImage).not.toHaveBeenCalled()
  })

  it('remove: elimina y borra la foto de Cloudinary', async () => {
    repo.findById.mockResolvedValue({ id: 'r1', photoPublicId: 'x/foto' })
    repo.countGuides.mockResolvedValue(0)
    expect(await controller.remove('r1')).toEqual({ success: true })
    expect(cloudinary.deleteImage).toHaveBeenCalledWith('x/foto')
  })
})

// ── Guías de mantenimiento (H-20) ────────────────────────────────────────────

const guideDto = {
  source: 'Manual del propietario, pág. 34',
  reviewerId: 'r1',
  items: [{ label: 'Aceite de motor', intervalKm: 3000, intervalMonths: 6 }, { label: 'Bujía', intervalKm: 8000 }],
}

describe('AdminMaintenanceController', () => {
  const repo = { findByModelId: vi.fn(), save: vi.fn(), deleteByModelId: vi.fn(), modelExists: vi.fn(), findReviewer: vi.fn(), findExistingProductIds: vi.fn() }
  const prisma = { client: { motorcycleModel: { findMany: vi.fn() }, maintenanceGuide: { findUnique: vi.fn() } } }
  let controller: AdminMaintenanceController

  beforeEach(() => {
    vi.resetAllMocks()
    controller = new AdminMaintenanceController(repo as unknown as IMaintenanceGuideRepository, prisma as never)
  })

  it('list: clasifica cada modelo en NONE, PUBLISHED u HIDDEN (revisor desactivado)', async () => {
    prisma.client.motorcycleModel.findMany.mockResolvedValue([
      { id: 'm1', name: 'NKD 125', brand: { name: 'AKT' }, maintenanceGuide: null },
      { id: 'm2', name: 'DR150', brand: { name: 'Suzuki' }, maintenanceGuide: { reviewedAt: new Date(), reviewer: { name: 'Carlos', isActive: true }, _count: { items: 4 } } },
      { id: 'm3', name: 'FZ', brand: { name: 'Yamaha' }, maintenanceGuide: { reviewedAt: new Date(), reviewer: { name: 'Ana', isActive: false }, _count: { items: 4 } } },
    ])
    const out = await controller.list()
    expect(out.map((m) => [m.label, m.status])).toEqual([
      ['AKT NKD 125', 'NONE'], ['Suzuki DR150', 'PUBLISHED'], ['Yamaha FZ', 'HIDDEN'],
    ])
  })

  it('getOne: null si el modelo aún no tiene guía', async () => {
    prisma.client.maintenanceGuide.findUnique.mockResolvedValue(null)
    expect(await controller.getOne('m1')).toBeNull()
  })

  it('set: guarda la guía a través de SetMaintenanceGuide', async () => {
    repo.modelExists.mockResolvedValue(true)
    repo.findReviewer.mockResolvedValue({ id: 'r1', isActive: true })
    repo.findExistingProductIds.mockResolvedValue([])
    repo.save.mockImplementation(async (i) => ({ ...i, id: 'g1' }))
    const out = await controller.set('m1', guideDto)
    expect(out).toMatchObject({ id: 'g1', modelId: 'm1', reviewerId: 'r1' })
  })

  it('set: sin revisor activo se rechaza con 422 y no guarda', async () => {
    repo.modelExists.mockResolvedValue(true)
    repo.findReviewer.mockResolvedValue({ id: 'r1', isActive: false })
    await expect(controller.set('m1', guideDto)).rejects.toMatchObject({ constructor: HttpException, status: 422 })
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('set: un modelo inexistente responde 404', async () => {
    repo.modelExists.mockResolvedValue(false)
    await expect(controller.set('nada', guideDto)).rejects.toMatchObject({ constructor: HttpException, status: 404 })
  })

  it('remove: elimina la guía del modelo', async () => {
    expect(await controller.remove('m1')).toEqual({ success: true })
    expect(repo.deleteByModelId).toHaveBeenCalledWith('m1')
  })
})

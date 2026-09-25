import { Body, Controller, Delete, Get, HttpException, Inject, Param, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { isMaintenanceGuidePublishable, SetMaintenanceGuide, type IMaintenanceGuideRepository } from '@h2r/domain'
import { MAINTENANCE_GUIDE_REPOSITORY } from '../infrastructure/injection-tokens'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { SetMaintenanceGuideDto } from './dto/set-maintenance-guide.dto'

const ERROR_HTTP_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
}

/**
 * Guías de mantenimiento por modelo (docs/seo/, Fase 5 — H-20).
 * Una por modelo: `PUT /admin/maintenance/:modelId` la crea o la reemplaza completa.
 */
@ApiTags('admin / maintenance')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/maintenance')
export class AdminMaintenanceController {
  constructor(
    @Inject(MAINTENANCE_GUIDE_REPOSITORY) private readonly guideRepo: IMaintenanceGuideRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Todos los modelos activos con el estado de su guía: "sin guía", "publicada"
   * o "oculta" (existe, pero su revisor está desactivado).
   */
  @Get()
  @ApiOperation({ summary: 'Modelos con el estado de su guía de mantenimiento' })
  async list() {
    const models = await this.prisma.client.motorcycleModel.findMany({
      where: { isActive: true },
      orderBy: [{ brand: { order: 'asc' } }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        brand: { select: { name: true } },
        maintenanceGuide: {
          select: { reviewedAt: true, reviewer: { select: { name: true, isActive: true } }, _count: { select: { items: true } } },
        },
      },
    })

    return models.map((m) => {
      const guide = m.maintenanceGuide
      const publishable = guide
        ? isMaintenanceGuidePublishable({ items: new Array(guide._count.items) }, guide.reviewer)
        : false
      return {
        modelId: m.id,
        label: `${m.brand.name} ${m.name}`,
        status: !guide ? 'NONE' : publishable ? 'PUBLISHED' : 'HIDDEN',
        itemCount: guide?._count.items ?? 0,
        reviewerName: guide?.reviewer.name ?? null,
        reviewedAt: guide?.reviewedAt ?? null,
      }
    })
  }

  /** La guía guardada de un modelo, con el producto enlazado de cada punto de control. `null` si no tiene. */
  @Get(':modelId')
  @ApiOperation({ summary: 'Guía de mantenimiento de un modelo (null si aún no tiene)' })
  async getOne(@Param('modelId') modelId: string) {
    const guide = await this.prisma.client.maintenanceGuide.findUnique({
      where: { modelId },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: { product: { select: { id: true, name: true, sku: true, price: true, stock: true, isActive: true, images: true } } },
        },
      },
    })
    if (!guide) return null
    return {
      modelId: guide.modelId,
      source: guide.source,
      reviewerId: guide.reviewerId,
      notes: guide.notes,
      reviewedAt: guide.reviewedAt,
      items: guide.items.map((i) => ({
        label: i.label,
        intervalKm: i.intervalKm,
        intervalMonths: i.intervalMonths,
        notes: i.notes,
        product: i.product
          ? { id: i.product.id, name: i.product.name, sku: i.product.sku, price: i.product.price, stock: i.product.stock, isActive: i.product.isActive, image: i.product.images[0] ?? null }
          : null,
      })),
    }
  }

  @Put(':modelId')
  @ApiOperation({ summary: 'Crear o reemplazar la guía de un modelo. Sin fuente o sin revisor activo se rechaza.' })
  async set(@Param('modelId') modelId: string, @Body() dto: SetMaintenanceGuideDto) {
    const result = await new SetMaintenanceGuide(this.guideRepo).execute({
      modelId,
      source: dto.source,
      reviewerId: dto.reviewerId,
      notes: dto.notes,
      reviewedAt: dto.reviewedAt ? new Date(dto.reviewedAt) : undefined,
      items: dto.items,
    })
    if (!result.ok) throw new HttpException(result.error.message, ERROR_HTTP_STATUS[result.error.code] ?? 500)
    return result.value
  }

  @Delete(':modelId')
  @ApiOperation({ summary: 'Eliminar la guía de un modelo (la ruta pública vuelve a responder 404)' })
  async remove(@Param('modelId') modelId: string) {
    await this.guideRepo.deleteByModelId(modelId)
    return { success: true }
  }
}

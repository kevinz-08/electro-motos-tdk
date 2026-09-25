import {
  Body, Controller, Delete, Get, HttpException, Inject, NotFoundException, Param, Post, Put,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { computeKitAvailability, computeKitPrice, IKitRepository, SetKit } from '@h2r/domain'
import { KIT_REPOSITORY } from '../infrastructure/injection-tokens'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { SetKitDto } from './dto/set-kit.dto'

const ERROR_HTTP_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
}

/** Administración de kits de productos (docs/seo/plan-kits.md, Fase 4 ítem 8). */
@ApiTags('admin / kits')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/kits')
export class AdminKitsController {
  constructor(
    @Inject(KIT_REPOSITORY) private readonly kitRepo: IKitRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Lista de kits con precio y disponibilidad calculados en vivo. Incluye
   * inactivos y sin stock — el admin necesita verlos para corregirlos; la
   * tienda pública nunca los muestra.
   */
  @Get()
  @ApiOperation({ summary: 'Listar kits (incluye inactivos y sin disponibilidad)' })
  async list() {
    const kits = await this.prisma.client.kit.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: { product: { select: { id: true, name: true, sku: true, price: true, stock: true, isActive: true, deletedAt: true } } },
        },
        model: { select: { name: true, brand: { select: { name: true } } } },
      },
    })
    return kits.map((k) => this.toSummary(k))
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un kit con sus productos' })
  async getOne(@Param('id') id: string) {
    const kit = await this.prisma.client.kit.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: { product: { select: { id: true, name: true, sku: true, price: true, stock: true, isActive: true, images: true } } },
        },
      },
    })
    if (!kit || kit.deletedAt) throw new NotFoundException('Kit no encontrado')
    return {
      id: kit.id,
      name: kit.name,
      slug: kit.slug,
      description: kit.description,
      discountCents: kit.discountCents,
      modelId: kit.modelId,
      isActive: kit.isActive,
      items: kit.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        name: i.product.name,
        sku: i.product.sku,
        price: i.product.price,
        stock: i.product.stock,
        isActive: i.product.isActive,
        image: i.product.images[0] ?? null,
      })),
    }
  }

  @Post()
  @ApiOperation({ summary: 'Crear un kit' })
  async create(@Body() dto: SetKitDto) {
    return this.save(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un kit' })
  async update(@Param('id') id: string, @Body() dto: SetKitDto) {
    return this.save(dto, id)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar (soft delete) un kit' })
  async remove(@Param('id') id: string) {
    await this.kitRepo.softDelete(id)
    return { success: true }
  }

  private async save(dto: SetKitDto, id?: string) {
    const result = await new SetKit(this.kitRepo).execute({
      id,
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      discountCents: dto.discountCents,
      modelId: dto.modelId,
      isActive: dto.isActive,
      items: dto.items,
    })
    if (!result.ok) {
      const status = ERROR_HTTP_STATUS[result.error.code] ?? 500
      throw new HttpException(result.error.message, status)
    }
    return result.value
  }

  private toSummary(kit: {
    id: string; name: string; slug: string; discountCents: number; isActive: boolean
    modelId: string | null
    model: { name: string; brand: { name: string } } | null
    items: Array<{ quantity: number; product: { price: number; stock: number; isActive: boolean; deletedAt: Date | null } }>
  }) {
    const itemsTotal = kit.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
    const availableUnits = computeKitAvailability(kit.items.map((i) => ({ quantity: i.quantity, ...i.product })))
    return {
      id: kit.id,
      name: kit.name,
      slug: kit.slug,
      isActive: kit.isActive,
      itemCount: kit.items.length,
      modelLabel: kit.model ? `${kit.model.brand.name} ${kit.model.name}` : null,
      itemsTotal,
      discountCents: kit.discountCents,
      price: computeKitPrice(itemsTotal, kit.discountCents),
      availableUnits,
    }
  }
}

import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpException, Inject, NotFoundException, Param, Post, Put,
  UploadedFile, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { computeKitAvailability, computeKitPrice, IKitRepository, SetKit } from '@h2r/domain'
import { KIT_REPOSITORY } from '../infrastructure/injection-tokens'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { CloudinaryService } from '../infrastructure/services/CloudinaryService'
import { SetKitDto } from './dto/set-kit.dto'

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post('upload-image')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen del kit a Cloudinary (variant: desktop | mobile)' })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      cb(null, IMAGE_MIME_TYPES.includes(file.mimetype))
    },
  }))
  async uploadImage(
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @Body('variant') variant: string,
    @Body('slug') slug: string,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo inválido — solo se permiten imágenes JPEG, PNG o WebP de hasta 5MB')
    }
    const safeSlug = (slug ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'kit'
    const result = await this.cloudinary.uploadKitImage(file.buffer, safeSlug, variant === 'mobile' ? 'mobile' : 'desktop')
    return { url: result.secureUrl, publicId: result.publicId }
  }

  @Post('discard-image')
  @HttpCode(200)
  @ApiOperation({ summary: 'Borrar de Cloudinary una imagen subida y no guardada (publicId por body: contiene "/")' })
  async discardImage(@Body('publicId') publicId: string) {
    // Solo carpeta de kits y solo si ningún kit la referencia: evita borrar imágenes en uso.
    if (!publicId || !publicId.startsWith('h2r-online-store/kits/')) throw new BadRequestException('publicId inválido')
    const inUse = await this.prisma.client.kit.findFirst({
      where: { OR: [{ desktopImagePublicId: publicId }, { mobileImagePublicId: publicId }] },
      select: { id: true },
    })
    if (!inUse) await this.cloudinary.deleteImage(publicId).catch(() => undefined)
    return { success: true }
  }

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
      desktopImageUrl: kit.desktopImageUrl,
      desktopImagePublicId: kit.desktopImagePublicId,
      mobileImageUrl: kit.mobileImageUrl,
      mobileImagePublicId: kit.mobileImagePublicId,
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
    const previous = await this.kitRepo.findById(id)
    await this.kitRepo.softDelete(id)
    if (previous) await this.deleteOrphans(previous, [])
    return { success: true }
  }

  /** Borra en Cloudinary los public_id de `previous` que ya no usa el kit guardado. */
  private async deleteOrphans(
    previous: { desktopImagePublicId: string | null; mobileImagePublicId: string | null },
    stillUsed: Array<string | null>,
  ) {
    const keep = new Set(stillUsed.filter(Boolean))
    const orphaned = new Set(
      [previous.desktopImagePublicId, previous.mobileImagePublicId].filter((p): p is string => !!p && !keep.has(p)),
    )
    for (const publicId of orphaned) {
      // No bloquear el guardado si Cloudinary falla o el asset ya no existe.
      await this.cloudinary.deleteImage(publicId).catch(() => undefined)
    }
  }

  private async save(dto: SetKitDto, id?: string) {
    const previous = id ? await this.kitRepo.findById(id) : null
    const result = await new SetKit(this.kitRepo).execute({
      id,
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      discountCents: dto.discountCents,
      modelId: dto.modelId,
      desktopImageUrl: dto.desktopImageUrl,
      desktopImagePublicId: dto.desktopImagePublicId,
      mobileImageUrl: dto.mobileImageUrl,
      mobileImagePublicId: dto.mobileImagePublicId,
      isActive: dto.isActive,
      items: dto.items,
    })
    if (!result.ok) {
      const status = ERROR_HTTP_STATUS[result.error.code] ?? 500
      throw new HttpException(result.error.message, status)
    }
    if (previous) {
      await this.deleteOrphans(previous, [result.value.desktopImagePublicId, result.value.mobileImagePublicId])
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

import {
  BadRequestException, Body, Controller, Get, HttpCode, Patch, Post, Put,
  UploadedFile, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Roles } from '../auth/decorators/roles.decorator'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { CloudinaryService } from '../infrastructure/services/CloudinaryService'
import { UpsertPromoModalDto } from './dto/upsert-promo-modal.dto'
import { ToggleSettingDto } from './dto/toggle-setting.dto'

/** Fila única del pop-up promocional (README §25.1). */
const PROMO_ID = 'default'

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

@ApiTags('admin / promo')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/promo-modal')
export class AdminPromoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener la configuración del pop-up promocional (null si nunca se creó)' })
  find() {
    return this.prisma.client.promoModal.findUnique({ where: { id: PROMO_ID } })
  }

  @Post('upload-image')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen del pop-up a Cloudinary (variant: desktop | mobile)' })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      cb(null, IMAGE_MIME_TYPES.includes(file.mimetype))
    },
  }))
  async uploadImage(
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @Body('variant') variant: string,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo inválido — solo se permiten imágenes JPEG, PNG o WebP de hasta 5MB')
    }
    const result = await this.cloudinary.uploadPromoModalImage(
      file.buffer,
      variant === 'mobile' ? 'mobile' : 'desktop',
    )
    return { url: result.secureUrl, publicId: result.publicId }
  }

  @Put()
  @ApiOperation({ summary: 'Crear o actualizar el pop-up (si cambia alguna imagen, borra la anterior en Cloudinary)' })
  async upsert(@Body() dto: UpsertPromoModalDto) {
    const previous = await this.prisma.client.promoModal.findUnique({ where: { id: PROMO_ID } })

    const data = {
      isActive: dto.isActive ?? false,
      altText: dto.altText,
      ctaUrl: dto.ctaUrl,
      desktopImageUrl: dto.desktopImageUrl,
      desktopImagePublicId: dto.desktopImagePublicId,
      mobileImageUrl: dto.mobileImageUrl,
      mobileImagePublicId: dto.mobileImagePublicId,
    }

    const saved = await this.prisma.client.promoModal.upsert({
      where: { id: PROMO_ID },
      update: data,
      create: { id: PROMO_ID, ...data },
    })

    if (previous) {
      // Solo se borra el public_id que ya no referencia ninguna variante — ambas pueden compartir imagen.
      const stillUsed = new Set([saved.desktopImagePublicId, saved.mobileImagePublicId])
      const orphaned = new Set(
        [previous.desktopImagePublicId, previous.mobileImagePublicId].filter((pid) => !stillUsed.has(pid)),
      )
      for (const publicId of orphaned) {
        await this.cloudinary.deleteImage(publicId).catch(() => {
          // No bloquear el guardado si Cloudinary falla o el asset ya no existe.
        })
      }
    }

    return saved
  }

  @Patch('active')
  @ApiOperation({ summary: 'Activar o desactivar el pop-up sin tocar el resto de la configuración' })
  async toggleActive(@Body() dto: ToggleSettingDto) {
    const existing = await this.prisma.client.promoModal.findUnique({ where: { id: PROMO_ID } })
    if (!existing) {
      throw new BadRequestException('Primero configura el pop-up (imágenes y destino) antes de activarlo')
    }
    await this.prisma.client.promoModal.update({
      where: { id: PROMO_ID },
      data: { isActive: dto.enabled },
    })
    return { success: true, enabled: dto.enabled }
  }
}

import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpException, Inject, NotFoundException,
  Param, Post, Put, UploadedFile, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { DeleteTechnicalReviewer, SaveTechnicalReviewer, type ITechnicalReviewerRepository } from '@h2r/domain'
import { TECHNICAL_REVIEWER_REPOSITORY } from '../infrastructure/injection-tokens'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { CloudinaryService } from '../infrastructure/services/CloudinaryService'
import { Roles } from '../auth/decorators/roles.decorator'
import { SaveReviewerDto } from './dto/save-reviewer.dto'

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const ERROR_HTTP_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
}

/**
 * Administración de revisores técnicos (docs/seo/, Fase 5 — H-21).
 * La foto sigue el mismo patrón que los banners: se sube a Cloudinary por un
 * endpoint aparte y el formulario guarda la URL y el `public_id`; al reemplazarla
 * o al eliminar al revisor, la foto anterior se borra del CDN.
 */
@ApiTags('admin / reviewers')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/reviewers')
export class AdminReviewersController {
  constructor(
    @Inject(TECHNICAL_REVIEWER_REPOSITORY) private readonly reviewerRepo: ITechnicalReviewerRepository,
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar revisores técnicos (activos e inactivos) con cuántas guías firma cada uno' })
  async list() {
    const rows = await this.prisma.client.technicalReviewer.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { guides: true } } },
    })
    return rows.map(({ _count, ...r }) => ({ ...r, guideCount: _count.guides }))
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un revisor técnico' })
  async getOne(@Param('id') id: string) {
    const reviewer = await this.reviewerRepo.findById(id)
    if (!reviewer) throw new NotFoundException('Revisor no encontrado')
    return reviewer
  }

  @Post('upload-image')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir la foto de un revisor a Cloudinary' })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, IMAGE_MIME_TYPES.includes(file.mimetype)),
  }))
  async uploadImage(@UploadedFile() file: { buffer: Buffer } | undefined, @Body('slug') slug: string) {
    if (!file) {
      throw new BadRequestException('Archivo inválido — solo se permiten imágenes JPEG, PNG o WebP de hasta 5MB')
    }
    const result = await this.cloudinary.uploadReviewerPhoto(file.buffer, slug || 'revisor')
    return { url: result.secureUrl, publicId: result.publicId }
  }

  @Post('image/delete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Borrar una foto subida a Cloudinary que nunca se guardó (reemplazo cancelado o foto quitada '
      + 'antes de guardar). Se recibe por body porque el publicId contiene "/" (incluye el folder).',
  })
  async deleteUnsavedImage(@Body('publicId') publicId: string) {
    if (!publicId) throw new BadRequestException('publicId es requerido')
    await this.cloudinary.deleteImage(publicId)
    return { success: true }
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Crear un revisor técnico' })
  async create(@Body() dto: SaveReviewerDto) {
    return this.save(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un revisor técnico (si cambia la foto, borra la anterior en Cloudinary)' })
  async update(@Param('id') id: string, @Body() dto: SaveReviewerDto) {
    const previous = await this.reviewerRepo.findById(id)
    const saved = await this.save(dto, id)
    if (previous?.photoPublicId && previous.photoPublicId !== saved.photoPublicId) {
      await this.cloudinary.deleteImage(previous.photoPublicId).catch(() => {
        // No bloquear la actualización si Cloudinary falla o el asset ya no existe.
      })
    }
    return saved
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un revisor (se rechaza si todavía firma guías); borra su foto en Cloudinary' })
  async remove(@Param('id') id: string) {
    const result = await new DeleteTechnicalReviewer(this.reviewerRepo).execute(id)
    if (!result.ok) throw new HttpException(result.error.message, ERROR_HTTP_STATUS[result.error.code] ?? 500)
    if (result.value.photoPublicId) {
      await this.cloudinary.deleteImage(result.value.photoPublicId).catch(() => {
        // No bloquear la eliminación si Cloudinary falla o el asset ya no existe.
      })
    }
    return { success: true }
  }

  private async save(dto: SaveReviewerDto, id?: string) {
    const result = await new SaveTechnicalReviewer(this.reviewerRepo).execute({ id, ...dto })
    if (!result.ok) throw new HttpException(result.error.message, ERROR_HTTP_STATUS[result.error.code] ?? 500)
    return result.value
  }
}

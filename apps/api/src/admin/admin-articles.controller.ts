import {
  Body, Controller, Delete, Get, HttpCode, HttpException, Inject, NotFoundException, Param, Post, Put,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { SaveArticle, type IArticleRepository, type ITechnicalReviewerRepository } from '@h2r/domain'
import { ARTICLE_REPOSITORY, TECHNICAL_REVIEWER_REPOSITORY } from '../infrastructure/injection-tokens'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { SaveArticleDto } from './dto/save-article.dto'

const ERROR_HTTP_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
}

/**
 * Administración de artículos (docs/seo/, Fase 5 — ítem 1): comparativas, guía
 * de revisión técnico-mecánica y demás guías de texto libre. Publicar exige un
 * revisor técnico activo y la fecha de su revisión (regla de `SaveArticle`).
 */
@ApiTags('admin / articles')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(
    @Inject(ARTICLE_REPOSITORY) private readonly articleRepo: IArticleRepository,
    @Inject(TECHNICAL_REVIEWER_REPOSITORY) private readonly reviewerRepo: ITechnicalReviewerRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar artículos (todos los estados) con su revisor' })
  async list() {
    return this.prisma.client.article.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, slug: true, title: true, kind: true, status: true, updatedAt: true, publishedAt: true,
        reviewer: { select: { name: true, isActive: true } },
      },
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un artículo' })
  async getOne(@Param('id') id: string) {
    const article = await this.articleRepo.findById(id)
    if (!article) throw new NotFoundException('Artículo no encontrado')
    return article
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Crear un artículo' })
  async create(@Body() dto: SaveArticleDto) {
    return this.save(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un artículo' })
  async update(@Param('id') id: string, @Body() dto: SaveArticleDto) {
    return this.save(dto, id)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un artículo' })
  async remove(@Param('id') id: string) {
    if (!(await this.articleRepo.findById(id))) throw new NotFoundException('Artículo no encontrado')
    await this.articleRepo.delete(id)
    return { success: true }
  }

  private async save(dto: SaveArticleDto, id?: string) {
    const result = await new SaveArticle(this.articleRepo, this.reviewerRepo).execute({ id, ...dto })
    if (!result.ok) throw new HttpException(result.error.message, ERROR_HTTP_STATUS[result.error.code] ?? 500)
    return result.value
  }
}

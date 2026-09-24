import {
  Body, Controller, ForbiddenException, Get, HttpCode, Inject, NotFoundException, Param, Patch, Post, Query,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { IReviewRepository, SubmitProductReview } from '@h2r/domain'
import { REVIEW_REPOSITORY } from '../infrastructure/injection-tokens'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { Public } from '../auth/decorators/public.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { verifyReviewToken } from '../shared/order-access-token'
import { SubmitReviewDto } from './dto/submit-review.dto'
import { ModerateReviewDto } from './dto/moderate-review.dto'

/** Reseñas verificadas (README §22.6). */
@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviewRepo: IReviewRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Público: el enlace firmado del correo es la prueba de compra (funciona para invitados).
   * El use case además exige que el pedido esté DELIVERED y que el ítem no tenga reseña.
   */
  @Post('reviews')
  @Public()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Enviar reseña verificada de un producto comprado' })
  async submit(@Body() dto: SubmitReviewDto) {
    if (!verifyReviewToken(dto.orderItemId, dto.token)) {
      throw new ForbiddenException('El enlace para calificar no es válido')
    }
    const result = await new SubmitProductReview(this.reviewRepo).execute({
      orderItemId: dto.orderItemId,
      rating: dto.rating,
      recommends: dto.recommends,
      comment: dto.comment,
      installedModelId: dto.installedModelId,
    })
    if (!result.ok) throw result.error
    return { id: result.value.id, status: result.value.status }
  }

  @Get('admin/reviews')
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[ADMIN] Listar reseñas por estado' })
  async list(@Query('status') status?: string) {
    const where = status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status) ? { status } : {}
    return this.prisma.client.productReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { product: { select: { name: true, slug: true } } },
    })
  }

  @Patch('admin/reviews/:id')
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[ADMIN] Aprobar o rechazar una reseña' })
  async moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    const exists = await this.prisma.client.productReview.findUnique({ where: { id }, select: { id: true } })
    if (!exists) throw new NotFoundException('Reseña no encontrada')
    return this.reviewRepo.updateStatus(id, dto.status)
  }
}

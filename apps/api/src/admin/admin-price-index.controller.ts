import {
  Controller, Get, HttpCode, NotFoundException, Param, Post, UnprocessableEntityException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  BRAND_CATEGORIES_SETTING_KEY,
  computePriceIndex,
  parseBrandCategorySlugs,
  priceIndexCutoffDate,
  toPriceIndexGroup,
} from '@h2r/domain'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { Roles } from '../auth/decorators/roles.decorator'

/**
 * Índice de Precios de Repuestos de Moto (docs/seo/, Fase 5 — ítem 4).
 *
 * El administrador genera un corte (foto inmutable del catálogo de hoy), lo
 * revisa en el panel y lo publica. El cálculo es `computePriceIndex` del
 * dominio; aquí solo se leen los productos y se guarda el resultado.
 *
 *   - Las subcategorías que son marcas (ajuste `BRAND_CATEGORY_SLUGS`) se suman
 *     a su categoría padre: el índice mide tipos de repuesto, no marcas (H-55).
 *   - Un corte por día (zona Bogotá). Generar de nuevo el mismo día reemplaza
 *     el borrador; si ya está publicado se rechaza: primero hay que despublicarlo,
 *     para que nunca cambien en silencio unas cifras que alguien ya pudo citar.
 */
@ApiTags('admin / price-index')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/price-index')
export class AdminPriceIndexController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Cortes del índice (el más reciente primero), con sus datos' })
  async list() {
    return this.prisma.client.priceIndexSnapshot.findMany({ orderBy: { cutoffDate: 'desc' } })
  }

  @Post('snapshot')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generar (o regenerar, si es borrador) el corte de hoy desde el catálogo' })
  async snapshot() {
    const cutoff = new Date(`${priceIndexCutoffDate(new Date())}T00:00:00Z`)
    const existing = await this.prisma.client.priceIndexSnapshot.findUnique({ where: { cutoffDate: cutoff } })
    if (existing?.isPublished) {
      throw new UnprocessableEntityException('El corte de hoy ya está publicado. Despublícalo antes de regenerarlo.')
    }

    const [products, brandSetting] = await Promise.all([
      this.prisma.client.product.findMany({
        where: { isActive: true, deletedAt: null, price: { gt: 0 } },
        select: {
          price: true,
          category: { select: { slug: true, name: true, parent: { select: { slug: true, name: true } } } },
        },
      }),
      this.prisma.client.settings.findUnique({ where: { key: BRAND_CATEGORIES_SETTING_KEY } }),
    ])
    const brandSlugs = new Set(parseBrandCategorySlugs(brandSetting?.value))
    const data = computePriceIndex(
      products.map((p) => ({ price: p.price, ...toPriceIndexGroup(p.category, brandSlugs) })),
    )

    const fields = { methodologyVersion: data.methodologyVersion, productCount: data.productCount, data: data as object }
    return this.prisma.client.priceIndexSnapshot.upsert({
      where: { cutoffDate: cutoff },
      create: { cutoffDate: cutoff, ...fields },
      update: fields,
    })
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publicar un corte revisado' })
  async publish(@Param('id') id: string) {
    const snap = await this.find(id)
    const data = snap.data as { categories?: unknown[] }
    if (!data.categories?.length) {
      throw new UnprocessableEntityException('El corte no tiene ninguna categoría con muestra suficiente: no hay nada que publicar.')
    }
    return this.prisma.client.priceIndexSnapshot.update({
      where: { id },
      data: { isPublished: true, publishedAt: snap.publishedAt ?? new Date() },
    })
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Retirar un corte publicado (vuelve a borrador)' })
  async unpublish(@Param('id') id: string) {
    await this.find(id)
    return this.prisma.client.priceIndexSnapshot.update({ where: { id }, data: { isPublished: false } })
  }

  private async find(id: string) {
    const snap = await this.prisma.client.priceIndexSnapshot.findUnique({ where: { id } })
    if (!snap) throw new NotFoundException('Corte no encontrado')
    return snap
  }
}

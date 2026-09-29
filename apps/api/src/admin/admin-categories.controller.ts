import {
  Body, ConflictException, Controller, Delete, Get,
  HttpCode, NotFoundException, Param, Post, Put,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Roles } from '../auth/decorators/roles.decorator'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { SetCategoryBrandDto } from './dto/set-category-brand.dto'
import { BRAND_CATEGORIES_SETTING_KEY, parseBrandCategorySlugs } from '@h2r/domain'

@ApiTags('admin / categories')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las categorías con conteo de productos' })
  async findAll() {
    const [categories, brandSlugs] = await Promise.all([
      this.prisma.client.category.findMany({
        orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { products: true } },
        },
      }),
      this.brandSlugs(),
    ])
    return categories.map((c) => ({ ...c, isBrand: brandSlugs.includes(c.slug) }))
  }

  /**
   * Marca o desmarca una subcategoría como marca (Índice de Precios, H-55). Se
   * guarda en `Settings` (`BRAND_CATEGORY_SLUGS`), sin tocar la tabla de
   * categorías: el catálogo y sus URLs no cambian; solo el índice suma esa
   * subcategoría a su categoría padre.
   */
  @Put(':id/brand')
  @ApiOperation({ summary: 'Marcar o desmarcar una subcategoría como marca (agrupación del Índice de Precios)' })
  async setBrand(@Param('id') id: string, @Body() dto: SetCategoryBrandDto) {
    const category = await this.prisma.client.category.findUnique({ where: { id } })
    if (!category) throw new NotFoundException('Categoría no encontrada')
    if (dto.isBrand && !category.parentId) {
      throw new ConflictException('Solo una subcategoría puede ser una marca: el índice la suma a su categoría padre')
    }

    const current = await this.brandSlugs()
    const next = dto.isBrand
      ? [...new Set([...current, category.slug])]
      : current.filter((slug) => slug !== category.slug)
    const value = JSON.stringify(next.sort())
    await this.prisma.client.settings.upsert({
      where: { key: BRAND_CATEGORIES_SETTING_KEY },
      update: { value },
      create: { key: BRAND_CATEGORIES_SETTING_KEY, value },
    })
    return { slug: category.slug, isBrand: dto.isBrand }
  }

  private async brandSlugs(): Promise<string[]> {
    const setting = await this.prisma.client.settings.findUnique({ where: { key: BRAND_CATEGORIES_SETTING_KEY } })
    return parseBrandCategorySlugs(setting?.value)
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Crear categoría' })
  async create(@Body() dto: CreateCategoryDto) {
    const existing = await this.prisma.client.category.findUnique({
      where: { slug: dto.slug },
    })
    if (existing) throw new ConflictException(`Ya existe una categoría con el slug "${dto.slug}"`)

    if (dto.parentId) {
      const parent = await this.prisma.client.category.findUnique({
        where: { id: dto.parentId },
      })
      if (!parent) throw new NotFoundException('Categoría padre no encontrada')
      if (parent.parentId) throw new ConflictException('No se permiten categorías de más de dos niveles')
    }

    return this.prisma.client.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        parentId: dto.parentId ?? null,
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar categoría' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const category = await this.prisma.client.category.findUnique({ where: { id } })
    if (!category) throw new NotFoundException('Categoría no encontrada')

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.prisma.client.category.findUnique({
        where: { slug: dto.slug },
      })
      if (existing) throw new ConflictException(`Ya existe una categoría con el slug "${dto.slug}"`)
    }

    if (dto.parentId) {
      if (dto.parentId === id) throw new ConflictException('Una categoría no puede ser su propio padre')
      const parent = await this.prisma.client.category.findUnique({
        where: { id: dto.parentId },
      })
      if (!parent) throw new NotFoundException('Categoría padre no encontrada')
      if (parent.parentId) throw new ConflictException('No se permiten categorías de más de dos niveles')
    }

    return this.prisma.client.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        // null explícito permite quitar el padre; undefined lo deja sin cambios
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
    })
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eliminar categoría (falla si tiene productos asociados)' })
  async delete(@Param('id') id: string) {
    const category = await this.prisma.client.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    })
    if (!category) throw new NotFoundException('Categoría no encontrada')

    if (category._count.products > 0) {
      throw new ConflictException(
        `No se puede eliminar: la categoría tiene ${category._count.products} producto(s) asociado(s)`,
      )
    }
    if (category._count.children > 0) {
      throw new ConflictException(
        `No se puede eliminar: la categoría tiene ${category._count.children} subcategoría(s). Elimínalas primero.`,
      )
    }

    await this.prisma.client.category.delete({ where: { id } })
    return { success: true }
  }
}

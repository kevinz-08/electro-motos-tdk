import {
  Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException,
  Param, Post, UnprocessableEntityException, UploadedFile, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  ImportFitments,
  SaveFitment,
  parseFitmentCsv,
  toMotorcycleSlug,
  normalizeOemReference,
  type IFitmentRepository,
  type IMotorcycleRepository,
  type IOemReferenceRepository,
  type IProductRepository,
} from '@h2r/domain'
import {
  FITMENT_REPOSITORY,
  MOTORCYCLE_REPOSITORY,
  OEM_REFERENCE_REPOSITORY,
  PRODUCT_REPOSITORY,
} from '../infrastructure/injection-tokens'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { CreateMotorcycleModelDto } from './dto/create-motorcycle-model.dto'
import { CreateOemReferenceDto } from './dto/create-oem-reference.dto'
import { SaveFitmentDto } from './dto/save-fitment.dto'

/**
 * Administración del sistema de compatibilidad (docs/seo/, Fase 2).
 *
 * Cuatro cosas:
 *   1. Alta de marcas y modelos de moto. Se hace desde aquí, a mano, porque el
 *      catálogo de modelos es el esqueleto del sistema: si lo pudiera crear el
 *      importador de CSV, cualquier errata ("Boxer CT 100" vs "Boxer CT100")
 *      acabaría en dos modelos distintos y en dos hubs compitiendo entre sí.
 *   2. Importación masiva de compatibilidades desde CSV, con reporte de errores
 *      fila a fila.
 *   3. Alta de referencias OEM.
 *   4. Alta, edición y verificación de compatibilidades una a una desde el
 *      formulario de producto (H-37), con las mismas reglas que el CSV.
 *
 * El límite de 5 MB del CSV da para decenas de miles de filas; más que eso no
 * debería subirse de una vez por la petición HTTP.
 */
@ApiTags('admin / fitments')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/fitments')
export class AdminFitmentsController {
  constructor(
    @Inject(MOTORCYCLE_REPOSITORY) private readonly motorcycleRepo: IMotorcycleRepository,
    @Inject(FITMENT_REPOSITORY) private readonly fitmentRepo: IFitmentRepository,
    @Inject(OEM_REFERENCE_REPOSITORY) private readonly oemRepo: IOemReferenceRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ── Catálogo de motos ──────────────────────────────────────────────────────

  @Get('brands')
  @ApiOperation({ summary: 'Marcas de moto' })
  async brands() {
    return this.motorcycleRepo.findBrands()
  }

  @Get('models')
  @ApiOperation({ summary: 'Modelos de moto con su marca' })
  async models() {
    return this.motorcycleRepo.findAllModels()
  }

  @Post('models')
  @HttpCode(201)
  @ApiOperation({ summary: 'Dar de alta un modelo de moto (crea la marca si no existe)' })
  async createModel(@Body() dto: CreateMotorcycleModelDto) {
    const brandSlug = toMotorcycleSlug(dto.brandName)
    const modelSlug = dto.slug ? toMotorcycleSlug(dto.slug) : toMotorcycleSlug(dto.name)

    if (!modelSlug) {
      throw new UnprocessableEntityException('El nombre del modelo no produce un slug válido')
    }

    // El cilindraje y los años quedan en null si no se envían: nunca se estiman.
    const brand = await this.prisma.client.motorcycleBrand.upsert({
      where: { slug: brandSlug },
      create: { name: dto.brandName, slug: brandSlug },
      update: {},
    })

    const model = await this.prisma.client.motorcycleModel.upsert({
      where: { brandId_slug: { brandId: brand.id, slug: modelSlug } },
      create: {
        brandId: brand.id,
        name: dto.name,
        slug: modelSlug,
        cc: dto.cc ?? null,
        yearFrom: dto.yearFrom ?? null,
        yearTo: dto.yearTo ?? null,
        aliases: dto.aliases ?? [],
        intro: dto.intro ?? null,
      },
      update: {
        name: dto.name,
        cc: dto.cc ?? null,
        yearFrom: dto.yearFrom ?? null,
        yearTo: dto.yearTo ?? null,
        aliases: dto.aliases ?? [],
        intro: dto.intro ?? null,
      },
      include: { brand: true },
    })

    return model
  }

  @Get('models/summary')
  @ApiOperation({ summary: 'Modelos (activos e inactivos) con el conteo de compatibilidades verificadas y pendientes' })
  async modelsSummary() {
    const [models, counts] = await Promise.all([
      this.prisma.client.motorcycleModel.findMany({
        include: { brand: { select: { name: true, slug: true } } },
        orderBy: [{ brand: { order: 'asc' } }, { brand: { name: 'asc' } }, { name: 'asc' }],
      }),
      this.prisma.client.fitment.groupBy({ by: ['modelId', 'verified'], _count: { _all: true } }),
    ])

    const byModel = new Map<string, { verified: number; pending: number }>()
    for (const c of counts) {
      const entry = byModel.get(c.modelId) ?? { verified: 0, pending: 0 }
      if (c.verified) entry.verified += c._count._all
      else entry.pending += c._count._all
      byModel.set(c.modelId, entry)
    }

    return models.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      cc: m.cc,
      yearFrom: m.yearFrom,
      yearTo: m.yearTo,
      aliases: m.aliases,
      intro: m.intro,
      isActive: m.isActive,
      brandName: m.brand.name,
      brandSlug: m.brand.slug,
      ...(byModel.get(m.id) ?? { verified: 0, pending: 0 }),
    }))
  }

  // ── Compatibilidades de un producto ────────────────────────────────────────

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Crear o actualizar una compatibilidad (clave: producto + modelo + posición)' })
  async save(
    @Body() dto: SaveFitmentDto,
    @CurrentUser() user: { email?: string; userId?: string } | undefined,
  ) {
    const useCase = new SaveFitment(this.motorcycleRepo, this.fitmentRepo, this.productRepo)
    const result = await useCase.execute({ ...dto, savedBy: user?.email ?? user?.userId ?? 'admin' })
    if (!result.ok) throw result.error
    return result.value
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Compatibilidades de un producto, verificadas y sin verificar' })
  async byProduct(@Param('productId') productId: string) {
    const [fitments, oemReferences] = await Promise.all([
      this.fitmentRepo.findAllByProductUnverified(productId),
      this.oemRepo.findByProduct(productId),
    ])
    return { fitments, oemReferences }
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eliminar una compatibilidad' })
  async remove(@Param('id') id: string) {
    await this.prisma.client.fitment.delete({ where: { id } })
    return { success: true }
  }

  // ── Referencias OEM ────────────────────────────────────────────────────────

  @Post('oem')
  @HttpCode(201)
  @ApiOperation({ summary: 'Añadir una referencia original a un producto' })
  async addOem(@Body() dto: CreateOemReferenceDto) {
    const product = await this.productRepo.findById(dto.productId)
    if (!product) throw new NotFoundException('Producto no encontrado')

    return this.oemRepo.upsert({
      productId: dto.productId,
      reference: dto.reference,
      normalized: normalizeOemReference(dto.reference),
      manufacturer: dto.manufacturer ?? null,
    })
  }

  @Delete('oem/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eliminar una referencia original' })
  async removeOem(@Param('id') id: string) {
    await this.prisma.client.oemReference.delete({ where: { id } })
    return { success: true }
  }

  // ── Importación masiva ─────────────────────────────────────────────────────

  @Post('import')
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Importar compatibilidades desde CSV',
    description:
      'Cabecera: sku,marca_moto,modelo_moto,posicion,anio_desde,anio_hasta,fuente,notas,verificado. ' +
      'Devuelve el reporte con altas, actualizaciones y errores por fila. ' +
      'No crea modelos que no existan: hay que darlos de alta antes.',
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async import(
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
    @CurrentUser() user: { email?: string; userId?: string } | undefined,
  ) {
    if (!file) throw new UnprocessableEntityException('No se recibió ningún archivo')

    const { rows, errors } = parseFitmentCsv(file.buffer.toString('utf8'))

    // Si el archivo no tiene ni una fila válida, se devuelve el diagnóstico sin
    // tocar la base de datos.
    if (rows.length === 0) {
      return { created: 0, updated: 0, failed: errors.length, verified: 0, errors }
    }

    const useCase = new ImportFitments(this.motorcycleRepo, this.fitmentRepo, this.productRepo)
    const result = await useCase.execute({
      rows,
      importedBy: user?.email ?? user?.userId ?? 'admin',
    })

    if (!result.ok) throw result.error

    // Los errores de formato (parseo) y los de aplicación (SKU o modelo que no
    // existen) se devuelven juntos y ordenados por línea: al que corrige el
    // archivo le da igual de qué fase venga cada error.
    return {
      ...result.value,
      failed: result.value.failed + errors.length,
      errors: [...errors, ...result.value.errors].sort((a, b) => a.line - b.line),
    }
  }
}

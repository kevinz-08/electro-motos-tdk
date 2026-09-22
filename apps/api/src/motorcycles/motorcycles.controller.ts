import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  FindByOemReference,
  GetModelHub,
  type IFitmentRepository,
  type IMotorcycleRepository,
  type IOemReferenceRepository,
} from '@h2r/domain'
import {
  FITMENT_REPOSITORY,
  MOTORCYCLE_REPOSITORY,
  OEM_REFERENCE_REPOSITORY,
} from '../infrastructure/injection-tokens'
import { Public } from '../auth/decorators/public.decorator'

/**
 * API pública del sistema de compatibilidad (docs/seo/, Fase 2).
 *
 * La tienda web lee estos datos directamente de Prisma en SSR (más rápido, sin
 * salto HTTP). Estos endpoints existen para todo lo demás: el selector de moto
 * desde el cliente, integraciones y herramientas internas.
 *
 * Todo lo que devuelven está filtrado por compatibilidad **verificada**.
 */
@ApiTags('motorcycles')
@Public()
@Controller('motorcycles')
export class MotorcyclesController {
  constructor(
    @Inject(MOTORCYCLE_REPOSITORY) private readonly motorcycleRepo: IMotorcycleRepository,
    @Inject(FITMENT_REPOSITORY) private readonly fitmentRepo: IFitmentRepository,
    @Inject(OEM_REFERENCE_REPOSITORY) private readonly oemRepo: IOemReferenceRepository,
  ) {}

  @Get('brands')
  @ApiOperation({ summary: 'Marcas de moto activas' })
  async brands() {
    return this.motorcycleRepo.findBrands()
  }

  @Get('brands/:brandSlug/models')
  @ApiOperation({ summary: 'Modelos de una marca' })
  async models(@Param('brandSlug') brandSlug: string) {
    return this.motorcycleRepo.findModelsByBrand(brandSlug)
  }

  @Get('models')
  @ApiOperation({ summary: 'Todos los modelos con su marca — selector "¿Qué moto tienes?"' })
  async allModels() {
    return this.motorcycleRepo.findAllModels()
  }

  @Get(':brandSlug/:modelSlug')
  @ApiOperation({ summary: 'Hub de un modelo: categorías con conteo de repuestos compatibles' })
  async hub(@Param('brandSlug') brandSlug: string, @Param('modelSlug') modelSlug: string) {
    const result = await new GetModelHub(this.motorcycleRepo).execute({ brandSlug, modelSlug })
    // NOT_FOUND incluye "existe pero no tiene repuestos verificados": para el
    // consumidor es lo mismo, no hay hub que mostrar.
    if (!result.ok) throw result.error
    return result.value
  }

  @Get(':brandSlug/:modelSlug/products')
  @ApiOperation({ summary: 'IDs de productos compatibles con un modelo' })
  async products(
    @Param('brandSlug') brandSlug: string,
    @Param('modelSlug') modelSlug: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const model = await this.motorcycleRepo.findModel(brandSlug, modelSlug)
    if (!model) throw new NotFoundException('Modelo no encontrado')

    const productIds = await this.fitmentRepo.findProductIdsByModel(model.id, categoryId)
    return { model, productIds }
  }
}

/**
 * Consulta de compatibilidades de un producto y búsqueda por referencia OEM.
 * Va en su propio controlador porque cuelga de otra raíz de rutas.
 */
@ApiTags('motorcycles')
@Public()
@Controller()
export class FitmentQueryController {
  constructor(
    @Inject(FITMENT_REPOSITORY) private readonly fitmentRepo: IFitmentRepository,
    @Inject(OEM_REFERENCE_REPOSITORY) private readonly oemRepo: IOemReferenceRepository,
  ) {}

  @Get('products/:id/fitments')
  @ApiOperation({ summary: 'Compatibilidades verificadas y referencias OEM de un producto' })
  async fitments(@Param('id') id: string) {
    const [fitments, oemReferences] = await Promise.all([
      this.fitmentRepo.findVerifiedByProduct(id),
      this.oemRepo.findByProduct(id),
    ])
    return { fitments, oemReferences }
  }

  @Get('oem/:reference')
  @ApiOperation({ summary: 'Productos que corresponden a una referencia original' })
  async byOem(@Param('reference') reference: string) {
    const result = await new FindByOemReference(this.oemRepo).execute({ reference })
    if (!result.ok) throw result.error
    return result.value
  }
}

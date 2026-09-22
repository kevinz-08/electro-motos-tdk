/**
 * Contratos de acceso a datos del sistema de compatibilidad (docs/seo/, Fase 2).
 *
 * Como el resto del dominio, esto es solo la forma del contrato: las
 * implementaciones viven en `apps/api` y `apps/web` sobre Prisma, y se inyectan
 * con los Symbol de `injection-tokens.ts`.
 *
 * Todos los métodos de lectura pública devuelven **solo fitments verificados**.
 * Los que incluyen los no verificados lo dicen en el nombre (`...Unverified`) y
 * son para el panel de administración.
 */
import type {
  Fitment,
  FitmentWithModel,
  MotorcycleBrand,
  MotorcycleModel,
  MotorcycleModelWithBrand,
  OemReference,
} from '../entities/Motorcycle'

/** Categoría con su número de productos compatibles, para el hub de modelo. */
export interface ModelCategoryCount {
  categoryId: string
  categoryName: string
  categorySlug: string
  /** Productos publicables (activos, no borrados) compatibles con el modelo. */
  productCount: number
}

/** Resumen del hub de un modelo. */
export interface ModelHub {
  model: MotorcycleModelWithBrand
  categories: ModelCategoryCount[]
  /** Total de productos compatibles verificados. Si es 0, el hub no se publica. */
  totalProducts: number
}

/** Datos mínimos de un modelo para el selector "¿Qué moto tienes?". */
export interface ModelOption {
  id: string
  name: string
  slug: string
  brandSlug: string
  brandName: string
  cc: number | null
}

export interface IMotorcycleRepository {
  /** Marcas activas que tengan al menos un modelo, ordenadas para el selector. */
  findBrands(): Promise<MotorcycleBrand[]>

  /** Modelos activos de una marca. */
  findModelsByBrand(brandSlug: string): Promise<MotorcycleModel[]>

  /** Todos los modelos activos con su marca — selector y buscador interno. */
  findAllModels(): Promise<MotorcycleModelWithBrand[]>

  /** Un modelo por marca + slug. `null` si no existe o está inactivo. */
  findModel(brandSlug: string, modelSlug: string): Promise<MotorcycleModelWithBrand | null>

  /**
   * Hub del modelo: categorías con conteo de productos compatibles verificados.
   * `null` si el modelo no existe.
   */
  getModelHub(brandSlug: string, modelSlug: string): Promise<ModelHub | null>

  /** Modelos que tienen al menos un fitment verificado — los únicos publicables. */
  findModelsWithVerifiedFitments(): Promise<MotorcycleModelWithBrand[]>
}

export interface IFitmentRepository {
  /** Compatibilidades verificadas de un producto, para la tabla "Compatible con". */
  findVerifiedByProduct(productId: string): Promise<FitmentWithModel[]>

  /** Todas las de un producto, verificadas o no. Solo para el panel admin. */
  findAllByProductUnverified(productId: string): Promise<FitmentWithModel[]>

  /** IDs de productos compatibles verificados con un modelo (y categoría opcional). */
  findProductIdsByModel(modelId: string, categoryId?: string): Promise<string[]>

  /**
   * Inserta o actualiza un fitment por su clave natural (producto + modelo +
   * posición). Devuelve el fitment resultante y si fue alta o actualización.
   */
  upsert(fitment: Omit<Fitment, 'id' | 'verifiedAt'> & { verifiedAt?: Date | null }): Promise<{
    fitment: Fitment
    created: boolean
  }>

  /** Cuenta los fitments verificados del catálogo — dato para "Por qué comprar en H2R". */
  countVerified(): Promise<number>
}

export interface IOemReferenceRepository {
  /** Referencias OEM de un producto. */
  findByProduct(productId: string): Promise<OemReference[]>

  /** Productos asociados a una referencia OEM ya normalizada. */
  findProductIdsByReference(normalized: string): Promise<string[]>

  /** Alta idempotente por (producto, referencia normalizada). */
  upsert(reference: Omit<OemReference, 'id'>): Promise<OemReference>
}

import type { Kit } from '@/domain/entities/Kit'

export interface KitItemInput {
  productId: string
  quantity: number
  order: number
}

export interface SaveKitInput {
  id?: string
  name: string
  slug: string
  description: string | null
  discountCents: number
  modelId: string | null
  isActive: boolean
  items: KitItemInput[]
}

/**
 * Contrato de acceso a datos de los kits (docs/seo/plan-kits.md).
 * Implementado por PrismaKitRepository en apps/api.
 */
export interface IKitRepository {
  /** Crea o actualiza un kit completo (con sus ítems), de forma atómica. */
  save(input: SaveKitInput): Promise<Kit>

  findById(id: string): Promise<Kit | null>

  /** true si el slug ya existe en otro kit (excluye `excludeId` al editar). */
  slugExists(slug: string, excludeId?: string): Promise<boolean>

  /**
   * De los ids dados, los que son productos existentes y no están en la
   * papelera, con su precio ACTUAL (centavos COP). El caso de uso nunca confía
   * en un total que mande el cliente: la suma del kit se calcula server-side
   * a partir de este precio.
   */
  findProducts(ids: readonly string[]): Promise<Array<{ id: string; price: number }>>

  softDelete(id: string): Promise<void>
}

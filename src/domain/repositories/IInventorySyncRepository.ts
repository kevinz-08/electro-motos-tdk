import { Product } from '@/domain/entities/Product'

export interface StockUpdate {
  sku: string
  newStock: number
}

/**
 * Contrato para sincronización con Optimun (software contable local).
 * FASE 2 — no implementar hasta que sea requerido.
 * Las implementaciones de infrastructure/ conectarán con la API de Optimun.
 */
export interface IInventorySyncRepository {
  getProductsBySku(skus: string[]): Promise<Product[]>
  bulkUpdateStock(updates: StockUpdate[]): Promise<void>
  getLastSyncTimestamp(): Promise<Date | null>
}

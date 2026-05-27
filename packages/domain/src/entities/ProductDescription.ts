export interface ProductBenefit {
  id: string
  /** Título corto del beneficio. Ej: "Alta durabilidad". Opcional. */
  title?: string
  /** Descripción del beneficio. Requerido. */
  body: string
  /** Posición de ordenamiento ascendente. 0 = primero. */
  order: number
}

export interface ProductDescription {
  id: string
  productId: string
  /** Texto largo de presentación del producto. Sustituye o complementa description. */
  generalDescription?: string
  /** Lista de beneficios ordenados por `order` ascendente. */
  benefits: ProductBenefit[]
  createdAt: Date
  updatedAt: Date
}

/** Input para crear o actualizar la descripción estructurada de un producto. */
export interface UpsertDescriptionInput {
  productId: string
  generalDescription?: string
  /** Máximo 10 beneficios. Cada uno reemplaza completamente la lista anterior. */
  benefits: Array<{ title?: string; body: string; order: number }>
}

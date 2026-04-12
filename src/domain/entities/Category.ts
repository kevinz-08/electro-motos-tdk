/** Categoría de productos */
export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
}

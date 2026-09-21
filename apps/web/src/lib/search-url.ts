/**
 * URL de una búsqueda nueva desde el buscador (README §24).
 *
 * Regla de UX: una búsqueda nueva SOBRESCRIBE todo lo anterior. La URL resultante lleva solo
 * `search`; categoría, rango de precio y "solo en stock" de la vista previa no se arrastran
 * (si el usuario buscó "aceites" y luego "ns 200", la consulta es únicamente "ns 200").
 * Los filtros del drawer sí refinan la búsqueda vigente: eso vive en FilterDrawer.
 */

export const SEARCH_MAX_LENGTH = 80

/** Recorta, colapsa espacios internos y limita el largo. */
export function cleanSearchQuery(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX_LENGTH)
}

/** `/catalogo?search=…` con solo la consulta; sin texto útil, vuelve al catálogo base. */
export function buildSearchUrl(raw: string): string {
  const query = cleanSearchQuery(raw)
  return query ? `/catalogo?search=${encodeURIComponent(query)}` : '/catalogo'
}

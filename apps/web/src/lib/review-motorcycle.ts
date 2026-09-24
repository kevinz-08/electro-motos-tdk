/**
 * "¿En qué moto lo instalaste?" en las reseñas (docs/seo/ Fase 4, ítem 9).
 *
 * El comprador declara el modelo al reseñar y la ciudad sale de la entrega del
 * pedido. Es compatibilidad contada por clientes, no verificada: se muestra como
 * testimonio ("Le sirvió a una Suzuki DR150 · Cali") y NO crea ningún Fitment —
 * la regla de la Fase 2 sigue siendo que solo se publica lo verificado.
 */

/** Forma que devuelven las consultas de reseñas con el modelo incluido. */
export interface ReviewInstalledModel {
  name: string
  brand: { name: string }
}

/** "Suzuki DR150" — o null si la reseña no declara moto. */
export function installedMotorcycleLabel(model: ReviewInstalledModel | null | undefined): string | null {
  return model ? `${model.brand.name} ${model.name}` : null
}

/**
 * Línea visible bajo la reseña. Solo dice "Le sirvió" si el comprador la
 * recomienda; si no, dice dónde la instaló sin afirmar que le sirvió.
 */
export function installedMotorcycleLine(
  label: string | null,
  city: string | null,
  recommends: boolean,
): string | null {
  if (!label) return null
  const base = recommends ? `Le sirvió a una ${label}` : `Lo instaló en una ${label}`
  return city ? `${base} · ${city}` : base
}

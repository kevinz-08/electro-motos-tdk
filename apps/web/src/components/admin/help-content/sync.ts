import type { AdminHelpContent } from '../AdminHelpButton'

/**
 * Contenido del modal de ayuda de /admin/sync.
 *
 * El paso 1 (export desde Optimun) queda con un texto genérico porque no
 * tenemos visibilidad del menú/botón real de Optimun desde este repo —
 * pendiente que el equipo confirme el camino exacto para reemplazarlo.
 */
export const syncHelpContent: AdminHelpContent = {
  title: 'Sincronizar inventario',
  summary:
    'Actualiza el stock y el precio de los productos de la tienda web a partir del inventario ' +
    'del local físico (Optimun). Nunca crea productos nuevos ni elimina los existentes — solo ' +
    'actualiza los que ya están en la tienda.',
  steps: [
    'En Optimun: exporta el inventario en formato Excel (.xlsx).',
    'Verifica que el archivo tenga las columnas CODIGO, NOMBRE PRODUCTO, EXISTENCIAS y DETAL — si falta alguna, el sistema te dirá cuál y rechazará el archivo.',
    'En esta página, haz clic en el recuadro punteado (o arrastra el archivo) para subir el .xlsx.',
    'Espera el resultado: verás cuántos productos se actualizaron, cuántos quedaron igual y cuáles no se encontraron.',
    'Revisa "No encontrados": son productos que existen en Optimun pero no en la tienda web. No se crean automáticamente — agrégalos manualmente en Productos si corresponde.',
    'Revisa "Precio no actualizado": son productos donde Optimun tiene el precio en 0 — la web conservó el precio actual a propósito, para no borrar un precio válido por error.',
    'Puedes repetir el proceso cuando quieras: subir el mismo archivo dos veces no duplica ni daña nada.',
  ],
}

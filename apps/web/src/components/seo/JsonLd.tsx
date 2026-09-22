/**
 * Inserta un bloque JSON-LD en la página (Fase 3 del proyecto SEO, docs/seo/).
 *
 * Existe para que ninguna página tenga que repetir el `dangerouslySetInnerHTML`
 * con el escape de `<`: ese escape es lo que impide que una descripción de
 * producto que contenga `</script>` cierre la etiqueta antes de tiempo.
 *
 * Server Component. Acepta un nodo o varios; varios se emiten como un array,
 * que es válido en JSON-LD y ahorra etiquetas.
 */
import { serializeJsonLd, type JsonLdNode } from '@/lib/structured-data'

export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}

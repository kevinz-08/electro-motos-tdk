/**
 * Prueba social de la home — alimentada SOLO por `ProductReview` (Fase 4, H-01).
 *
 * Antes tenía cuatro testimonios con nombre propio etiquetados "Cliente
 * verificado" y cifras ("500+ clientes", "98 % recomendación") escritos a mano
 * en el código, sin respaldo alguno. Ahora todo sale de reseñas aprobadas de
 * compradores reales:
 *
 *   - Sin reseñas con comentario → la sección no se pinta (return null). Nunca
 *     hay relleno ni ejemplos.
 *   - Las cifras (promedio, cantidad, % que recomienda) solo aparecen cuando hay
 *     al menos `reviewsMinCount` reseñas aprobadas, el mismo umbral de la ficha
 *     de producto, para no vender un promedio sobre una o dos opiniones.
 *   - Se muestran las reseñas más recientes sin filtrar por estrellas.
 */
import { getCachedStoreReviews, getCachedCroSettings } from '@/lib/cache'
import { StarRating } from '@/components/store/ProductTrustSignals'
import { ReviewsCarousel } from '@/components/store/ReviewsCarousel'

export async function SocialProof() {
  const [{ summary, latest }, cro] = await Promise.all([getCachedStoreReviews(), getCachedCroSettings()])

  if (latest.length === 0) return null

  const showStats = summary !== null && summary.count >= cro.reviewsMinCount
  const reviews = latest.flatMap((r) =>
    r.comment
      ? [{ id: r.id, rating: r.rating, comment: r.comment, authorName: r.authorName, createdAt: r.createdAt, installedLine: r.installedLine, product: r.product }]
      : [],
  )

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Lo que dicen nuestros clientes
          </h2>
          <p className="text-gray-500 mt-3 max-w-md mx-auto">
            Opiniones de compradores que recibieron su pedido
          </p>
        </div>

        <ReviewsCarousel reviews={reviews} />

        {showStats && summary && (
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black text-sky-600 tracking-tight">
                {summary.average.toFixed(1)}
              </p>
              <div className="mt-1 flex justify-center">
                <StarRating average={summary.average} />
              </div>
              <p className="text-sm text-gray-500 mt-1">Calificación promedio</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black text-sky-600 tracking-tight">
                {summary.count.toLocaleString('es-CO')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {summary.count === 1 ? 'Reseña verificada' : 'Reseñas verificadas'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black text-sky-600 tracking-tight">
                {summary.recommendPercent}%
              </p>
              <p className="text-sm text-gray-500 mt-1">Recomiendan su compra</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

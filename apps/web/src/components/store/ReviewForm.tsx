'use client'

/**
 * Formulario de reseña verificada (README §22.6). Sin sesión: el token firmado del
 * enlace autoriza el envío a POST /reviews en NestJS.
 */
import { useState } from 'react'
import { apiClient } from '@/lib/api-client'

const MAX_COMMENT = 1000
const LABELS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente']

export interface MotorcycleBrandOption {
  name: string
  models: Array<{ id: string; name: string }>
}

export function ReviewForm({
  orderItemId,
  token,
  motorcycleBrands = [],
}: {
  orderItemId: string
  token: string
  motorcycleBrands?: MotorcycleBrandOption[]
}) {
  const [installedModelId, setInstalledModelId] = useState('')
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [recommends, setRecommends] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return setError('Elige de 1 a 5 estrellas')
    if (recommends === null) return setError('Cuéntanos si recomendarías el producto')
    setError(null)
    setLoading(true)
    try {
      const res = await apiClient().post<{ id: string }>('/reviews', {
        orderItemId,
        token,
        rating,
        recommends,
        ...(comment.trim() && { comment: comment.trim() }),
        ...(installedModelId && { installedModelId }),
      })
      if (!res.ok) {
        setError(res.error ?? 'No se pudo enviar tu reseña')
        return
      }
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div role="status" className="text-center bg-green-50 border border-green-200 rounded-xl p-8">
        <div className="text-4xl mb-3" aria-hidden="true">🙌</div>
        <p className="font-bold text-gray-900 mb-1">¡Gracias por tu opinión!</p>
        <p className="text-sm text-gray-600">La publicaremos después de una breve revisión.</p>
      </div>
    )
  }

  const shown = hover || rating

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-2">Tu calificación *</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHover(value)}
              aria-label={`${value} ${value === 1 ? 'estrella' : 'estrellas'}`}
              aria-pressed={rating === value}
              className="p-1 text-4xl leading-none transition-transform hover:scale-110"
            >
              <span className={value <= shown ? 'text-amber-400' : 'text-gray-200'}>★</span>
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-500 min-w-[5rem]">{LABELS[shown]}</span>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-2">¿Recomendarías este producto? *</legend>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: true, label: '👍 Sí' },
            { value: false, label: '👎 No' },
          ].map((opt) => (
            <label
              key={String(opt.value)}
              className={`flex items-center justify-center gap-2 border rounded-lg px-4 py-3 cursor-pointer text-sm font-medium transition-colors ${
                recommends === opt.value ? 'border-sky-400 bg-sky-50 text-gray-900' : 'border-gray-300 text-gray-600'
              }`}
            >
              <input
                type="radio"
                name="recommends"
                className="sr-only"
                checked={recommends === opt.value}
                onChange={() => setRecommends(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      {motorcycleBrands.length > 0 && (
        <div>
          <label htmlFor="review-moto" className="block text-sm font-semibold text-gray-900 mb-2">
            ¿En qué moto lo instalaste? <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <select
            id="review-moto"
            value={installedModelId}
            onChange={(e) => setInstalledModelId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-sky-400"
          >
            <option value="">No aplica / prefiero no decirlo</option>
            {motorcycleBrands.map((brand) => (
              <optgroup key={brand.name} label={brand.name}>
                {brand.models.map((m) => (
                  <option key={m.id} value={m.id}>{brand.name} {m.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Si la eliges, publicaremos “Le sirvió a una [moto] · [ciudad de entrega]” junto a tu reseña. Solo la
            ciudad, nunca tu dirección.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="review-comment" className="block text-sm font-semibold text-gray-900 mb-2">
          Comentario <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          id="review-comment"
          rows={4}
          maxLength={MAX_COMMENT}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="¿Cómo te fue con el producto? ¿Le sirvió a tu moto?"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400 resize-none"
        />
        <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/{MAX_COMMENT}</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-sky-500 text-white py-3 rounded-xl font-bold hover:bg-sky-600 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Enviando...' : 'Enviar reseña'}
      </button>
      <p className="text-xs text-gray-400 text-center">Publicaremos tu primer nombre y la inicial de tu apellido.</p>
    </form>
  )
}

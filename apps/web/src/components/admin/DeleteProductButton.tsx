'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Trash2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

interface Props {
  id: string
  name: string
}

export function DeleteProductButton({ id, name }: Props) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    const res = await apiClient(session?.user?.accessToken).delete(`/admin/products/${id}`)
    if (!res.ok) {
      alert(res.error ?? 'Error al eliminar el producto')
      setLoading(false)
      setConfirm(false)
      return
    }
    await revalidateAdminCache([CACHE_TAGS.products])
    router.refresh()
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={loading}
          aria-label={`Confirmar eliminación de ${name}`}
          className="text-xs text-red-400 hover:text-red-300 font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? 'Eliminando...' : 'Confirmar'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={loading}
          className="text-xs text-white/25 hover:text-white/50 transition-colors"
        >
          No
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      aria-label={`Eliminar ${name}`}
      className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}

'use client'

/**
 * Al detectar una sesión, mueve el carrito de invitado al carrito del usuario.
 * Sin esto, un invitado que inicia sesión desde el checkout vería su carrito vacío.
 * No renderiza nada. Ver mergeGuestCartInto en lib/cart.ts.
 */
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { mergeGuestCartInto } from '@/lib/cart'

export function GuestCartMerger() {
  const { data: session } = useSession()
  const userId = (session?.user as { id?: string } | undefined)?.id

  useEffect(() => {
    if (userId) mergeGuestCartInto(userId)
  }, [userId])

  return null
}

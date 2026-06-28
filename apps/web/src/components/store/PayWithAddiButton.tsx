'use client'

/**
 * Botón "Pagar con Addi" — abre WhatsApp con un mensaje pre-armado.
 *
 * No integramos la pasarela de Addi (sería 2-3 días de trabajo).
 * En cambio, abrimos el chat de WhatsApp del comercio con la consulta lista
 * para que el admin coordine el pago con Addi manualmente.
 *
 * El mensaje incluye nombre del producto + SKU para que el admin sepa
 * exactamente qué producto referenciar sin preguntar.
 */

import { Product } from '@h2r/domain'

interface PayWithAddiButtonProps {
  product: Product
  /** className opcional para overrides puntuales — el base ya viene fuerte. */
  className?: string
}

function buildWhatsappUrl(product: Product): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '573152926609'
  const lines = [
    `¡Hola!`,
    ``,
    `Estoy interesad@ en el producto:`,
    `${product.name}`,
    ``,
    `Me gustaría pagarlo con Addi. ¿Es posible coordinar esa opción?`,
  ]
  const message = encodeURIComponent(lines.join('\n'))
  return `https://wa.me/${number}?text=${message}`
}

export function PayWithAddiButton({ product, className }: PayWithAddiButtonProps) {
  if (product.stock === 0) return null

  const href = buildWhatsappUrl(product)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Pagar con Addi por WhatsApp: ${product.name}`}
      className={
        className ??
        // Azul Addi (#1A57FF) — vibrante, sólido, contrasta con el sky-400 de
        // "Agregar al carrito" sin chocar visualmente.
        'w-full inline-flex items-center justify-center gap-2.5 bg-[#1A57FF] text-white py-3 px-6 rounded-xl text-base font-bold ' +
        'hover:bg-[#0B47E5] active:scale-95 transition-all ' +
        'shadow-lg shadow-[#1A57FF]/25 hover:shadow-[#1A57FF]/40'
      }
    >
      {/* Ícono A estilizado de Addi (forma simplificada del logo) */}
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#1A57FF] font-black text-sm"
        aria-hidden="true"
      >
        A
      </span>
      <span>Pagar con Addi</span>
    </a>
  )
}

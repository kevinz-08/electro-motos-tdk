'use client'

/**
 * "Confirma compatibilidad por WhatsApp" junto al botón de compra (Fase 4, ítem 3).
 *
 * El mensaje sale con producto y SKU, y con la moto del comprador si ya la
 * eligió en el selector "¿Qué moto tienes?". Sin moto, pregunta abiertamente.
 *
 * No promete ninguna política de cambio por incompatibilidad: esa política no
 * existe (H-16). Solo abre la conversación para que un asesor lo confirme.
 * Lee la cookie de "mi moto" en el cliente para que la ficha siga estática.
 */
import { useSyncExternalStore } from 'react'
import { WHATSAPP_URL } from '@/lib/contact'
import { track } from '@/lib/analytics'
import { readMyMotorcycle, subscribeToMyMotorcycle, type MyMotorcycle } from '@/lib/my-motorcycle'

const noneOnServer = (): MyMotorcycle | null => null

export function ConfirmCompatibilityButton({
  productName,
  productSku,
  className = '',
}: {
  productName: string
  productSku: string
  className?: string
}) {
  const moto = useSyncExternalStore(subscribeToMyMotorcycle, readMyMotorcycle, noneOnServer)

  const message = moto
    ? `Hola H2R, quiero confirmar si ${productName} (SKU ${productSku}) le sirve a mi ${moto.label}${moto.year ? ` ${moto.year}` : ''}.`
    : `Hola H2R, quiero confirmar si ${productName} (SKU ${productSku}) le sirve a mi moto. Mi moto es: `

  return (
    <a
      href={WHATSAPP_URL(message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('generate_lead', { method: 'whatsapp_compatibilidad', item_id: productSku })}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366] px-4 py-2.5 text-sm font-semibold text-[#128C4A] hover:bg-[#25D366]/10 transition-colors ${className}`}
    >
      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.114.552 4.1 1.516 5.827L.057 23.854l6.162-1.617A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.002-1.371l-.36-.213-3.657.958.976-3.563-.234-.376A9.79 9.79 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" />
      </svg>
      {moto ? `Confirma con un asesor si sirve a tu ${moto.label}` : 'Confirma compatibilidad por WhatsApp'}
    </a>
  )
}

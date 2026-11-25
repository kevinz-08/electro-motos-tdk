import { WHATSAPP_NUMBER, WHATSAPP_URL } from '@/lib/contact'

/**
 * Enlace «Ayuda por WhatsApp» del lado cliente: abre un chat con la tienda con
 * un mensaje ya armado. No renderiza nada si no hay mensaje (estado sin
 * soporte) o si el número de la tienda no está configurado. No escribe en BD.
 */
export function OrderSupportLink({
  message,
  label = 'Ayuda por WhatsApp',
  className = 'text-xs font-semibold text-green-600 hover:text-green-700 transition-colors',
}: {
  message: string | null
  label?: string
  className?: string
}) {
  if (!message || !WHATSAPP_NUMBER) return null
  return (
    <a href={WHATSAPP_URL(message)} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  )
}

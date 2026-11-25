'use client'

/**
 * Modal para escribirle al cliente por WhatsApp desde /admin/pedidos.
 *
 * El admin elige una plantilla, la revisa/edita y abre `wa.me` con el mensaje
 * ya escrito. Se envía desde la sesión de WhatsApp del propio admin: no hay
 * API de WhatsApp Business ni registro de mensajes. Sin fetch: recibe los
 * datos del pedido por props.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  WHATSAPP_TEMPLATES,
  buildWhatsAppUrl,
  normalizeColombianPhone,
  renderTemplate,
} from '@/lib/whatsapp'

interface Props {
  orderId: string
  /** Teléfono tal como lo escribió el cliente (texto libre); puede ser inválido o faltar. */
  phone: string | null
  fullName: string
  /** Total ya formateado en COP. */
  total: string
  /** Etiqueta legible del estado del pedido. */
  statusLabel: string
}

export function OrderWhatsAppModal({ orderId, phone, fullName, total, statusLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [templateId, setTemplateId] = useState(WHATSAPP_TEMPLATES[0].id)
  const [message, setMessage] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  const normalized = normalizeColombianPhone(phone)
  const orderLabel = `#${orderId.slice(-8).toUpperCase()}`
  const firstName = fullName.trim().split(/\s+/)[0] || 'cliente'

  const vars = useMemo(
    () => ({ nombre: firstName, pedido: orderLabel, total, estado: statusLabel }),
    [firstName, orderLabel, total, statusLabel],
  )

  function selectTemplate(id: string) {
    const tpl = WHATSAPP_TEMPLATES.find((t) => t.id === id)
    if (!tpl) return
    setTemplateId(id)
    setMessage(renderTemplate(tpl.body, vars))
  }

  function handleOpen() {
    selectTemplate(WHATSAPP_TEMPLATES[0].id)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      // Foco atrapado dentro del diálogo.
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, a[href], textarea, input',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    dialogRef.current?.querySelector<HTMLElement>('input[type="radio"]:checked')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const icon = (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.22-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.21 4.24-9.45 9.46-9.45 2.52 0 4.9.99 6.68 2.77a9.4 9.4 0 0 1 2.76 6.68c0 5.21-4.24 9.46-9.45 9.46zM20.52 3.45A11.35 11.35 0 0 0 12.05 0C5.78 0 .68 5.1.68 11.37c0 2 .52 3.96 1.52 5.69L.57 23l6.1-1.6a11.36 11.36 0 0 0 5.38 1.37h.01c6.27 0 11.37-5.1 11.37-11.37 0-3.04-1.18-5.9-3.33-8.05z" />
    </svg>
  )

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={!normalized}
        title={normalized ? 'Escribir al cliente por WhatsApp' : 'Teléfono inválido o sin registrar'}
        aria-label="Escribir al cliente por WhatsApp"
        className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-green-500/10"
      >
        {icon}
      </button>

      {open && normalized && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`WhatsApp — pedido ${orderLabel}`}
            className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">Escribir por WhatsApp</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  Pedido {orderLabel} · {fullName} · +{normalized}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white transition-colors text-2xl leading-none"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-5">
              <ol className="text-xs text-white/50 space-y-1 list-decimal list-inside bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                <li>Elige una plantilla de mensaje.</li>
                <li>Revisa y, si quieres, edita el texto antes de enviarlo.</li>
                <li>Pulsa «Abrir en WhatsApp»: se abre el chat con el mensaje listo y solo debes enviarlo.</li>
              </ol>

              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-2">
                  Plantilla
                </legend>
                <div className="flex flex-wrap gap-2">
                  {WHATSAPP_TEMPLATES.map((t) => (
                    <label
                      key={t.id}
                      className={`cursor-pointer px-3 py-1.5 rounded-lg text-sm border transition-colors focus-within:ring-2 focus-within:ring-green-400/50 ${
                        templateId === t.id
                          ? 'bg-green-500/20 border-green-500/50 text-green-300'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`wa-template-${orderId}`}
                        value={t.id}
                        checked={templateId === t.id}
                        onChange={() => selectTemplate(t.id)}
                        className="sr-only"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor={`wa-message-${orderId}`}
                  className="block text-xs font-semibold uppercase tracking-wide text-white/50 mb-2"
                >
                  Mensaje
                </label>
                <textarea
                  id={`wa-message-${orderId}`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-green-500/60"
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Cerrar
              </button>
              <a
                href={buildWhatsAppUrl(normalized, message.trim())}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!message.trim()}
                onClick={(e) => {
                  if (!message.trim()) e.preventDefault()
                }}
                className={`inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                  message.trim() ? '' : 'opacity-40 pointer-events-none'
                }`}
              >
                {icon}
                Abrir en WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

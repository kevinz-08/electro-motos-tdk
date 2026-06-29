'use client'

/**
 * Botón ⓘ genérico para explicarle al admin cómo funciona una sección del
 * panel. El contenido vive en archivos separados (ver components/admin/help-content/)
 * para que agregar ayuda a una nueva sección sea solo escribir el contenido,
 * sin tocar este componente.
 *
 * Mismo patrón de accesibilidad que OrderInfoModal: cierre con click fuera,
 * tecla Esc o botón ✕.
 */
import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'

export interface AdminHelpContent {
  /** Título del modal — normalmente el mismo nombre de la sección. */
  title: string
  /** Explicación breve de qué hace la sección y qué garantías tiene. */
  summary: string
  /** Pasos numerados de cómo usarla, en orden. */
  steps: string[]
}

export function AdminHelpButton({ content }: { content: AdminHelpContent }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="¿Cómo funciona esta sección?"
        aria-label="¿Cómo funciona esta sección?"
        className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors shrink-0"
      >
        <Info className="w-4 h-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-help-title"
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
              <h2 id="admin-help-title" className="text-lg font-bold text-white">
                {content.title}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white transition-colors text-2xl leading-none"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-5 space-y-5">
              <p className="text-sm text-white/70 leading-relaxed">{content.summary}</p>

              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">
                  Cómo usarla, paso a paso
                </h3>
                <ol className="space-y-3">
                  {content.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-white/80 leading-relaxed">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 text-white/60 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

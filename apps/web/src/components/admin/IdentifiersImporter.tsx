'use client'

/**
 * Carga masiva de marca, MPN, tipo y garantía por CSV (docs/seo/, Fase 7 — H-18).
 *
 * La plantilla sale precargada con TODOS los productos (SKU, nombre y los datos
 * que ya tengan): el negocio completa las columnas en Excel y la sube. La
 * columna `nombre` es solo de referencia; el importador la ignora.
 */
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Download, Loader2, Upload } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

export interface IdentifierTemplateRow {
  sku: string
  name: string
  partBrand: string | null
  mpn: string | null
  partType: string | null
  warrantyMonths: number | null
}

interface ImportReport {
  updated: number
  failed: number
  errors: { line: number; message: string }[]
}

const TYPE_TO_CSV: Record<string, string> = { ORIGINAL: 'original', HOMOLOGADO: 'homologado', GENERICO: 'generico' }

const csvCell = (value: string | number | null) => {
  const text = value === null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function IdentifiersImporter({ rows }: { rows: IdentifierTemplateRow[] }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [importing, setImporting] = useState(false)
  const [report, setReport] = useState<ImportReport | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const lines = [
      'sku,nombre,marca,mpn,tipo,garantia_meses',
      ...rows.map((r) =>
        [r.sku, r.name, r.partBrand, r.mpn, r.partType ? TYPE_TO_CSV[r.partType] ?? '' : '', r.warrantyMonths].map(csvCell).join(','),
      ),
    ]
    // BOM para que Excel abra el archivo en UTF-8 (tildes y eñes).
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'identificacion-repuestos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const upload = async (file: File) => {
    setImporting(true)
    setReport(null)
    const form = new FormData()
    form.append('file', file)
    const res = await apiClient(session?.user?.accessToken).postForm<ImportReport>('/admin/products/identifiers/import', form)
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
    if (!res.ok) return toast.error(res.error)
    setReport(res.data)
    if (res.data.updated > 0) {
      await revalidateAdminCache([CACHE_TAGS.products])
      router.refresh()
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Marca, MPN, tipo y garantía (H-18)</h2>
          <p className="mt-0.5 max-w-xl text-xs text-white/40">
            Descarga la plantilla con todos los productos, completa las columnas en Excel y súbela. Celda vacía = no se toca;
            un guion (<code>-</code>) = borrar el dato. Tipo: <code>original</code>, <code>homologado</code> o{' '}
            <code>generico</code>. No escribas &ldquo;genérico&rdquo; como marca: Google lo rechaza.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:border-white/30 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" /> Plantilla ({rows.length} productos)
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black hover:bg-white/90">
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {importing ? 'Importando…' : 'Subir CSV'}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void upload(file)
              }}
            />
          </label>
        </div>
      </div>
      {report && (
        <div className="space-y-2 rounded-lg border border-white/10 p-3 text-xs">
          <p className="text-white/70">
            <span className="text-emerald-400">{report.updated} actualizados</span> ·{' '}
            <span className={report.failed ? 'text-red-400' : 'text-white/40'}>{report.failed} con error</span>
          </p>
          {report.errors.length > 0 && (
            <ul className="max-h-60 space-y-1 overflow-auto text-red-300/80">
              {report.errors.map((e, i) => (
                <li key={`${e.line}-${i}`}>
                  <span className="text-white/40">Línea {e.line}:</span> {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

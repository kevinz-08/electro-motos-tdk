'use client'

/**
 * Gestión del sistema de compatibilidad desde el panel (docs/seo/, H-37).
 *
 * Tres bloques:
 *   1. Importador de CSV con la plantilla descargable y el reporte fila a fila
 *      que ya devolvía `POST /admin/fitments/import`.
 *   2. Alta y edición de modelos de moto. Es el único sitio donde se crean: el
 *      CSV y el formulario de producto solo referencian modelos existentes.
 *   3. Tabla de modelos con cuántas compatibilidades verificadas y pendientes
 *      tiene cada uno. Un modelo sin verificadas no tiene hub publicado.
 *
 * Cada cambio invalida `fitments` + `products` (H-40): sin eso, los hubs y el
 * selector de moto tardaban hasta 1 h en reflejar una carga.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Download, ExternalLink, Loader2, Pencil, Upload, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

interface ModelSummary {
  id: string
  name: string
  slug: string
  cc: number | null
  yearFrom: number | null
  yearTo: number | null
  aliases: string[]
  intro: string | null
  isActive: boolean
  brandName: string
  brandSlug: string
  verified: number
  pending: number
}

interface ImportReport {
  created: number
  updated: number
  failed: number
  verified: number
  errors: { line: number; message: string }[]
}

/** Misma cabecera y ejemplos que `docs/seo/plantilla-compatibilidades.csv`. */
const CSV_TEMPLATE = [
  'sku,marca_moto,modelo_moto,posicion,anio_desde,anio_hasta,fuente,notas,verificado',
  'EJEMPLO-001,AKT,NKD 125,ambas,,,Manual AKT NKD 125 2023 pag. 48,,si',
  'EJEMPLO-002,Bajaj,Boxer CT100,delantera,2018,,"Catalogo proveedor, ref. 12345",Solo version con freno de disco,si',
  'EJEMPLO-003,Honda,XR190L,trasera,,,Pendiente de confirmar con el manual,,no',
].join('\n')

const INPUT =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500'

const emptyModel = { brandName: '', name: '', cc: '', yearFrom: '', yearTo: '', aliases: '', intro: '' }

export function CompatibilityManager() {
  const { data: session } = useSession()
  const accessToken = session?.user?.accessToken
  const [models, setModels] = useState<ModelSummary[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [report, setReport] = useState<ImportReport | null>(null)
  const [importing, setImporting] = useState(false)
  const [modelForm, setModelForm] = useState(emptyModel)
  const [editing, setEditing] = useState<string | null>(null)
  const [savingModel, setSavingModel] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!accessToken) return
    const res = await apiClient(accessToken).get<ModelSummary[]>('/admin/fitments/models/summary')
    if (!res.ok) return setLoadError(res.error)
    setLoadError(null)
    setModels(res.data)
  }, [accessToken])

  useEffect(() => {
    // Carga inicial desde la API; `load` solo actualiza estado al resolver.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const downloadTemplate = () => {
    // BOM para que Excel abra el archivo en UTF-8 (tildes y eñes).
    const blob = new Blob(['﻿' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-compatibilidades.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importCsv = async (file: File) => {
    setImporting(true)
    setReport(null)
    const form = new FormData()
    form.append('file', file)
    const res = await apiClient(accessToken).postForm<ImportReport>('/admin/fitments/import', form)
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
    if (!res.ok) return toast.error(res.error)
    setReport(res.data)
    if (res.data.created + res.data.updated > 0) {
      await revalidateAdminCache([CACHE_TAGS.fitments, CACHE_TAGS.products])
      await load()
    }
  }

  const startEdit = (m: ModelSummary) => {
    setEditing(m.id)
    setModelForm({
      brandName: m.brandName,
      name: m.name,
      cc: m.cc?.toString() ?? '',
      yearFrom: m.yearFrom?.toString() ?? '',
      yearTo: m.yearTo?.toString() ?? '',
      aliases: m.aliases.join(', '),
      intro: m.intro ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveModel = async () => {
    if (!modelForm.brandName.trim() || !modelForm.name.trim()) return toast.error('Marca y modelo son obligatorios')
    const editingModel = models?.find((m) => m.id === editing)
    setSavingModel(true)
    const res = await apiClient(accessToken).post('/admin/fitments/models', {
      brandName: modelForm.brandName.trim(),
      name: modelForm.name.trim(),
      // Al editar se conserva el slug: cambiarlo rompería la URL del hub ya indexada.
      ...(editingModel ? { slug: editingModel.slug } : {}),
      ...(modelForm.cc ? { cc: Number(modelForm.cc) } : {}),
      ...(modelForm.yearFrom ? { yearFrom: Number(modelForm.yearFrom) } : {}),
      ...(modelForm.yearTo ? { yearTo: Number(modelForm.yearTo) } : {}),
      aliases: modelForm.aliases.split(',').map((a) => a.trim()).filter(Boolean),
      ...(modelForm.intro.trim() ? { intro: modelForm.intro.trim() } : {}),
    })
    setSavingModel(false)
    if (!res.ok) return toast.error(res.error)
    toast.success(editingModel ? 'Modelo actualizado' : 'Modelo creado')
    setModelForm(emptyModel)
    setEditing(null)
    await revalidateAdminCache([CACHE_TAGS.fitments, CACHE_TAGS.products])
    await load()
  }

  const term = filter.trim().toLowerCase()
  const shown = (models ?? []).filter(
    (m) => !term || `${m.brandName} ${m.name} ${m.aliases.join(' ')}`.toLowerCase().includes(term),
  )
  const published = models?.filter((m) => m.verified > 0).length ?? 0

  return (
    <div className="space-y-6">
      {/* ── Importador ── */}
      <section className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Importar desde CSV</h2>
            <p className="mt-0.5 max-w-xl text-xs text-white/40">
              Una fila por compatibilidad. La <strong>fuente</strong> es obligatoria y solo las filas con{' '}
              <code>verificado = si</code> se publican. El importador no crea modelos: si uno no existe, la fila se
              rechaza y hay que darlo de alta abajo (o añadir ese nombre como alias).
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:border-white/30 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" /> Plantilla
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
                  if (file) void importCsv(file)
                }}
              />
            </label>
          </div>
        </div>

        {report && (
          <div className="space-y-2 rounded-lg border border-white/10 p-3 text-xs">
            <p className="text-white/70">
              <span className="text-emerald-400">{report.created} nuevas</span> ·{' '}
              <span className="text-blue-300">{report.updated} actualizadas</span> ·{' '}
              {report.verified} publicables ·{' '}
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

      {/* ── Alta / edición de modelo ── */}
      <section className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{editing ? 'Editar modelo' : 'Nuevo modelo de moto'}</h2>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setModelForm(emptyModel)
              }}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
            >
              <X className="h-3.5 w-3.5" /> Cancelar edición
            </button>
          )}
        </div>
        <p className="text-xs text-white/40">
          Cilindraje y años solo si están confirmados: vacíos, la web no los muestra. Los alias son como lo escribe la
          gente al buscar (&ldquo;NKD&rdquo;, &ldquo;AK125NKD&rdquo;), separados por comas.
        </p>
        <div className="grid gap-2 sm:grid-cols-6">
          <input
            placeholder="Marca (se crea si no existe)"
            value={modelForm.brandName}
            disabled={!!editing}
            onChange={(e) => setModelForm({ ...modelForm, brandName: e.target.value })}
            className={`${INPUT} sm:col-span-2 disabled:opacity-50`}
          />
          <input
            placeholder="Modelo, sin la marca. Ej: NKD 125"
            value={modelForm.name}
            onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
            className={`${INPUT} sm:col-span-2`}
          />
          <input
            type="number"
            placeholder="cc"
            value={modelForm.cc}
            onChange={(e) => setModelForm({ ...modelForm, cc: e.target.value })}
            className={`${INPUT} sm:col-span-2`}
          />
          <input
            type="number"
            placeholder="Año desde"
            value={modelForm.yearFrom}
            onChange={(e) => setModelForm({ ...modelForm, yearFrom: e.target.value })}
            className={`${INPUT} sm:col-span-1`}
          />
          <input
            type="number"
            placeholder="Año hasta"
            value={modelForm.yearTo}
            onChange={(e) => setModelForm({ ...modelForm, yearTo: e.target.value })}
            className={`${INPUT} sm:col-span-1`}
          />
          <input
            placeholder="Alias, separados por comas"
            value={modelForm.aliases}
            onChange={(e) => setModelForm({ ...modelForm, aliases: e.target.value })}
            className={`${INPUT} sm:col-span-4`}
          />
          <textarea
            placeholder="Introducción del hub (opcional, la escribe una persona; máx. 2000 caracteres)"
            maxLength={2000}
            rows={3}
            value={modelForm.intro}
            onChange={(e) => setModelForm({ ...modelForm, intro: e.target.value })}
            className={`${INPUT} sm:col-span-6`}
          />
        </div>
        <button
          type="button"
          onClick={saveModel}
          disabled={savingModel}
          className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black hover:bg-white/90 disabled:opacity-50"
        >
          {savingModel ? 'Guardando…' : editing ? 'Guardar modelo' : 'Crear modelo'}
        </button>
      </section>

      {/* ── Modelos ── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm text-white/50">
            {models ? `${models.length} modelos · ${published} con hub publicado` : 'Cargando modelos…'}
          </p>
          <input
            type="search"
            placeholder="Filtrar por marca, modelo o alias…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`${INPUT} max-w-xs`}
          />
        </div>
        {loadError && <p className="text-sm text-red-400">No se pudieron cargar los modelos ({loadError}).</p>}
        {models && (
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Modelo', 'Verificadas', 'Pendientes', 'Hub', ''].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/20 ${h === 'Modelo' ? 'text-left' : 'text-center'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <span className="text-white/80">
                        {m.brandName} {m.name}
                      </span>
                      {!m.isActive && <span className="ml-2 text-xs text-white/30">(inactivo)</span>}
                      {m.aliases.length > 0 && (
                        <span className="block text-xs text-white/30">{m.aliases.join(', ')}</span>
                      )}
                    </td>
                    <td className={`px-5 py-3 text-center ${m.verified ? 'text-emerald-400' : 'text-white/25'}`}>
                      {m.verified}
                    </td>
                    <td className={`px-5 py-3 text-center ${m.pending ? 'text-amber-400' : 'text-white/25'}`}>
                      {m.pending}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {m.verified > 0 && m.isActive ? (
                        <Link
                          href={`/repuestos/${m.brandSlug}/${m.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"
                        >
                          Ver <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-white/25">Sin publicar</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(m)}
                        className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white"
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-white/30">
          Para cargar compatibilidades de un producto concreto, ábrelo en{' '}
          <Link href="/admin/productos" className="underline hover:text-white/60">
            Productos
          </Link>{' '}
          → sección &ldquo;Compatibilidades&rdquo;.
        </p>
      </section>
    </div>
  )
}

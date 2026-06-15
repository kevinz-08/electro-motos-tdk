'use client'

import type { SyncReport } from '@h2r/domain'

interface Props {
  report: SyncReport
}

export function SyncResultTable({ report }: Props) {
  const totalProcessed = report.updated + report.unchanged + report.notFound.length

  return (
    <div className="space-y-6">

      {/* ── Resumen general ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Actualizados" value={report.updated} color="green" />
        <StatCard label="Sin cambios"  value={report.unchanged} color="neutral" />
        <StatCard label="No encontrados" value={report.notFound.length} color="red" />
        <StatCard label="Total procesados" value={totalProcessed} color="neutral" />
      </div>

      {/* ── Metadata ──────────────────────────────────────────────────── */}
      <p className="text-xs text-white/30">
        Ejecutado en {report.durationMs} ms ·{' '}
        {new Date(report.executedAt).toLocaleString('es-CO')}
      </p>

      {/* ── Corregidos por nombre ──────────────────────────────────────── */}
      {report.fixedByNombre.length > 0 && (
        <Section title={`Resueltos por nombre (${report.fixedByNombre.length})`} color="amber">
          <p className="text-xs text-white/40 mb-3">
            El código llegó corrupto desde Optimun y se encontró el producto por nombre.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <Th>Código corrupto</Th>
                <Th>Nombre encontrado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {report.fixedByNombre.map((r, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="px-3 py-2 font-mono text-xs text-amber-400">{r.codigoCorrupto}</td>
                  <td className="px-3 py-2 text-white/70">{r.nombreMatch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* ── Precio omitido (DETAL = 0) ────────────────────────────────── */}
      {report.skippedPrice.length > 0 && (
        <Section title={`Precio no actualizado — DETAL 0 en Optimun (${report.skippedPrice.length})`} color="blue">
          <p className="text-xs text-white/40 mb-3">
            Estos productos no tienen precio configurado en el sistema local.
            El precio de la web no fue modificado.
          </p>
          <div className="flex flex-wrap gap-2">
            {report.skippedPrice.map(sku => (
              <span key={sku} className="font-mono text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white/50">
                {sku}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ── No encontrados ────────────────────────────────────────────── */}
      {report.notFound.length > 0 && (
        <Section title={`No encontrados en la tienda (${report.notFound.length})`} color="red">
          <p className="text-xs text-white/40 mb-3">
            Estos productos existen en Optimun pero no en la tienda web. No se crearon.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <Th>Código</Th>
                <Th>Nombre en Optimun</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {report.notFound.map((r, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="px-3 py-2 font-mono text-xs text-white/40">{r.codigo}</td>
                  <td className="px-3 py-2 text-white/70">{r.nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'green' | 'red' | 'amber' | 'neutral'
}) {
  const valueColor = {
    green:   'text-green-400',
    red:     value > 0 ? 'text-red-400' : 'text-white/40',
    amber:   'text-amber-400',
    neutral: 'text-white',
  }[color]

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 flex flex-col gap-1">
      <span className={`text-2xl font-bold ${valueColor}`}>{value}</span>
      <span className="text-xs text-white/40">{label}</span>
    </div>
  )
}

function Section({
  title,
  color,
  children,
}: {
  title: string
  color: 'green' | 'red' | 'amber' | 'blue'
  children: React.ReactNode
}) {
  const border = {
    green: 'border-green-500/20',
    red:   'border-red-500/20',
    amber: 'border-amber-500/20',
    blue:  'border-blue-500/20',
  }[color]

  const titleColor = {
    green: 'text-green-400',
    red:   'text-red-400',
    amber: 'text-amber-400',
    blue:  'text-blue-400',
  }[color]

  return (
    <div className={`bg-white/[0.03] border ${border} rounded-xl p-4`}>
      <h3 className={`text-sm font-semibold mb-3 ${titleColor}`}>{title}</h3>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wide">
      {children}
    </th>
  )
}

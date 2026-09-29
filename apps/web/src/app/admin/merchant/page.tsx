/**
 * `/admin/merchant` — estado del feed de Google Merchant Center (docs/seo/,
 * Fase 7): cuántos productos entran, cuáles quedan fuera y por qué, y la carga
 * masiva de marca y MPN (H-18), que es lo que más productos desbloquea.
 *
 * Calcula el feed en el momento (sin caché) con la misma función que la ruta
 * pública, así lo que se ve aquí es exactamente lo que recibirá Google.
 */
import { ExternalLink } from 'lucide-react'
import { prisma } from '@/infrastructure/database/prisma-client'
import { loadMerchantFeed, MERCHANT_FEED_PATH } from '@/lib/merchant-feed'
import { absoluteUrl } from '@/lib/seo'
import { IdentifiersImporter } from '@/components/admin/IdentifiersImporter'

export const dynamic = 'force-dynamic'

export default async function AdminMerchantPage() {
  const [report, products] = await Promise.all([
    loadMerchantFeed(),
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { sku: true, name: true, partBrand: true, mpn: true, partType: true, warrantyMonths: true },
    }),
  ])
  const feedUrl = absoluteUrl(MERCHANT_FEED_PATH)
  const reasons = Object.entries(report.reasonCounts).sort((a, b) => b[1] - a[1])
  const withWarnings = report.included.filter((i) => i.warnings.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">Canales</p>
        <h1 className="text-2xl font-bold tracking-tight text-white">Google Merchant Center</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/40">
          Qué productos recibe Google Shopping y cuáles quedan fuera. Solo entran productos activos, con stock, foto y marca del
          repuesto.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
          <p className="text-xs text-white/40">En el feed</p>
          <p className="mt-1 text-3xl font-black text-emerald-400">{report.items.length}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
          <p className="text-xs text-white/40">Excluidos</p>
          <p className="mt-1 text-3xl font-black text-amber-400">{report.excluded.length}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
          <p className="text-xs text-white/40">URL del feed (para Merchant Center)</p>
          <a href={MERCHANT_FEED_PATH} target="_blank" className="mt-2 inline-flex items-center gap-1 break-all text-xs text-sky-400 hover:underline">
            {feedUrl} <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
      </div>

      <IdentifiersImporter
        rows={products.map((p) => ({
          sku: p.sku, name: p.name, partBrand: p.partBrand, mpn: p.mpn, partType: p.partType, warrantyMonths: p.warrantyMonths,
        }))}
      />

      {reasons.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">¿Por qué quedan productos fuera?</h2>
          <ul className="flex flex-wrap gap-2 text-xs">
            {reasons.map(([reason, count]) => (
              <li key={reason} className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-200/90">
                {reason}: <strong>{count}</strong>
              </li>
            ))}
          </ul>
          <div className="max-h-[480px] overflow-auto rounded-2xl border border-white/[0.06] bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-950">
                <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-[0.12em] text-white/25">
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Producto</th>
                  <th className="px-5 py-3">Motivos</th>
                </tr>
              </thead>
              <tbody>
                {report.excluded.map((e) => (
                  <tr key={e.sku} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-2.5 font-mono text-xs text-white/50">{e.sku}</td>
                    <td className="px-5 py-2.5 text-white/80">{e.name}</td>
                    <td className="px-5 py-2.5 text-xs text-amber-200/80">{e.reasons.join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {withWarnings.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white">En el feed, pero con avisos ({withWarnings.length})</h2>
          <ul className="space-y-1 text-xs text-white/50">
            {withWarnings.map((i) => (
              <li key={i.sku}>
                <span className="font-mono text-white/40">{i.sku}</span> {i.name} — {i.warnings.join(' · ')}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

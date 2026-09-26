/**
 * `/admin/guias` — artículos de contenido (docs/seo/, Fase 5 — ítem 1).
 * Lee directo de Prisma (patrón SSR admin, como `/admin/revisores`).
 *
 * Mientras la migración `20260926000000_phase5_content` no esté aplicada la
 * tabla no existe: la página lo dice en vez de romper el panel.
 */
import Link from 'next/link'
import { ExternalLink, Plus } from 'lucide-react'
import { ARTICLE_KIND_LABELS, ARTICLE_STATUS_LABELS, type ArticleStatus } from '@h2r/domain'
import { prisma } from '@/infrastructure/database/prisma-client'

const STATUS_STYLE: Record<ArticleStatus, string> = {
  DRAFT: 'bg-white/10 text-white/50',
  IN_REVIEW: 'bg-amber-500/15 text-amber-300',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-300',
}

async function loadArticles() {
  try {
    return await prisma.article.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, slug: true, title: true, kind: true, status: true, updatedAt: true,
        reviewer: { select: { name: true, isActive: true } },
      },
    })
  } catch (e) {
    console.error('[admin/guias] no se pudo leer la tabla Article', e)
    return null
  }
}

export default async function AdminArticlesPage() {
  const articles = await loadArticles()

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">Contenido</p>
          <h1 className="text-2xl font-bold tracking-tight text-white">Guías y comparativas</h1>
          <p className="mt-1 max-w-xl text-sm text-white/40">
            Artículos de texto que se publican en /guias. Nada se publica sin un revisor técnico y la fecha de su revisión.
            Las guías de intervalos por modelo están en Mantenimiento.
          </p>
        </div>
        {articles && (
          <Link
            href="/admin/guias/nuevo"
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-white/90"
          >
            <Plus className="h-4 w-4" /> Nuevo artículo
          </Link>
        )}
      </div>

      {articles === null ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-6 py-8 text-sm text-amber-200/80">
          Falta aplicar la migración <code>20260926000000_phase5_content</code> (tarea H-54 de docs/seo/HUMAN_TASKS.md).
          Hasta entonces no se pueden crear artículos.
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-6 py-16 text-center">
          <p className="text-sm text-white/40">Todavía no hay artículos.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Artículo', 'Tipo', 'Revisor', 'Estado', ''].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-white/20">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/guias/${a.id}`} className="font-medium text-white/80 hover:underline">
                      {a.title}
                    </Link>
                    <span className="block text-xs text-white/30">/guias/{a.slug}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-white/50">{ARTICLE_KIND_LABELS[a.kind]}</td>
                  <td className="px-5 py-3.5 text-xs text-white/50">
                    {a.reviewer ? (
                      <>
                        {a.reviewer.name}
                        {!a.reviewer.isActive && <span className="text-amber-400"> (inactivo)</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[a.status]}`}>{ARTICLE_STATUS_LABELS[a.status]}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {a.status === 'PUBLISHED' && a.reviewer?.isActive && (
                      <Link href={`/guias/${a.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white">
                        Ver <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

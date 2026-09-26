/**
 * Pinta el cuerpo de un artículo (Markdown restringido, `parseArticleBody` del
 * dominio) como elementos React. Nunca usa `dangerouslySetInnerHTML`: lo que el
 * administrador pega no puede inyectar HTML ni scripts.
 *
 * Sin hooks ni estado: lo usan la página pública (Server Component) y la vista
 * previa del editor del panel (Client Component). `tone` cambia la paleta.
 */
import Link from 'next/link'
import type { ArticleBlock, InlineNode } from '@h2r/domain'

type Tone = 'light' | 'dark'

const STYLES: Record<Tone, Record<'h2' | 'h3' | 'p' | 'li' | 'table' | 'th' | 'td' | 'link' | 'code', string>> = {
  light: {
    h2: 'mt-10 scroll-mt-24 text-2xl font-bold text-gray-900',
    h3: 'mt-6 scroll-mt-24 text-lg font-bold text-gray-900',
    p: 'mt-4 leading-relaxed text-gray-700',
    li: 'leading-relaxed text-gray-700',
    table: 'mt-5 overflow-x-auto rounded-xl border border-gray-200',
    th: 'bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500',
    td: 'border-t border-gray-100 px-4 py-3 align-top text-gray-700',
    link: 'font-medium text-sky-600 underline hover:text-sky-700',
    code: 'rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.9em] text-gray-800',
  },
  dark: {
    h2: 'mt-6 text-lg font-bold text-white',
    h3: 'mt-4 text-base font-bold text-white',
    p: 'mt-3 text-sm leading-relaxed text-white/70',
    li: 'text-sm leading-relaxed text-white/70',
    table: 'mt-3 overflow-x-auto rounded-lg border border-white/10',
    th: 'bg-white/5 px-3 py-2 text-left text-xs font-semibold text-white/50',
    td: 'border-t border-white/[0.06] px-3 py-2 align-top text-sm text-white/70',
    link: 'text-sky-400 underline',
    code: 'rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em] text-white/80',
  },
}

function Inline({ nodes, tone }: { nodes: InlineNode[]; tone: Tone }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.type) {
          case 'text':
            return <span key={i}>{n.text}</span>
          case 'strong':
            return (
              <strong key={i} className="font-semibold">
                <Inline nodes={n.children} tone={tone} />
              </strong>
            )
          case 'em':
            return (
              <em key={i}>
                <Inline nodes={n.children} tone={tone} />
              </em>
            )
          case 'code':
            return (
              <code key={i} className={STYLES[tone].code}>
                {n.text}
              </code>
            )
          case 'link':
            return n.internal ? (
              <Link key={i} href={n.href} className={STYLES[tone].link}>
                <Inline nodes={n.children} tone={tone} />
              </Link>
            ) : (
              <a key={i} href={n.href} target="_blank" rel="noopener noreferrer" className={STYLES[tone].link}>
                <Inline nodes={n.children} tone={tone} />
              </a>
            )
        }
      })}
    </>
  )
}

export function ArticleBody({ blocks, tone = 'light' }: { blocks: ArticleBlock[]; tone?: Tone }) {
  const s = STYLES[tone]
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return block.level === 2 ? (
              <h2 key={i} id={block.id} className={s.h2}>
                <Inline nodes={block.children} tone={tone} />
              </h2>
            ) : (
              <h3 key={i} id={block.id} className={s.h3}>
                <Inline nodes={block.children} tone={tone} />
              </h3>
            )
          case 'paragraph':
            return (
              <p key={i} className={s.p}>
                <Inline nodes={block.children} tone={tone} />
              </p>
            )
          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul'
            return (
              <ListTag key={i} className={`mt-4 space-y-1.5 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
                {block.items.map((item, j) => (
                  <li key={j} className={s.li}>
                    <Inline nodes={item} tone={tone} />
                  </li>
                ))}
              </ListTag>
            )
          }
          case 'table':
            return (
              <div key={i} className={s.table}>
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr>
                      {block.header.map((cell, j) => (
                        <th key={j} scope="col" className={s.th}>
                          <Inline nodes={cell} tone={tone} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, j) =>
                          j === 0 ? (
                            <th key={j} scope="row" className={`${s.td} font-semibold`}>
                              <Inline nodes={cell} tone={tone} />
                            </th>
                          ) : (
                            <td key={j} className={s.td}>
                              <Inline nodes={cell} tone={tone} />
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </>
  )
}

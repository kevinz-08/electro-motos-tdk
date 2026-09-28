/**
 * Tráfico que llega desde asistentes de IA (docs/seo/, Fase 6 — ítem 10).
 *
 * Reconoce la fuente por el dominio del referrer o por `utm_source` (ChatGPT,
 * por ejemplo, agrega `utm_source=chatgpt.com` a los enlaces que cita). Sirve
 * para enviar un evento a GA4 y poder medir si el trabajo de GEO trae visitas.
 */

/** Nombre corto de la fuente → dominios (sin `www.`) que la identifican. */
export const AI_SOURCES: Readonly<Record<string, readonly string[]>> = {
  chatgpt: ['chatgpt.com', 'chat.openai.com', 'openai.com'],
  perplexity: ['perplexity.ai'],
  gemini: ['gemini.google.com', 'bard.google.com'],
  copilot: ['copilot.microsoft.com', 'copilot.cloud.microsoft'],
  claude: ['claude.ai'],
  deepseek: ['chat.deepseek.com', 'deepseek.com'],
  meta_ai: ['meta.ai'],
  grok: ['grok.com'],
  you: ['you.com'],
  poe: ['poe.com'],
}

const hostOf = (value: string): string | null => {
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

const matches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`)

/**
 * Devuelve el nombre de la fuente de IA, o `null` si la visita no viene de una.
 * `utm_source` tiene prioridad: el referrer a veces llega vacío (apps móviles,
 * políticas de referrer estrictas) y el parámetro no.
 */
export function detectAiSource(referrer: string | null | undefined, utmSource: string | null | undefined): string | null {
  for (const candidate of [utmSource, referrer]) {
    if (!candidate) continue
    const host = hostOf(candidate.trim())
    if (!host) continue
    for (const [source, domains] of Object.entries(AI_SOURCES)) {
      if (domains.some((d) => matches(host, d))) return source
    }
  }
  return null
}

/** Expresión regular para el filtro "fuente de la sesión" en GA4 (Exploraciones). */
export const GA4_AI_SOURCE_REGEX = Object.values(AI_SOURCES)
  .flat()
  .map((d) => d.replace(/\./g, '\\.'))
  .join('|')

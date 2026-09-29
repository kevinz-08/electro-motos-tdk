#!/usr/bin/env node
/**
 * Acceso de los crawlers de IA y buscadores — Fase 6, ítem 1 (docs/seo/ROADMAP.md).
 *
 * Pide las plantillas clave con el user-agent de cada crawler y comprueba que
 * reciba lo mismo que un navegador: status 200, HTML completo (no una página de
 * desafío de la CDN/WAF), título, JSON-LD y, en la ficha, el precio en el HTML
 * sin JavaScript. También verifica que robots.txt no los bloquee.
 *
 * Uso:
 *   pnpm seo:ai                        # contra producción
 *   pnpm seo:ai http://localhost:3000  # contra el entorno local
 */

const BASE = (process.argv[2] ?? 'https://www.tiendah2r.com').replace(/\/$/, '')

const CRAWLERS = {
  'Navegador (referencia)': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  Bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  'OAI-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  'ChatGPT-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  PerplexityBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  ClaudeBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'Claude-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)',
  CCBot: 'CCBot/2.0 (https://commoncrawl.org/faq/)',
  Applebot: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
}

/** Tokens de robots.txt que deben estar permitidos (Google-Extended y Applebot-Extended no rastrean, solo autorizan el uso). */
const ROBOTS_TOKENS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bingbot', 'Googlebot']

const CHALLENGE = /just a moment|cf-chl|attention required|access denied|captcha|verify you are human/i

let failures = 0
let checks = 0
function check(description, condition, detail = '') {
  checks++
  if (condition) console.log(`  OK    ${description}`)
  else {
    failures++
    console.log(`  FALLA ${description}${detail ? ` — ${detail}` : ''}`)
  }
}

async function fetchAs(path, ua) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'user-agent': ua, accept: 'text/html' }, redirect: 'follow' })
  return { status: res.status, html: await res.text() }
}

/** Grupos de robots.txt: user-agent → reglas Disallow. */
function robotsGroups(txt) {
  const groups = []
  let current = null
  for (const raw of txt.split('\n')) {
    const line = raw.split('#')[0].trim()
    const [key, ...rest] = line.split(':')
    const value = rest.join(':').trim()
    if (/^user-agent$/i.test(key)) {
      if (!current || current.rules.length) groups.push((current = { agents: [], rules: [] }))
      current.agents.push(value)
    } else if (/^(dis)?allow$/i.test(key) && current) current.rules.push({ allow: /^allow$/i.test(key), path: value })
  }
  return groups
}

async function main() {
  console.log(`\nAcceso de crawlers en ${BASE}\n`)

  // Una ficha real, sacada del sitemap.
  const sitemap = await (await fetch(`${BASE}/sitemap-productos.xml`)).text()
  const productPath = sitemap.match(/<loc>[^<]*?(\/producto\/[^<]+)<\/loc>/)?.[1]
  const modelsSitemap = await (await fetch(`${BASE}/sitemap-modelos.xml`)).text()
  const hubPath = modelsSitemap.match(/<loc>[^<]*?(\/repuestos\/[^/<]+\/[^/<]+)<\/loc>/)?.[1]
  const pages = [
    { name: 'home', path: '/' },
    productPath && { name: 'ficha', path: productPath, needsPrice: true },
    hubPath && { name: 'hub de modelo', path: hubPath },
    { name: 'catálogo', path: '/catalogo' },
  ].filter(Boolean)

  console.log('robots.txt')
  const robots = await (await fetch(`${BASE}/robots.txt`)).text()
  const groups = robotsGroups(robots)
  for (const token of ROBOTS_TOKENS) {
    const group = groups.find((g) => g.agents.some((a) => a.toLowerCase() === token.toLowerCase())) ?? groups.find((g) => g.agents.includes('*'))
    const blocksAll = group?.rules.some((r) => !r.allow && r.path === '/')
    check(`${token} no está bloqueado del sitio`, group !== undefined && !blocksAll)
  }

  const reference = {}
  for (const [name, ua] of Object.entries(CRAWLERS)) {
    console.log(`\n${name}`)
    for (const page of pages) {
      const { status, html } = await fetchAs(page.path, ua)
      const size = html.length
      if (name.startsWith('Navegador')) reference[page.path] = size
      const ref = reference[page.path] ?? size
      const ok =
        status === 200 &&
        !CHALLENGE.test(html.slice(0, 5000)) &&
        /<title>[^<]+<\/title>/.test(html) &&
        html.includes('application/ld+json') &&
        size > ref * 0.8 &&
        (!page.needsPrice || /"price"\s*:\s*"?\d/.test(html))
      check(
        `${page.name} (${page.path})`,
        ok,
        `status ${status}, ${Math.round(size / 1024)} KB (navegador ${Math.round(ref / 1024)} KB)${CHALLENGE.test(html.slice(0, 5000)) ? ', página de desafío' : ''}`,
      )
    }
  }

  console.log(`\n${checks - failures}/${checks} comprobaciones correctas\n`)
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

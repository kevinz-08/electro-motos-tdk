# Fase 6 — GEO (visibilidad en motores generativos)

**Estado:** técnico completo y material preparado (2026-09-28, rama `feat/seo-geo-cro`). **Falta la parte humana**,
empezando por la línea base de la medición de prompts, que es el criterio de salida. Detalle técnico en
`HISTORIAL_TECNICO.md` §184–§185.

**Objetivo:** que ChatGPT, Perplexity, Gemini y Copilot citen y recomienden a H2R.

## Técnico

| # | Ítem | Estado | Resultado |
|---|---|---|---|
| 1 | Crawlers de IA reciben HTML completo en producción | ✅ **Medido** | `pnpm seo:ai`: **54/54** en producción el 2026-09-28 — GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Claude-User, CCBot, Applebot, Googlebot y Bingbot reciben 200, HTML completo, JSON-LD y precio; robots.txt y la CDN no bloquean a ninguno |
| 2 | `/llms.txt` | ✅ | Formato llmstxt.org; resumen, datos de la empresa, envíos, pagos, garantía, los 20 hubs por moto, categorías, guías, índice y políticas — todo calculado desde la base |
| 3 | "Por qué comprar en H2R" | ✅ | `/por-que-comprar-en-h2r`: cifras calculadas (productos, compatibilidades verificadas, modelos, días de entrega), tienda física, pagos, garantía; reseñas solo si hay suficientes. Enlazada en el footer y en el sitemap |
| 4 | Coherencia de entidad | ✅ | JSON-LD `Organization` y `WebSite` con `alternateName: ["Tienda H2R", "H2R"]`; datos canónicos únicos en `geo/perfiles-marca.md` |
| 10 | Segmento de tráfico desde IA | ✅ Código · ⏳ configurar GA4 | Evento `ai_referral` (`ai_source`, `landing_page`), una vez por sesión y con consentimiento; guía en `geo/medicion-trafico-ia.md` |

`/llms.txt` y la página "Por qué comprar" leen de la misma función (`findStoreFacts`), así nunca se contradicen ni
quedan con una cifra vieja.

## Fuera del sitio (en `geo/`)

| # | Ítem | Estado |
|---|---|---|
| 5 | 10 guiones de vídeo corto | ✅ Preparados (con `[VERIFICAR]` técnicos) · ⏳ H-29 |
| 6 | Plantillas de correo (medios, blogs, talleres, marcas) | ✅ Preparadas · ⏳ H-30 |
| 7 | Guía de participación en comunidades | ✅ Preparada · ⏳ H-31 |
| 8 | Checklist de perfiles de marca | ✅ Preparado · ⏳ H-41, H-42 |
| 9 | 30 prompts y plantilla de registro mensual | ✅ Preparado · ⏳ **H-32: línea base** |

## Criterio de salida y qué falta

> Carpeta `geo/` completa y línea base de la medición de prompts registrada.

La carpeta está completa. Falta **registrar la primera medición** (H-32): 30 prompts × 4 motores, siguiendo
`geo/prompts.md`. Conviene hacerla **antes** de desplegar esta rama y de crear los perfiles, para que la comparación del
mes siguiente mida el efecto de todo lo nuevo.

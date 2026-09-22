# Indexación de páginas — línea base

Capturado el 2026-09-22 desde Search Console → Indexación → Páginas (17/9/26, última actualización
del informe).

## Totales

- **Páginas indexadas: 35**
- **Páginas sin indexar: 4** (3 motivos distintos)

La tendencia (gráfico de barras) es de crecimiento sostenido: de ~7 páginas indexadas a finales de
junio a 35 a mediados de septiembre. Coherente con las 124 URLs de producto que había en el sitemap
antiguo — el sitio se está indexando de forma normal y sin bloqueos.

## Motivos de las páginas sin indexar

| Motivo | Páginas | Lectura |
|---|---|---|
| Página con redirección | 2 | Esperado: el apex `tiendah2r.com` redirige 308 a `www.tiendah2r.com` (confirmado en la Fase 0) |
| Excluida por una etiqueta "noindex" | 1 | Esperado: coincide con alguna ruta transaccional (`/carrito`, `/checkout`, `/auth/*`…) que ya llevaba `noindex` antes de este proyecto |
| *(tercer motivo — pendiente de confirmar el texto exacto)* | — | TODO(humano): completar tras revisar el resto de la tabla en Search Console |

**Ninguno de los 4 casos es un problema.** Los tres motivos son consecuencia de decisiones ya tomadas
antes de la Fase 1, no de un error de rastreo.

## Qué comparar después de desplegar

Tras la Fase 1, el número de "sin indexar" **va a subir**, y es lo correcto:

- Los filtros del catálogo (`?search=`, `?minPrice=`, `?maxPrice=`, `?inStock=`, `?showAll=`,
  combinaciones de más de una faceta) pasan a `noindex, follow`. En la línea base, `?category=repuestos`
  ya tenía 123 impresiones y `?showAll=true` 18 — ver `README.md` de esta carpeta.
- Si sube "sin indexar" por esas URLs, es el resultado esperado de la Fase 1, no una regresión.
- Si sube "sin indexar" en una **ficha de producto** o en un **hub de modelo** con compatibilidades
  cargadas, eso sí hay que investigarlo.

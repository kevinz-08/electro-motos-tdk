# Fase 1 — Base técnica de SEO

**Fecha:** 2026-09-22
**Rama:** `feat/pop-up-promocional`
**Estado:** implementada y verificada en local sobre un build de producción.
**Pendiente:** volver a medir en producción después del despliegue (ver §5).

Parte de la auditoría [`00-auditoria.md`](./00-auditoria.md), cuyos problemas M1-M7, I1-I6, P1-P6 y el
hallazgo crítico del vídeo se atacan aquí.

---

## 1. Qué se hizo y por qué

### 1.1 Metadatos, idioma y canonical (M1, M2, M3, M4, M5, M6, M7)

Antes **no existía ni un solo `canonical`** en el sitio y el idioma era `es` genérico.

- **`lib/seo.ts` (nuevo)** centraliza tres cosas: el host canónico
  (`https://www.tiendah2r.com`, sin barra final), el helper `canonical()` que emite `<link rel="canonical">`
  más `hreflang="es-CO"` y `x-default`, y las reglas de indexación del catálogo.
- `<html lang="es-CO">` en el layout raíz.
- **Canonical absoluto en todas las plantillas indexables**: home, catálogo, categoría, ficha de producto,
  contacto y las cuatro legales.
- **La home ya tiene metadata propia.** Antes heredaba "Taller especializado en motos eléctricas y a
  gasolina", que no decía qué se vende ni dónde se entrega. Ahora: *"Repuestos para moto con envío a toda
  Colombia"*.
- **Títulos de categoría con intención de búsqueda**: `{Categoría} para moto | Precios en Colombia | H2R`,
  en vez del nombre pelado.
- **Descripción de la ficha de producto con datos reales**: precio formateado en COP, ventana de despacho
  leída de `Settings` (la misma que se muestra en la página) y medios de pago.
- Se eliminó el `keywords` heredado ("taller motos"), que no aporta y desalineaba la entidad.
- **Coherencia de entidad**: el logo tenía `alt="Electro Motos Tony"` en cinco archivos mientras la marca es
  H2R Online Store. Unificado.

> **Nota sobre el pago contra entrega:** ninguna descripción estática lo menciona, porque el admin puede
> desactivarlo (`Settings.COD_ENABLED`). Solo se promete lo que siempre es cierto: Wompi con PSE, Nequi y
> tarjetas.

### 1.2 robots.txt (I1) y reglas de indexación de los filtros (I5, I6)

- **`app/robots.ts` (nuevo)**. Antes `/robots.txt` devolvía 404.
  - Permite explícitamente a Googlebot, Google-Extended, Bingbot, OAI-SearchBot, ChatGPT-User, GPTBot,
    PerplexityBot, Perplexity-User, ClaudeBot, Claude-SearchBot, Applebot y DuckDuckBot.
  - Bloquea `/admin`, `/api/`, `/auth/`, `/carrito`, `/checkout`, `/pedido/`, `/pedidos` y `/resena/`.
  - Bloquea la búsqueda interna (`?search=`), que acepta texto libre y por tanto genera URLs infinitas.
  - Declara los cuatro sitemaps y el `Host` canónico.
- **`catalogSeo()` decide qué URL del catálogo entra al índice**:

  | URL | Resultado |
  |---|---|
  | `/catalogo` | indexable, canonical a sí misma |
  | `/catalogo?category=<slug>` | indexable, canonical a sí misma |
  | `?category=<slug>&page=N` | indexable, canonical a sí misma |
  | `?search=…` | `noindex, follow`, canonical a `/catalogo` |
  | `?minPrice=`, `?maxPrice=`, `?inStock=`, `?showAll=` | `noindex, follow`, canonical a la versión limpia |
  | combinación de más de una faceta | `noindex, follow` |
  | categoría sin productos | `noindex, follow` |
  | slug de categoría inexistente | `noindex, follow` |

  Los filtros **no** se bloquean en robots.txt a propósito: para que un buscador vea el `noindex` tiene que
  poder rastrear la página.

### 1.3 Sitemaps segmentados (I1, I2, I3, I4)

`/sitemap.xml` deja de ser una lista de 128 URLs y pasa a ser un **índice** — misma dirección, ya enviada a
los buscadores, otro contenido:

| Sitemap | Contenido | URLs |
|---|---|---|
| `/sitemap-paginas.xml` | home, catálogo, contacto y las 4 legales | 7 |
| `/sitemap-categorias.xml` | una URL por categoría **con productos** | 25 |
| `/sitemap-productos.xml` | productos activos, con y sin stock | 132 |

Correcciones concretas frente al sitemap anterior:

- **Fuera `/auth/login` y `/auth/register`**, que estaban en el sitemap y a la vez marcadas `noindex`.
- **Dentro las 4 legales y `/contacto`**, que eran indexables y no estaban.
- **Dentro las 25 categorías y subcategorías**, que no tenían ninguna URL en el sitemap.
- **Los productos sin stock ya no se excluyen**: la URL responde 200 y su JSON-LD declara `OutOfStock`;
  sacarla solo le quitaba señales. Los borrados (`deletedAt`) e inactivos siguen fuera.
- `lastmod` siempre real: `Product.updatedAt` y, en categorías, el producto modificado más recientemente.
  Las páginas fijas no llevan `lastmod` porque no hay un dato honesto que poner.

De 128 URLs (2 de ellas contradictorias) a **164 URLs, todas indexables**.

### 1.4 IndexNow (1.3 del brief)

- **`IndexNowService` (nuevo, NestJS)** notifica a Bing, Yandex, Seznam y Naver cuando cambia un producto.
  Google no participa del protocolo; para Google sigue valiendo el sitemap.
- Enganchado a las tres mutaciones que cambian lo que ve el buscador: crear producto, actualizar producto y
  actualizar stock (`availability` en el JSON-LD).
- **Con cola y *debounce* de 30 s** (o lote de 100): guardar 30 productos seguidos en el panel manda **una**
  petición, no 30.
- Tolerante a fallos por diseño: sin `INDEXNOW_KEY` queda desactivado sin error, y un fallo de la API se
  registra pero nunca rompe el guardado del producto.
- Clave publicada en `apps/web/public/57f804052944e876eedbd2eb22475f65.txt`; las variables
  `INDEXNOW_KEY` y `SITE_URL` se inyectan en Cloud Run desde el workflow de CI.

### 1.5 Core Web Vitals

**El vídeo del hero del catálogo — el problema más caro del sitio.**

| | Antes | Ahora |
|---|---|---|
| Archivo en el repositorio | 87,8 MB (1080p30, 19,8 Mbps, **con pista de audio** en un vídeo `muted`) | **3,7 MB** (720p25, sin audio, faststart) |
| Transferido en `/catalogo` | ~30 MB | 0 en móvil, 3,7 MB solo en escritorio y bajo demanda |
| Elemento LCP | el propio vídeo (6,8 s) | póster WebP de **12 KB** |
| Carga | `autoplay preload="auto"` | montado por JS solo si: pantalla ≥ 1024 px, sin `prefers-reduced-motion`, sin `saveData` ni conexión 2G/3G, y con el hilo principal libre (`requestIdleCallback`) |

Es decir: **en móvil el vídeo ya no se descarga**, y el usuario ve exactamente lo mismo desde el primer
frame gracias al póster.

Resto de cambios de rendimiento:

- **Preloads que competían con el LCP, eliminados** (P2): `RecommendedProducts` y los destacados de la home
  marcaban `priority` en las dos primeras tarjetas, que están muy por debajo del pliegue. Eso generaba
  cuatro `<link rel="preload">` de imágenes de otros productos peleando por el ancho de banda con el
  elemento LCP real.
- **Banners de categoría a WebP** (P5): los cinco JPG de `/catalogo` bajan de 734 KB a 429 KB (-41 %).
  Los JPG se eliminaron del repositorio.
- **Imagen del pop-up con `fetchPriority="low"`** (P1): ~130 KB que competían con el hero de la home.
- **Presupuesto de rendimiento en CI** (nuevo `.github/workflows/seo.yml` + `scripts/seo-lighthouse.mjs`):
  falla si LCP > 2,5 s, CLS > 0,1, TBT > 300 ms, TTFB > 600 ms, rendimiento < 80, SEO < 95 o si la página
  supera su techo de peso. Corre semanalmente y a mano. **Sin esto nada impedía que volviera a entrar otro
  asset de 30 MB.**

### 1.6 Un bug de producción encontrado al verificar

Al levantar el sitio para comprobar la Fase 1, la home devolvía **HTTP 500 de forma intermitente**:

```
TypeError: Cannot read properties of null (reading 'id')
    at src/app/(store)/home.tsx:79   → featuredProducts.map(...)
```

Causa: `getCachedFeaturedProducts()` elige 4 productos con SQL crudo filtrando `stock > 0 AND isActive`,
**pero sin `deletedAt IS NULL`**, y luego los resuelve con `repo.findById()`, que sí filtra los borrados.
Si el `ORDER BY RANDOM()` elegía un producto de la papelera con stock, el array traía un `null` y la home
reventaba. Intermitente, por eso no saltaba siempre.

No es parte de la Fase 1, pero un 5xx aleatorio en la home es lo peor que le puede pasar a un sitio en SEO.
Corregido en `lib/cache.ts` añadiendo el filtro y un `.filter()` defensivo.

---

## 2. Archivos tocados

**Nuevos**

| Archivo | Qué es |
|---|---|
| `apps/web/src/lib/seo.ts` | Host canónico, `canonical()`, `NOINDEX_FOLLOW` y `catalogSeo()` |
| `apps/web/src/lib/sitemap.ts` | Datos y serialización de los sitemaps |
| `apps/web/src/app/robots.ts` | robots.txt generado |
| `apps/web/src/app/sitemap.xml/route.ts` | Índice de sitemaps |
| `apps/web/src/app/sitemap-paginas.xml/route.ts` | Segmento de páginas |
| `apps/web/src/app/sitemap-categorias.xml/route.ts` | Segmento de categorías |
| `apps/web/src/app/sitemap-productos.xml/route.ts` | Segmento de productos |
| `apps/web/src/components/store/CatalogHeroVideo.tsx` | Carga diferida y condicional del vídeo |
| `apps/web/public/assets/video-hero-catalog-poster.webp` | Póster del hero (12 KB), nuevo elemento LCP |
| `apps/web/public/57f804052944e876eedbd2eb22475f65.txt` | Clave de IndexNow |
| `apps/api/src/infrastructure/services/IndexNowService.ts` | Notificación a IndexNow con cola |
| `scripts/seo-check.mjs` | Verificación de robots, sitemaps, canonical e indexación |
| `scripts/seo-lighthouse.mjs` | Presupuesto de rendimiento |
| `.github/workflows/seo.yml` | Workflow semanal + manual |

**Modificados**

`apps/web/src/app/layout.tsx` · `(store)/page.tsx` · `(store)/home.tsx` · `(store)/catalogo/page.tsx` ·
`(store)/producto/[slug]/page.tsx` · `(store)/contacto/page.tsx` · las 4 páginas de `legal/` ·
`components/store/CatalogHero.tsx` · `components/store/RecommendedProducts.tsx` ·
`components/store/PromoModal.tsx` · `components/nav/Navbar.tsx` · `lib/cache.ts` · 4 páginas de `auth/` ·
`apps/api/src/admin/admin-products.controller.ts` · `apps/api/src/infrastructure/infrastructure.module.ts` ·
`apps/api/.env.example` · `.github/workflows/ci.yml` · `package.json`

**Eliminados**

`apps/web/src/app/sitemap.ts` (sustituido por el índice y los tres segmentos) ·
`apps/web/public/assets/bannerByCategory/*.jpg` (sustituidos por WebP)

**Migraciones de base de datos: ninguna.** La Fase 1 no toca el esquema.

**Activos regenerados:** `video-hero-catalog.mp4` se recomprimió en el sitio (87,8 MB → 3,7 MB). El original
sigue recuperable con `git show HEAD:apps/web/public/assets/video-hero-catalog.mp4 > video.mp4`.

---

## 3. Cómo verificarlo

```bash
# 1. Verificación funcional completa (42 comprobaciones)
pnpm build && pnpm --filter @h2r/web start   # en otra terminal
pnpm seo:check http://localhost:3000
# esperado: ✔ 42/42 comprobaciones correctas

# 2. Contra producción, una vez desplegado
pnpm seo:check
pnpm seo:lighthouse

# 3. A mano
curl -s https://www.tiendah2r.com/robots.txt          # antes: 404
curl -s https://www.tiendah2r.com/sitemap.xml         # ahora: <sitemapindex>
curl -s https://www.tiendah2r.com/ | grep -i canonical
```

Resultado en local, sobre un build de producción, el 2026-09-22:

```
robots.txt                     10/10 OK
Sitemaps                        11/11 OK   (7 + 25 + 132 URLs)
Canonical e idioma               8/8  OK
Indexación de filtros            5/5  OK
Ficha de producto                3/3  OK
Crawlers de IA                   5/5  OK
✔ 42/42 comprobaciones correctas
```

Además: `pnpm type-check` limpio en los 6 paquetes, `pnpm lint` sin errores, 213/213 tests de dominio y
191/191 de API.

---

## 4. Métricas

**Deterministas (medidas sobre los archivos, no dependen del entorno):**

| Métrica | Antes | Ahora | Δ |
|---|---|---|---|
| Vídeo del hero del catálogo | 87,8 MB | 3,7 MB | **-96 %** |
| Vídeo transferido en móvil | ~30 MB | 0 | **-100 %** |
| Banners de categoría (5 archivos) | 734 KB | 429 KB | -41 % |
| Preloads de imagen que competían con el LCP | 4 | 0 | — |
| URLs en el sitemap | 128 (2 contradictorias) | 164 | +36 |
| Categorías con URL en el sitemap | 0 | 25 | +25 |
| Plantillas con `canonical` | 0 | todas las indexables | — |
| URLs de filtro indexables | ilimitadas | solo `?category=` | — |

**Lighthouse en producción (antes, medido el 2026-09-22 en la Fase 0):**

| Plantilla | Rendimiento | LCP | Peso |
|---|---|---|---|
| Home | 80 | 4,3 s | 888 KB |
| Catálogo | 72 | 6,8 s | 31.803 KB |
| Producto | 88 | 3,4 s | 487 KB |

---

## 5. Riesgos y deuda

1. **Las cifras "después" de Lighthouse en producción están pendientes del despliegue.** Se intentó una
   comparación local, pero Chrome headless en emulación móvil **no descarga el vídeo de fondo**, así que la
   medición local no reproduce el problema real y no sirve como comparación. La medición honesta es
   `pnpm seo:lighthouse` contra producción una vez desplegado.
2. **El `altText` del banner del hero sigue siendo una cadena de espacios** (tarea H-22): es un dato de la
   base de datos y se corrige desde `/admin/banners`. Mientras no se corrija, la home se queda en SEO 91-92.
3. **IndexNow no se ha probado contra la API real**: hasta que `INDEXNOW_KEY` no esté en Cloud Run y la
   clave sea accesible en `https://www.tiendah2r.com/<clave>.txt`, el servicio responde 403. Verificar
   después del primer despliegue (tarea H-33).
4. **Las URLs de categoría siguen siendo query params** (`?category=`). Es legítimo y ya son indexables,
   pero las rutas propias con sus 301 son trabajo de la Fase 2 y necesitan aprobación (H-26).
5. **La paginación (`?page=N`) es indexable con canonical propio.** Es lo que recomienda Google, pero si
   Search Console muestra páginas paginadas canibalizando, conviene revisarlo con datos.
6. **El `BANNER_FALLBACK` del catálogo apunta a un archivo que no existe**
   (`banner-category-example.jpg`). Hoy no se llega a ese caso porque las 5 categorías padre están todas
   mapeadas, pero es una bomba de relojería si se crea una categoría padre nueva.
7. **El workflow `seo.yml` corre contra producción**, no contra un preview. Si el sitio está caído, el job
   falla — que es lo que se quiere, pero conviene saberlo.

---

## 6. Tareas nuevas para el humano

Añadidas a [`HUMAN_TASKS.md`](./HUMAN_TASKS.md):

- **H-33** — Verificar IndexNow tras el despliegue: que `https://www.tiendah2r.com/57f804052944e876eedbd2eb22475f65.txt`
  responda 200 con la clave, y que `INDEXNOW_KEY` esté presente en la revisión de Cloud Run.
- **H-34** — Reenviar los sitemaps en Search Console y Bing Webmaster Tools: el `/sitemap.xml` cambió de
  lista a índice, y hay tres sitemaps nuevos.
- **H-35** — Revisar el vídeo recomprimido del catálogo en un escritorio real y confirmar que la calidad es
  aceptable. Si no lo es, se puede regenerar con menos compresión partiendo del original, que sigue en el
  historial de git.

Se resuelven con esta fase: **H-23** (el vídeo de 30 MB) y **H-24** (dominio canónico: se asume `www`, como
ya hacía la redirección 308).

*Última actualización: 2026-09-22*

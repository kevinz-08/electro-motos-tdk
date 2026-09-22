# Fase 0 — Auditoría SEO / GEO / CRO

**Fecha de corte:** 2026-09-22
**Sitio auditado:** https://www.tiendah2r.com (producción, Vercel)
**Rama:** `feat/pop-up-promocional`
**Alcance:** auditoría de solo lectura. **No se modificó código de la aplicación.**

Todos los números de esta auditoría salen de mediciones reales hechas hoy (Lighthouse 12 sobre Chrome local
contra producción, `curl` con distintos user-agents, lectura del repositorio). Lo que no se pudo medir está
marcado como `TODO(humano)` y replicado en [`HUMAN_TASKS.md`](./HUMAN_TASKS.md).

---

## 0. Verificación del stack (Brief §3)

| Punto | Estado real |
|---|---|
| Next.js | **16.2.3**, App Router, React 19.2.4, React Compiler activado |
| Render home | Server Component; datos vía `unstable_cache` (`getCachedHeroBanners`, `getCachedFeaturedProducts`, `getCachedHomeCategories`, `getCachedPromoModal`). Sin `revalidate` explícito → cacheado hasta invalidación por tag |
| Render catálogo | Server Component (`/catalogo`), dos vistas (landing y grid) en la misma ruta, diferenciadas por `searchParams`. Datos vía `getCachedCatalogLanding` / `getCachedCatalogGrid` |
| Render producto | Server Component con `generateStaticParams()` + `export const revalidate = 300` → **SSG + ISR de 5 min** |
| Consumo de API desde el front | Lecturas SSR van **directo a Prisma** (`@h2r/database`); las mutaciones van por `fetch` a NestJS con Bearer JWT |
| Esquema Prisma | 30 modelos. Relevantes: `Product`, `Category` (árbol con `parentId`), `ProductDescription` + `ProductBenefit` + `ProductCompatibilityItem`, `MotorcycleCompatibility`, `ProductReview`, `ProductPriceHistory` |
| Despliegue | Web → **Vercel**; API → **Google Cloud Run**; imágenes → **Cloudinary** (loader propio, sin Vercel Image Optimization); BD → Postgres (Neon) |
| Convenciones | Turborepo + pnpm; Clean Architecture; Vitest (dominio/API) y Playwright (E2E); ESLint solo en web; commits en español, sin co-autoría |
| Dominio | `tiendah2r.com` → **308 → `www.tiendah2r.com`** (canonical de facto: con `www`, sin barra final) |

---

## 1. Inventario de rutas y plantillas

### Rutas públicas (indexables hoy)

| Ruta | Plantilla | Render | Metadata propia |
|---|---|---|---|
| `/` | `(store)/home.tsx` | Server + cache por tags | ❌ (hereda el layout raíz) |
| `/catalogo` | `(store)/catalogo/page.tsx` — vista landing | Server + cache | ✅ `generateMetadata` |
| `/catalogo?category=<slug>` | misma plantilla — vista grid | Server + cache | ✅ (title = nombre de categoría) |
| `/catalogo?search=…` | misma plantilla — vista grid | Server + cache | ✅ (title = "Resultados para …") |
| `/catalogo?page=N&inStock=&minPrice=&maxPrice=&showAll=` | misma plantilla | Server | ⚠️ sin diferenciación |
| `/producto/[slug]` | `(store)/producto/[slug]/page.tsx` | **SSG + ISR 300 s** | ✅ + `opengraph-image.tsx` |
| `/contacto` | `(store)/contacto/page.tsx` | Server | ✅ |
| `/legal/terminos-y-condiciones` | Server Component | Server | ✅ (`index,follow`) |
| `/legal/politica-de-envios` | Server Component | Server | ✅ (`index,follow`) |
| `/legal/politica-de-cambios` | Server Component | Server | ✅ (`index,follow`) |
| `/legal/politica-de-privacidad` | Server Component | Server | ✅ (`index,follow`) |

### Rutas privadas / transaccionales (ya con `noindex`)

`/carrito`, `/checkout`, `/checkout/confirmacion`, `/pedidos`, `/resena/[orderItemId]`, `/admin/*`,
`/auth/*` — todas declaran `robots: { index: false, follow: false }`. **Esto está bien resuelto.**

### Rutas que **no existen** y que el negocio necesita

- ❌ No hay ruta propia de categoría (`/catalogo/[categoria]`): las categorías viven en un **query param**.
- ❌ No hay hub de modelo de moto (`/repuestos/[marca]/[modelo]`) ni modelo × categoría.
- ❌ No hay blog, guías, páginas de autor, páginas de envío por ciudad ni "Sobre nosotros" como ruta propia.
- ❌ No hay `/buscar` como ruta canónica (la búsqueda es `?search=` sobre el catálogo).
- ❌ No hay `robots.txt`, `llms.txt`, `manifest.webmanifest` ni feed de Merchant Center.

---

## 2. Metadatos

**Lo que ya funciona**

- `metadataBase` desde `NEXT_PUBLIC_SITE_URL` (= `https://www.tiendah2r.com` en producción).
- Plantilla de título global `%s | H2R Online Store`.
- Open Graph global con `locale: es_CO`, `siteName` y `twitter: summary_large_image`.
- PDP con `generateMetadata` (nombre + 160 caracteres de descripción) y **OG image generada por producto**
  (`opengraph-image.tsx`). Verificado en producción.
- `noindex` correcto en todo el área transaccional y de cuenta.

**Problemas encontrados**

| # | Problema | Evidencia |
|---|---|---|
| M1 | **No existe ni un solo `canonical` en todo el sitio.** Búsqueda de `alternates`/`canonical` en `apps/web/src`: 0 resultados; confirmado también en el HTML de producción de home, catálogo y PDP | riesgo alto de duplicados con `?page=`, `?inStock=`, `?showAll=`, UTM, `www`/apex |
| M2 | `<html lang="es">`, no `es-CO`; **sin `hreflang` ni `x-default`** | `apps/web/src/app/layout.tsx` |
| M3 | La **home no tiene metadata propia**: usa el título y la descripción genéricos del layout ("Taller especializado en motos eléctricas y a gasolina") — no menciona repuestos por modelo ni Colombia como mercado | `apps/web/src/app/(store)/home.tsx` |
| M4 | Los `title` de categoría son solo el nombre ("Repuestos \| H2R Online Store"): sin modelo, sin "precio", sin "Colombia" | `catalogo/page.tsx` |
| M5 | Las descripciones de PDP son un corte a 160 caracteres de la descripción comercial: sin precio desde, sin medio de pago, sin tiempo de envío | `producto/[slug]/page.tsx` |
| M6 | El `keywords` global es de la época anterior ("taller motos"); no aporta y desalinea la entidad | `layout.tsx` |
| M7 | La marca del layout dice "Repuestos y Servicios" mientras el logo del sitio tiene `alt="Electro Motos Tony"` → **incoherencia de entidad** (crítico para GEO) | HTML de producción |

---

## 3. Indexación

| Elemento | Estado |
|---|---|
| `robots.txt` | **404 en producción** (`GET /robots.txt` → 404). No hay `robots.ts` en el repo. Hoy no bloquea nada (permisivo por defecto), pero tampoco declara sitemap ni protege los parámetros |
| `sitemap.xml` | ✅ existe (`app/sitemap.ts`). **128 URLs**: 124 productos + home + `/catalogo` + `/auth/login` + `/auth/register` |
| `lastmod` | ✅ real, desde `updatedAt` de los productos (124 de 128 URLs lo llevan) |
| Sitemaps segmentados | ❌ uno solo |
| IndexNow | ❌ no existe |
| `noindex` en filtros | ❌ ninguna combinación de `?page` / `?minPrice` / `?maxPrice` / `?inStock` / `?showAll` / `?search` lleva `noindex`; sin canonical, todas son indexables |

**Problemas de indexación**

- **I1 — El sitemap incluye `/auth/login` y `/auth/register`, que están marcados `noindex`.** Es una
  contradicción directa: el sitemap pide indexar lo que la página prohíbe.
- **I2 — El sitemap excluye los productos sin stock** (`stock: { gt: 0 }`), pero esas URLs siguen vivas y
  devolviendo 200. Un producto que se agota desaparece del sitemap y pierde señales, en vez de mantenerse con
  `availability: OutOfStock`.
- **I3 — Las categorías no están en el sitemap** porque no son rutas, son parámetros. Las 5 categorías padre
  (`sistema-electrico`, `repuestos`, `aceites`, `llantas`, `accesorios`) y sus subcategorías no tienen una URL
  limpia que rankear.
- **I4 — Las páginas legales y `/contacto` no están en el sitemap** aunque son `index,follow`.
- **I5 — Espacio de rastreo infinito**: `?search=` acepta cualquier texto y genera páginas indexables sin límite.
- **I6 — Sin canonical, la paginación (`?page=2…`) compite con la página 1.**

---

## 4. Datos estructurados (JSON-LD)

| Tipo | Estado |
|---|---|
| `Product` | ✅ **Único JSON-LD del sitio**, solo en la PDP. Verificado en producción, bien formado |
| `AggregateRating` | ✅ Presente **solo** si hay reseñas reales aprobadas por encima del umbral (`reviewsMinCount`). Criterio correcto y conservador |
| `Organization` | ❌ |
| `WebSite` + `SearchAction` | ❌ |
| `BreadcrumbList` | ❌ (hay breadcrumb visual en el grid, sin marcado) |
| `ItemList` en listados | ❌ |
| `FAQPage` | ❌ (hay un FAQ **visible** en la home con 6 preguntas reales — marcado listo para usarse) |
| `OfferShippingDetails` / `MerchantReturnPolicy` | ❌ |
| `isAccessoryOrSparePartFor` (Vehicle/Motorcycle) | ❌ |
| `LocalBusiness` / tienda física | ❌ (hay dirección real y embed de Maps en `lib/contact.ts`) |

**Campos que le faltan al `Product` actual** (`producto/[slug]/page.tsx`): `brand`, `mpn`, `offers.url`,
`offers.itemCondition`, `offers.priceValidUntil`, `shippingDetails`, `hasMerchantReturnPolicy`.

Ejemplo real medido hoy:

```json
{"@context":"https://schema.org","@type":"Product","name":"BATERIA MAGNA MF-MAGX7L-BS","sku":"3-MAG7L",
 "image":["...4 imágenes de Cloudinary..."],"description":"...",
 "offers":{"@type":"Offer","priceCurrency":"COP","price":"109900","availability":"https://schema.org/InStock"}}
```

---

## 5. Rendimiento (Lighthouse 12, móvil, throttling simulado 4G)

Ejecutado el 2026-09-22 contra producción, `--form-factor=mobile --screenEmulation.mobile`.

| Plantilla | Perf. | SEO | Best pr. | LCP | CLS | TBT | TTFB | Peso total |
|---|---|---|---|---|---|---|---|---|
| Home `/` | 80 | **91** | 100 | **4,3 s** ❌ | 0 ✅ | 160 ms ✅ | 70 ms ✅ | 888 KB |
| Catálogo `/catalogo` | **72** | 100 | 100 | **6,8 s** ❌❌ | 0 ✅ | 100 ms ✅ | 80 ms ✅ | **31.803 KB** ❌❌❌ |
| Producto (PDP) | 88 | 100 | 100 | **3,4 s** ❌ | 0 ✅ | 30 ms ✅ | 70 ms ✅ | 487 KB |

Metas del brief: LCP ≤ 2,5 s · INP ≤ 200 ms · CLS ≤ 0,1 · TTFB < 600 ms.
**CLS y TTFB están en verde en las tres plantillas. LCP falla en las tres.**

### Hallazgo crítico: 30 MB de vídeo en el catálogo

```
29.955 KB  https://www.tiendah2r.com/assets/video-hero-catalog.mp4
```

Es el **elemento LCP** de `/catalogo`, servido con `autoplay preload="auto"` desde `/public`. Representa el
**94 % de los 31,8 MB** que pesa la página. En un plan de datos móvil colombiano esto es medio gigabyte cada
16 visitas, además del coste de ancho de banda de Vercel. Es, con diferencia, el problema técnico más caro del
sitio.

### Otros hallazgos de rendimiento

- **P1** — Home: el elemento LCP es la imagen del hero de Cloudinary; ya lleva `fetchpriority="high"` y
  `loading="eager"`, pero pesa 157 KB y compite con el **pop-up promocional (132 KB)** que se descarga en la
  misma carga inicial.
- **P2** — PDP: el elemento LCP detectado es **el logo del navbar** (`/assets/logo.webp`), no la imagen del
  producto → falla `prioritize-lcp-image`. La imagen del producto no se prioriza.
- **P3** — `image-alt` falla en la home: el banner del hero se sirve con un `alt` compuesto solo de espacios.
  Viene de `HeroBanner.altText` en la base de datos, no del código. Es la razón del SEO 91 de la home.
- **P4** — `uses-long-cache-ttl`, `legacy-javascript` y `unused-javascript` fallan en las tres plantillas.
  JS: ~220 KB transferidos en 16 peticiones. No es crítico (TBT ≤ 160 ms), pero hay margen.
- **P5** — Los banners de categoría de `/catalogo` son **JPG de ~140 KB cada uno, cinco a la vez**, servidos
  desde `/public` sin Cloudinary y sin formatos modernos → fallan `modern-image-formats` y
  `uses-responsive-images`.
- **P6** — `bf-cache` falla en `/catalogo`.
- **Terceros**: solo Cloudinary y Vercel Analytics. **0 ms de bloqueo por terceros.** No hay GA4, ni píxeles,
  ni SDK de chat. El WhatsApp es un enlace `wa.me` (`lib/contact.ts`), no un SDK. Esto está bien y hay que
  mantenerlo así.
- **Sin datos de campo (CrUX)**: la API de PageSpeed Insights respondió 429 sin clave. `TODO(humano)`:
  entregar una API key de PSI o acceso a Search Console para tener el percentil 75 real de Colombia.

---

## 6. Crawlers de IA y renderizado sin JavaScript

Probado hoy con `curl` contra la PDP de producción, un user-agent por petición:

| User-Agent | Respuesta |
|---|---|
| `GPTBot/1.1` | 200 · 147.170 bytes |
| `OAI-SearchBot/1.0` | 200 · 147.170 bytes |
| `ChatGPT-User/1.0` | 200 · 147.170 bytes |
| `PerplexityBot/1.0` | 200 · 147.170 bytes |
| `ClaudeBot/1.0` | 200 · 147.170 bytes |
| `bingbot/2.0` | 200 · 147.170 bytes |
| `Googlebot/2.1` | 200 · 147.170 bytes |

**Ningún crawler de IA está bloqueado**, ni por `robots.txt` (no existe), ni por `proxy.ts` (su `matcher` es
solo `/admin/:path*`), ni por Vercel. Todos reciben exactamente el mismo HTML: **no hay cloaking**.

**El contenido clave viaja en el HTML inicial, sin ejecutar JavaScript** — verificado en el HTML crudo:

- Precio: `$ 109.900` ✅
- Stock: "¡Solo queda 1 unidad en stock!" ✅
- Nombre en `<h1>` ✅ · `sku` en el JSON-LD ✅
- Compatibilidad: ⚠️ el acordeón se renderiza **solo si el admin cargó `ProductCompatibilityItem`**. En el
  producto probado el bloque no existe. Es un dato opcional, en texto libre y disperso.

**Conclusión GEO**: la base técnica es buena (HTML completo, sin bloqueos, TTFB de 70-80 ms). Lo que falta es
**qué** leen: no hay `Organization`, ni NIT, ni dirección estructurada, ni hubs de modelo, ni contenido citable.
Una IA que lea el sitio hoy no puede responder "¿qué pastillas le sirven a una XR190L?" porque ese dato no
existe en ninguna parte del sitio de forma estructurada.

---

## 7. Modelo de datos: qué hay hoy para compatibilidad

| Modelo Prisma | Qué guarda | Estado real |
|---|---|---|
| `MotorcycleCompatibility` | `productId`, `brand`, `model`, `year?` | **Existe pero está muerto.** El propio esquema lo documenta: "queda sin uso por ahora (sin escritura implementada en ningún flujo)". Sin slug, sin cilindraje, sin alias, sin verificación, sin posición |
| `ProductCompatibilityItem` | `body` (texto libre, ej. "Honda CB160F 2020-2023") + `order` | **Es lo único que se usa hoy.** Lo escribe el admin a mano y se muestra en un acordeón de la PDP. No es consultable, ni filtrable, ni indexable por modelo |
| `Product` | `name`, `slug`, `sku`, `price`, `compareAtPrice`, `stock`, `soldCount`, `storeRecommendations`, `images`, dimensiones y peso | **Faltan**: `mpn`, marca del repuesto, tipo (original / homologado / genérico), garantía, posición |
| `Category` | Árbol con `parentId` | ✅ Sano. 5 categorías padre + subcategorías. Sin ruta propia |
| `ProductReview` | Reseñas con aprobación y compra verificada | ✅ Existe y alimenta `AggregateRating`. **No tiene el campo "¿en qué moto lo instalaste?"** |
| `ProductPriceHistory` | Respaldo legal del precio ancla (Ley 1480 / SIC) | ✅ Muy bien resuelto |

**No existe**: marca de moto como entidad, modelo de moto como entidad, referencia OEM, fuente del dato de
compatibilidad, ni bandera de verificación. **Todo el núcleo de la Fase 2 está por construir.**

---

## 8. Conversión (móvil)

**Lo que ya está resuelto y es bueno** — no hay que rehacerlo:

- Guest checkout (`Order.userId` nullable, `buyerIdKey` para cupones sin cuenta).
- Cotizador de envío real por ciudad (`ShippingQuoteCalculator` + `CitySelector`, integración Vendelo).
- Estimación de entrega con días hábiles colombianos y hora de corte (`DeliveryEstimate`).
- Pago contra entrega (COD) con toggle de admin, Wompi (PSE, Nequi, tarjetas) y botón de Addi.
- Prueba social **real**: `soldCount` desde pedidos confirmados y reseñas verificadas por compra.
- Urgencia de stock **real** (`stock < umbral`), no inventada.
- Precio ancla respaldado por `ProductPriceHistory`.
- Botón flotante de WhatsApp como enlace ligero.
- Cuatro páginas legales publicadas e indexables.

**Fricciones detectadas**

| # | Fricción |
|---|---|
| C1 | **No hay barra fija de "Agregar al carrito"** en móvil al hacer scroll. La PDP es larga (galería, acordeones, reseñas, relacionados) |
| C2 | **No hay selector "¿Qué moto tienes?"** ni badge de compatibilidad. El comprador de repuestos decide por compatibilidad y hoy tiene que adivinar |
| C3 | El botón de WhatsApp es genérico ("Estoy interesado en algo para mi moto"): **no hay "Confirma compatibilidad por WhatsApp"** con producto, SKU y moto prellenados |
| C4 | No hay venta cruzada mecánica ("normalmente se cambia junto con…") ni kits de mantenimiento por modelo |
| C5 | El umbral de envío gratis ($500.000 COP) está **escrito a mano en el acordeón de la PDP**, no en `Settings`, y no hay barra de progreso hacia él |
| C6 | Falta "Sobre nosotros" con NIT y equipo, y una página de garantías separada |
| C7 | La política de cambios de la PDP ("5 días calendario") está escrita a mano en el JSX en vez de leerse de una fuente única |
| C8 | Sin analítica de eventos: solo Vercel Analytics (páginas vistas). No hay embudo medible ni segmento de tráfico desde IA |

**Riesgo de confianza — requiere decisión del negocio (no es un bug técnico):**

`components/store/SocialProof.tsx` muestra en la home cuatro testimonios con nombre y apellido
("Carlos Mendoza", "Andrea Ruiz"…) etiquetados **"Cliente verificado"**, y las cifras **"500+ clientes
satisfechos", "1.200+ repuestos vendidos", "98% recomendación"** — todo **escrito directamente en el código
fuente**. Si esos testimonios y cifras no corresponden a clientes y pedidos reales, incumplen la regla 2 del
brief (nada de reseñas falsas) y la Ley 1480 de 2011 en materia de publicidad engañosa. Existe una tabla
`ProductReview` con reseñas reales verificadas por compra de la que se podría alimentar esta sección.
→ **`TODO(humano)`: confirmar el origen de estos datos.** Ver `HUMAN_TASKS.md` H-01.

---

## 9. Lista priorizada (impacto × esfuerzo)

### 🔴 Ahora — impacto alto, esfuerzo bajo

| # | Acción | Fase |
|---|---|---|
| 1 | **Quitar o sustituir el vídeo de 30 MB de `/catalogo`** (póster + vídeo comprimido bajo demanda, o imagen). Es el 94 % del peso de la página | 1 |
| 2 | Crear `robots.ts`: permitir explícitamente buscadores e IA, bloquear `/carrito`, `/checkout`, `/pedidos`, `/admin`, `/auth` y `?search=`, y declarar los sitemaps | 1 |
| 3 | **Canonicals absolutos en todas las plantillas** + `lang="es-CO"` + `hreflang` | 1 |
| 4 | Sacar `/auth/login` y `/auth/register` del sitemap; meter las legales y `/contacto`; dejar de excluir los productos sin stock | 1 |
| 5 | `noindex, follow` en `?search=`, `?minPrice`, `?maxPrice`, `?inStock`, `?showAll` y en toda combinación de más de dos filtros | 1 |
| 6 | Arreglar el `altText` del banner del hero en la base de datos (hoy son espacios) | 1 |
| 7 | JSON-LD `Organization` (con NIT, dirección real y `sameAs`) + `WebSite`/`SearchAction` en el layout raíz | 3 |
| 8 | `FAQPage` sobre el FAQ que **ya es visible** en la home | 3 |
| 9 | Unificar la entidad: `alt="Electro Motos Tony"` del logo y la descripción del layout → "H2R Online Store" | 1 |
| 10 | Confirmar el origen de los testimonios y las cifras de `SocialProof` (H-01) | — |

### 🟠 Después — impacto alto, esfuerzo medio o alto

| # | Acción | Fase |
|---|---|---|
| 11 | **Sistema de compatibilidad**: `MotorcycleBrand`, `MotorcycleModel`, `Fitment` (con fuente y verificado), `OemReference` | 2 |
| 12 | Rutas de categoría propias (`/catalogo/[categoria]`) con 301 desde `?category=` | 2 |
| 13 | Hubs `/repuestos/[marca]/[modelo]` y `/repuestos/[marca]/[modelo]/[categoria]` | 2 |
| 14 | Selector "¿Qué moto tienes?" + badge de compatibilidad + WhatsApp con contexto | 2 / 4 |
| 15 | Completar el `Product` JSON-LD: `brand`, `mpn`, `offers.url`, `itemCondition`, envío, devoluciones e `isAccessoryOrSparePartFor` | 3 |
| 16 | `BreadcrumbList` + `ItemList` | 3 |
| 17 | Priorizar la imagen del producto como LCP en la PDP; comprimir y mover a Cloudinary los banners de categoría | 1 |
| 18 | Barra fija de compra en móvil + umbral de envío gratis en `Settings` con barra de progreso | 4 |
| 19 | Sitemaps segmentados + IndexNow desde NestJS | 1 |
| 20 | Campo "¿en qué moto lo instalaste?" en `ProductReview` | 4 |

### 🟡 Luego — construcción de contenido y GEO

| # | Acción | Fase |
|---|---|---|
| 21 | Guías de mantenimiento por modelo, páginas de autor, comparativas | 5 |
| 22 | Índice de Precios de Repuestos de Moto en Colombia (generado desde el catálogo) | 5 |
| 23 | Páginas de envío por ciudad (solo con datos reales de pedidos) | 5 |
| 24 | `llms.txt`, "Por qué comprar en H2R", material de difusión y medición de prompts | 6 |
| 25 | Feed de Merchant Center | 7 |
| 26 | GA4 o equivalente con eventos de embudo y segmento de tráfico desde IA | 4 |

---

## 10. Riesgos y deuda técnica detectada

1. **`MotorcycleCompatibility` es una tabla muerta.** Antes de la Fase 2 hay que decidir si se migra o se
   reemplaza. La migración debe ser aditiva (regla 4 del brief).
2. **El catálogo es una sola ruta con siete parámetros.** Mover las categorías a rutas propias cambia URLs
   que ya están indexadas → exige mapa de redirecciones 301 y aprobación previa (regla 6).
3. **Sin acceso a Search Console ni a datos de campo**, la priorización se apoya en datos de laboratorio y en
   el mercado, no en el tráfico real del sitio.
4. **Textos de política duplicados en el JSX** (envíos, cambios, umbral de envío gratis): cambiar la política
   real obliga a tocar varios archivos.
5. **Sin CI de rendimiento**: nada impide que vuelva a entrar otro asset de 30 MB.
6. **124 productos** en el sitemap: el catálogo es pequeño. Los hubs de modelo solo tendrán sentido si se
   cargan compatibilidades reales para esos 124 productos — es trabajo humano, no generable.

---

## 11. Qué necesito para seguir

Bloqueantes reales para las siguientes fases, detallados en [`HUMAN_TASKS.md`](./HUMAN_TASKS.md):
acceso a Search Console, confirmación de la política real de envíos y garantías, decisión sobre `SocialProof`
y, sobre todo, **datos de compatibilidad verificados** para los modelos prioritarios.

**Estado: Fase 0 terminada. Esperando aprobación para empezar la Fase 1.**

---

## Cómo reproducir esta auditoría

```bash
# Lighthouse móvil (requiere Chrome instalado)
npx lighthouse@12 https://www.tiendah2r.com/catalogo \
  --only-categories=performance,seo,best-practices \
  --form-factor=mobile --screenEmulation.mobile \
  --throttling-method=simulate --output=json --output-path=./lh-catalogo.json \
  --chrome-flags="--headless=new"

# Acceso de los crawlers de IA
for ua in "GPTBot/1.1" "OAI-SearchBot/1.0" "PerplexityBot/1.0" "ClaudeBot/1.0"; do
  curl -sS -o /dev/null -w "$ua -> %{http_code}\n" -A "$ua" \
    https://www.tiendah2r.com/producto/bateria-magna-mf-magx7l-bs
done

# robots y sitemap
curl -sI https://www.tiendah2r.com/robots.txt | head -1     # hoy: 404
curl -sS https://www.tiendah2r.com/sitemap.xml | grep -c "<loc>"   # hoy: 128
```

*Última actualización: 2026-09-22*

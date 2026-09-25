# Roadmap SEO / GEO / CRO — H2R Online Store

Estado de las fases definidas en [`AGENT-BRIEF.md`](./AGENT-BRIEF.md).
Para desplegar lo ya construido: [`DESPLIEGUE.md`](./DESPLIEGUE.md).
Orden de ejecución: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. Las fases 3 y 4 pueden avanzar en paralelo una vez
terminada la 2. **Las fases 0 y 2 requieren aprobación explícita antes de continuar.**

| Fase | Nombre | Estado | Entregable | Puerta |
|---|---|---|---|---|
| **0** | Auditoría | ✅ Terminada (2026-09-22) | [`00-auditoria.md`](./00-auditoria.md) | ✅ Aprobada |
| **1** | Base técnica de SEO | ✅ **Terminada** (2026-09-22) | [`01-resultados.md`](./01-resultados.md) | ⏳ Pendiente de desplegar y volver a medir (H-36) |
| **2** | Sistema de compatibilidad | ✅ Terminada (2026-09-22) | [`02-compatibilidad.md`](./02-compatibilidad.md) | ✅ Aprobada · ⛔ bloqueada por **H-02** para publicar |
| **3** | Datos estructurados | ✅ **Terminada** (2026-09-22) | [`03-datos-estructurados.md`](./03-datos-estructurados.md) | — |
| **4** | Conversión | 🚧 **Casi cerrada** (2ª entrega 2026-09-23) | [`04-conversion.md`](./04-conversion.md) | — |
| 5 | Contenido y E-E-A-T | 🚧 En curso | `05-contenido.md` | Necesita revisor técnico (H-21) |
| 6 | GEO | 📋 Definida | `06-geo.md`, `geo/` | — |
| 7 | Merchant Center y feed | 📋 Definida | `07-feed.md` | Necesita marca y MPN de los repuestos (H-18) |

---

## Fase 0 — Auditoría ✅

**Terminada el 2026-09-22.** Auditoría de solo lectura; no se modificó código de la aplicación.

Medido: Lighthouse 12 móvil sobre las tres plantillas en producción, acceso de 7 crawlers (4 de IA),
contenido en HTML sin JavaScript, `robots.txt`, `sitemap.xml`, metadatos, JSON-LD, esquema Prisma y flujo de
compra.

**Los cinco hallazgos que mandan:**

1. `/catalogo` pesa **31,8 MB** por un vídeo de 30 MB que además es el elemento LCP (6,8 s).
2. **No hay ni un solo `canonical`** en el sitio, y ningún filtro del catálogo lleva `noindex`.
3. **`robots.txt` devuelve 404** y no existe `robots.ts`.
4. **No hay sistema de compatibilidad**: `MotorcycleCompatibility` está muerta y lo único vivo es texto libre.
5. El único JSON-LD del sitio es `Product` en la PDP: **no hay `Organization`, `WebSite`, `Breadcrumb` ni `FAQPage`**.

**Lo bueno, que no hay que tocar:** ningún crawler de IA bloqueado, HTML completo con precio y stock sin
JavaScript, TTFB de 70-80 ms, CLS en 0, cero bloqueo por terceros, `noindex` correcto en todo el área
transaccional, y prueba social de producto basada en datos reales.

---

## Fase 1 — Base técnica de SEO ✅

**Terminada el 2026-09-22.** Detalle completo en [`01-resultados.md`](./01-resultados.md).

Lo que se hizo:

1. **`robots.ts`** — antes devolvía 404. Permite explícitamente a 13 crawlers (buscadores + IA), bloquea
   carrito, checkout, cuenta, admin y la búsqueda interna, y declara los sitemaps.
2. **Canonical absoluto en todas las plantillas indexables** + `lang="es-CO"` + `hreflang` + `x-default`.
   Antes no existía ni un solo canonical en el sitio.
3. **Sitemaps segmentados**: `/sitemap.xml` pasa a ser un índice de `-paginas` (7), `-categorias` (25) y
   `-productos` (132). Fuera las dos URLs `noindex` que estaban dentro; dentro las legales, `/contacto`, las
   25 categorías y los productos sin stock.
4. **Reglas de indexación de los filtros**: solo `/catalogo` y `?category=` son indexables; búsquedas,
   precio, stock y combinaciones salen con `noindex, follow`.
5. **Metadata por plantilla** con datos reales: la home deja de heredar el texto genérico del layout, las
   categorías usan fórmula con intención de búsqueda y la ficha de producto lleva precio y ventana de
   despacho leídos de la base de datos.
6. **IndexNow** desde NestJS, con cola y debounce, enganchado a alta, edición y cambio de stock.
7. **Core Web Vitals**: el vídeo del catálogo baja de 87,8 MB a 3,7 MB y deja de descargarse en móvil (el
   LCP pasa a ser un póster de 12 KB); se quitan 4 preloads que competían con el elemento LCP; los banners
   de categoría pasan a WebP.
8. **Presupuesto de rendimiento en CI** (`.github/workflows/seo.yml` + `pnpm seo:lighthouse`) y script de
   verificación (`pnpm seo:check`, 42 comprobaciones).

De paso se corrigió un **HTTP 500 intermitente en la home** (productos de la papelera colándose en los
destacados), detectado al verificar la fase.

**Verificación:** 42/42 comprobaciones en local sobre build de producción, `type-check` limpio, `lint` sin
errores, 213/213 tests de dominio y 191/191 de API.

**Pendiente:** desplegar y volver a medir en producción (H-36), verificar IndexNow (H-33), reenviar sitemaps
(H-34) y corregir el `altText` de los banners (H-22).

---

## Fase 2 — Sistema de compatibilidad ✅

**Terminada el 2026-09-22.** Detalle en [`02-compatibilidad.md`](./02-compatibilidad.md).

Lo que se construyó:

1. **Modelo de datos** (migración aditiva, ya aplicada): `MotorcycleBrand`,
   `MotorcycleModel`, `Fitment` y `OemReference`, más `mpn`, `partBrand`, `partType` y
   `warrantyMonths` en `Product`.
2. **Dominio**: entidades, reglas y casos de uso en TypeScript puro, con 40 tests nuevos
   (253 en total, 96 % de cobertura en el módulo).
3. **API**: 12 endpoints, incluida la importación masiva desde CSV con validación estricta y
   reporte de errores fila a fila.
4. **Rutas**: `/repuestos/[marca]/[modelo]`, `/repuestos/[marca]/[modelo]/[categoria]` y
   `/referencia/[oem]`, con su sitemap propio.
5. **Ficha de producto**: tabla "Compatible con" enlazada a cada hub, más referencias OEM.
6. **Selector "¿Qué moto tienes?"** en el header y badge de compatibilidad, sin sacrificar el
   prerender estático de la ficha de producto.
7. **Buscador**: "pastillas nkd" encuentra el producto por su moto compatible y sus alias.

**La regla que lo gobierna todo:** solo se publica un fitment con `verified = true`. Un modelo
sin compatibilidades verificadas responde 404 y no entra al sitemap — nada de páginas por modelo
que solo cambian el nombre.

**Verificación:** end-to-end contra la base real con un fitment de prueba que se creó, se
comprobó y se borró. 42/42 en `pnpm seo:check`, type-check y lint limpios, 253 tests de dominio y
191 de API.

**Estado real (actualizado 2026-09-22):** 10 marcas y 41 modelos cargados. **55 fitments
verificados en 20 modelos**, confirmados por Santiago tras revisar los borradores de análisis —
ver [`compatibilidades-importadas-2026-09-22.md`](./compatibilidades-importadas-2026-09-22.md).
Quedan 21 modelos sin ninguna compatibilidad; se sigue cargando con la plantilla y el importador.

---

## Fase 3 — Datos estructurados ✅

**Terminada el 2026-09-22.** Detalle en [`03-datos-estructurados.md`](./03-datos-estructurados.md).

Se implementó todo lo planificado: utilidad JSON-LD tipada, `Organization` con NIT y perfiles
verificados, `WebSite` + `SearchAction`, `Product` completo con **`isAccessoryOrSparePartFor`**
construido desde los fitments verificados, `BreadcrumbList` en ficha y catálogo, `ItemList`,
`FAQPage` sobre el FAQ visible, y el validador `pnpm seo:schema` (47 comprobaciones) integrado en CI.

**Verificación:** 43/43 sin datos de compatibilidad y 47/47 con un fitment de prueba que se creó, se
comprobó y se borró. `brand`, `mpn` e `isAccessoryOrSparePartFor` se probaron en ambos sentidos
(presentes al cargar los datos, ausentes al vaciarlos).

**Lo que quedó fuera, a propósito:** `shippingRate` (H-13), `returnFees` (H-15), `LocalBusiness`
(H-10) y el `sameAs` de Mercado Libre, cuya URL en el brief devuelve 404 (H-12). Marcar lo que no se
puede sostener es peor que no marcarlo.

**Objetivo original:** que Google y los motores generativos entiendan qué es H2R, qué vende, con qué
motos es compatible cada repuesto y en qué condiciones lo entrega.

---

## Fase 4 — Conversión 🚧

**Primera entrega 2026-09-23** (detalle en [`04-conversion.md`](./04-conversion.md)): ítems 1, 2, 3, 4, 5 y 12 hechos — barra fija móvil, estimador de envío, botón de WhatsApp, bloque de confianza, umbral de envío gratis en `Settings` con barra de progreso y `SocialProof` alimentado solo desde `ProductReview` (sin reseñas reales no se muestra nada). **Segunda entrega 2026-09-23:** garantía unificada en 6 meses, umbral de $500.000 confirmado y leído de `Settings` en todo el sitio, campo "¿en qué moto lo instalaste?" en reseñas (migración pendiente de aplicar, H-43), GA4 con consentimiento (falta el ID, H-45) y páginas `/sobre-nosotros` y `/garantias`. **Tercera entrega 2026-09-24:** venta cruzada (ítem 7) implementada en `feat/cro-cross-selling-kits`, con sugerencias en ficha y carrito. Pendientes: aplicar su migración (H-47) y cargar los vínculos, e historia y equipo (H-44). **Cuarta entrega 2026-09-25:** kits de productos (ítem 8) implementados en `feat/product-kits`, con `/admin/kits` y páginas propias `/kits/[slug]`. Pendiente aplicar su migración (H-49) y armar los primeros kits (H-50). Con esto, todo el código de la Fase 4 está construido.

**Objetivo:** que cada visita tenga el camino más corto y confiable hacia la compra. Puede avanzar en
paralelo con la Fase 3.

**Ficha de producto**

1. **Barra fija de "Agregar al carrito"** en móvil al hacer scroll (fricción C1: la ficha es larga y
   el botón se queda arriba del todo).
2. **Estimador de envío por ciudad en la ficha.** El cotizador real ya existe
   (`ShippingQuoteCalculator` + Vendelo) pero solo en carrito y checkout; se lleva a la ficha, que es
   donde se decide la compra.
3. **Botón "Confirma compatibilidad por WhatsApp"** en el bloque de compra, con producto, SKU y moto
   seleccionada prellenados. La tabla y el badge de la Fase 2 ya lo llevan; falta junto al botón de
   comprar.
4. **Bloque de confianza**: medios de pago reales, garantía y datos de la empresa.

**Carrito y checkout**

5. **Umbral de envío gratis en `Settings`** con barra de progreso. Hoy los "$500.000" están escritos
   a mano en el acordeón de la ficha (fricción C5) y hay que confirmar si siguen vigentes (**H-14**).
6. Resumen con costo de envío antes del último paso — ya está resuelto en buena parte.

**Venta cruzada con sentido mecánico**

7. **"Normalmente se cambia junto con…"**, con reglas definidas por el negocio (**H-19**), no
   deducidas por el agente.
8. **Kits de mantenimiento por modelo** ("Kit NKD 125: aceite + filtro + bujía") con precio total
   visible. Depende de H-19 y de que haya compatibilidades cargadas (**H-02**).

**Reseñas**

9. **Campo "¿en qué moto lo instalaste?"** en el formulario poscompra, mostrado como "Le sirvió a una
   DR150 · Cali". Es compatibilidad generada por clientes reales: alimenta el sistema de la Fase 2
   desde el otro extremo.

**Legal y confianza**

10. **"Sobre nosotros"** con NIT y equipo, y **página de garantías** (fricción C6, **H-17**).

**Medición**

11. **Analítica de eventos.** Hoy solo hay Vercel Analytics (páginas vistas): no hay embudo medible.
    Requiere decidir si se instala GA4 (**H-11**).

**Pendiente de decisión del negocio desde la Fase 0**

12. **`SocialProof.tsx`** (**H-01**): los cuatro testimonios con nombre propio etiquetados "Cliente
    verificado" y las cifras "500+ clientes / 98 % recomendación", escritos a mano en el código.
    **Recomendación: alimentarlos desde `ProductReview`**, que ya tiene reseñas reales verificadas por
    compra.

**Criterio de salida:** flujo de compra móvil completo y medible, con `04-conversion.md` documentando
las métricas antes y después.

---

## Fase 5 — Contenido y E-E-A-T 🚧

**Primera entrega 2026-09-26** (rama `feat/phase5-reviewers-maintenance`): revisores técnicos administrables desde `/admin/revisores` con página pública `/autores/[slug]` (H-21), y guías de mantenimiento por modelo administrables desde `/admin/mantenimiento` con página pública `/guias/mantenimiento/[marca]/[modelo]` (H-20). Es el arranque del ítem 1 (infraestructura) y del ítem 2 (guías por modelo) de abajo, sin el modelo genérico de MDX. Pendiente aplicar su migración (H-51) y cargar los datos reales (H-52).

**Objetivo:** ser la fuente que Google y las IAs citan sobre repuestos de moto en Colombia.

**Orden obligatorio: primero la infraestructura, después los borradores.** Todo borrador lleva
`estado: borrador` y `revisor: pendiente`, y **no se publica sin revisión de alguien con conocimiento
mecánico** (**H-21**).

1. **Infraestructura de contenido**: modelo de datos o MDX, rutas `/guias/[slug]` y `/autores/[slug]`,
   estados de publicación, y autor y revisor técnico por pieza.
2. **Guías de mantenimiento por modelo** (`/guias/mantenimiento-[marca]-[modelo]`): tabla de
   intervalos (aceite, filtro, bujía, kit de arrastre, pastillas, llantas) con el repuesto exacto de
   H2R enlazado en cada fila. **Los intervalos salen del manual del fabricante o del revisor
   (H-20), nunca inventados, y se cita la fuente.**
3. **Costo anual de mantenimiento por modelo**, calculado desde los precios reales del catálogo, de
   modo que se actualice solo.
4. **Índice de Precios de Repuestos de Moto en Colombia**: página de datos generada desde el catálogo,
   con metodología explícita, fecha de corte y gráficos, actualizable por script cada semestre. **Es
   la pieza principal para enlaces de prensa y citas de IA.**
5. **Comparativas**: "original vs genérico", "{marca A} vs {marca B} de pastillas para {modelo}",
   "mejor aceite para moto de trabajo". Con criterios concretos y tablas.
6. **Guía de revisión técnico-mecánica**: qué revisan y qué repuestos la hacen fallar, enlazando a
   producto.
7. **Páginas de envío por ciudad** (Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Eje Cafetero):
   tiempos y costos reales, transportadora, y los repuestos más pedidos en esa zona **según los
   pedidos reales**. Si no hay datos suficientes para una ciudad, no se crea.
8. **Enlazado interno**: hub de modelo ↔ categorías ↔ productos ↔ guías. Ninguna página comercial a
   más de 3 clics del home, con reporte de páginas huérfanas.

**Formato para que las IAs lo citen:** cada página clave abre con una respuesta directa de 40 a 60
palabras, encabezados en forma de pregunta, tablas, datos verificables y fecha visible de "última
actualización".

**Criterio de salida:** infraestructura funcionando, y las guías de los 5 modelos top más el Índice de
Precios **publicados tras revisión humana**.

---

## Fase 6 — GEO 📋

**Objetivo:** que ChatGPT, Perplexity, Gemini y Copilot citen y recomienden H2R.

**Técnico (lo implemento yo)**

1. **Confirmar en producción** que los crawlers de IA reciben HTML completo, probando con `curl` por
   cada user-agent, y que ni la CDN ni el WAF los bloquean. En la Fase 0 salió bien; hay que repetirlo
   después de desplegar la Fase 1.
2. **`/llms.txt`** con la descripción de H2R, qué vende, cobertura, medios de pago y enlaces a hubs,
   guías, índice de precios y políticas. Es de bajo costo y **su adopción real por los motores no está
   confirmada**, así que no se le dedica más de lo necesario.
3. **Página "Por qué comprar en H2R"** con afirmaciones concretas y verificables, calculadas desde la
   base de datos siempre que se pueda — por ejemplo el número de referencias con compatibilidad
   verificada, que ya sabe contar `countVerified()` de la Fase 2.
4. **Coherencia de entidad**: mismo nombre, NIT, dirección, teléfono y descripción en todo el sitio y
   en el JSON-LD. La Fase 1 ya unificó el nombre; el resto se cierra con la Fase 3.

**Fuera del sitio (lo preparo yo, lo ejecuta el humano)** — en `docs/seo/geo/`:

5. **10 guiones de vídeo corto** (YouTube, TikTok, Reels) con título, descripción optimizada y enlace
   al producto: "cómo cambiar el kit de arrastre de la NKD 125", "original vs genérico: pastillas
   NMAX"…
6. **Plantillas de correo** para medios (lanzamiento del Índice de Precios), blogs de "dónde comprar
   repuestos de moto en Colombia" y talleres aliados.
7. **Guía de participación en comunidades** por modelo: tono, tipo de respuestas útiles y qué no hacer
   (spam).
8. **Checklist de perfiles de marca**: Google Business Profile (solo si hay punto físico), Bing Places,
   Merchant Center, Mercado Libre, Wikidata (solo si cumple los criterios de notabilidad) y
   directorios colombianos.

**Medición**

9. **`docs/seo/geo/prompts.md`** con 30 prompts reales de usuario y una plantilla de registro mensual:
   motor, si mencionó a H2R, posición y fuentes citadas.
10. **Segmento de tráfico desde IA** en la analítica (`chatgpt.com`, `perplexity.ai`,
    `gemini.google.com`, `copilot.microsoft.com`). Depende de **H-11**.

**Criterio de salida:** carpeta `geo/` completa y **línea base de la medición de prompts registrada**.
Sin línea base no hay forma de saber después si algo mejoró.

---

## Fase 7 — Merchant Center y feed 📋

**Objetivo:** aparecer en las fichas gratuitas de Google Shopping en Colombia.

1. **Feed de productos** (XML o TSV) con `id`, `title` siguiendo la fórmula
   "[Repuesto] [marca del repuesto] para [Marca] [Modelo] [cc]", `description`, `link`, `image_link`,
   `price` en COP, `availability`, `brand`, `mpn`, `condition`, `google_product_category`,
   `product_type` (marca > modelo > categoría) y datos de envío.
2. **Solo productos con stock, precio e imagen válidos.** Un feed con productos agotados o sin foto se
   rechaza entero.
3. El `product_type` por modelo sale de los fitments verificados de la Fase 2.

**Dependencias duras:** `brand` y `mpn` por producto (**H-18**) y tiempos de envío reales (**H-13**).
Sin ellas el feed se rechaza o sale incompleto. Crear la cuenta y activar las fichas gratuitas es
**H-09**.

**Criterio de salida:** feed válido según el validador de Merchant Center.

---

## Dependencias humanas, ordenadas por impacto

| Tarea | Bloquea | Si no llega |
|---|---|---|
| **H-02** compatibilidades verificadas | Publicar la Fase 2, kits de la 4, guías de la 5, `product_type` de la 7 | El sistema de compatibilidad no publica nada |
| **H-13** tiempos de envío reales | `OfferShippingDetails` (3), estimador (4), páginas de ciudad (5), feed (7) | Se omiten esos bloques |
| **H-18** marca, MPN y tipo de repuesto | `brand` y `mpn` (3), feed (7) | El feed de Merchant Center no es viable |
| **H-21** revisor técnico | Fase 5 entera | Los borradores no se publican |
| ~~**H-01** decisión sobre `SocialProof`~~ — resuelta 2026-09-23: se alimenta desde `ProductReview` | — | — |
| **H-11** decisión sobre GA4 | Medición de las fases 4 y 6 | No hay embudo ni segmento de IA medible |
| **H-12** perfiles oficiales | `sameAs` (3) | `Organization` sin perfiles |
| **H-15** política de devoluciones | `MerchantReturnPolicy` (3) | Se omite |
| **H-09** Merchant Center | Fase 7 | No se publica el feed |

---

*Última actualización: 2026-09-23*

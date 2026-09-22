# Tareas para el humano — SEO / GEO / CRO

Todo lo que el agente **no puede** hacer: decisiones de negocio, datos que no se pueden inventar, accesos a
plataformas externas y validaciones que exigen criterio mecánico.

**Regla:** ninguna de estas tareas se puede "resolver" generando datos plausibles. Una compatibilidad
equivocada genera devoluciones y destruye la confianza.

Estados: ⬜ pendiente · 🟡 en curso · ✅ hecho · ⛔ bloqueada

---

## Bloqueantes (frenan fases enteras)

| ID | Tarea | Bloquea | Estado |
|---|---|---|---|
| **H-01** | **Decidir qué hacer con `SocialProof.tsx`.** Hoy la home muestra 4 testimonios con nombre propio etiquetados "Cliente verificado" y las cifras "500+ clientes satisfechos / 1.200+ repuestos vendidos / 98% recomendación", todo escrito a mano en el código. ¿Son datos reales? Opciones: (a) confirmarlos con respaldo y dejarlos, (b) alimentar la sección desde `ProductReview` (reseñas reales verificadas por compra), (c) retirarlos. Riesgo legal: Ley 1480 de 2011, publicidad engañosa | Fase 4, Fase 5 | ⬜ |
| **H-02** | **Datos de compatibilidad verificados.** 🔴 **Ahora es LA tarea crítica del proyecto.** El sistema está construido y probado, pero con 0 compatibilidades no publica nada: los hubs dan 404 y el sitemap de modelos va vacío. Llenar la plantilla [`plantilla-compatibilidades.csv`](./plantilla-compatibilidades.csv) (`sku,marca_moto,modelo_moto,posicion,anio_desde,anio_hasta,fuente,notas,verificado`) y subirla a `POST /admin/fitments/import`. La **fuente** es obligatoria: sin ella el importador rechaza la fila | Fase 2 → publicar | ⬜ |
| **H-03** | **Referencias OEM** de los productos que las tengan (`sku,referencia_oem,fabricante`) | Fase 2, Fase 3 | ⬜ |
| **H-04** | **Confirmar la lista de modelos prioritarios** (ver también H-39) del brief (AKT NKD 125, Bajaj Boxer CT100, NMAX 155, XR190L, DR150, Pulsar NS/N, FZ, Hunk 125R, Apache, Raider) contra las ventas reales de H2R y los datos de Search Console | Fase 2, Fase 5 | ⬜ |
| **H-05** | **Dar acceso a Google Search Console** (o exportar consultas, páginas y URLs indexadas de los últimos 12 meses). Sin esto no se puede saber qué URLs tienen tráfico antes de cambiar rutas — regla 7 del brief | Fase 1, Fase 2 | ⬜ |

---

## Accesos y verificaciones en plataformas externas

| ID | Tarea | Fase | Estado |
|---|---|---|---|
| H-06 | Verificar el sitio en **Google Search Console** y enviar los sitemaps. **Pasos detallados en [`DESPLIEGUE.md`](./DESPLIEGUE.md) §4** | 1 | ⬜ |
| H-07 | Verificar el sitio en **Bing Webmaster Tools** y enviar los sitemaps (también habilita IndexNow). **Pasos en [`DESPLIEGUE.md`](./DESPLIEGUE.md) §5** | 1 | ⬜ |
| H-08 | Conseguir una **API key de PageSpeed Insights** (o dar acceso a los datos de campo CrUX) para medir el percentil 75 real desde Colombia | 1 | ⬜ |
| H-09 | Crear/configurar **Google Merchant Center** para Colombia y activar las fichas gratuitas | 7 | ⬜ |
| H-10 | Decidir si hay **punto físico atendiendo al público** en Carrera 21 #21-58, Bucaramanga. Si lo hay: crear **Google Business Profile** y **Bing Places**. Si no, no se crea (y el JSON-LD usa `Organization`, no `LocalBusiness`) | 3, 6 | ⬜ |
| H-11 | Decidir si se instala **GA4** (hoy solo hay Vercel Analytics, sin eventos). Sin analítica de eventos no se puede medir el embudo ni el tráfico desde IA | 4, 6 | ⬜ |
| H-12 | Confirmar los **perfiles oficiales** para `sameAs`: Instagram `h2r.onlinestore`, Facebook `h2ronlinestore`, TikTok `h2ronlinestore`, Mercado Libre `/pagina/h2ronlinestore/`. Pasar las URLs exactas | 3 | ⬜ |

---

## Datos de negocio que hay que confirmar (no se pueden inventar)

| ID | Tarea | Fase | Estado |
|---|---|---|---|
| H-13 | **Tiempos de envío reales por ciudad** (Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Eje Cafetero) con Coordinadora. Hoy la PDP dice "1 a 5 días hábiles" de forma genérica y el brief marca este punto como `TODO(humano)`. Se necesitan para `OfferShippingDetails` y para las páginas de envío por ciudad | 3, 4, 5 | ⬜ |
| H-14 | **Umbral de envío gratis**: hoy "$500.000 COP" está escrito a mano en el acordeón de la PDP. ¿Sigue vigente? Debe pasar a `Settings` para ser una única fuente de verdad | 4 | ⬜ |
| H-15 | **Política de devoluciones exacta** para `MerchantReturnPolicy`: días de retracto, quién paga el flete de devolución, condiciones. Hoy la PDP dice "5 días calendario" | 3, 4 | ⬜ |
| H-16 | ¿Existe la política **"si no le sirve a tu moto, te lo cambiamos"**? Solo se publica si es real | 4 | ⬜ |
| H-17 | **Garantía por tipo de producto** (baterías, llantas, eléctricos…): meses y condiciones | 3, 4, 5 | ⬜ |
| H-18 | **Marca y tipo de cada repuesto** (original / homologado / genérico) y su `mpn`. Necesario para el feed de Merchant Center y para el `Product` JSON-LD completo | 3, 7 | ⬜ |
| H-19 | **Reglas de venta cruzada con criterio mecánico** ("kit de arrastre + aceite de cadena", "pastillas + líquido de frenos"). Las define el negocio, no se deducen | 4 | ⬜ |
| H-20 | **Intervalos de mantenimiento** por modelo, tomados del manual del fabricante, con la fuente citada | 5 | ⬜ |
| H-21 | **Revisor técnico**: una persona con conocimiento mecánico que revise y firme las guías (nombre, foto, experiencia) para las páginas de autor y el E-E-A-T | 5 | ⬜ |
| H-22 | **Corregir el `altText` de los banners del hero** desde `/admin/banners`: hoy es una cadena de espacios. Es lo único que impide que la home llegue a SEO 100 — el resto de la Fase 1 ya está hecho | 1 | ⬜ |
| H-23 | ~~Decidir qué hacer con `/assets/video-hero-catalog.mp4` (30 MB)~~ — **resuelta en la Fase 1**: el original estaba en el repositorio, se recomprimió (87,8 MB → 3,7 MB, sin audio, 720p), se añadió un póster de 12 KB como elemento LCP y el vídeo ya no se descarga en móvil. Queda H-35 (revisar la calidad) | 1 | ✅ |
| H-24 | ~~Confirmar el dominio canónico~~ — **resuelta en la Fase 1**: se adoptó `https://www.tiendah2r.com` (sin barra final) como canónico, que es a donde ya redirigía el apex con un 308. Avisar si debe ser el apex | 1 | ✅ |

---

## Aprobaciones requeridas por el brief

| ID | Tarea | Estado |
|---|---|---|
| H-25 | **Aprobar la Fase 0** (`docs/seo/00-auditoria.md`) para poder empezar la Fase 1 | ⬜ |
| H-26 | Aprobar el **mapa de redirecciones 301** antes de mover las categorías de `?category=` a rutas propias (regla 6). No bloquea nada: los hubs de modelo no dependen de ello | ⬜ |
| H-27 | Aprobar la **Fase 2** (sistema de compatibilidad, `02-compatibilidad.md`) antes de pasar a la 3 y la 4 | ⬜ |
| H-28 | Autorizar cualquier **migración de Prisma en producción** antes de aplicarla. La de la Fase 2 (`20260922000000_motorcycle_fitment_system`) fue autorizada y aplicada el 2026-09-22 | ✅ |

---

## Tareas de ejecución fuera del sitio (Fase 6 — el agente prepara, el humano ejecuta)

| ID | Tarea | Estado |
|---|---|---|
| H-29 | Grabar y publicar los vídeos cortos a partir de los guiones de `docs/seo/geo/` | ⬜ |
| H-30 | Enviar los correos a medios y blogs con el Índice de Precios | ⬜ |
| H-31 | Participar en grupos y comunidades por modelo siguiendo la guía de tono | ⬜ |
| H-32 | Registrar mensualmente la medición de prompts de `docs/seo/geo/prompts.md` | ⬜ |

---

## Nuevas tras la Fase 1 (2026-09-22)

| ID | Tarea | Fase | Estado |
|---|---|---|---|
| **H-33** | **Verificar IndexNow tras el primer despliegue**: que `https://www.tiendah2r.com/57f804052944e876eedbd2eb22475f65.txt` responda 200 con la clave dentro, y que `INDEXNOW_KEY` y `SITE_URL` estén en la revisión de Cloud Run. Hasta entonces la API responde 403 y el servicio no avisa a nadie | 1 | ⬜ |
| **H-34** | **Reenviar los sitemaps** en Google Search Console y Bing Webmaster Tools: `/sitemap.xml` pasó de ser una lista a un índice, y hay tres sitemaps nuevos (`-paginas`, `-categorias`, `-productos`) | 1 | ⬜ |
| **H-35** | **Revisar el vídeo recomprimido del catálogo** en un escritorio real y confirmar que la calidad es aceptable. Si no lo es, se regenera con menos compresión desde el original, que sigue en el historial de git | 1 | ⬜ |
| **H-36** | **Medir Lighthouse en producción tras el despliegue** (`pnpm seo:lighthouse`) y pegar los resultados en `01-resultados.md` §4. Las cifras "después" de la Fase 1 no están confirmadas hasta entonces | 1 | ⬜ |

*Última actualización de este bloque: 2026-09-22*

---

## Nuevas tras la Fase 2 (2026-09-22)

| ID | Tarea | Fase | Estado |
|---|---|---|---|
| **H-37** | **Decidir si hace falta una pantalla en el panel** para gestionar compatibilidades, o si basta con subir el CSV a `POST /admin/fitments/import`. Hoy no hay interfaz gráfica para esto | 4 | ⬜ |
| **H-38** | **Revisar los textos libres de compatibilidad** que ya existen (`ProductCompatibilityItem`, el acordeón de la ficha) y decidir cuáles se convierten en fitments verificados. Hay que leer cada texto y decidir a qué modelo corresponde: no se puede automatizar sin riesgo de inventar compatibilidades | 2 | ⬜ |
| **H-39** | **Revisar la lista de 32 modelos** de `packages/database/prisma/motorcycles.ts`. Los 10 prioritarios salen del brief; los otros 22 los añadió el agente desde el mercado colombiano, sin confirmar contra las ventas reales. Un modelo mal escrito rompe la importación de CSV, que lo busca por ese nombre exacto | 2 | ⬜ |

*Última actualización de este bloque: 2026-09-22*

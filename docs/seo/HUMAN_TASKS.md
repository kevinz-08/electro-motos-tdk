# Tareas para el humano — SEO / GEO / CRO

Todo lo que el agente **no puede** hacer: decisiones de negocio, datos que no se pueden inventar, accesos a
plataformas externas y validaciones que exigen criterio mecánico.

**Regla:** ninguna de estas tareas se puede "resolver" generando datos plausibles. Una compatibilidad
equivocada genera devoluciones y destruye la confianza.

Estados: ⬜ pendiente · 🟡 en curso · ✅ hecho · ⛔ bloqueada

---

## Bloqueantes (frenan fases enteras)

| ID | Tarea | Bloquea | Estado |
| --- | --- | --- | --- |
| **H-01** | ~~**Decidir qué hacer con `SocialProof.tsx`**~~ — **resuelta el 2026-09-23**: se alimenta solo desde `ProductReview`; sin reseñas reales no se muestra nada. Detalle anterior: Hoy la home muestra 4 testimonios con nombre propio etiquetados "Cliente verificado" y las cifras "500+ clientes satisfechos / 1.200+ repuestos vendidos / 98% recomendación", todo escrito a mano en el código. ¿Son datos reales? Opciones: (a) confirmarlos con respaldo y dejarlos, (b) alimentar la sección desde `ProductReview` (reseñas reales verificadas por compra), (c) retirarlos. Riesgo legal: Ley 1480 de 2011, publicidad engañosa | Fase 4, Fase 5 | ✅ |
| **H-02** | **Datos de compatibilidad verificados.** 🟡 **En marcha.** El 2026-09-22 se cargaron 55 fitments verificados (20 modelos con hub publicado) a partir de los dos CSV de borrador, confirmados por Santiago — ver [`compatibilidades-importadas-2026-09-22.md`](./compatibilidades-importadas-2026-09-22.md). Quedan **21 modelos del catálogo (41 en total) sin ninguna compatibilidad**: seguir cargando desde **`/admin/compatibilidades`** (importador CSV con la plantilla descargable) o desde el formulario de cada producto | Fase 2 → publicar | 🟡 |
| **H-03** | **Referencias OEM** de los productos que las tengan (`sku,referencia_oem,fabricante`) | Fase 2, Fase 3 | ⬜ |
| **H-04** | ~~Confirmar la lista de modelos prioritarios~~ — **confirmada el 2026-09-22**: sigue siendo correcta (AKT NKD 125, Bajaj Boxer CT100, NMAX 155, XR190L, DR150, Pulsar NS/N, FZ, Hunk 125R, Apache, Raider) | Fase 2, Fase 5 | ✅ |
| **H-05** | ~~Dar acceso a Google Search Console~~ — **resuelta el 2026-09-22**: línea base capturada en `docs/seo/baseline/` (133 clics, 1.470 impresiones, 35 páginas indexadas, 16 meses). Confirma que la gente ya busca por modelo de moto y que el riesgo de perder tráfico existente con la Fase 1 es mínimo | Fase 1, Fase 2 | ✅ |

---

## Accesos y verificaciones en plataformas externas

| ID | Tarea | Fase | Estado |
| --- | --- | --- | --- |
| H-06 | Verificar el sitio en **Google Search Console** y enviar los sitemaps. **Pasos detallados en [`DESPLIEGUE.md`](./DESPLIEGUE.md) §4** | 1 | ✅ (2026-09-24: sitemaps enviados) |
| H-07 | Verificar el sitio en **Bing Webmaster Tools** y enviar los sitemaps (también habilita IndexNow). **Pasos en [`DESPLIEGUE.md`](./DESPLIEGUE.md) §5** | 1 | ✅ (2026-09-24: sitemaps enviados) |
| H-08 | Conseguir una **API key de PageSpeed Insights** (o dar acceso a los datos de campo CrUX) para medir el percentil 75 real desde Colombia | 1 | ⬜ |
| H-09 | Crear/configurar **Google Merchant Center** para Colombia y activar las fichas gratuitas | 7 | ⬜ |
| H-10 | ~~Decidir si hay punto físico~~ — **confirmado el 2026-09-22**: sí hay, en Carrera 21 #21-58, Bucaramanga, y se pueden recoger pedidos ahí. El JSON-LD ya declara `LocalBusiness` además de `Organization`. **Falta la parte externa** (ver H-41, H-42 más abajo) | 3, 6 | 🟡 |
| H-11 | ~~Decidir si se instala GA4~~ — **decidido el 2026-09-23: se instala.** Código listo; falta crear la propiedad y poner `NEXT_PUBLIC_GA_ID` (ver H-45). Antes: Decidir si se instala **GA4** (hoy solo hay Vercel Analytics, sin eventos). Sin analítica de eventos no se puede medir el embudo ni el tráfico desde IA | 4, 6 | ✅ (decisión; la ejecución sigue en H-45) |
| H-12 | ~~Confirmar los perfiles oficiales para `sameAs`~~ — **cerrada el 2026-09-22**: Instagram, Facebook y TikTok ya están y verificados. Se decidió **no incluir Mercado Libre por ahora** (la URL del brief daba 404 de todos modos) | 3 | ✅ |

---

## Datos de negocio que hay que confirmar (no se pueden inventar)

| ID | Tarea | Fase | Estado |
| --- | --- | --- | --- |
| H-13 | ~~Tiempos de envío reales por ciudad~~ — **aceptado el 2026-09-22**: el tiempo global de `Settings` (2 a 5 días hábiles) se confirma como aproximado real y suficiente por ahora. **Corregido el 2026-09-28 (H-60): 1–2 días en Bucaramanga, 3–7 en el resto del país.** Queda abierta la granularidad por ciudad (Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Eje Cafetero) como mejora futura para las páginas de envío por ciudad de la Fase 5, no bloqueante | 3, 4, 5 | ✅ |
| H-14 | ~~**Umbral de envío gratis**~~ — **confirmado el 2026-09-23: $500.000.** Ya vive en `Settings` (`FREE_SHIPPING_THRESHOLD`) y todos los textos lo leen de ahí. Antes: **Umbral de envío gratis**: hoy "$500.000 COP" está escrito a mano en el acordeón de la PDP. ¿Sigue vigente? Debe pasar a `Settings` para ser una única fuente de verdad | 4 | ✅ |
| H-15 | ~~Política de devoluciones exacta~~ — **confirmada el 2026-09-22**: siguen siendo 5 días calendario. El flete de devolución se evalúa caso por caso por WhatsApp según la gravedad (a veces cliente, a veces H2R) — no es un valor fijo, así que el JSON-LD sigue sin declarar `returnFees` a propósito (ver el comentario en `structured-data.ts`) | 3, 4 | ✅ |
| H-16 | ~~¿Existe la política "si no le sirve a tu moto, te lo cambiamos"?~~ — **confirmado el 2026-09-22: NO existe.** No se publicó nunca y no hay que agregarla en ningún lado (FAQ, ficha, JSON-LD) | 4 | ✅ |
| H-17 | ~~Garantía por tipo de producto~~ (reconfirmado 2026-09-23: **"hasta 6 meses"** en todo el sitio; se corrigieron el footer y `TrustBadges`, que decían "1 año") — **confirmado el 2026-09-22**: el "hasta 6 meses" genérico que ya dice la home es correcto, no hace falta desglosar por categoría | 3, 4, 5 | ✅ |
| H-18 | **Marca y tipo de cada repuesto** (original / homologado / genérico) y su `mpn`. Necesario para el feed de Merchant Center y para el `Product` JSON-LD completo. **Desde el 2026-09-28 se carga desde el panel:** `/admin/merchant` → "Plantilla" (sale con los 134 productos) → completar en Excel → "Subir CSV"; o uno a uno en el formulario del producto. Sin la marca, el producto no entra al feed (hoy: 0 de 134) | 3, 7 | ⬜ |
| H-19 | **Reglas de venta cruzada con criterio mecánico** ("kit de arrastre + aceite de cadena", "pastillas + líquido de frenos"). Las define el negocio, no se deducen. **Código listo (2026-09-24/25)**: venta cruzada y kits implementados; las reglas se cargan desde el panel (H-48, H-50) | 4 | 🟡 |
| H-20 | **Intervalos de mantenimiento** por modelo, tomados del manual del fabricante, con la fuente citada. **Cambia de enfoque (2026-09-26):** ya no se entregan en un documento; el administrador los carga en `/admin/mantenimiento` (la fuente es obligatoria para guardar). Falta cargarlos (H-52) | 5 | 🟡 |
| H-21 | **Revisor técnico**: una persona con conocimiento mecánico que revise y firme las guías (nombre, foto, experiencia) para las páginas de autor y el E-E-A-T. **Cambia de enfoque (2026-09-26):** el administrador lo registra, con foto, en `/admin/revisores`. Falta registrarlo (H-52) | 5 | 🟡 |
| H-22 | **Corregir el `altText` de los banners del hero** desde `/admin/banners`: hoy es una cadena de espacios. Es lo único que impide que la home llegue a SEO 100 — el resto de la Fase 1 ya está hecho | 1 | ✅ (2026-09-24: corregido) |
| H-23 | ~~Decidir qué hacer con `/assets/video-hero-catalog.mp4` (30 MB)~~ — **resuelta en la Fase 1**: el original estaba en el repositorio, se recomprimió (87,8 MB → 3,7 MB, sin audio, 720p), se añadió un póster de 12 KB como elemento LCP y el vídeo ya no se descarga en móvil. Queda H-35 (revisar la calidad) | 1 | ✅ |
| H-24 | ~~Confirmar el dominio canónico~~ — **resuelta en la Fase 1**: se adoptó `https://www.tiendah2r.com` (sin barra final) como canónico, que es a donde ya redirigía el apex con un 308. Avisar si debe ser el apex | 1 | ✅ |

---

## Aprobaciones requeridas por el brief

| ID | Tarea | Estado |
| --- | --- | --- |
| H-25 | ~~Aprobar la Fase 0~~ — **aprobada** | ✅ |
| H-26 | Aprobar el **mapa de redirecciones 301** antes de mover las categorías de `?category=` a rutas propias (regla 6). No bloquea nada: los hubs de modelo no dependen de ello | ⬜ |
| H-27 | ~~Aprobar la Fase 2~~ — **aprobada** | ✅ |
| H-28 | Autorizar cualquier **migración de Prisma en producción** antes de aplicarla. La de la Fase 2 (`20260922000000_motorcycle_fitment_system`) fue autorizada y aplicada el 2026-09-22. También aplicadas: H-43, H-47, H-49 y H-51 | ✅ |

---

## Tareas de ejecución fuera del sitio (Fase 6 — el agente prepara, el humano ejecuta)

| ID | Tarea | Estado |
| --- | --- | --- |
| H-29 | Grabar y publicar los vídeos cortos a partir de los guiones de [`geo/guiones-video.md`](./geo/guiones-video.md) (10 listos; el revisor confirma los `[VERIFICAR]` antes de grabar) | ⬜ |
| H-30 | Enviar los correos a medios, blogs, talleres y marcas con las plantillas de [`geo/correos.md`](./geo/correos.md). El de medios espera al primer corte publicado del índice (H-55) | ⬜ |
| H-31 | Participar en grupos y comunidades por modelo siguiendo [`geo/comunidades.md`](./geo/comunidades.md) | ⬜ |
| H-32 | Registrar mensualmente la medición de prompts de [`geo/prompts.md`](./geo/prompts.md) (30 prompts × 4 motores). **La primera medición es la línea base y el criterio de salida de la Fase 6**: hacerla antes de desplegar `feat/seo-geo-cro`. **Línea base aproximada registrada el 2026-09-28:** H2R aparece en ~6–7 de 30 prompts en promedio; ChatGPT es donde más aparece, Gemini ~2 de 30 y Copilot 0 (medición parcial). Desde octubre, medición abreviada de 10 prompts (~20 min, ver `geo/prompts.md`) y completa cada 3 meses | 🟡 |

---

## Nuevas tras la Fase 1 (2026-09-22)

| ID | Tarea | Fase | Estado |
| --- | --- | --- | --- |
| **H-33** | ~~Verificar IndexNow~~ — **resuelta el 2026-09-22**: `https://www.tiendah2r.com/57f804052944e876eedbd2eb22475f65.txt` responde 200 con la clave | 1 | ✅ |
| **H-34** | **Reenviar los sitemaps** en Google Search Console y Bing Webmaster Tools: `/sitemap.xml` pasó de ser una lista a un índice, y hay tres sitemaps nuevos (`-paginas`, `-categorias`, `-productos`) | 1 | ✅ (2026-09-24: reenviados en Search Console y Bing) |
| **H-35** | **Revisar el vídeo recomprimido del catálogo** en un escritorio real y confirmar que la calidad es aceptable. Si no lo es, se regenera con menos compresión desde el original, que sigue en el historial de git | 1 | ⬜ |
| **H-36** | ~~Medir Lighthouse en producción tras el despliegue~~ — **medido el 2026-09-25, dos rondas.** Cuatro hallazgos en [`01-resultados.md`](./01-resultados.md): (1) el SEO 92 no era H-22 sino un enlace no descriptivo del aviso de cookies de GA4 — corregido, SEO 100 confirmado; (2) el LCP de home era el pop-up promocional y no el hero: un simple retraso no basta porque el LCP se mide hasta la primera interacción real, así que ahora espera al primer scroll o a 4 s — corregido; (3) `/catalogo` precargaba los 5 banners de categoría en vez de solo el primero — corregido; (4) el `Render Delay` y el TBT de producto empeoraron, compatible con el crecimiento de JS de las fases 3 y 4, sin causa confirmada: necesita perfilado con DevTools. **Falta remedir tras desplegar la segunda ronda** | 1 | 🟡 |

*Última actualización de este bloque: 2026-09-25*

---

## Nuevas tras la Fase 2 (2026-09-22)

| ID | Tarea | Fase | Estado |
| --- | --- | --- | --- |
| **H-37** | **Decidir si hace falta una pantalla en el panel** para gestionar compatibilidades, o si basta con subir el CSV a `POST /admin/fitments/import`. Hoy no hay interfaz gráfica para esto | 4 | ✅ Construida 2026-09-26: `/admin/compatibilidades` + editor en el formulario de producto |
| **H-38** | **Revisar los textos libres de compatibilidad** que ya existen (`ProductCompatibilityItem`, el acordeón de la ficha) y decidir cuáles se convierten en fitments verificados. Hay que leer cada texto y decidir a qué modelo corresponde: no se puede automatizar sin riesgo de inventar compatibilidades | 2 | ⬜ |
| **H-39** | ~~Revisar la lista de 32 modelos~~ — **avanzada el 2026-09-22**: se dieron de alta 2 marcas y 9 modelos más (41 en total) al cruzar las notas de compatibilidad ya escritas contra el catálogo. Sigue pendiente confirmar los 10 prioritarios del brief contra ventas reales (H-04) y el caso "DINAMIC" (¿es la AKT Dynamic 125 o una moto distinta? — llanta de 12", evidencia contradictoria, sin resolver a propósito) | 2 | 🟡 |
| **H-41** | **Crear Google Business Profile** para el punto físico de Carrera 21 #21-58, Bucaramanga (confirmado H-10). Pasos: [business.google.com](https://business.google.com) → agregar negocio → verificar dirección (Google manda un código por correo postal o llamada) → activar "recogida en tienda" | 6 | ⬜ |
| **H-42** | **Crear Bing Places** para el mismo punto físico. Pasos: [bingplaces.com](https://www.bingplaces.com) → puede importarse directo desde Google Business Profile una vez creado (H-41) | 6 | ⬜ |
| **H-40** | Falta invalidar la caché de Next tras importar compatibilidades (`revalidateTag('fitments')`). **Se autocorrigió sola por TTL** el 2026-09-22 (selector y `sitemap-modelos.xml` ya muestran los 20 modelos). Sigue pendiente el arreglo de fondo: cuando exista pantalla de admin (H-37), que llame a `revalidateAdminCache(['fitments'])` tras cada import — si no, cada carga futura tarda hasta 1h en verse | 2, 4 | ✅ Resuelto 2026-09-26: toda escritura desde el panel invalida `fitments` y `products` |

*Última actualización de este bloque: 2026-09-22*

---

## Nuevas tras las fases 3, 4 y 5 (2026-09-23 a 2026-09-26)

| ID | Tarea | Fase | Estado |
| --- | --- | --- | --- |
| **H-43** | **Aplicar la migración `20260923000000_review_installed_motorcycle`** (reseñas: "¿en qué moto lo instalaste?") con `pnpm --filter @h2r/database migrate:deploy`. Es aditiva y reversible (rollback en el propio SQL). **Hasta que se aplique, `pnpm build` de la web falla** con `ColumnNotFound` al prerenderizar las fichas. **Aplicada y confirmada el 2026-09-25** (`prisma migrate status` → "Database schema is up to date") | 4 | ✅ |
| **H-44** | **Historia, fundadores y equipo para /sobre-nosotros.** Las redes son ilegibles sin sesión, así que la página solo lleva datos ya confirmados. Pegar aquí (o en un archivo) la bio de Instagram/Facebook/TikTok, año de fundación, quiénes son, y fotos si las hay. Con eso se amplía la página | 4, 5 | ⬜ |
| **H-45** | **GA4:** crear la propiedad y el flujo web, copiar el ID `G-XXXXXXXXXX` a `NEXT_PUBLIC_GA_ID` (Vercel + `.env.local`), marcar `purchase` como conversión, y verificar en DebugView que salen `view_item → add_to_cart → view_cart → begin_checkout → purchase`. Pasos en `04-conversion.md`. **Avance detectado el 2026-09-26:** el ID `G-27M2WKZ9WF` ya está en el bundle de producción (la variable está configurada). Falta confirmar en GA4 que `purchase` está marcado como conversión y ver el embudo en DebugView | 4, 6 | 🟡 |
| **H-46** | **Reglas de venta cruzada (H-19)**: lista de pares "si compra A, ofrecer B" y de kits por modelo. Explicación y plantilla en `04-conversion.md` | 4 | ✅ Implementado: venta cruzada 2026-09-24, kits 2026-09-25 (`/admin/kits`). Falta cargar datos (H-48, H-50) |
| **H-47** | **Aplicar la migración `20260924000000_product_cross_sell`** (tabla de venta cruzada) con `pnpm --filter @h2r/database migrate:deploy`. Aditiva y reversible (`DROP TABLE "ProductCrossSell"`). Sin ella la ficha y el carrito funcionan pero sin el bloque, y el editor del admin muestra un error de carga. **Aplicada y confirmada el 2026-09-25** | 4 | ✅ |
| **H-48** | **Cargar los vínculos de venta cruzada** desde el formulario de cada producto (buscar producto, motivo opcional, casilla de sentido inverso). Empezar por los pares evidentes: kit de arrastre ↔ aceite de cadena, pastillas ↔ líquido de frenos | 4 | ⬜ |
| **H-49** | **Aplicar la migración `20260925000000_product_kits`** (tablas `Kit`/`KitItem`) con `pnpm --filter @h2r/database migrate:deploy`. Aditiva y reversible (`DROP TABLE "KitItem"; DROP TABLE "Kit";`). Sin ella, `/admin/kits` funciona pero no lista nada, y las páginas públicas se sirven sin el bloque de kits. **Aplicada y confirmada el 2026-09-25** | 4 | ✅ |
| **H-50** | **Armar los primeros kits** desde `/admin/kits`: nombre, productos con cantidad, descuento opcional y el modelo de moto si aplica. Empezar por los que ya sugiere el ROADMAP: "Kit NKD 125: aceite + filtro + bujía" | 4 | ⬜ |
| **H-51** | **Aplicar la migración `20260925120000_phase5_reviewers_maintenance`** (tablas `TechnicalReviewer`, `MaintenanceGuide`, `MaintenanceItem`) con `pnpm --filter @h2r/database migrate:deploy`. Aditiva y reversible (rollback en el propio SQL). Sin ella `/admin/revisores` y `/admin/mantenimiento` no funcionan y las páginas públicas se sirven sin guías. **Aplicada y confirmada el 2026-09-25** (`_prisma_migrations`: terminada 21:18 UTC, sin rollback; `prisma migrate status` → "Database schema is up to date"; tablas creadas y vacías) | 5 | ✅ |
| **H-52** | **Registrar al revisor técnico y cargar las guías.** (1) `/admin/revisores/nuevo`: nombre, foto, años de experiencia y trayectoria. (2) `/admin/mantenimiento`: por cada modelo, revisor, **fuente** (manual del fabricante o taller), fecha y los intervalos reales. Empezar por los 5 modelos prioritarios (AKT NKD 125, Bajaj Boxer CT100, NMAX 155, XR190L, DR150). Nada se inventa: sin fuente no se puede guardar | 5 | ⬜ |
| **H-53** | **Páginas de envío por ciudad (Fase 5, ítem 7) — pospuestas el 2026-09-26.** El ROADMAP exige mostrar "los repuestos más pedidos en esa zona según los pedidos reales" y no crear la página si no hay datos; hoy hay 12 pedidos válidos en total. Retomar cuando haya volumen suficiente por ciudad (orientativo: ≥ 30 pedidos entregados en esa ciudad) | 5 | ⛔ |
| **H-54** | **Aplicar la migración `20260926000000_phase5_content`** (tablas `Article` y `PriceIndexSnapshot`, enums `ArticleStatus`/`ArticleKind`) con `pnpm --filter @h2r/database migrate:deploy`. Aditiva y reversible (rollback en el propio SQL). Sin ella, `/admin/guias` avisa que falta y no deja crear artículos, `/guias/[slug]` responde 404 y el Índice de Precios no se puede generar; el resto del sitio funciona igual **Aplicada y confirmada el 2026-09-28** (`_prisma_migrations`: terminada 17:22 UTC, sin rollback; `migrate status` up to date; tablas, enums, CHECK, FK e índices verificados; `migrate diff` vacío) | 5 | ✅ |
| **H-55** | **Primer corte del Índice de Precios** (tras H-54): (1) corregir la errata "Motores de Arraque" en `/admin/categorias`; (2) `/admin/indice-precios` → "Generar corte de hoy"; (3) revisar la tabla buscando precios mal cargados (en la simulación: máximo de Reguladores $380.000 frente a mediana $95.000, máximo de CDI $350.000, mínimo de Accesorios Generales $7.000); (4) "Revisé las cifras: publicar". **Decidido el 2026-09-28: opción C** — las subcategorías que son marcas (Liquimoly y Castrol bajo Aceites; SKY, Kontrol y Dunlop bajo Llantas) se suman a su categoría padre, ya implementado; si crean otra categoría de marca, marcar "Es una marca" en `/admin/categorias`. Simulación del 2026-09-28: 134 productos, 10 categorías publicables, con Llantas y Aceites | 5 | ⬜ |
| **H-56** | **Revisar y publicar los tres borradores** de [`borradores/`](./borradores/README.md) (revisión técnico-mecánica, original vs genérico, aceite para moto de trabajo). El revisor confirma o corrige todo lo marcado `[VERIFICAR]` (normas y plazos de la RTM, profundidad mínima de labrado, JASO/API…), borra las marcas y se cargan en `/admin/guias` con su nombre y la fecha de revisión. Requiere H-54 y el revisor registrado (H-52) | 5 | ⬜ |
| **H-57** | **Registrar el feed en Merchant Center** (tras H-09): Productos → Fuentes → "Obtención programada" con `https://www.tiendah2r.com/feeds/google-merchant.xml`, diaria; configurar envíos (2–5 días hábiles, gratis desde $500.000) y devoluciones (5 días) a nivel de cuenta y activar "Fichas gratuitas". Pasos completos en [`07-feed.md`](./07-feed.md). Tiene sentido después de H-18 (hoy el feed está vacío) | 7 | ⬜ |
| **H-58** | **GA4: crear las dimensiones personalizadas `ai_source` y `landing_page`** (ámbito Evento) y la exploración "Tráfico desde IA". Pasos en [`geo/medicion-trafico-ia.md`](./geo/medicion-trafico-ia.md) | 6 | ⬜ |
| **H-59** | **Tras desplegar `feat/seo-geo-cro`: solicitar la indexación** de `https://www.tiendah2r.com/` y `/sobre-nosotros` en Search Console (Inspección de URL → Solicitar indexación). A las 2 y a las 4 semanas, en Rendimiento → Consultas, filtrar "tienda h2r" / "h2r" y ver qué página recibe las impresiones. Si al mes sigue saliendo `/sobre-nosotros`, adelantar Google Business Profile (H-41). **Hacerla después del despliegue del favicon cuadrado (2026-09-28)**: así Google actualiza en la misma pasada el título, la descripción y el logo del resultado, que hoy muestra un globo genérico | 1 | ⬜ |
| **H-60** | ~~Unificar los tiempos de envío que dice el sitio~~ — **resuelta el 2026-09-28**: el dato real es **1 a 2 días hábiles en Bucaramanga y área metropolitana, 3 a 7 en el resto de Colombia**, y **Addi sigue activo** (se coordina con un asesor por WhatsApp). La estimación general del sitio (ficha, JSON-LD de envío, `/llms.txt`, "Por qué comprar") pasa a 3–7 (default de `SHIPPING_ETA_*`, editable en `/admin/configuracion`) y los textos nombran también el plazo de Bucaramanga | 4, 6 | ✅ |

*Última actualización de este bloque: 2026-09-28*

# Roadmap SEO / GEO / CRO — H2R Online Store

Estado de las fases definidas en [`AGENT-BRIEF.md`](./AGENT-BRIEF.md).
Orden de ejecución: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. Las fases 3 y 4 pueden avanzar en paralelo una vez
terminada la 2. **Las fases 0 y 2 requieren aprobación explícita antes de continuar.**

| Fase | Nombre | Estado | Entregable | Puerta |
|---|---|---|---|---|
| **0** | Auditoría | ✅ Terminada (2026-09-22) | [`00-auditoria.md`](./00-auditoria.md) | ✅ Aprobada |
| **1** | Base técnica de SEO | ✅ **Terminada** (2026-09-22) | [`01-resultados.md`](./01-resultados.md) | ⏳ Pendiente de desplegar y volver a medir (H-36) |
| **2** | Sistema de compatibilidad | ✅ **Terminada** (2026-09-22) | [`02-compatibilidad.md`](./02-compatibilidad.md) | 🔴 **Esperando aprobación — y bloqueada por H-02 para publicar** |
| 3 | Datos estructurados | 🔜 Siguiente | `03-datos-estructurados.md` | — |
| 4 | Conversión | ⬜ No iniciada | `04-conversion.md` | — |
| 5 | Contenido y E-E-A-T | ⬜ No iniciada | `05-contenido.md` | — |
| 6 | GEO | ⬜ No iniciada | `06-geo.md`, `geo/` | — |
| 7 | Merchant Center y feed | ⬜ No iniciada | `07-feed.md` | — |

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

**Estado real:** 8 marcas y 32 modelos cargados, **0 compatibilidades**. Mientras no lleguen los
datos de H-02, el sistema está completo pero no publica nada. Es lo correcto: no se inventan
compatibilidades.

---

## Fases 3 a 7 ⬜

Detalladas en el brief. Se planifican al cerrar la Fase 2.

---

*Última actualización: 2026-09-22*

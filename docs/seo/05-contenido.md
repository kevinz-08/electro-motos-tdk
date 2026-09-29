# Fase 5 — Contenido y E-E-A-T

**Estado:** código completo (2026-09-26, rama `feat/seo-geo-cro`). **No publicable todavía**: faltan la migración
(H-54), el revisor técnico y los datos reales (H-52), el primer corte del índice (H-55) y la revisión de los
borradores (H-56). Detalle técnico en `HISTORIAL_TECNICO.md` §170 y §172–§179 y en el README §26.9–§26.10.

**Objetivo:** ser la fuente que Google y las IAs citan sobre repuestos de moto en Colombia.

---

## Qué se construyó, por ítem del ROADMAP

| # | Ítem | Estado | Dónde |
|---|---|---|---|
| 1 | Infraestructura de contenido | ✅ Código | `Article` en BD, `/admin/guias`, `/guias`, `/guias/[slug]`, `/autores/[slug]` |
| 2 | Guías de mantenimiento por modelo | ✅ Código · ⏳ datos (H-52) | `/admin/mantenimiento`, `/guias/mantenimiento/[marca]/[modelo]` |
| 3 | Costo anual de mantenimiento | ✅ Código · ⏳ datos (H-52) | Calculadora en cada guía de mantenimiento |
| 4 | Índice de Precios | ✅ Código · ⏳ primer corte (H-55) | `/admin/indice-precios`, `/indice-precios-repuestos-moto` |
| 5 | Comparativas | 🟡 2 borradores · ⏳ revisión (H-56) | `docs/seo/borradores/` |
| 6 | Guía de revisión técnico-mecánica | 🟡 Borrador · ⏳ revisión (H-56) | `docs/seo/borradores/` |
| 7 | Páginas de envío por ciudad | ⛔ Pospuesto (H-53) | 12 pedidos válidos: no hay datos por ciudad |
| 8 | Enlazado interno | ✅ Hecho y medido | `pnpm seo:links`, `/repuestos`, subcategorías, footer |

## Reglas que el sistema hace cumplir (no dependen de la disciplina de nadie)

- **Nada se publica sin revisor técnico activo y fecha de revisión** — en guías de mantenimiento, artículos (dominio +
  `CHECK` en la base) e índice (se publica a mano tras revisar las cifras).
- **Nada se inventa:** intervalos con fuente obligatoria, sin kilometraje por defecto en la calculadora, índice con muestra
  mínima de 5 referencias por categoría, borradores con marcas `[VERIFICAR]`.
- **Formato citable:** respuesta directa de 40–60 palabras (validada por el dominio en artículos), encabezados en forma de
  pregunta, tablas, fuentes visibles, fecha de revisión y de actualización a la vista, JSON-LD con `reviewedBy`,
  `lastReviewed`, `citation` y `Dataset`.
- **Markdown sin HTML:** el cuerpo de los artículos se interpreta en el dominio y se pinta como React; un texto pegado no
  puede inyectar scripts.

## Medición

**Enlazado interno (`pnpm seo:links`):**

| | Producción (antes, 2026-09-26) | Build local (después) |
|---|---|---|
| URLs en sitemaps | 216 | 240 |
| Comerciales a más de 3 clics | 69 | **0** |
| Comerciales huérfanas | 24 (subcategorías) | **0** |
| Enlaces rotos | 0 | 0 |
| Profundidad máxima | 5 | **3** |

**Índice de Precios — simulación sobre el catálogo real (solo lectura, 2026-09-26):** 133 productos, 11 categorías con
muestra suficiente, 14 sin ella. Antes del primer corte, el negocio debe decidir sobre las categorías que son marcas
(SKY, Liquimoly, Kontrol) — H-55.

## Criterio de salida (del ROADMAP) y qué falta para cumplirlo

> Infraestructura funcionando, y las guías de los 5 modelos top más el Índice de Precios publicados tras revisión humana.

1. **H-54** — aplicar la migración `20260926000000_phase5_content`.
2. **H-52** — registrar al revisor y cargar las guías de AKT NKD 125, Bajaj Boxer CT100, NMAX 155, XR190L y DR150.
3. **H-55** — primer corte del índice, revisado y publicado.
4. **H-56** — revisar y publicar los borradores (no es parte del criterio de salida, pero sí del ítem 5–6).

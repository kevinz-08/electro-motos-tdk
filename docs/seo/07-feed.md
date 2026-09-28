# Fase 7 — Merchant Center y feed

**Estado:** código completo (2026-09-28, rama `feat/seo-geo-cro`). **El feed sale vacío hasta cargar la marca de los
repuestos (H-18)**: hoy los 134 productos la tienen vacía. Detalle técnico en `HISTORIAL_TECNICO.md` §182–§183.

**Objetivo:** aparecer en las fichas gratuitas de Google Shopping en Colombia.

## Qué se construyó

| # | Ítem del ROADMAP | Estado | Dónde |
|---|---|---|---|
| — | Poder cargar marca y MPN (no existía forma) | ✅ | Formulario de producto → "Identificación del repuesto"; CSV masivo en `/admin/merchant` |
| 1 | Feed de productos | ✅ | `https://www.tiendah2r.com/feeds/google-merchant.xml` (RSS 2.0 con `g:`) |
| 2 | Solo productos con stock, precio e imagen válidos | ✅ | `evaluateMerchantProduct` (dominio); excluidos y motivos en `/admin/merchant` |
| 3 | `product_type` por modelo desde las compatibilidades verificadas | ✅ | "Marca > Modelo > Categoría" |
| — | Validación antes de Google | ✅ | `pnpm seo:feed` |

**Campos de cada producto:** `id` (SKU), `title` ("[Repuesto] [marca] para [Marca Modelo cc]", sin MAYÚSCULAS excesivas
porque Google las rechaza), `description` (texto plano), `link`, `image_link` + hasta 10 `additional_image_link` (JPEG
900 px), `availability`, `price` / `sale_price` (con precio ancla), `condition`, `brand`, `mpn` o
`identifier_exists=no`, `google_product_category` (ID oficial de la taxonomía de Google, por categoría del catálogo) y
`product_type`.

**Envío y devoluciones no van en el feed:** se configuran una vez a nivel de cuenta en Merchant Center (abajo). Así un
cambio de tarifa no obliga a tocar el código.

## Simulación con el catálogo real (2026-09-28, solo lectura)

- **Hoy:** 0 productos en el feed — 134 sin marca, 10 de ellos además agotados.
- **Con la marca cargada:** entrarían **124** productos, en 10 categorías de Google (46 en sistema eléctrico, 17 en
  luces, 13 aceites, 11 llantas…). Los que no tengan MPN entran con aviso: Google puede limitar su visibilidad.

## Configurar Merchant Center (H-09 + H-57)

1. **Crear la cuenta** en merchants.google.com con el correo de la empresa. País: Colombia; moneda: COP.
2. **Verificar y reclamar el sitio** `https://www.tiendah2r.com`: la forma más rápida es con la misma cuenta de Google que
   ya tiene Search Console verificado (H-06).
3. **Información del negocio:** nombre "H2R Online Store", dirección y teléfono **exactamente** como en
   `geo/perfiles-marca.md`.
4. **Envíos** (configuración de la cuenta): Colombia; tiempo de manipulación 0–1 día; tiempo de tránsito de **3 a 7 días
   hábiles** (resto del país; confirmado en H-60 — si Merchant Center permite una región para Santander/Bucaramanga, 1 a 2 días); costo según la tabla real de Vendelo o una tarifa fija aproximada; **envío gratis desde $500.000**.
5. **Devoluciones:** 5 días calendario, según `/legal/politica-de-cambios`; el costo del envío de devolución "se evalúa
   según el caso" (H-15), así que se declara sin costo fijo o se deja en blanco.
6. **Impuestos:** los precios de H2R ya incluyen IVA. Colombia no pide configurar impuestos aparte [VERIFICAR en la
   cuenta].
7. **Productos → Fuentes → Agregar fuente → "Obtención programada"**, URL
   `https://www.tiendah2r.com/feeds/google-merchant.xml`, frecuencia diaria.
8. **Activar el programa "Fichas gratuitas"** (Growth → Manage programs).
9. Revisar **Diagnóstico** a los 2–3 días. El criterio de salida de la fase es un feed válido según ese validador.

## Criterio de salida y qué falta

> Feed válido según el validador de Merchant Center.

1. **H-18** — cargar marca, MPN y tipo: `/admin/merchant` → "Plantilla" → completar en Excel → "Subir CSV".
2. **H-09 / H-57** — crear la cuenta y registrar el feed (pasos de arriba).
3. Corregir lo que marque el Diagnóstico de Merchant Center.

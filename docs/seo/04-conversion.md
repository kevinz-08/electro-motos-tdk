# Fase 4 — Conversión

**Estado:** 🚧 casi cerrada — segunda entrega 2026-09-23. Una migración aditiva pendiente de aplicar (H-43).

Objetivo: que cada visita tenga el camino más corto y confiable hacia la compra.

## Hecho en esta entrega

| # ROADMAP | Ítem | Dónde |
|---|---|---|
| 12 | **`SocialProof` alimentado desde `ProductReview`** (H-01) | `components/store/SocialProof.tsx`, `ReviewsCarousel.tsx`, `getCachedStoreReviews()` en `lib/cache.ts` |
| 1 | Barra fija "Agregar al carrito" en móvil | `StickyBuyBar.tsx` |
| 2 | Estimador de envío por ciudad en la ficha | `ProductShippingEstimate.tsx` (reutiliza `useShippingQuote` y la ciudad del carrito) |
| 3 | "Confirma compatibilidad por WhatsApp" junto al botón de comprar | `ConfirmCompatibilityButton.tsx` |
| 4 | Bloque de confianza (pagos, garantía, empresa) | `ProductTrustBlock.tsx` |
| 5 | Umbral de envío gratis en `Settings` + barra de progreso | `croSettings.ts` (`freeShippingThreshold`), `FreeShippingProgress.tsx`, `carrito/CartView.tsx` |

### `SocialProof` (H-01, decisión del negocio)

- Solo `ProductReview` con `status = APPROVED` y comentario. Las 8 más recientes, **sin filtrar por
  estrellas**: mostrar únicamente las positivas sería selección a conveniencia.
- **Sin reseñas con comentario, la sección no se renderiza.** Hoy, mientras no haya reseñas aprobadas, la
  home no muestra prueba social.
- Las cifras (promedio, total, % que recomienda) solo aparecen con al menos `REVIEWS_MIN_COUNT` reseñas
  aprobadas (default 3), el mismo umbral de la ficha.
- Se eliminaron los 4 testimonios y las cifras "500+ / 1.200+ / 98 %" que estaban escritos en el código.
- Cada tarjeta enlaza al producto reseñado y dice "Compra verificada" (la reseña está atada a un
  `OrderItem` de un pedido `DELIVERED`).
- Se invalida con el tag `products`, así que moderar en `/admin/resenas` la actualiza (revalidate 10 min).

### Umbral de envío gratis

`FREE_SHIPPING_THRESHOLD` en `Settings`, en centavos (default 50.000.000 = $500.000; `0` = no se promete).
Se edita en `/admin/configuracion` en pesos. Lo leen el acordeón de la ficha, el estimador, el calculador
del carrito y la barra de progreso. Es informativo: el cobro real del flete lo decide la cotización de
Vendelo.

## Segunda entrega (decisiones del negocio del 2026-09-23)

- **Garantía: "hasta 6 meses"** en todo el sitio. Se corrigieron el footer y `TrustBadges` ("1 año") y el bloque de confianza usa 6 meses por defecto (o `warrantyMonths` del producto).
- **Umbral $500.000 confirmado (H-14).** Ya no hay ningún "$500.000" escrito a mano: el FAQ (`buildFaqItems`), footer, `TrustBadges`, ficha, carrito y las dos páginas legales lo leen de `Settings`.
- **Reseñas con moto (ítem 9):** el formulario poscompra tiene un selector opcional de moto (marca > modelo). La ciudad sale de la entrega del pedido (solo la ciudad). Se muestra "Le sirvió a una Suzuki DR150 · Cali" en la ficha y en `SocialProof` (si el comprador no recomienda, dice "Lo instaló en…", sin afirmar que le sirvió). **Es un dato declarado: no crea ni verifica ningún `Fitment`.** Migración `20260923000000_review_installed_motorcycle` (2 columnas nulas + índice + FK, reversible).
- **GA4 (ítem 11):** `@next/third-parties`, solo con `NEXT_PUBLIC_GA_ID` y **consentimiento** (aviso de cookies con Aceptar/Rechazar de igual peso; se cambia desde el footer; sección 4.1 en la política de privacidad). Eventos: `view_item`, `add_to_cart`, `view_cart`, `begin_checkout`, `purchase` (con `transaction_id`, una vez por pedido, solo con pago aprobado o contra entrega), `search` y `generate_lead` (clic en WhatsApp de compatibilidad). Importes en pesos COP, sin datos personales. `lib/analytics.ts` documenta las reglas.
- **/sobre-nosotros y /garantias (ítem 10):** nuevas, indexables, en el sitemap y el footer. Las redes sociales no son legibles sin sesión, así que **no se redactó historia ni equipo** (H-44); `/sobre-nosotros` lleva la descripción ya publicada, los datos de la empresa (misma fuente que el JSON-LD) y las redes. `/garantias` resume la política legal existente sin crear compromisos nuevos.

## Decisiones de diseño

- **Garantía en el bloque de confianza:** `warrantyMonths` del producto si está cargado; si no, "hasta 6 meses" (H-17), con enlace a `/garantias`.
- **WhatsApp:** no promete cambio si no le sirve a la moto — esa política no existe (H-16).
- **La ficha sigue estática:** los componentes nuevos son de cliente y leen carrito y cookie de "mi moto"
  al hidratar; el HTML prerenderizado no cambia.

## Tercera entrega — venta cruzada (2026-09-24, rama `feat/cro-cross-selling-kits`)

Ítem 7 del ROADMAP. El admin vincula productos desde el formulario de producto; la ficha y el carrito los muestran ("Normalmente se cambia junto con…" y otras 9 frases). Máx. 4 por producto, motivo opcional, sentido inverso por casilla, se oculta lo agotado, filtro por la moto del comprador. Detalle y decisiones en [`plan-venta-cruzada.md`](./plan-venta-cruzada.md). Migración `20260924000000_product_cross_sell` pendiente de aplicar (H-47).

## Pendiente para cerrar la fase

| Ítem | Qué falta |
|---|---|
| Migración de reseñas | Aplicar `migrate:deploy` (H-43) antes de compilar y desplegar |
| GA4 | Crear propiedad y configurar `NEXT_PUBLIC_GA_ID` (H-45) |
| 7. Venta cruzada | Código listo; falta aplicar la migración (H-47) y que el admin cargue los vínculos |
| 8. Kits de mantenimiento | Siguiente rama: `/admin/kits` (ver la propuesta del negocio del 2026-09-24) |
| /sobre-nosotros | Historia y equipo (H-44) |

## Medición antes / después

La línea base del embudo empieza a acumularse cuando GA4 esté activo (H-45). El criterio de salida ("flujo móvil completo y medible") se cierra con 2 semanas de datos.

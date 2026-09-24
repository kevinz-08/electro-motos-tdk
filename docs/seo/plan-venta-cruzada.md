# Plan de desarrollo — Venta cruzada (Fase 4, ítem 7)

**Rama:** `feat/cro-cross-selling-kits` · **Estado:** plan, sin código todavía · **Origen:** propuesta del negocio del 2026-09-24 (resuelve el bloqueo H-19/H-46: las reglas ya no las define el agente ni una tabla, las mantiene el admin como datos).

## 1. Objetivo y alcance

Que el administrador vincule, desde el formulario de edición de un producto, otros productos que "normalmente se cambian junto con" él, y que la ficha pública los muestre con su motivo, su precio real y un botón de agregar.

**Dentro del alcance (v1):** vínculos dirigidos A → B, selector con buscador en el admin, bloque en la ficha, filtro por la moto del comprador, medición en GA4.

**Fuera del alcance (se decide después):** kits (rama y PR aparte), sugerencias dentro del carrito, vínculos automáticos en sentido inverso, recomendaciones calculadas por el sistema.

**Principio rector (igual que `SocialProof` y los fitments):** sin datos cargados no se muestra nada, y nunca se inventa una recomendación. Cada vínculo lo firma una persona del negocio.

## 2. Decisiones de diseño

| Tema | Decisión | Por qué |
|---|---|---|
| Dirección | A → B. El inverso es otro vínculo | Pastillas sugieren líquido de frenos; el líquido no siempre sugiere pastillas |
| Tope | 4 sugerencias por producto (constante de dominio) | Una fila limpia en la ficha; evita el "muro" de productos |
| Motivo | Campo opcional, máx. 120 caracteres | La afirmación mecánica la firma el negocio; sin motivo se usa el título genérico |
| Precio y stock | Se leen vivos del producto, nunca se copian | Un precio copiado queda desactualizado y contradice el JSON-LD |
| Visibilidad | Solo productos activos, no borrados y con stock | Sugerir algo que no se puede comprar quema confianza |
| Filtro por moto | Se oculta la sugerencia si el producto **tiene fitments verificados y ninguno es de la moto del comprador**; si no tiene fitments (aceites, accesorios universales) se muestra | La mayoría del catálogo aún no tiene fitments (H-02): tratar "sin fitment" como "no sirve" vaciaría el bloque |
| Ficha estática | El filtro por moto se hace en el cliente (cookie), como `CompatibilityBadge` | Llamar a `cookies()` en el servidor convertiría la ficha en dinámica y perdería el prerender |
| Borrado | `ON DELETE CASCADE` por si se borra de verdad; el borrado suave se filtra al leer (`deletedAt`) | El proyecto nunca usa `product.delete()` |

## 3. Modelo de datos (migración aditiva y reversible)

`packages/database/prisma/migrations/20260924000000_product_cross_sell/`

```prisma
model ProductCrossSell {
  id        String   @id @default(cuid())
  /// Producto donde se muestra la sugerencia.
  productId String
  /// Producto sugerido.
  relatedId String
  /// "Se cambia junto con las pastillas". Null = título genérico.
  reason    String?
  /// Posición en el bloque (menor primero).
  order     Int      @default(0)
  createdAt DateTime @default(now())
  product   Product  @relation("CrossSellSource", fields: [productId], references: [id], onDelete: Cascade)
  related   Product  @relation("CrossSellTarget", fields: [relatedId], references: [id], onDelete: Cascade)

  @@unique([productId, relatedId])
  @@index([productId, order])
  @@index([relatedId])
}
```

En el SQL: `CHECK ("productId" <> "relatedId")` (sin autovínculo) y el rollback documentado en el propio archivo, como en `20260923000000_review_installed_motorcycle`. En `Product` se agregan las dos relaciones inversas.

> **Puerta:** aplicar la migración con `pnpm --filter @h2r/database migrate:deploy` afecta a la base compartida (única: `neondb`). La aplica el dueño del proyecto, o me da el visto bueno explícito. Sin ella, `pnpm build` falla con `ColumnNotFound`.

## 4. Paquetes de trabajo

Cada paquete es un commit; el orden respeta la dirección de dependencias (`dominio ← base de datos / API / web`).

### WP1 — Dominio (`packages/domain`)
- `entities/ProductCrossSell.ts`: tipo, `MAX_CROSS_SELLS = 4`, `CROSS_SELL_REASON_MAX_LENGTH = 120`.
- `repositories/ICrossSellRepository.ts`: `findByProduct`, `replaceForProduct`, `findProductsExist`.
- `use-cases/crossSell/SetProductCrossSells.ts`: reemplaza la lista completa de un producto (mismo patrón que `PUT /description`). Reglas: máx. 4, sin duplicados, sin autovínculo, motivo ≤ 120, todos los productos existen y no están en la papelera. Devuelve `Result`, nunca lanza.
- `use-cases/crossSell/filterVisibleCrossSells.ts`: función **pura** que decide qué se muestra (activo, no borrado, stock > 0) y una segunda, también pura, para el filtro por moto (`isCompatibleWithMotorcycle`). Al ser puras, se prueban sin base de datos.
- Exportar desde `index.ts`. Tests Vitest: todas las reglas de arriba, casos borde (lista vacía, 5 elementos, duplicado, producto borrado, fitments sin coincidencia / sin fitments / con coincidencia).

### WP2 — Base de datos y API (`packages/database`, `apps/api`)
- `schema.prisma` + migración (sección 3).
- `PrismaCrossSellRepository` en `apps/api/src/infrastructure/repositories/` y símbolo `CROSS_SELL_REPOSITORY` en `injection-tokens.ts`, registrado en el módulo.
- En `admin-products.controller.ts` (`@Roles('ADMIN')`):
  - `GET /admin/products/:id/cross-sells` — la lista actual con nombre, SKU, precio, stock y estado de cada producto vinculado.
  - `PUT /admin/products/:id/cross-sells` — body `{ items: [{ relatedId, reason? }] }`, en el orden deseado. DTO con `class-validator` (el `ValidationPipe` global ya usa `whitelist` y `forbidNonWhitelisted`).
  - `GET /admin/products/search?q=` — para el buscador: máx. 10 resultados con `id`, nombre, SKU, precio, stock e imagen; excluye borrados y el propio producto.
- Tests de API (Vitest): permisos, validación, errores del dominio mapeados por `HttpExceptionFilter`.

### WP3 — Panel admin (`apps/web`)
- `components/admin/CrossSellEditor.tsx`, dentro de `ProductEditForm`:
  - Solo con el producto ya creado; para uno nuevo muestra "Guarda el producto para vincular otros".
  - Buscador con autocompletar (debounce 300 ms, mismo estilo que el selector de ciudad), no un `<select>` (hay ~130 productos).
  - Lista ordenable con botones subir/bajar, campo de motivo, contador "2 de 4" y botón quitar.
  - Avisos por fila: "inactivo", "agotado" (se guarda igual, pero no se mostrará mientras no haya stock).
- Se guarda junto con el producto, en la misma llamada de `handleSubmit` que ya hace `PUT /description`, y luego `revalidateAdminCache([CACHE_TAGS.products])`.

### WP4 — Ficha pública
- `getCachedProductCrossSells(productId)` en `lib/cache.ts` (tags `products`; revalidate 600 s, como los fitments). Devuelve cada sugerencia con sus modelos con fitment verificado, ya reducidos a lo que el cliente compara.
- `components/store/CrossSellBlock.tsx` (servidor): trae los datos y renderiza el cliente; **devuelve `null` si no hay ninguna sugerencia visible** (sin espacio en blanco ni título huérfano).
- `components/store/CrossSellList.tsx` (cliente): lee "mi moto" con `useSyncExternalStore` reutilizando `readMyMotorcycle` y aplica el filtro puro del WP1. Reutilizar exactamente el patrón de `CompatibilityBadge`: el `getSnapshot` debe ser estable, o repite el bug del commit `4d019a8`.
- Título: "Normalmente se cambia junto con…"; cada tarjeta muestra imagen, nombre, precio actual, su motivo y un botón "Agregar" (usa `useCart().addItem` y el toast existentes).
- Ubicación: en la columna derecha, bajo el bloque de compra y antes de la descripción. En móvil queda antes de la tabla de compatibilidad.

### WP5 — Medición (GA4)
- `view_item_list` al mostrarse el bloque, `select_item` al hacer clic en una sugerencia y `add_to_cart` con `item_list_name: 'venta_cruzada'` al agregar. Todos por `track()`, que ya respeta el consentimiento y devuelve si el evento salió.
- Con esto, en GA se puede responder si la venta cruzada agrega al carrito y cuánto.

### WP6 — Verificación y documentación
- `pnpm type-check`, `pnpm lint`, tests de dominio y API, `pnpm --filter @h2r/web build`.
- Prueba manual en local con dos productos vinculados: aparece, respeta el tope, se oculta al agotarse, se oculta al elegir una moto incompatible (cuando el sugerido tiene fitments) y se muestra si no tiene fitments.
- Playwright: un caso `cross-sell.spec.ts` con la ficha y el botón de agregar.
- Documentación: README (nueva subsección en §26), `HISTORIAL_TECNICO.md`, `ROADMAP.md`, `04-conversion.md` e `H-46` como ✅.

## 5. Orden y dependencias

```
WP1 dominio ──► WP2 BD + API ──► WP3 admin ──┐
                     │                        ├──► WP6 verificación + docs
                     └──────► WP4 ficha ──► WP5 GA4 ┘
```
WP3 y WP4 pueden avanzar en paralelo una vez que WP2 existe. **La migración (WP2) es la única puerta que necesita al dueño del proyecto.**

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Recomendar un repuesto que no le sirve a la moto | El vínculo lo define una persona; el filtro por moto oculta lo incompatible; nada se calcula automáticamente |
| Bloque vacío o título huérfano | `CrossSellBlock` devuelve `null` sin sugerencias visibles |
| El admin nunca carga vínculos | Es un riesgo de proceso, no técnico: hasta entonces la ficha queda igual que hoy. Se puede medir en GA4 cuántas fichas tienen bloque |
| La ficha deja de ser estática | El filtro por moto va en el cliente; `CrossSellBlock` usa solo `unstable_cache`, sin `cookies()` |
| Regresión del bug de `useSyncExternalStore` | Reutilizar `readMyMotorcycle`/`subscribeToMyMotorcycle` tal cual y probar con y sin moto seleccionada |
| Caché desactualizada tras editar | `revalidateAdminCache([products])` al guardar; el ISR de 5 min es el respaldo |

## 7. Decisiones abiertas (a confirmar antes de empezar)

1. **Tope de 4** sugerencias: ¿está bien?
2. **Motivo opcional** o **obligatorio**. Recomiendo opcional.
3. **Vínculo recíproco:** ¿casilla "también sugerir en sentido inverso" en v1, o se deja para después? Recomiendo dejarlo para después: añade reglas de tope y conflictos.
4. **Título del bloque:** "Normalmente se cambia junto con…" (el de H-19) u otro.
5. **Carrito:** ¿sugerencias también en `/carrito` ("Completa tu compra")? Recomiendo una segunda entrega, con los mismos datos.
6. **Producto agotado sugerido:** recomiendo ocultarlo (propuesto). Alternativa: mostrarlo como "Agotado".

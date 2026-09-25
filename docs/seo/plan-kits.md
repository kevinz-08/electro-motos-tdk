# Plan de desarrollo — Kits de productos (Fase 4, ítem 8)

**Rama:** `feat/product-kits` · **Estado:** implementado (2026-09-25), pendiente de aplicar la migración y de cargar kits reales · **Origen:** propuesta del negocio del 2026-09-24, segunda mitad ("Kits de Productos"): una vista dedicada en el panel admin para agrupar productos en un conjunto promocional.

Relacionado: [`plan-venta-cruzada.md`](./plan-venta-cruzada.md) (ya implementado y mergeado). Los kits reutilizan varios de sus patrones — buscador de productos, editor controlado, filtro por moto — pero son una entidad de catálogo distinta, no una extensión de la venta cruzada.

## 1. Objetivo y alcance

Que el administrador arme, desde una sección propia del panel (`/admin/kits`), conjuntos de productos con un precio total visible ("Kit NKD 125: aceite + filtro + bujía"), y que la tienda los muestre y permita agregarlos al carrito de un clic.

**Dentro del alcance (v1):**
- CRUD de kits en `/admin/kits` (vista dedicada, como pidió el negocio — no dentro del formulario de producto).
- Un kit es un conjunto de productos existentes con cantidades; nunca un producto nuevo con stock propio.
- Precio del kit: la suma real de sus productos, con un descuento opcional que el admin define.
- Disponibilidad derivada del stock de sus productos — nunca un stock propio que se pueda desincronizar.
- Vínculo opcional a un modelo de moto (`MotorcycleModel`), para agruparlo en el hub de ese modelo.
- Página pública por kit (`/kits/[slug]`) más un índice (`/kits`), indexables — ver la decisión del punto 4 abajo.
- Bloque de kits en el hub de modelo cuando el kit está vinculado a ese modelo.
- Agregar al carrito: expande el kit en sus productos individuales (líneas normales). El kit nunca toca `Order`, `OrderItem`, pagos, stock ni Vendelo — cero riesgo sobre el flujo de compra ya probado.
- Medición en GA4.

**Fuera del alcance (v1):** descuentos escalonados por cantidad, kits que se arman solos a partir de reglas, kits con productos opcionales/variantes, kits vendidos como una única línea en el pedido.

**Principio rector (igual que la venta cruzada y `SocialProof`):** sin kits publicados no se muestra nada; nada se calcula ni se inventa — los productos y las cantidades los define una persona del negocio.

## 2. Decisiones de diseño

| Tema | Decisión | Por qué |
|---|---|---|
| Modelo de datos | `Kit` + `KitItem` (productos y cantidades), no un `Product` con `isKit` | Un kit no tiene stock ni SKU propios; mezclarlo con `Product` complicaría cada query que hoy asume "un producto, un stock" |
| Precio | Se lee vivo: suma de `product.price * quantity` de cada ítem, menos un descuento que el admin define (centavos fijos u opcional) | Igual que la venta cruzada: nunca se copia un precio que quede desactualizado. El "precio total visible" que pide el ROADMAP es justamente esta suma |
| Descuento | Campo `discountCents` (default 0). Regla: `0 <= discountCents < suma de los ítems` (el kit nunca cuesta $0 ni negativo) | Mismo criterio que `validateProductPricing` para `compareAtPrice`, aplicado al revés |
| Precio ancla del kit | El "precio sin kit" (la suma) se muestra tachado si `discountCents > 0`, igual que `PriceTag` ya hace con `compareAtPrice` | Reutiliza un componente y un patrón visual que el comprador ya reconoce |
| Disponibilidad | `availableUnits = min(floor(product.stock / itemQuantity))` sobre todos los ítems. El kit se oculta si `availableUnits === 0`, o si algún producto está inactivo o borrado | Nunca se promete un kit que no se puede armar completo hoy |
| Cantidad de ítems | Mínimo 2, máximo 8 por kit (constantes de dominio) | Un kit de 1 producto no es un kit; 8 es más que suficiente para "aceite + filtro + bujía + pastillas + líquido…" |
| Vínculo a modelo de moto | Opcional (`modelId` nullable). Si está, se avisa en el admin (no se bloquea) cuando algún ítem no tiene fitment verificado con ese modelo | Hay kits genéricos ("kit de limpieza") que no dependen de una moto; para los que sí, el aviso evita un kit mal etiquetado sin impedir guardarlo mientras se completan las compatibilidades (H-02 sigue en curso) |
| Dónde se administra | Vista propia `/admin/kits` (lista + crear/editar), **no** dentro de `ProductEditForm` | Así lo pidió el negocio explícitamente, y es más claro: un kit no "pertenece" a ninguno de sus productos |
| Agregar al carrito | Se expande en N llamadas a `addItem()` normales (una por producto del kit); si un producto ya estaba en el carrito, se suma su cantidad | El carrito, el checkout y el stock ya funcionan por producto; inventar un "ítem de carrito tipo kit" duplicaría toda esa lógica para cero beneficio |
| Slug | Único, generado del nombre y editable, como `Product.slug` | Consistencia con el resto del catálogo |
| Borrado | Soft delete (`isActive`), nunca `delete()` físico salvo vía admin explícito | Mismo criterio que `Product` |

## 3. Decisión abierta — alcance SEO (recomendación incluida, a confirmar)

El ROADMAP original (ítem 8) pide "Kits de mantenimiento por modelo… con precio total visible", lo que sugiere páginas propias, no solo un bloque. Dos alcances posibles:

- **A — Solo bloque** (como la venta cruzada): los kits aparecen embebidos en el hub de modelo y en la ficha de sus productos, sin ruta propia. Menos trabajo, cero superficie SEO nueva.
- **B — Páginas propias `/kits/[slug]` + índice `/kits`** (recomendado): cada kit tiene su URL indexable, con JSON-LD `Product` (agregando los productos como `isSimilarTo` o un `Offer` compuesto) y entra al sitemap. Es lo que el ROADMAP describe y lo que puede citar un buscador o una IA generativa ("kit de mantenimiento para NKD 125").

**Recomiendo B**, con la misma regla que ya rige los hubs de modelo: **un kit solo se publica y solo entra al sitemap si tiene `availableUnits > 0`** (nada de páginas de kits agotados indexadas). El plan de abajo (§5) está armado para B; si el negocio prefiere A, el WP5 se recorta a un componente sin rutas.

## 4. Modelo de datos (migración aditiva y reversible)

`packages/database/prisma/migrations/20260925000000_product_kits/`

```prisma
/// Kit de productos (docs/seo/plan-kits.md, Fase 4 ítem 8). Lo arma un administrador
/// en /admin/kits — nunca es un producto con stock propio: su disponibilidad y su
/// precio se derivan siempre en vivo de los productos que lo componen.
model Kit {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  /// Texto corto para la tarjeta y la meta description. Opcional.
  description   String?  @db.Text
  /// Centavos COP a descontar de la suma de los ítems. 0 = sin descuento.
  /// CHECK en BD: discountCents >= 0.
  discountCents Int      @default(0)
  /// Modelo de moto al que se asocia (para agruparlo en su hub). Null = kit genérico.
  modelId       String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  model         MotorcycleModel? @relation(fields: [modelId], references: [id], onDelete: SetNull)
  items         KitItem[]

  @@index([isActive, deletedAt])
  @@index([modelId])
}

/// Un producto dentro de un kit, con su cantidad.
model KitItem {
  id        String  @id @default(cuid())
  kitId     String
  productId String
  quantity  Int     @default(1)
  /// Posición en la tarjeta del kit.
  order     Int     @default(0)
  kit       Kit     @relation(fields: [kitId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([kitId, productId])
  @@index([kitId, order])
  @@index([productId])
}
```

SQL: `CHECK ("discountCents" >= 0)` en `Kit` y `CHECK ("quantity" > 0)` en `KitItem`. Rollback documentado en el propio archivo (`DROP TABLE "KitItem"; DROP TABLE "Kit";`).

> **Puerta:** aplicar la migración con `pnpm --filter @h2r/database migrate:deploy` toca la base compartida (única: `neondb`). La aplica el dueño del proyecto, o me da el visto bueno explícito — igual que en las dos migraciones anteriores de esta fase.

## 5. Paquetes de trabajo

Un commit por paquete, mismo orden de dependencias que la venta cruzada.

### WP1 — Dominio (`packages/domain`)
- `entities/Kit.ts`: tipos `Kit`, `KitItem`, `KitWithItems`; constantes `MIN_KIT_ITEMS = 2`, `MAX_KIT_ITEMS = 8`.
- `validateKitPricing(itemsTotal, discountCents)`: `0 <= discountCents < itemsTotal` (mismo estilo que `validateProductPricing`).
- `computeKitAvailability(items: { stock, quantity }[])`: `Math.min(...items.map(i => Math.floor(i.stock / i.quantity)))`, con `0` si algún ítem no cumple.
- `isKitVisible(kit)`: activo, no borrado, `availableUnits > 0`, todos los productos activos y no borrados.
- `isKitCompatible(itemsModels, moto)`: reutiliza la misma regla que `isCrossSellCompatible` (si algún ítem tiene fitments verificados y ninguno es de la moto, se avisa/oculta según el contexto — ver WP4).
- `use-cases/kits/SetKit.ts`: crea o actualiza un kit completo (nombre, slug, descuento, modelo, ítems). Reglas: entre 2 y 8 ítems, sin producto repetido, cantidades enteras ≥ 1, todos los productos existen y no están en la papelera, `validateKitPricing` sobre la suma calculada server-side (nunca confía en un total que mande el cliente).
- Tests Vitest de las cuatro funciones puras y del caso de uso (paralelo a `CrossSell.test.ts`).

### WP2 — Base de datos y API (`packages/database`, `apps/api`)
- `schema.prisma` + migración (§4).
- `IKitRepository` (dominio) + `PrismaKitRepository` (API): `findAll` (admin, con filtros), `findBySlug` (público), `findByModelId` (para el hub), `save`, `softDelete`, `findExistingProductIds` (reutilizable desde `ICrossSellRepository` si conviene, o duplicado simple).
- `admin-kits.controller.ts` nuevo (`@Roles('ADMIN')`, patrón calcado de `admin-products.controller.ts`):
  - `GET /admin/kits` — lista con nombre, slug, ítems, precio calculado, disponibilidad.
  - `GET /admin/kits/:id` — un kit con sus ítems.
  - `POST /admin/kits` / `PUT /admin/kits/:id` — crear/editar (usa `SetKit`).
  - `DELETE /admin/kits/:id` — soft delete.
  - Reutiliza `GET /admin/products/search` ya existente (de la venta cruzada) para el buscador de productos del editor.
- Tests de API: permisos, validación, mapeo de errores del dominio.

### WP3 — Panel admin (`apps/web`)
- `/admin/kits` (lista): tabla con nombre, modelo vinculado, precio, disponibilidad, activo/inactivo, botón nuevo.
- `/admin/kits/[id]` (o `/nuevo`): formulario con nombre, descripción, selector de modelo (opcional, mismo combo que usa `CroSettingsForm`/`MotorcycleSelector`), buscador de productos con cantidad por ítem (mismo componente base que `CrossSellEditor`, adaptado: cantidad en vez de motivo, sin "sentido inverso"), total en vivo y descuento, con el precio final recalculado al cambiar cualquier cantidad o el descuento.
- Avisos en el editor: producto inactivo/agotado/borrado, ítem del kit sin fitment verificado con el modelo vinculado (si hay modelo).
- Enlace nuevo en `AdminNav.tsx` (`/admin/kits`, ícono tipo `Boxes` o `Layers`).

### WP4 — Público: hub de modelo y ficha
- `getCachedKitsByModel(modelId)` y `getCachedKitBySlug(slug)` en `lib/cache.ts` (tags `products`, `fitments`; mismo `revalidate` que los fitments).
- Bloque "Kits para tu moto" en `/repuestos/[marca]/[modelo]`, debajo de las categorías: tarjetas con nombre, precio (con el ancla tachada si hay descuento), disponibilidad y botón "Agregar kit al carrito".
- Opcional en esta primera entrega: mención del kit en la ficha de un producto que forma parte de él ("Este producto está en el Kit NKD 125"), como enlace simple — se evalúa según tiempo, no bloquea el resto.
- `AddKitButton.tsx` (cliente): al hacer clic, recorre los ítems del kit y llama a `addItem()` por cada uno (cantidades del kit); un solo toast de confirmación.
- Igual que la venta cruzada: si la lectura falla (migración sin aplicar), la página se sirve sin el bloque, nunca se cae.

### WP5 — Páginas propias e SEO (solo si se confirma el alcance B de §3)
- `/kits` — índice de kits publicados (activos, con disponibilidad), con `ItemListJsonLd`.
- `/kits/[slug]` — ficha del kit: ítems, precio, disponibilidad, botón de agregar, y su propio JSON-LD `Product` (precio = precio del kit, `offers` con disponibilidad derivada). `generateStaticParams` solo con kits visibles, como ya hace `/producto/[slug]`.
- Sitemap: nuevo `sitemap-kits.xml`, sumado a `/sitemap.xml`, con la misma regla que los modelos — un kit sin disponibilidad no entra.
- Breadcrumbs: Inicio → (modelo, si tiene) → Kit.

### WP6 — Medición (GA4)
- `view_item` al abrir `/kits/[slug]` (o al verse el bloque embebido), y `add_to_cart` al agregar el kit — con `items` siendo la lista completa de productos del kit (cada uno con su cantidad) y `item_list_name: 'kit'`, para que el valor total del evento coincida con lo que de verdad entra al carrito.

### WP7 — Verificación y documentación
- `pnpm type-check`, `pnpm lint`, tests de dominio y API, `pnpm --filter @h2r/web build` (debe pasar aunque la migración no esté aplicada, igual que con la venta cruzada).
- Prueba manual local con un kit de 2 productos: precio y disponibilidad correctos, se oculta al agotar un ítem, se oculta al inactivar/borrar un ítem, "Agregar kit" deja las cantidades correctas en el carrito.
- README (nueva subsección en §26), `HISTORIAL_TECNICO.md`, `ROADMAP.md`, `04-conversion.md`, y `H-49`/`H-50` en `HUMAN_TASKS.md` (aplicar migración / cargar kits), en el mismo estilo que H-47/H-48.

## 6. Orden y dependencias

```
WP1 dominio ──► WP2 BD + API ──► WP3 admin ──┐
                     │                        ├──► WP7 verificación + docs
                     └──────► WP4 hub/ficha ──┴──► WP5 páginas propias ──► WP6 GA4
```
WP3 y WP4 pueden avanzar en paralelo una vez que WP2 existe. WP5 depende de que WP4 exista (reutiliza `getCachedKitBySlug`) y de la decisión de §3. **La migración (WP2) es la única puerta que necesita al dueño del proyecto**, igual que en la venta cruzada.

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Un kit "se vende" aunque le falte un ítem por agotarse a mitad de compra | La disponibilidad se recalcula en cada lectura (nunca se cachea el número de unidades más allá del TTL corto); y como el kit se expande en productos individuales, el checkout revalida el stock real de cada uno exactamente igual que hoy — un kit nunca puede saltarse esa validación |
| Precio del kit desincronizado si sube el precio de un ítem | Nunca se guarda un precio final: se calcula en cada lectura a partir de `product.price` vivo, igual que la venta cruzada |
| Kit mal etiquetado a un modelo que no le corresponde | El editor avisa (no bloquea) cuando un ítem no tiene fitment verificado con el modelo elegido; nada se asume automáticamente |
| Duplicar lógica del carrito para un "ítem tipo kit" | Se descarta a propósito: agregar un kit es N `addItem()` de productos reales, cero cambios en `Order`/`OrderItem`/pagos/Vendelo |
| Páginas de kits agotados indexadas (si se confirma el alcance B) | Misma regla que los hubs de modelo: `generateStaticParams` y el sitemap solo incluyen kits con `availableUnits > 0` |
| Migración pendiente rompe el build | `getCachedKitsByModel`/`getCachedKitBySlug` envueltos en try/catch, igual que `CrossSellBlock`: sin la tabla, la página se sirve sin el bloque |

## 8. Decisiones (confirmadas por el negocio el 2026-09-25)

1. **Alcance SEO:** B — páginas propias `/kits/[slug]` + índice `/kits`, indexables, con `sitemap-kits.xml`. ✅
2. **Rango de ítems:** 2 a 8. ✅
3. **Descuento:** solo centavos fijos. ✅
4. **Mención en la ficha del producto:** incluida desde esta entrega (`ProductKitMention`). ✅
5. **Nombre de la sección del admin:** "Kits". ✅

## 9. Qué se construyó

| Paquete | Archivos principales |
|---|---|
| Dominio | `entities/Kit.ts` (precio, disponibilidad, compatibilidad), `repositories/IKitRepository.ts`, `use-cases/kits/SetKit.ts`, `__tests__/Kit.test.ts` (17 tests) |
| Base de datos y API | `Kit`/`KitItem` + migración `20260925000000_product_kits`, `PrismaKitRepository`, `AdminKitsController` (listar, obtener, crear, editar, borrar), `__tests__/kits.test.ts` (7 tests) |
| Admin | `/admin/kits` (lista) y `/admin/kits/[id]` (`KitEditForm`: buscador, cantidades, descuento, precio en vivo, selector de modelo) |
| Público | `lib/kits.ts`, cachés en `lib/cache.ts`, `KitCard`/`KitsSection` (hub de modelo, `/kits`, ficha del kit), `ProductKitMention` en la ficha de producto |
| SEO | `/kits/[slug]` y `/kits` indexables, `kitJsonLd`/`kitItemListJsonLd`, `sitemap-kits.xml`, declarado en `robots.ts` |
| Medición | `add_to_cart` (con `item_list_name: 'kit'`, un ítem por producto del kit) al agregar; `view_item` al abrir `/kits/[slug]` |

**Detalles a tener en cuenta:**
- **Nunca se guarda un precio ni una disponibilidad.** Se calculan con las mismas funciones puras del dominio (`computeKitPrice`, `computeKitAvailability`) tanto en el admin como en la tienda — nunca dos fórmulas para el mismo número.
- **Agregar un kit es N `addItem()` de productos reales**, con las cantidades del kit. Cero cambios en `Order`, `OrderItem`, pagos o Vendelo.
- **Todas las lecturas públicas degradan con gracia** si la tabla no existe (migración sin aplicar): `try/catch` en `generateStaticParams`, en cada página y en `sitemap-kits.xml`. Verificado con `pnpm build` completo sin la migración aplicada.
- Un kit sin disponibilidad (`availableUnits === 0`) no se publica, no entra al sitemap y no se prerenderiza — misma regla que los hubs de modelo.

**No hecho:** prueba Playwright y verificación contra la base real con un kit de prueba (ambas necesitan la migración aplicada).

## 10. Decisiones a confirmar antes de empezar

1. **Alcance SEO (§3):** ¿A (solo bloque) o B (páginas propias `/kits/[slug]` + índice, recomendado)? Cambia el tamaño del WP5 y si hay `sitemap-kits.xml`.
2. **Rango de ítems:** ¿2 a 8 está bien, o prefieres otro tope?
3. **Descuento:** ¿en centavos fijos (como lo describe el plan) o también como porcentaje? Recomiendo solo centavos fijos en v1 — es más simple y evita redondeos con `Math.round` en cada lectura.
4. **Mención del kit en la ficha del producto** ("Este producto está en el Kit NKD 125"): ¿entra en esta entrega o se deja para después?
5. **Nombre de la sección en el admin:** ¿"Kits" alcanza, o prefieres algo como "Kits de mantenimiento" para distinguirlo de un futuro "kit de accesorios"?

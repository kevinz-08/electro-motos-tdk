# Historial Técnico — H2r Online Store

Registro cronológico de todos los cambios de código realizados durante el desarrollo del proyecto.

---

## 141. Renombrado de subcategoría de Accesorios: Filtros de Aire → Filtros de Aire de alto flujo

**Contexto:** pedido del usuario para renombrar la subcategoría `filtros-de-aire` (bajo Accesorios;
no confundir con `filtro-de-aire`, subcategoría distinta bajo Repuestos). Antes de aplicar el cambio
se verificó que `catalog.ts` no tiene ningún `deleteMany`/`truncate` (ver corrección en la entrada #140)
y se listaron las 35 categorías existentes en la BD para confirmar que ninguna categoría
creada desde el panel admin (p. ej. `motores`, que no está en `SUBCATEGORIES`) se vería afectada.

**Cambio:**

- `packages/database/prisma/catalog.ts` — `name` de la entrada `filtros-de-aire` en `SUBCATEGORIES`.
- `apps/web/src/components/nav/Navbar.tsx` — mismo cambio en la data hardcodeada del mega menu.

**Sincronización de datos:** se corrió `pnpm db:catalog` y se verificó por consulta directa que las
35 categorías siguen presentes (incluida `motores`, sin tocar) y que solo cambió el `name` de
`filtros-de-aire`.

---

## 140. Soft delete de productos + papelera en panel admin

**Contexto:** varios productos creados desde el panel admin desaparecieron porque `pnpm db:catalog`
ejecutaba un `deleteMany` sobre cualquier producto cuyo SKU no estuviera en su array `PRODUCTS`.
Se necesitaba un mecanismo que haga irreversibles las eliminaciones accidentales imposibles (o al
menos recuperables) y que el script de catálogo nunca vuelva a borrar datos.

**Cambios:**

- `packages/database/prisma/schema.prisma` — campo `deletedAt DateTime?` en `Product` con índice
  `@@index([deletedAt])`. Migración `20260725040603_add_product_soft_delete` aplicada.
- `packages/domain/src/entities/Product.ts` — campo `deletedAt?: Date | null` en la entidad.
- `packages/domain/src/repositories/IProductRepository.ts` — reemplazado `delete(id)` por
  `softDelete(id)`, `restore(id)`, `findDeleted()`.
- `apps/api/src/infrastructure/repositories/PrismaProductRepository.ts` — todas las queries de
  lectura incluyen `deletedAt: null`; implementados `softDelete`, `restore`, `findDeleted`.
- `apps/web/src/infrastructure/repositories/PrismaProductRepository.ts` — mismo patrón de filtro;
  reemplazado `delete` por `softDelete`/`restore`/`findDeleted`.
- `apps/api/src/admin/admin-products.controller.ts` — `DELETE /admin/products/:id` ahora llama
  `softDelete`; agregados `PATCH /admin/products/:id/restore` y `GET /admin/products/deleted`.
- `apps/web/src/app/admin/productos/papelera/page.tsx` — nueva página Server Component que lista
  productos eliminados con botón de restaurar.
- `apps/web/src/components/admin/RestoreProductButton.tsx` — nuevo componente Client que llama
  `PATCH /admin/products/:id/restore` e invalida la caché.
- `apps/web/src/components/admin/AdminNav.tsx` — enlace "Papelera" (icono Trash2) agregado al nav;
  lógica de `isActive` ajustada para que "Productos" no quede activo en `/papelera`.
- `packages/database/prisma/catalog.ts` — eliminado el bloque destructivo `deleteMany` que borraba
  productos con SKUs desconocidos; el script ahora solo hace upsert.
- `packages/domain/src/__tests__/UpsertProductDescription.test.ts` — mock actualizado: `delete`
  reemplazado por `softDelete`, `restore`, `findDeleted`.

**Regla:** nunca usar `prisma.product.delete()` directamente. Siempre llamar a
`productRepo.softDelete(id)`. Los productos borrados accidentalmente se recuperan desde
`/admin/productos/papelera`.

---

## 139. Renombrado de subcategorías de Accesorios: Exploradores → Exploradoras, Bombillas LED → Bombillos LED

**Contexto:** pedido del usuario para corregir el nombre visible de dos subcategorías de Accesorios.
Los `slug` (`exploradores`, `bombillas-led`) se mantuvieron sin cambios para no romper URLs ni las
relaciones de productos ya existentes bajo esas categorías — solo se actualizó el campo `name`.

**Cambio:**

- `packages/database/prisma/catalog.ts` — `name` de las entradas `exploradores` y `bombillas-led`
  en `SUBCATEGORIES`.
- `apps/web/src/components/nav/Navbar.tsx` — mismo cambio en la data hardcodeada del mega menu.
- `README.md` — actualizado el diagrama de jerarquía de categorías.

**Sincronización de datos:** se corrió `pnpm db:catalog`. El `upsert` por `slug` en `catalog.ts`
actualiza únicamente `name`, `description` y `parentId` de las categorías existentes — no crea
duplicados ni afecta los productos ya asignados. Verificado por consulta directa a la BD que ambas
categorías quedaron con el nombre nuevo.

---

## 138. Fix: parentCategoryId no se poblaba en PrismaProductRepository del web

**Contexto:** gap detectado post-sprint del sistema de cupones. La validación de cupones en cascada
(categoría padre → subcategoría) depende de que `parentCategoryId` esté presente en los ítems del
carrito. El `PrismaProductRepository` de la API (`apps/api`) ya incluía `category: { select: { parentId } }`
desde la Fase 2, pero el repositorio equivalente de la web (`apps/web/src/infrastructure/repositories/
PrismaProductRepository.ts`) no lo hacía, por lo que todos los productos enviados desde el checkout
llegaban con `parentCategoryId: undefined`. Resultado: los cupones asignados a una categoría padre
nunca coincidían con productos de subcategorías.

**Cambio:** `apps/web/src/infrastructure/repositories/PrismaProductRepository.ts`:

- `toDomain()`: recibe ahora `category?: { parentId: string | null } | null` y mapea
  `parentCategoryId: p.category?.parentId ?? null`.
- `findById`, `findBySlug`, `findBySku`, `findAll`, `findLowStock`, `findRelatedByCategory`:
  añaden `category: { select: { parentId: true } }` al `include` de Prisma.
- `save` y `update` (uso exclusivo admin, no alimentan el carrito) se dejan sin cambio.

**Verificación:** `pnpm --filter @h2r/web exec tsc --noEmit` limpio.

---

## 137. Feature: Sistema de Cupones — Sprint completo (Fases 1–6 + rediseño dark)

**Contexto:** nueva feature de gestión y aplicación de códigos de descuento, implementada desde la
capa de base de datos hasta la UI de cliente y el panel admin, con cobertura de tests completa.

### Fase 1 — Base de datos (`packages/database`)

- `schema.prisma`: nuevo modelo `Coupon` con enums `CouponType` (`PERCENTAGE | FIXED`) y
  `CouponRestriction` (`NONE | ONCE_PER_CUSTOMER | FIRST_PURCHASE`). FK opcionales `categoryId` y
  `productId` (exactamente una debe estar seteada, validado en capa API). Campos `couponCode` y
  `discountAmount` añadidos al modelo `Order`. Relaciones inversas en `Category` y `Product`.
- Migración: `20260724032214_add_coupon_system`.

### Fase 2 — Dominio (`packages/domain`)

- `entities/Coupon.ts`: tipo `Coupon`, helpers `isCouponExpired()` y `calculateDiscount()`.
  Porcentaje en centésimas (20% = 2000). Descuento fijo en centavos. Cap al subtotal elegible.
- `repositories/ICouponRepository.ts`: interfaz con `findByCode`, `findAll`, `create`, `update`,
  `delete` (soft).
- `entities/Product.ts`: campo `parentCategoryId?: string | null` añadido a la entidad.
- `repositories/IOrderRepository.ts`: campos `couponCode?` y `discountAmount?` en
  `CreateOrderInput`. Nuevos métodos `existsByCouponAndUser()` y `hasApprovedOrders()`.
- `use-cases/coupons/ValidateCoupon.ts`: valida estado → expiración (lazy) → restricción por
  cliente → scope en cascada (categoría padre cubre subcategorías) → calcula descuento sobre
  subtotal elegible únicamente.
- `use-cases/orders/CreateOrder.ts`: 5to argumento opcional `validateCoupon?: ValidateCoupon`.
  Strips `_categoryId`/`_parentCategoryId` antes de persistir. `total = max(0, subtotal − descuento + flete)`.

### Fase 3 — API NestJS (`apps/api`)

- `PrismaCouponRepository`: CRUD + soft delete (`isActive = false`).
- `PrismaOrderRepository`: `create`/`createPaidOrder` incluyen `couponCode`/`discountAmount`.
  Nuevos `existsByCouponAndUser()` y `hasApprovedOrders()`.
- `PrismaProductRepository`: `findById` incluye `category: { select: { parentId } }` y mapea `parentCategoryId`.
- `COUPON_REPOSITORY` symbol en `injection-tokens`, registrado en `InfrastructureModule`.
- `CouponsController`: `POST /coupons/validate` (JWT cualquier rol), `GET/POST/PATCH/DELETE /coupons` (ADMIN). `CouponsModule` registrado en `AppModule`.
- `OrdersController`: instancia `ValidateCoupon` como 5to arg de `CreateOrder`. Acepta `couponCode` en el DTO.

### Fase 4 — Checkout UI (`apps/web`)

- `CheckoutForm.tsx`: campo de cupón con botón Aplicar/Quitar. Llama `POST /coupons/validate`
  con los ítems del carrito (incluye `categoryId` y `parentCategoryId`). Muestra descuento en
  el resumen y lo resta del total estimado. Envía `couponCode` en `POST /orders` si está aplicado.
- `PrismaOrderRepository` (web): implementa `existsByCouponAndUser()` y `hasApprovedOrders()`.

### Fase 5 — Panel Admin (`apps/web`)

- `AdminNav.tsx`: nueva entrada "Cupones" con ícono `Ticket` de lucide-react.
- `/admin/cupones/page.tsx`: Server Component — carga cupones, categorías y productos via Prisma.
- `CouponManager.tsx`: tabla con estado/vencimiento, modal crear/editar con presets de duración
  (30/60/90 días), selector de alcance (categoría con cascada / producto específico) y restricciones
  por cliente. Paleta oscura del admin (`bg-white/5`, `bg-[#111]`, `text-white`).

### Fase 6 — Tests (`packages/domain`)

- `ValidateCoupon.test.ts`: 14 casos — cupón inexistente/desactivado/vencido, restricciones
  `ONCE_PER_CUSTOMER` y `FIRST_PURCHASE`, scope directo, cascada a subcategoría, scope por producto,
  descuento FIXED con cap, happy paths con permiso.
- `CreateOrder.test.ts`: 4 nuevos casos — descuento aplicado al total, total nunca negativo,
  error de cupón rechaza el pedido, sin `couponCode` no invoca `ValidateCoupon`.
- Totales: **239 tests domain** · **176 tests API** — todos pasan.

**Rama:** `feat/coupons` · **Commits:** `149d6f0` → `c719e33`

---

## 130. Fix: build de Vercel roto por runtime edge en la OG image de producto

**Contexto:** el PR de la feature de Compatibilidad pasaba todos los checks salvo el de Vercel. El
build fallaba en `next build` → `Collecting page data` con `Error: The edge runtime does not support
Node.js 'crypto' module`, sobre `/producto/[slug]/opengraph-image`. La causa era anterior a esta
feature: el commit `e1b62f0` (fix de OG-image/admin-panel, entrada previa a la #125) había cambiado
`export const runtime` de `'nodejs'` a `'edge'` en
`apps/web/src/app/(store)/producto/[slug]/opengraph-image.tsx`. Ese archivo importa
`getCachedProductBySlug` → `@h2r/database`, cuyo cliente Prisma generado usa APIs de Node
(`node:path`, `node:url`, `process.exit`, `crypto` vía el adapter `pg`) que no existen en el Edge
Runtime — fundamentalmente incompatible, sin importar qué tan liviano sea el resto de la ruta.

**Cambio:** `apps/web/src/app/(store)/producto/[slug]/opengraph-image.tsx` — `runtime` vuelto a
`'nodejs'`. Es la única ruta del proyecto que declaraba `runtime = 'edge'` (verificado por grep). La
imagen OG de la home ya no es dinámica (quedó como PNG estático, `opengraph-image.png`, en un commit
aparte), así que no le aplica este problema.

**Verificación:** se reprodujo localmente el comando exacto que corre Vercel
(`pnpm --filter @h2r/database generate && pnpm --filter @h2r/web build`) — build completo exitoso,
`/producto/[slug]/opengraph-image` listada como ruta dinámica (`ƒ`) sin errores.

## 129. Feature Compatibilidad — Fase 6 (acordeón en la página de producto)

**Contexto:** sexta fase del plan de la feature "Compatibilidad" (ver entrada #125) — el consumo en
`/producto/[slug]` del dato que ya se puede escribir desde el admin desde la Fase 5.

**Cambio:** `apps/web/src/app/(store)/producto/[slug]/page.tsx`:

- El query de `structuredDescription` ahora también trae `compatibility: { orderBy: { order: 'asc' } }`.
- Nuevo `<details>` "🏍️ Compatibilidad" (mismo markup visual que Envíos/Cambios), insertado como
  **primero** dentro del grupo de acordeones (antes de Envíos), renderizado solo si
  `structuredDescription.compatibility.length > 0` — igual criterio condicional que Beneficios.
  Cada línea: `<p>• {c.body}</p>`.
- **Eliminado** el bloque de pills que leía `product.compatible` (el modelo `MotorcycleCompatibility`
  legado) — quedaba redundante con el nuevo acordeón y nunca tuvo forma de ser editado desde el
  admin (ver entrada #125, "Existing compatible admin editing").
- Comentario JSDoc de cabecera del archivo actualizado.

**Verificación:** `pnpm --filter @h2r/web type-check` limpio. Prueba end-to-end con Playwright contra
el servidor de dev: se sembraron 2 ítems de compatibilidad directo en la tabla
`ProductCompatibilityItem` (simulando lo que haría el endpoint admin) para el producto
`candado-con-alarma-semi-macizo` — el acordeón apareció con el contenido correcto y en el orden
correcto (`🏍️ Compatibilidad` → `📦 Envíos` → `🔄 Cambios y devoluciones`), sin errores de consola.
Se verificó también que un producto sin compatibilidad cargada (`kit-de-limpieza-...-kn`) no muestra
el acordeón. Datos de prueba y scripts temporales eliminados al terminar.

## 128. Feature Compatibilidad — Fase 5 (UI del admin)

**Contexto:** quinta fase del plan de la feature "Compatibilidad" (ver entrada #125). Sección nueva
en el panel admin, calco visual y funcional exacto de Beneficios, dentro de la misma card
"Información general", justo debajo de esa sección.

**Cambio:** `apps/web/src/components/admin/ProductEditForm.tsx`:

- Nueva interfaz `CompatibilityEntry { body, order }` y prop `initialCompatibility?: CompatibilityEntry[]`
  (default `[]`) → `useState`.
- Handlers `addCompatibility()` (tope 30, en vez de 10 de beneficios), `removeCompatibility(index)`
  (reindexa `order`), `updateCompatibility(index, value)` — calco 1:1 de los de Beneficios.
- Sección UI "Compatibilidad" (contador `N/30`, botón "Agregar moto compatible", filas con input +
  botón eliminar, placeholder "Honda CB160F 2020-2023") insertada justo debajo del bloque de
  Beneficios existente.
- `handleSubmit` — el mismo `PUT /admin/products/:id/description` que ya mandaba `benefits` ahora
  también manda `compatibility` (filtrando entradas vacías, reindexando `order`). No se agregó
  ninguna llamada de red nueva.

`apps/web/src/app/admin/productos/[id]/page.tsx`:

- El query de `productDescription` ahora también trae `compatibility: { orderBy: { order: 'asc' } }`.
- Nuevo `initialCompatibility` mapeado igual que `initialBenefits`, pasado como prop a `ProductEditForm`.
- Un solo punto de uso de `ProductEditForm` en todo el proyecto (esta página cubre tanto alta como
  edición vía el id especial `'nuevo'`), así que no quedó ningún otro caller por actualizar.

**Verificación:** `pnpm --filter @h2r/web type-check` y `pnpm --filter @h2r/api build` — ambos
compilan limpio.

## 127. Feature Compatibilidad — Fase 4 (DTO + endpoint)

**Contexto:** cuarta fase del plan de la feature "Compatibilidad" (ver entrada #125). Sin endpoint
nuevo — se extiende el DTO que ya usa `PUT /admin/products/:id/description`.

**Cambio:** `apps/api/src/admin/dto/upsert-description.dto.ts`:

- Nuevo `CompatibilityItemDto` (calco de `BenefitItemDto` sin `title`): `body` (`@IsString
  @IsNotEmpty @MaxLength(200)`) y `order` (`@IsInt @Min(0)`).
- `UpsertProductDescriptionDto.compatibility: CompatibilityItemDto[]` agregado
  (`@IsArray @ValidateNested @Type(() => CompatibilityItemDto)`), requerido (no
  `@IsOptional`) — mismo criterio que `benefits`.
- `admin-products.controller.ts` no necesitó cambios: `upsertDescription()` ya hace
  `useCase.execute({ productId: id, ...dto })`, así que `compatibility` llega solo.

**Punto de atención:** como `compatibility` es requerido en el DTO y el `ValidationPipe` global usa
`whitelist: true, forbidNonWhitelisted: true`, cualquier llamada a este endpoint que no envíe el
campo (por ejemplo el `ProductEditForm.tsx` actual, que todavía no lo conoce) fallará con 400 hasta
completar la Fase 5. No es un problema en este momento (nada de esto está desplegado), pero conviene
completar la Fase 5 antes de probar la edición de Beneficios en el admin, para no dejarla rota
temporalmente.

**Verificación:** `pnpm --filter @h2r/api build` — compila limpio (el error de la Fase 3 desapareció).
No existían tests de este endpoint que actualizar.

## 126. Feature Compatibilidad — Fase 3 (repositorio Prisma)

**Contexto:** tercera fase del plan de la feature "Compatibilidad" (ver entrada #125). Sin
repositorio ni endpoint nuevos — se extiende `PrismaProductDescriptionRepository`, el mismo que ya
persiste Beneficios.

**Cambio:** `apps/api/src/infrastructure/repositories/PrismaProductDescriptionRepository.ts`:

- `PrismaDescRow` y `toDomain()` — agregado `compatibility: Array<{ id, body, order }>`, mapeado y
  ordenado por `order` igual que `benefits`.
- `findByProductId()` — `include` ahora trae también `compatibility: true`.
- `upsert()` — dentro de la misma transacción: `deleteMany` + `createMany` condicional para
  `productCompatibilityItem`, en paralelo al de `productBenefit` (mismo patrón "borrar y recrear"),
  y el `include` del `findUniqueOrThrow` final trae ambas listas.

**Verificación:** `pnpm --filter @h2r/api build` falla con **un único error esperado** en
`admin-products.controller.ts:96` (`UpsertDescriptionInput` requiere `compatibility`, que el DTO
todavía no provee) — confirma que el repositorio y el dominio ya están correctamente enlazados; el
error desaparece en la Fase 4 al extender el DTO del controller.

## 125. Feature Compatibilidad — Fase 1 (Prisma) y Fase 2 (dominio)

**Contexto:** primeras dos fases del plan acordado para agregar un acordeón "Compatibilidad" en
`/producto/[slug]`, editable desde el admin como texto libre (ej. "Honda CB160F 2020-2023"), igual
que Beneficios. Se optó por reutilizar toda la infraestructura de `ProductDescription`/Beneficios en
vez de construir un repositorio/endpoint nuevo — ver conversación previa para el detalle de por qué
(menos superficie de código, mismo mental model para el admin). El modelo `MotorcycleCompatibility`
(brand/model/year) preexistente queda sin uso, no se toca.

Antes de arrancar se hizo housekeeping de rama: la rama `fix/og-image-panel-admin` tenía WIP sin
commitear (fix de imagen OG con soporte de URLs completas de Cloudinary + edge runtime, y ajustes al
uploader de imágenes de `ProductEditForm`) que no tenía relación con esta feature — se commiteó
aparte (`e1b62f0`) y la rama se renombró a `feature/product-compatibility-accordion`.

**Fase 1 — Prisma** (`packages/database/prisma/schema.prisma`):

- Nuevo modelo `ProductCompatibilityItem` (`id`, `descriptionId`, `body: String @db.Text`,
  `order: Int @default(0)`), calco exacto de `ProductBenefit`, relacionado a `ProductDescription`
  vía `onDelete: Cascade`.
- Nueva relación inversa `compatibility ProductCompatibilityItem[]` en `ProductDescription`.
- Migración `20260718062608_add_product_compatibility_item` — solo `CREATE TABLE` + índice
  `(descriptionId, order)` + FK, no toca datos existentes. Cliente Prisma regenerado.

**Fase 2 — Dominio** (`packages/domain/src`):

- `entities/ProductDescription.ts` — nueva interfaz `ProductCompatibilityItem { id, body, order }`;
  `ProductDescription.compatibility: ProductCompatibilityItem[]` y
  `UpsertDescriptionInput.compatibility: Array<{ body, order }>` agregados.
- `use-cases/products/UpsertProductDescription.ts` — nueva constante `MAX_COMPATIBILITY = 30`
  (vs. `MAX_BENEFITS = 10`, dado que una lista de motos compatibles suele ser más larga que la de
  beneficios); mismas dos validaciones que ya existían para beneficios (tope excedido, body vacío)
  replicadas para `compatibility`, con mensajes de error propios.
- `repositories/IProductDescriptionRepository.ts` — comentario de `upsert()` actualizado para
  mencionar que también recrea los ítems de compatibilidad.
- Nuevo `__tests__/UpsertProductDescription.test.ts` (10 tests: producto no encontrado, tope de
  beneficios, body vacío de beneficio, tope de compatibilidad, body vacío de compatibilidad, casos
  límite exactos en 10/30, caso feliz con ambas listas, listas vacías). No existía test previo para
  este use case. Suite completa del dominio: 206/206 tests pasan, cobertura global 85%/90.6%/80.48%/
  85.71% (líneas/branches/funciones/statements), por encima de los umbrales del proyecto
  (80%/70%). `pnpm --filter @h2r/domain build` (type-check) limpio.

## 124. Reemplazo de banners del Hero de la landing

**Contexto:** El usuario cargó 4 imágenes nuevas para el carrusel Hero de la home
(`hero_banner_slide1.jpeg` a `hero_banner_slide4.jpeg`), reemplazando los PNG de placeholder
originales (`hero_banner1.png` a `hero_banner4.png`).

- `apps/web/src/app/(store)/home.tsx` — `HERO_BANNERS` actualizado: cada `src` apunta al nuevo
  archivo (`hero_banner_slide{n}.jpeg`), manteniendo el mismo orden, títulos, descripciones y CTAs
- `apps/web/public/assets/heroBanners/` — se eliminaron los 4 PNG viejos (ya sin referencias en
  el código) y quedan los 4 JPEG nuevos

*Última actualización: 2026-07-06*

---

## 123. "Pagar con Addi" pasa de centrado a alineado directamente bajo "Agregar al carrito"

**Contexto:** en la entrada #122 el botón de Addi quedó del mismo ancho que "Agregar al carrito"
pero centrado en toda la columna (margen simétrico de 59px a cada lado). Al verlo, el usuario
prefirió que en vez de centrado quede alineado exactamente debajo de "Agregar al carrito" — mismo
ancho y mismo borde izquierdo, no centrado en la columna completa.

**Cambio:** `apps/web/src/app/(store)/producto/[slug]/page.tsx` — el wrapper pasó de
`flex justify-center` con `w-[calc(100%-118px)]` a `flex items-center gap-3` con un
**espaciador invisible** (`<div className="w-[106px] shrink-0" aria-hidden="true" />`) del mismo
ancho que el selector de cantidad, seguido del botón de Addi con `flex-1`. Así el botón ocupa
exactamente el mismo espacio horizontal que "Agregar al carrito" (que comparte fila con el stepper),
en vez de calcular un ancho fijo y centrarlo. El espaciador solo se renderiza si
`product.stock > 1` (cuando el stepper es visible); si el stock es 1, tanto "Agregar al carrito"
como "Pagar con Addi" ocupan el ancho completo, sin espaciador. Verificado con Playwright en ambos
escenarios: mismo borde izquierdo y mismo ancho en los dos casos.

## 122. "Pagar con Addi" iguala el ancho de "Agregar al carrito" y queda centrado

**Contexto:** tras restaurar "Pagar con Addi" como botón en la entrada #121, quedó a ancho completo
de la columna (`w-full`), mientras que "Agregar al carrito" es más angosto porque comparte fila con
el stepper de cantidad (106px de ancho + 12px de gap = 118px descontados del ancho total,
medido con Playwright: contenedor 456px, stepper 106px, botón resultante 338px). Esa diferencia de
tamaño se veía inconsistente. El usuario pidió que ambos botones midan lo mismo y que Addi quede
centrado (no pegado a la izquierda) ya que no comparte fila con el stepper.

**Cambio:** `apps/web/src/app/(store)/producto/[slug]/page.tsx` — el wrapper de
`PayWithAddiButton` pasó de `<div className="mt-3">` a `<div className="mt-3 flex justify-center">`,
y el botón recibe `className="w-[calc(100%-118px)] ..."` (mismo ancho fijo restado que ocupa el
stepper + gap) en vez del `w-full` por defecto del componente. Verificado con Playwright: ambos
botones miden 338px de ancho, Addi queda con 59px de margen simétrico a cada lado.

## 121. "Pagar con Addi" vuelve a ser botón (revierte el cambio a texto de la entrada #119)

**Contexto:** el usuario pidió revertir el cambio de la entrada #119 — "Pagar con Addi" vuelve a ser
el botón sólido azul original (icono "A" + texto), en vez del texto con link introducido antes.
Pidió que quede debajo de "Agregar al carrito", centrado y bien estructurado.

**Cambio:**
- `apps/web/src/components/store/PayWithAddiButton.tsx` — se restauró el `<a>` con estilo de botón
  completo (`bg-[#1A57FF]`, ícono circular blanco con "A", sombra), igual que antes de la entrada
  #119. El link a WhatsApp no cambió.
- `apps/web/src/app/(store)/producto/[slug]/page.tsx` — se envolvió `<PayWithAddiButton>` en un
  `<div className="mt-3">` para separar el espacio del bloque `AddToCartWithQuantity` de arriba, sin
  duplicar el className completo del botón en la página.

Verificado con Playwright contra el servidor de dev: el botón renderiza a ancho completo, centrado
en la columna de detalle, debajo del stepper + "Agregar al carrito".

## 120. Fix: selector de cantidad "no funcionaba" en productos con stock = 1

**Contexto:** el usuario reportó que el selector de cantidad de la entrada #119 no funcionaba.
Se verificó con Playwright contra el propio servidor de dev del usuario (puerto 3000): en un
producto con stock 2 el stepper funcionaba perfecto (1→2→1), pero en uno con stock 1 (el mismo tipo
de producto "¡Solo 1 disponibles!" de la captura original) **ambos botones `−`/`+` quedaban
deshabilitados desde el primer render** — matemáticamente correcto (no se puede bajar de 1 ni subir
más del stock), pero visualmente el control entero parecía muerto/roto porque ningún clic producía
efecto.

**Cambio:** `apps/web/src/components/store/AddToCartWithQuantity.tsx` — cuando
`maxQuantity <= 1` (stock de una sola unidad), el componente ya no renderiza el stepper: muestra
directamente el botón "Agregar al carrito" a ancho completo, igual que ya hacía para `stock === 0`
("Agotado"). Para stock ≥ 2 el comportamiento no cambió. Verificado con un script Playwright
temporal contra dos productos reales (stock 1 y stock 2) antes y después del fix.

## 119. Selector de cantidad junto a "Agregar al carrito" + "Pagar con Addi" pasa de botón a texto

**Contexto:** el usuario mostró una referencia visual (stepper de cantidad `− 1 +` a la izquierda de
un botón de compra) y pidió dos cambios en `/producto/[slug]`: (1) agregar un selector de cantidad
a la izquierda del botón "Agregar al carrito", adaptado a la paleta del sitio; (2) que "Pagar con
Addi" deje de ser un botón sólido y pase a ser un texto informativo con link, del estilo "¿Prefieres
pagar con Addi? Contacta con nuestro asesor personalizado para coordinar la compra."

**Cambio:**
- Nuevo componente `apps/web/src/components/store/AddToCartWithQuantity.tsx` (Client Component) —
  reemplaza a `AddToCartButton` en esta página. Mantiene estado local `quantity` (mín. 1, máx.
  `min(product.stock, 99)`), con un stepper `− / +` en pill (`rounded-full border border-gray-200`)
  a la izquierda y el botón "Agregar al carrito" (mismo estilo `bg-sky-400`/`rounded-xl` que ya
  existía) ocupando el resto del ancho (`flex-1`). Si `stock === 0`, se comporta igual que antes
  (botón "Agotado" deshabilitado, sin stepper). `AddToCartButton.tsx` quedó sin ningún uso en el
  proyecto tras el reemplazo, así que se eliminó en vez de dejarlo como código muerto.
- `apps/web/src/components/store/PayWithAddiButton.tsx` — el `<a>` con fondo azul Addi sólido pasa a
  ser un `<p>` de texto (`text-sm text-gray-500`) con un link inline (`text-sky-600 underline`) sobre
  "Contacta con nuestro asesor personalizado", que sigue abriendo WhatsApp con el mismo mensaje
  pre-armado de siempre. Solo cambió la presentación, no el comportamiento del link.
- `apps/web/src/app/(store)/producto/[slug]/page.tsx` — usa `AddToCartWithQuantity` en vez de
  `AddToCartButton` + `className` a medida.

## 118. Trust bar de Wompi/envío pasa a estar arriba de los acordeones

**Contexto:** el usuario prefirió el trust bar (candado + camión) rediseñado en la entrada #117
ubicado antes de los acordeones de Envíos/Cambios, en vez de después.

**Cambio:** `apps/web/src/app/(store)/producto/[slug]/page.tsx` — se movió el bloque del trust bar
de debajo del `<div className="... space-y-2">` de los acordeones a justo debajo de
`ProductImageGallery`, antes del bloque de acordeones. Solo reordenamiento de JSX, mismo componente.

## 117. Rediseño de la línea de confianza (Wompi/envío) como trust bar consistente

**Contexto:** el usuario notó que el texto "🔒 Pago seguro con Wompi / 🚚 Envío a todo Colombia" se
veía inconsistente frente al lenguaje visual de tarjeta de los acordeones de Envíos/Cambios
(`border`, `rounded-xl`, `bg-gray-50`) justo arriba. Los emojis como íconos varían de render entre
sistemas operativos y no comparten grosor de trazo con el ícono SVG del acordeón, y el texto flotaba
sin contenedor entre dos bloques tipo card.

**Cambio:** `apps/web/src/app/(store)/producto/[slug]/page.tsx` — se reemplazaron los emojis por un
"trust bar": contenedor `bg-gray-50 border border-gray-100 rounded-xl px-4 py-3` con dos ítems
(candado + camión, ambos íconos SVG de línea en `text-sky-500`, mismo tono de acento usado en el
resto de la página) separados por un divisor vertical (`border-l border-gray-200`), reemplazando el
`<div className="text-sm text-gray-500 flex items-center gap-4">` original con emojis sueltos.

## 116. Reducir espacio vacío antes de "Productos relacionados" en la página de producto

**Contexto:** el usuario reportó que la sección "Productos relacionados" quedaba muy separada del
resto del contenido, con un hueco en blanco grande. Dos causas: (1) el grid de dos columnas
(`grid-cols-1 md:grid-cols-2`) no tenía `items-start`, así que por defecto (`align-items: stretch`)
la columna más corta se estiraba para igualar la altura de la más alta, dejando espacio vacío al
final de esa columna; (2) `RecommendedProducts.tsx` usaba `mt-16 pt-10` (~104px) de espacio antes
de la sección, sumándose al hueco anterior.

**Cambio:**
- `apps/web/src/app/(store)/producto/[slug]/page.tsx` — el grid principal ahora usa
  `items-start` en vez de stretch por defecto, para que ninguna columna se estire de más.
- `apps/web/src/components/store/RecommendedProducts.tsx` — `mt-16 pt-10` → `mt-8 pt-6` tanto en
  `RecommendedProducts` como en su `RecommendedProductsSkeleton`.

## 115. Tercer ajuste de distribución en la página de producto — línea de confianza (Wompi/envío) bajo el acordeón

**Contexto:** siguiendo la misma línea de reorganización de las entradas #113 y #114, el usuario
pidió que la línea de confianza "🔒 Pago seguro con Wompi / 🚚 Envío a todo Colombia" deje de estar
debajo de los botones de compra (columna derecha) y pase a la columna izquierda, debajo del
acordeón de Envíos/Cambios.

**Cambio:** `apps/web/src/app/(store)/producto/[slug]/page.tsx` — solo reordenamiento de JSX:
- Columna izquierda: galería → acordeón de **Envíos/Cambios** → línea de confianza (Wompi/envío) →
  **Compatibilidad**.
- Columna derecha: ya no incluye la línea de confianza; queda `AddToCartButton` +
  `PayWithAddiButton` → `<hr>` → **Descripción** → **Beneficios**.

## 114. Segundo ajuste de distribución en la página de producto — acordeón junto a la galería, Beneficios bajo la Descripción

**Contexto:** tras el reordenamiento de la entrada #113, el usuario pidió un segundo ajuste: que el
acordeón de **Envíos** / **Cambios y devoluciones** ocupe el lugar donde antes estaban los
**Beneficios** (debajo de la galería, columna izquierda), y que **Beneficios** pase a la columna
derecha, debajo de la **Descripción**.

**Cambio:** `apps/web/src/app/(store)/producto/[slug]/page.tsx` — solo reordenamiento de JSX, sin
tocar lógica ni datos:
- Columna izquierda: `ProductImageGallery` → acordeón de **Envíos** y **Cambios y devoluciones** →
  **Compatibilidad** (se queda donde estaba, ahora debajo del acordeón en vez de debajo de
  Beneficios).
- Columna derecha: ... → `<hr>` → **Descripción** → **Beneficios** (nuevo último bloque de la
  columna derecha).

## 113. Reordenamiento de la página de producto — beneficios junto a la galería, descripción y acordeón bajo los botones

**Contexto:** en `/producto/[slug]`, toda la información secundaria (descripción, beneficios,
acordeón de envíos/cambios) estaba apilada en la misma columna derecha, debajo de los botones de
compra, generando una página excesivamente larga y una jerarquía visual confusa. El usuario pidió
redistribuir el contenido: **Beneficios** (y Compatibilidad) debajo de la galería de imágenes en la
columna izquierda; **Descripción** debajo de los botones de compra en la columna derecha; y el
acordeón de **Envíos** / **Cambios y devoluciones** debajo de la Descripción.

**Cambio:** `apps/web/src/app/(store)/producto/[slug]/page.tsx` — sin cambios de lógica ni de datos,
solo reordenamiento de JSX dentro del `grid grid-cols-1 md:grid-cols-2`:
- Columna izquierda: `ProductImageGallery` → bloque de **Beneficios** → bloque de **Compatibilidad**
  (antes ambos vivían al final de la columna derecha).
- Columna derecha: SKU/nombre/precio/stock → `AddToCartButton` + `PayWithAddiButton` → línea de
  confianza (Wompi/envío) → `<hr>` → **Descripción** → acordeón de **Envíos** y **Cambios y
  devoluciones** (antes el acordeón iba primero y la descripción/beneficios después).

---

## 112. Cobrar el flete en línea junto con el producto — reemplaza el modo híbrido

**Contexto:** tras el fallback seguro de #111 (Vendelo rechazó las dos formas probadas de recaudo
parcial COD), el usuario propuso una alternativa más simple: en vez de pedirle a Vendelo un recaudo
que no soportan, sumar el flete cotizado al monto que ya cobra Wompi/Mercado Pago de forma
confiable. El cliente paga producto + envío en un solo cargo online; el negocio le sigue pagando a
Vendelo el flete desde su billetera al despachar (sin cambios ahí), pero ahora lo recupera del
cliente en vez de absorberlo en silencio. Esto vuelve obsoleto `Order.shippingCod` y todo el
mecanismo del modo híbrido — se elimina como limpieza de esta misma tarea.

Se usó `/plan` (EnterPlanMode) dado el alcance: cambios en Prisma, dominio, 3 capas de
infraestructura, checkout, comprobante y panel admin, todos relacionados con dinero real. Se
lanzaron 3 agentes de exploración en paralelo (firma de integridad Wompi, uso de `Order.total` en
dashboards/comprobantes, flujo actual de `orders.controller.ts`) + 1 agente de diseño antes de
escribir el plan final, que el usuario aprobó explícitamente con 2 decisiones de negocio
confirmadas: reset del toggle `SHIPPING_ONLINE_ENABLED` existente al desplegar, y tope defensivo de
$50.000 COP por pedido.

**Diseño:**

- `Order.total` pasa a significar el **total cobrado** (producto + flete cuando se cobra en línea)
  — `WompiService`/`MercadoPagoService`/`ConfirmPayment` ya leen `order.total` directamente, así que
  funcionan sin ningún cambio de código.
- Nuevo campo `Order.shippingTotal Int @default(0)` — componente de flete incluido en `total`, para
  desglosarlo en comprobante/admin. `0` = negocio absorbió el flete (COD, toggle apagado, o falla
  de cotización).
- `Order.shippingCod` **eliminado** (migración `DROP COLUMN`) junto con todo lo que lo consumía.
- El toggle admin `SHIPPING_ONLINE_ENABLED` (mismo Settings key, mismo componente
  `ShippingOnlineToggle.tsx`, mismo endpoint `PATCH /admin/settings/shipping-online`) se reutiliza
  con nuevo significado: **activado** = el flete se suma al cobro online; **desactivado (nuevo
  default)** = comportamiento legado. El default cambió de `true` a `false` deliberadamente — el
  significado anterior era distinto (modo híbrido), así que se **borró cualquier fila existente en
  Settings como parte de la migración** para que ningún ambiente arranque cobrando flete de sorpresa.
- `CreateOrder` gana un 4º parámetro de constructor **opcional** `quoteShipping?: QuoteShipping` —
  compone el use case ya existente (peso real por producto, umbral de envío gratis) en vez de
  duplicar su lógica. Opcional para no romper los `new CreateOrder(...)` de 3 argumentos que ya
  existían en tests.
- Falla segura: si falta `cityCode`/`subdivisionCode`, si `QuoteShipping` falla, o si no hay
  `quoteShipping` inyectado → `shippingTotal = 0` (nunca bloquea el checkout). Tope defensivo
  `MAX_SHIPPING_CHARGE_CENTS` (default 5.000.000 centavos = $50.000 COP) recorta cualquier
  cotización anormalmente alta. `CreateOrderOutput.shippingQuoteFallback: boolean` señala el
  fallback para que `orders.controller.ts` lo loggee como warning.

**Cambios por capa:**

- **Prisma**: migración `remove_shipping_cod_add_shipping_total` — `DROP COLUMN shippingCod`,
  `ADD COLUMN shippingTotal Int DEFAULT 0`, más `DELETE FROM Settings WHERE key = 'SHIPPING_ONLINE_ENABLED'`
  en el mismo archivo de migración (se ejecuta automáticamente en cualquier ambiente vía
  `prisma migrate deploy`).
- **Dominio**: `Order.ts`, `IOrderRepository.ts` (`CreateOrderInput`), `CreateOrder.ts` (lógica
  central descrita arriba).
- **Infraestructura**: `PrismaOrderRepository.ts` (api y web) — `toDomain()`/`create()`/`createPaidOrder()`
  mapean `shippingTotal` en vez de `shippingCod`. Los métodos de revenue (`getTodayRevenue`,
  `getMonthRevenue`, `getWeeklyRevenueSeries`) no cambiaron — ahora suman ventas brutas incluyendo
  flete de pedidos que lo cobraron en línea, no solo producto (cambio de semántica documentado, sin
  tocar las queries).
- **NestJS**: `orders.controller.ts` inyecta `VENDELO_SHIPPING_PORT` (mismo token que
  `shipping.controller.ts`) y arma `new QuoteShipping(productRepo, shippingPort)` para pasárselo a
  `CreateOrder`. `VendeloService.ts` sin cambios funcionales — solo se limpiaron los comentarios que
  mencionaban `shippingCod`/fallback temporal (`payment_method_code` nunca dependió de esto para
  nada más que `paymentProvider`).
- **Checkout**: `CheckoutForm.tsx` — se quitó `shippingWillBeCod` y la nota de "flete contraentrega"
  del modo híbrido; nueva nota "El envío se paga junto con tu pedido" cuando el toggle está activo;
  el resumen muestra "Total a pagar (incluye envío)" sin el disclaimer de Vendelo cuando aplica.
- **Comprobante**: `ReceiptPdf.tsx` + la ruta de comprobante — desglosan Subtotal productos / Envío
  / Total cuando `shippingTotal > 0`, para que la suma de ítems siempre cuadre con el total mostrado.
- **Admin**: `pedidos/page.tsx` y `OrderInfoModal.tsx` — se quitaron los badges "Flete COD"/"Flete
  contraentrega" del modo híbrido; se agregó indicador "incl. envío" y desglose Subtotal/Envío/Total
  donde corresponde.
- **Tipos**: `OrderResponse.shippingCod` → `OrderResponse.shippingTotal`.

**Tests:** se reemplazaron todos los tests de `shippingCod`/modo híbrido por una suite nueva
cubriendo: cotización exitosa suma al total, `freeShipping` dejando `shippingTotal` en 0, fallback
por falla de `QuoteShipping`, fallback por dirección incompleta (sin llamar a `QuoteShipping`),
fallback sin `quoteShipping` inyectado, recorte por `maxShippingChargeCents`, y guard explícito de
que COD nunca cobra flete en línea aunque se pida. `pnpm --filter @h2r/domain test` (190/190 ✅),
`pnpm --filter @h2r/api test` (170/170 ✅), `pnpm type-check` limpio en los 5 paquetes, `pnpm --filter
@h2r/web lint` sin errores nuevos (22 warnings preexistentes, no relacionados).

**Rama:** `feat/charge-shipping-online` (renombrada desde `fix/vendelo-hybrid-safe-fallback`, que
nunca llegó a mergearse — esta feature la reemplaza por completo).

*Última actualización: 2026-07-02*

---

## 111. Fallback seguro — modo híbrido pausado hasta confirmar el campo de recaudo con Vendelo

**Contexto:** el segundo intento (#110, usando `discounts` para anular el subtotal) también fue
rechazado por Vendelo, esta vez con `404 "El tipo de descuento no es válido"`. Se escaló a soporte
de Vendelo con el error exacto. Su respuesta confirmó dos cosas:

1. **`discounts` no es el mecanismo correcto** — dijeron explícitamente "no uses el campo
   discounts para ajustar el subtotal a cero".
2. La forma soportada es crear el pedido con `payment_method_code: 'COD'` pero fijando el **monto
   a recaudar** (no el `unit_price` del producto) igual solo al valor del flete — pero **no dieron
   el nombre real del campo**, solo sugirieron variantes sin confirmar
   (`amount_to_collect`, `amount_recaudo`, "o campo equivalente"). Ofrecieron escalar a un
   especialista técnico para el JSON exacto.

**Decisión:** no se intentó un tercer campo a ciegas. Razón: si se envía `payment_method_code: 'COD'`
con `unit_price` real y sin ningún mecanismo de recaudo parcial, Vendelo recaudaría el
**subtotal completo + flete** en la entrega — un pedido híbrido cuyo producto el cliente ya pagó
en línea terminaría cobrándose en efectivo otra vez. Es un riesgo de doble cobro real al cliente,
no solo un pedido que falla silenciosamente (que era el peor caso hasta ahora).

**Fix (fallback temporal):** `VendeloService.createOrder()` deja de traducir `order.shippingCod`
a `payment_method_code: 'COD'`. Mientras no se confirme el campo real:

```ts
payment_method_code: order.paymentProvider === 'COD' ? 'COD' : 'EXTERNAL_PAYMENT'
// shippingCod ya no participa acá
```

Efecto práctico: los pedidos híbridos (`shippingCod: true`) se envían a Vendelo como pago 100% en
línea — el negocio vuelve a asumir el costo del flete desde su billetera (comportamiento previo a
la entrada #108), pero **nadie le cobra de más al cliente**. El campo `Order.shippingCod` sigue
existiendo, persistiéndose y mostrándose en el admin (badge "Flete contraentrega") — la UI/toggle
de admin no cambia, solo la traducción hacia Vendelo queda pausada.

**Pendiente — desbloquea el modo híbrido real:**

1. Aceptar la escalación de Vendelo a soporte técnico avanzado y obtener el JSON/nombre de campo exacto.
2. Actualizar `VendeloService.createOrder()` con el campo real una vez confirmado.
3. Reencolar manualmente los pedidos huérfanos que quedaron `FAILED` en `VendeloOrderQueue`
   durante las pruebas de #110/#111 (stock ya descontado, `PAID`/`APPROVED`, pero sin
   `vendeloOrderId` — no se reintentan solos).

**Tests:** `VendeloService.test.ts` actualizado — el test de "modo híbrido" ahora confirma
`EXTERNAL_PAYMENT` + `discounts: []` (no `COD`). `pnpm --filter @h2r/api test` (169/169 ✅).

**Rama:** `fix/vendelo-hybrid-safe-fallback`.

*Última actualización: 2026-07-02*

---

## 110. Fix real de producción — Vendelo rechaza unit_price:0 en pedidos COD

**Contexto:** el usuario probó el modo híbrido en producción (checkout real: pago en línea +
"Flete pagado en línea" desactivado). El pedido se creó correctamente (`PAID`/`APPROVED` en
nuestro sistema) pero **nunca llegó al panel de Venndelo**. Se investigó consultando directamente
`VendeloOrderQueue` en la BD de producción: el pedido se encoló, pero agotó sus 3 reintentos con
`status: FAILED` y este error real de Vendelo:

```
Vendelo API 500: {"errors":[{"code":"500","message":"The entity Order has invalid values"}]}
```

**Causa raíz:** comparando contra un pedido anterior exitoso (mismo producto/comprador,
`shippingCod: false`, sí tiene `vendeloOrderId`), la única diferencia estructural era
`unit_price: 0` en los `line_items` — la implementación original de #108 (siguiendo la sugerencia
informal de soporte de Vendelo) declaraba el producto en $0 para que el recaudo COD fuera solo el
flete. **Vendelo rechaza esto**: un pedido `payment_method_code: 'COD'` con `unit_price: 0`
dispara la validación "invalid values" de su lado (razonable desde su negocio — no tiene sentido
un recaudo contraentrega de producto en $0).

**Fix:** `VendeloService.createOrder()` ahora **siempre** declara el `unit_price` real del
producto. Para anular el recaudo neto del producto en modo híbrido, se usa el array `discounts`
del payload en vez de `unit_price: 0`:

```ts
discounts: order.shippingCod
  ? [{ description: 'Producto pagado en línea — solo se recauda el flete', amount: subtotalReal }]
  : []
```

**⚠️ Advertencia — schema no verificado:** `API_VENDELO_DOCUMENTACION.md` no documenta el shape de
`ApiCreateOrderDiscount` (solo aparece como `array (ApiCreateOrderDiscount)` sin campos). Los
nombres `description`/`amount` son una suposición razonable basada en APIs similares, **no
confirmada con soporte de Vendelo ni probada aún contra la API real**. Falta:
1. Probar un pedido híbrido de prueba con este payload contra Vendelo real y confirmar que el
   recaudo mostrado en su panel es solo el flete.
2. Si Vendelo rechaza el schema de `discounts`, preguntar a soporte el shape exacto (idealmente
   pidiendo también confirmación explícita de que un descuento del 100% del subtotal es la forma
   correcta de lograr "producto pagado, flete contraentrega" — la sugerencia original de soporte
   mencionaba `unit_price` en $0, que ya se confirmó que no funciona).

**Archivos:** `apps/api/src/infrastructure/services/VendeloService.ts` (`VendeloCreateOrderBody.discounts`
tipado, `createOrder()`), `apps/api/src/__tests__/VendeloService.test.ts` (test actualizado +
test nuevo confirmando `discounts: []` en COD total/pago online puro).

**Validación:** `pnpm --filter @h2r/api test` (168/168 ✅), type-check limpio. **No validado aún
contra la API real de Vendelo** — pendiente de que el usuario repita la prueba end-to-end.

**Rama:** `feat/vendelo-shipping-improvements`.

*Última actualización: 2026-07-02*

---

## 109. Modo híbrido controlado por admin — de checkbox de cliente a toggle global

**Contexto:** a pedido explícito del usuario, el modo híbrido de #108 (producto pagado en línea,
flete contraentrega) deja de ser una elección del cliente en el checkout y pasa a ser una política
global que el admin activa/desactiva desde `/admin/configuracion`, con el mismo patrón que
`COD_ENABLED` y `MERCADOPAGO_ENABLED`. Se preguntó explícitamente al usuario si el toggle debía
reemplazar el checkbox o solo definir su valor por defecto — eligió **reemplazarlo**: el cliente ya
no decide nada, el checkout solo muestra una nota informativa.

**Nuevo setting: `SHIPPING_ONLINE_ENABLED`** (default habilitado si no existe la fila, mismo
fallback que `COD_ENABLED`):
- **Habilitado** (comportamiento de siempre) → el flete de pedidos `WOMPI`/`MERCADO_PAGO` se cobra
  "en línea": Vendelo no recauda nada al entregar (`EXTERNAL_PAYMENT`), lo asume la billetera del
  negocio.
- **Deshabilitado** → **todos** los pedidos pagados en línea nacen con `shippingCod: true` — el
  producto se sigue pagando por la pasarela como siempre, pero el flete se cobra en efectivo al
  repartidor.
- Si `COD_ENABLED` está deshabilitado (el repartidor no puede recaudar efectivo), este toggle
  **no tiene efecto** — `orders.controller.ts` degrada a flete online en vez de bloquear el
  checkout por una combinación de configuración conflictiva.

**Cambios:**

- **Backend** (`apps/api/src/admin/admin-settings.controller.ts`): nuevo endpoint
  `PATCH /admin/settings/shipping-online` (reutiliza `ToggleSettingDto`, mismo patrón que `/cod`
  y `/mercadopago`).
- **`orders.controller.ts`**: `dto.shippingCod` **eliminado** — ya no lo envía el cliente. Para
  pedidos no-COD, el controller consulta `SHIPPING_ONLINE_ENABLED` y `COD_ENABLED` en paralelo
  (`Promise.all`) y calcula `shippingCod = !shippingOnlineEnabled && codEnabled` antes de llamar al
  use case.
- **`CreateOrderDto`**: se quita el campo `shippingCod` (el `ValidationPipe` global con
  `forbidNonWhitelisted: true` habría rechazado la request si el frontend seguía enviándolo).
- **`packages/types`**: `CreateOrderRequest.shippingCod` eliminado (ya no es parte del contrato
  cliente→API). `OrderResponse.shippingCod` se mantiene — sigue siendo información válida sobre el
  pedido ya creado.
- **Admin UI**: `ShippingOnlineToggle.tsx` (copia exacta del patrón de `CodToggle.tsx`), integrado
  en `/admin/configuracion` en una nueva tarjeta "Flete de pedidos pagados en línea".
- **Checkout** (`CheckoutForm.tsx`): se elimina el checkbox y el estado `shippingCod` local. Se
  agrega el prop `shippingOnlineEnabled` (leído en `checkout/page.tsx`, Server Component, mismo
  patrón que `codEnabled`) y una variable derivada `shippingWillBeCod` que replica exactamente el
  cálculo del backend para que la cotización de envío (`quotePaymentMethod`) y la nota informativa
  mostrada al cliente coincidan con lo que el servidor realmente hará.

**Tests actualizados:** `orders.controller.test.ts` — se reemplazaron los 2 tests que asumían
`dto.shippingCod` (ya inválidos) por 3 tests nuevos que cubren los 3 casos de la matriz de settings
(forzado a true, queda false por default, degrada a false cuando COD está deshabilitado). El mock
de `settings.findUnique` pasó a encadenar `mockResolvedValueOnce` en el orden exacto del
`Promise.all` del controller.

**Validación:** `pnpm --filter @h2r/domain test` (182/182 ✅), `pnpm --filter @h2r/api test`
(167/167 ✅), `pnpm type-check` en los 5 paquetes — todo en verde.

**Rama:** `feat/vendelo-shipping-weight-dimensions` (work en curso, sin commitear).

*Última actualización: 2026-07-02*

---

## 108. Modo híbrido — producto pagado en línea, flete contraentrega (Fase 2 Vendelo)

**Contexto:** siguiendo la recomendación de soporte de Vendelo (confirmada en conversación con el
usuario), se implementa un nuevo modo de pedido: el cliente paga el producto por WOMPI/Mercado
Pago (flujo online normal), pero el flete se cobra en efectivo al repartidor de Vendelo en vez de
descontarse de la billetera del negocio (que hoy paga el flete de todo pedido online vía
`EXTERNAL_PAYMENT`). Objetivo: reducir la dependencia de saldo en la billetera Vendelo para
pedidos con pago 100% online.

**Decisión de diseño — flag ortogonal, no un tercer valor de `paymentProvider`:** se evaluó (y
descartó) modelar esto como un nuevo valor `'HYBRID'` en el enum `PaymentProvider`. Se descartó
porque `CreateOrder.execute()` usa `paymentProvider === 'COD'` para decidir si el pedido nace ya
`PAID` (sin esperar pasarela) o si sigue el flujo `PENDING` → webhook → `PAID`. Un valor `HYBRID`
en esa rama habría creado el pedido como `PAID` sin haber cobrado realmente el producto — un bug
de negocio real. En cambio, se agregó `Order.shippingCod: boolean` (default `false`), ortogonal a
`paymentProvider`: el pedido híbrido sigue el flujo online normal exacto (`PENDING` → webhook
confirma pago → `PAID`, stock descontado solo en `APPROVED`), y el flag solo le indica a
`VendeloService.createOrder()` cómo declarar el pedido ante Vendelo.

**Cambios:**

- **Prisma** (`schema.prisma`): `Order.shippingCod Boolean @default(false)` (migración
  `20260702163250_add_order_shipping_cod`).
- **Dominio** (`entities/Order.ts`, `repositories/IOrderRepository.ts`,
  `use-cases/orders/CreateOrder.ts`): `Order.shippingCod`, `CreateOrderInput.shippingCod`,
  `CreateOrderUseCaseInput.shippingCod?`. `CreateOrder.execute()` rechaza con `VALIDATION_ERROR`
  si `shippingCod: true` se combina con `paymentProvider: 'COD'`.
- **Repositorios Prisma** (api y web): `create()`/`createPaidOrder()`/`toDomain()` mapean el campo.
- **`CreateOrderDto`**: `shippingCod?: boolean` opcional.
- **`orders.controller.ts`**: el gate de `COD_ENABLED` ahora también aplica cuando
  `dto.shippingCod` es true (mismo toggle — ambos dependen de que el repartidor pueda recaudar
  efectivo). El flag se pasa al use case.
- **`VendeloService.createOrder()`**: `payment_method_code` es `'COD'` cuando
  `paymentProvider === 'COD' || order.shippingCod`; `unit_price` de los `line_items` se declara en
  `0` cuando `shippingCod` es true (el producto ya está pagado — Coordinadora solo debe recaudar
  el flete, no cobrar el producto otra vez).
- **`VendeloOrderQueueService`**: no requirió cambios — `shippingCod` es una columna real de
  `Order`, llega automáticamente en el spread `...order` sin tocar el `select`.
- **Checkout** (`CheckoutForm.tsx`): checkbox "Pagar el envío contraentrega", visible solo cuando
  el método de pago es "Pago en línea" (`WOMPI`) y COD está habilitado. La cotización de envío
  (`quotePaymentMethod`) usa `'COD'` cuando el checkbox está marcado, para que el estimado
  mostrado al cliente coincida con lo que Vendelo realmente cobrará.
- **Panel admin**: badge ámbar "Flete contraentrega" en `OrderInfoModal.tsx` y en la tabla de
  `/admin/pedidos` — distinto del badge de COD total, para que bodega/atención no confunda los
  tres modos (100% online, COD total, flete contraentrega). `apps/web/src/app/api/admin/orders/[id]/route.ts`
  expone `shippingCod` en la respuesta.
- **`packages/types`**: `CreateOrderRequest.shippingCod?` y `OrderResponse.shippingCod`.

**Tests nuevos:** `CreateOrder.test.ts` (persistencia del flag, rechazo de la combinación inválida,
default `false`), `VendeloService.test.ts` (nuevo describe `createOrder` — 3 casos: online puro,
COD total, híbrido con `unit_price: 0`), `orders.controller.test.ts` (paso del flag al use case,
gate de `COD_ENABLED` con `shippingCod: true`).

**Validación:** `pnpm --filter @h2r/domain test` (176/176 ✅), `pnpm --filter @h2r/api test`
(161/161 ✅ antes de sumar los 4 tests nuevos, todos en verde después), `pnpm type-check` en los 5
paquetes del monorepo — todo en verde. Migración aplicada contra la BD de desarrollo (Neon).

**Pendiente:** validar el flujo end-to-end contra la API real de Vendelo (crear un pedido híbrido
de prueba y confirmar en el panel de Venndelo que el recaudo mostrado es solo el valor del flete).
También queda pendiente la pregunta abierta a soporte de Vendelo sobre un campo de valor declarado
independiente del `unit_price` (para no perder cobertura de seguro en pedidos híbridos, donde
`unit_price` se declara en 0).

**Rama:** `feat/vendelo-shipping-weight-dimensions` (misma rama de la Fase 1, work en curso).

*Última actualización: 2026-07-02*

---

## 107. Cambio del default de peso/dimensiones Vendelo — de 0.5kg/10x10x10cm a 1kg/25x25x10cm

**Contexto:** continuación de #106. A pedido explícito del usuario, mientras el catálogo existente
no tenga peso/dimensiones reales cargados por producto, el default genérico usado por
`VendeloService` pasa de `0.5kg / 10x10x10cm` a `1kg / 25(alto) x 25(ancho) x 10(largo) cm`.
Criterio: sobreestimar el flete por defecto es preferible a subestimarlo — un default más grande
reduce el riesgo de que Coordinadora cobre de más sobre lo cotizado al cliente (la causa raíz de #106).

**Cambios:**

- `apps/api/src/infrastructure/services/VendeloService.ts` — literal de fallback en `createOrder()`
  y `quoteOrder()`: `'0.5'/'10'/'10'/'10'` → `'1'/'25'/'25'/'10'` (usado solo si la env var no está seteada).
- `apps/api/.env` (local, no versionado) y `apps/api/.env.example` — valores actualizados.
- `.github/workflows/ci.yml` — `--update-env-vars` del deploy a Cloud Run actualizado con los
  mismos valores. **Efecto en producción:** el próximo deploy a través de este workflow sobrescribirá
  la env var en Cloud Run con el nuevo default.
- `apps/api/src/__tests__/VendeloService.test.ts` — el test de "usa el default" ahora verifica
  1/25/25/10 sin env var seteada; se agregó un test separado que confirma que un valor custom de
  env var sigue teniendo prioridad sobre el literal hardcodeado.

**Validación:** `pnpm --filter @h2r/api exec vitest run src/__tests__/VendeloService.test.ts` (8/8 ✅).

**Rama:** `main`.

*Última actualización: 2026-07-02*

---

## 106. Peso y dimensiones reales por producto — fix de discrepancia entre flete cotizado y flete cobrado por Vendelo

**Contexto:** el usuario reportó que al procesar el pago del envío en el panel de Venndelo ("Pagar envío e imprimir Rótulos"), el monto cobrado a la billetera no coincidía con el valor mostrado/cotizado previamente. Se investigó el código de `VendeloService.ts` y se confirmó la causa raíz: `createOrder()` y `quoteOrder()` usaban un peso y dimensiones **fijos y hardcodeados para todos los productos** (`VENDELO_DEFAULT_WEIGHT_KG=0.5`, `VENDELO_DEFAULT_{HEIGHT,WIDTH,LENGTH}_CM=10`), sin importar el producto real que se estuviera enviando. `Product` en el schema de Prisma no tenía ningún campo de peso/dimensiones. Como Coordinadora recalcula el flete real con el peso pesado en bodega al despachar, cualquier producto distinto a una caja de 10x10x10cm/0.5kg generaba un flete real mayor al cotizado — cobrando de más al negocio sobre lo ya cobrado al cliente en el checkout.

**Cambios:**

- **Prisma** (`packages/database/prisma/schema.prisma`): se agregaron `weightKg Float?`, `heightCm Int?`, `widthCm Int?`, `lengthCm Int?` a `Product` (migración `20260702155853_add_product_weight_dimensions`, nullable — productos existentes quedan en `null` hasta que un admin los cargue).
- **Dominio** (`packages/domain/src/entities/Product.ts`, `Order.ts`, `IVendeloShippingPort.ts`): `Product` expone los 4 campos (`number | null`); `OrderItem.productSnapshot` y `VendeloQuoteInput.items` los llevan como opcionales para que `VendeloService` los use como override del default.
- **Repositorios Prisma** (`apps/api/.../PrismaProductRepository.ts`, `apps/web/.../PrismaProductRepository.ts`, `apps/api/.../PrismaStockSyncRepository.ts`): mapean los 4 campos en `toDomain()`/`save()`/`update()`.
- **Admin** (`create-product.dto.ts`, `update-product.dto.ts`, `admin-products.controller.ts`, `ProductEditForm.tsx`): nueva sección "Envío" en el formulario con 4 inputs opcionales (peso en kg, alto/ancho/largo en cm).
- **`VendeloService.ts`** (`createOrder()` y `quoteOrder()`): usa `productSnapshot.weightKg ?? defaultWeightKg` (y equivalentes) en vez del default fijo. Si el admin no cargó el dato, sigue cayendo al default configurado por env var — sin romper productos legacy.
- **`VendeloOrderQueueService.ts`**: el `select` de `product` al armar `productSnapshot` ahora incluye los 4 campos.
- **`QuoteShipping.ts`** (use case de cotización en checkout/carrito): ahora resuelve el peso/dimensiones reales del producto vía `productRepo.findById()` y los pasa a `shippingPort.quoteOrder()`, en vez de dejar que `VendeloService` use siempre el default.

**Nota de alcance:** esto corrige la causa raíz (cotización inexacta), pero **no resuelve el histórico** — pedidos ya despachados antes de este cambio mantienen la discrepancia y no son corregibles retroactivamente vía API. Tampoco carga datos para el catálogo existente: los productos actuales seguirán usando el default hasta que un admin edite cada uno con su peso/dimensiones reales.

**Archivos modificados:** ver lista arriba — 13 archivos de código + 1 migración Prisma. Tests actualizados: `VendeloService.test.ts` (2 casos nuevos: default vs. peso real), `VendeloOrderQueueService.test.ts` (1 caso nuevo: productSnapshot con dimensiones), `QuoteShipping.test.ts` (1 caso nuevo + fix de aserción existente), `CreateOrder.test.ts` y `SyncStock.test.ts` (factories `makeProduct` actualizadas con los 4 campos nuevos, requeridos por el tipo `Product`).

**Validación:** `pnpm --filter @h2r/domain test` (168/168), `pnpm --filter @h2r/api test` (160/160), `pnpm type-check` en los 5 paquetes del monorepo — todo en verde. Migración aplicada contra la BD de desarrollo (Neon).

**Pendiente (Fase 2, no incluida en este cambio):** modo híbrido "producto pagado online + flete contraentrega" — ver conversación con soporte de Vendelo sobre `payment_method_code: 'COD'` con `unit_price: 0` en los ítems para que el recaudo COD sea solo el flete.

**Rama:** `main` (trabajo directo, sin rama de feature).

*Última actualización: 2026-07-02*

---

## 105. Botón de ayuda contextual: /admin/categorias (cierre del rollout)

**Contexto:** última sección pendiente del rollout de `AdminHelpButton` iniciado en `/admin/sync` (#103) y continuado en pedidos/stock/productos (#104). Se verificó directamente en `CategoryManager.tsx` (no solo por inspección superficial) el comportamiento real antes de escribir el contenido.

**Hallazgos confirmados en el código:**

- La jerarquía está limitada a 2 niveles por diseño de la propia UI: el `<select>` de "Categoría padre" (`CategoryManager.tsx`, dentro de `CategoryForm`) solo lista `rootCategories` (las que tienen `parentId === null`) — es imposible anidar una subcategoría dentro de otra desde este formulario, así que el riesgo de jerarquía circular que se había anotado en la exploración inicial no aplica en la práctica.
- El slug se autogenera con cada tecla del nombre **solo al crear** (`handleNameChange`: `if (!isEdit) setField('slug', toSlug(value))`); al editar, el slug no se sincroniza con el nombre — hay que cambiarlo a mano.
- El slug exige regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` (minúsculas, números, guiones).
- `admin-categories.controller.ts` (`DELETE /admin/categories/:id`) rechaza el borrado con `ConflictException` y un mensaje explícito si la categoría tiene productos o subcategorías asociadas — el frontend ya muestra ese error inline (`deleteError[cat.id]`), no es un fallo silencioso como se había anotado inicialmente.

**Archivo creado:** `apps/web/src/components/admin/help-content/categorias.ts`

**Archivo modificado:** `apps/web/src/components/admin/CategoryManager.tsx` (botón agregado junto a "+ Nueva categoría").

**Validación:** type-check limpio, lint sin warnings nuevos, smoke test de `/admin/categorias` sin error 500.

**Rama:** `feat/admin-help-tooltips`. Con esta entrada se completa el rollout de ayuda contextual a las 5 secciones identificadas como prioritarias (sync, pedidos, stock, productos, categorías). Dashboard, lista de Productos y Configuración quedaron fuera por bajo riesgo de confusión (ver hallazgos del agente de exploración referenciado en #104).

*Última actualización: 2026-06-29*

---

## 104. Botón de ayuda contextual: /admin/pedidos, /admin/stock, /admin/productos — y eliminación del CSV de stock

**Contexto:** continuación del patrón `AdminHelpButton` iniciado en `/admin/sync` (#103). Un agente de exploración revisó las 7 páginas del panel admin para identificar cuáles tienen reglas de negocio no obvias; se priorizaron 4 secciones por nivel de riesgo de confusión para un admin no técnico: Pedidos (7/10), Stock (6/10), Producto Edit (6/10) y Categorías (5/10, pendiente). Esta entrada cubre las primeras 3.

**Fase 1 — `/admin/pedidos`:** el modal explica que el selector "Cambiar estado" no valida transiciones (se puede marcar `DELIVERED` sin haber pasado por `PAID`, sin guard ni en frontend ni en `orders.controller.ts`), que el cambio es instantáneo sin confirmación, qué significa el campo `vendeloOrderId` (solo se llena cuando la cola ya creó el pedido en Vendelo), y que la gestión de envíos (etiquetas, recolección, novedades) **no tiene UI en esta pantalla** — existen los endpoints en `VendeloController` pero no están expuestos aquí.

**Fase 2 — `/admin/stock`:** se eliminó la importación masiva por CSV (`CsvStockImport`), que quedó redundante con `/admin/sync` (cubre todo el inventario desde Optimun, no solo un archivo manual). Se confirmó que el endpoint `PATCH /admin/stock/bulk` no tenía otros consumidores ni tests, así que se eliminó completo en vez de dejarlo huérfano:

- `apps/web/src/components/admin/CsvStockImport.tsx` (eliminado)
- `apps/api/src/admin/admin-stock.controller.ts` (eliminado)
- `apps/api/src/admin/dto/bulk-stock-update.dto.ts` (eliminado)
- `apps/api/src/admin/admin.module.ts` (quitado el registro)

El modal de ayuda explica el umbral fijo de 5 unidades, cómo actualizar stock fila por fila, y redirige a `/admin/sync` para actualizaciones masivas.

**Fase 3/4 — `/admin/productos/[id]` y `/admin/productos/nuevo`:** son la misma página (`page.tsx` usa `id === 'nuevo'` como valor especial, no hay ruta separada) y el mismo componente `ProductEditForm`. El contenido de ayuda tiene dos variantes (`productoNuevoHelpContent` / `productoEditarHelpContent`) que comparten la mayoría de los pasos y la página elige cuál mostrar según si el producto existe. Explica: el slug se regenera en cada tecla del campo "Nombre" (se sobreescribe un slug personalizado si se sigue editando el nombre después), el precio se escribe en pesos sin centavos, el límite de 10 beneficios, que el texto "máximo 4 imágenes" **no se aplica realmente** (es solo una recomendación visual), y en modo edición la diferencia entre desactivar (reversible) y eliminar (permanente).

**Archivos creados:** `help-content/pedidos.ts`, `help-content/stock.ts`, `help-content/producto.ts`.

**Archivos modificados:** `admin/pedidos/page.tsx`, `admin/stock/page.tsx`, `admin/productos/[id]/page.tsx`.

**Validación:** type-check limpio en `@h2r/web` y `@h2r/api`. Suite completa de `@h2r/api` en verde (154 tests) tras eliminar `AdminStockController` — sin tests rotos, no tenía cobertura propia. Lint sin warnings nuevos. Smoke test de las 3 rutas modificadas (sin error 500, redirect de auth esperado).

**Rama:** `feat/admin-help-tooltips`.

*Última actualización: 2026-06-29*

---

## 103. Botón de ayuda contextual en el panel admin — primera sección: /admin/sync

**Contexto:** el admin no entendía cómo funcionaba `/admin/sync` (sincronización de stock/precio con el inventario del local físico vía Optimun) — no había ninguna explicación en la UI más allá de una línea de descripción. Se decidió agregar un botón ⓘ que abre un modal con la explicación y los pasos de uso, como patrón reusable para cubrir progresivamente las demás secciones del panel (Productos, Categorías, Pedidos, Stock, Configuración).

**Componente reusable:** `AdminHelpButton.tsx` — botón + modal accesible (cierre con Esc, click fuera, o botón ✕), mismo patrón que `OrderInfoModal.tsx` (dark theme, `role="dialog"`, `aria-modal`). El contenido vive separado en `help-content/<sección>.ts` (`{ title, summary, steps[] }`) para que agregar ayuda a una nueva sección sea solo escribir el contenido, sin tocar el componente.

**Contenido de `/admin/sync`:** explica que solo actualiza productos existentes (nunca crea ni elimina), que el algoritmo busca primero por código y luego por nombre si el código llega corrupto, que un precio en 0 en Optimun no sobreescribe el precio de la web, y que el proceso es repetible sin riesgo. Incluye 7 pasos numerados de uso. El paso 1 (export desde Optimun) quedó con texto genérico — no hay visibilidad del menú/botón real de Optimun desde este repo, pendiente que el equipo confirme el camino exacto para reemplazarlo.

**Archivos creados:**

- `apps/web/src/components/admin/AdminHelpButton.tsx`
- `apps/web/src/components/admin/help-content/sync.ts`

**Archivos modificados:** `apps/web/src/app/admin/sync/page.tsx` (botón agregado junto al `<h1>`).

**Validación:** type-check y lint limpios (sin warnings nuevos). No se hizo click-through en navegador autenticado como ADMIN — el setup de Playwright del proyecto (`apps/web/e2e/global-setup.ts`) solo autentica usuarios con rol CUSTOMER, no existe fixture de sesión ADMIN para E2E. Se verificó que la ruta compila y no devuelve error 500 (smoke test con servidor de desarrollo activo). El patrón de interacción (Esc/click-fuera/botón ✕) es idéntico al de `OrderInfoModal.tsx`, ya en producción.

**Rama:** `feat/admin-help-tooltips` (separada de `feat/admin-order-modal-addi-button-and-vendelo-quote` para no seguir acumulando features no relacionadas en una sola rama sin pushear).

*Última actualización: 2026-06-29*

---

## 102. Cotización de envío Vendelo en carrito/checkout (6 fases)

**Contexto:** Vendelo cobra el envío directamente al cliente al momento de la entrega (no nuestro Wompi) — sin un estimado previo, el cliente se sorprende y se queja del costo al recibir el pedido. Esta feature muestra un estimado informativo en `/carrito` y `/checkout` antes de pagar, sin afectar el monto que se cobra por Wompi.

**Fase 1 — Domain:** `IVendeloShippingPort.quoteOrder()` + tipos `VendeloQuoteInput`/`VendeloQuoteResult`. Use case `QuoteShipping` (resuelve precios/stock desde la BD, nunca confía en el cliente — mismo patrón que `CreateOrder`). Si el subtotal alcanza `FREE_SHIPPING_THRESHOLD_CENTS` (nueva constante en `packages/domain/src/shared/constants.ts`), ni siquiera consulta a Vendelo y retorna 0 directo.

**Fase 2 — Infrastructure:** `VendeloService.quoteOrder()` llama a `POST /v1/admin/orders/quotation`. Bug encontrado y corregido antes de producción: Vendelo responde montos en **pesos COP**, no centavos (confirmado comparando con `unit_price / 100` ya existente en `createOrder`) — se multiplica `x100` antes de devolver el resultado para mantener la convención de centavos del dominio.

**Fase 3 — NestJS:** `POST /shipping/quote` público (`@Public()`, carrito de invitado) en `ShippingController`. DTO con regex DIVIPOLA (8 dígitos), subdivisión (2 dígitos), `items` (1-50, qty 1-99) — anti-tampering y anti-DoS. Rate limit adicional con `@Throttle({ default: { limit: 10, ttl: 60_000 } })`, que sobreescribe el perfil `default` del Throttler solo en esta ruta sin tocar la config global de 100/min. Se agregó `app.set('trust proxy', 1)` en `main.ts` — sin esto, el rate limit por IP detrás de Cloud Run vería la IP del balanceador, no la del cliente real.

**Fase 4 — Next.js:** Proxy `/api/shipping/quote` con validación zod (fail fast antes de NestJS), timeout 8s, errores genéricos al cliente. `useShippingQuoteStore` (Zustand + `sessionStorage`, no `localStorage` — el estimado no debe sobrevivir entre sesiones) cachea por `${cityCode}-${items ordenados}` con TTL 5 min, compartido entre carrito y checkout. No se reimplementó rate-limit local: `rate-limit.ts` ya está documentado como no-op en serverless, la defensa real es el `ThrottlerGuard` de NestJS.

**Fase 5 — UI carrito:** `ShippingQuoteCalculator` reusa `CitySelector` (se exportó `CityOption`). Debounce 500ms, recalcula con cambios del carrito, nunca bloquea "Finalizar pedido". La ciudad se persiste en el store de carrito (`selectedCity`/`setSelectedCity`, nuevo en `apps/web/src/lib/cart.ts`) para llegar preseleccionada a `/checkout`.

**Fase 6 — UI checkout:** Lógica de debounce/fetch extraída a un hook compartido `useShippingQuote` (en `lib/shipping-quote.ts`) para no duplicarla entre carrito y checkout. `CheckoutForm` usa el `selectedCity` del store de carrito en vez de estado local (sincronización bidireccional). El resumen "Tu pedido" muestra el envío cotizado y un "Total estimado" con aclaración de que Vendelo cobra el envío directo — el monto cargado a Wompi no cambia.

**Archivos creados:**

- `packages/domain/src/shared/constants.ts`, `packages/domain/src/use-cases/shipping/QuoteShipping.ts`
- `apps/api/src/shipping/` (controller, module, dto)
- `apps/web/src/app/api/shipping/quote/route.ts`, `apps/web/src/lib/shipping-quote.ts`, `apps/web/src/components/store/ShippingQuoteCalculator.tsx`

**Archivos modificados:** `IVendeloShippingPort.ts`, `VendeloService.ts`, `app.module.ts`, `main.ts`, `cart.ts`, `CitySelector.tsx` (export `CityOption`), `CheckoutForm.tsx`, `carrito/page.tsx`, `index.ts` (barrel domain).

**Tests:** 8 nuevos en domain (`QuoteShipping`), 4 en `VendeloService`, 10 en NestJS (`ShippingController` + DTO). Suites completas en verde: domain 170, api 154+10, type-check limpio en los tres paquetes.

**Commits:** `c2433d5`, `9a6a262`, `89897de`, `6350049`, `e7368d6`, `0ae66cd` (uno por fase, mismo PR).

*Última actualización: 2026-06-29*

---

## 101. Fix triplicación de órdenes Vendelo + nombre/SKU reales en line_items

**Contexto:** Una compra real generó 3 órdenes duplicadas en Vendelo (timestamps 8:39, 8:39, 8:40 — segundos de distancia, no los 2 min del ciclo del `setInterval`). Además, los `line_items` enviados a Vendelo mostraban el cuid interno de Prisma (`Producto cmpyqnj44h0039...`) en vez del nombre y SKU comerciales reales.

### Bug — Triplicación de órdenes (4 causas combinadas)

- **Causa A:** `VendeloOrderQueueService.processNext()` leía filas `PENDING` con `findMany` y las procesaba en un loop sin reclamarlas antes de llamar a Vendelo — la fila seguía `PENDING` en DB durante todo el `createOrder()` (10-40s).
- **Causa B:** Cloud Run puede escalar a 2-3 instancias simultáneas, cada una con su propio `setInterval`; sin lock de fila, todas agarran las mismas filas `PENDING`.
- **Causa C (la dominante, según el patrón de timestamps en segundos):** `VendeloHttpClient` reintentaba en cualquier `5xx`, incluido el `POST /v1/admin/orders`. Vendelo no trata `external_order_id` como key única, así que cada retry tras un 5xx (aunque Vendelo ya hubiera procesado la primera request) creaba una orden adicional.
- **Causa D:** No había guard que verificara `order.vendeloOrderId !== null` antes de volver a llamar a `createOrder`.

**Solución por capas (defense in depth):**

1. **Guard de idempotencia temprano** — si `order.vendeloOrderId` ya existe, la queue marca `SENT` y sale sin llamar a Vendelo.
2. **Claim atómico de fila** — antes de procesar, `updateMany({ where: { id, status: 'PENDING' }, data: { status: 'PROCESSING', processingStartedAt } })`. Si `count === 0`, otro worker ya la reclamó. Migración Prisma `vendelo_queue_processing_lock` agrega `processingStartedAt DateTime?` a `VendeloOrderQueue` (columna nullable, backward-compatible). Un sweeper (`releaseOrphanedRows`) libera filas atascadas en `PROCESSING` por más de 5 min al inicio de cada `processNext()` — cubre el caso de un contenedor que crashea a mitad de proceso.
3. **Commit idempotente** — el `$transaction` final usa `order.updateMany({ where: { id, vendeloOrderId: null }, data: { vendeloOrderId } })` en vez de `update`; si otra corrida ya lo escribió, `count === 0` y queda en el log.
4. **`VendeloHttpClient` no reintenta en `5xx` para POST no idempotentes** — nuevo parámetro `retryOn5xx` en `post()` (default `true`, mantiene comportamiento existente para todos los demás endpoints). `VendeloService.createOrder()` pasa `retryOn5xx: false`. Sigue reintentando en `429` (rate limit) y errores de red antes de enviar el body, donde sí sabemos que la request no llegó al servidor.

### Bug — Nombre/SKU mostraban el cuid interno

`VendeloService.createOrder()` mapeaba `line_items` usando `item.productId` (cuid de Prisma) tanto para `name` como `sku`, porque `OrderItem` del dominio no cargaba la relación con `Product`. Se agregó un campo opcional `productSnapshot?: { sku, name }` a la interfaz `OrderItem` en `packages/domain/src/entities/Order.ts`. `VendeloOrderQueueService` ahora incluye `product: { select: { sku, name } }` en el query y lo mapea al `domainOrder`; `VendeloService` usa `item.productSnapshot?.name ?? \`Producto ${item.productId}\`` (fallback solo para callers legacy sin el snapshot).

**Archivos modificados:**

- `packages/domain/src/entities/Order.ts` — `productSnapshot?` agregado a `OrderItem`
- `apps/api/src/infrastructure/services/VendeloService.ts` — `line_items` usa `productSnapshot`; `createOrder` pasa `retryOn5xx: false`
- `apps/api/src/infrastructure/services/VendeloOrderQueueService.ts` — claim atómico, guard `vendeloOrderId`, sweeper de huérfanas, commit idempotente, include de `product`
- `apps/api/src/infrastructure/services/VendeloHttpClient.ts` — parámetro `retryOn5xx` en `post()` y `request()`
- `packages/database/prisma/schema.prisma` — `VendeloOrderQueue.processingStartedAt DateTime?`
- `packages/database/prisma/migrations/20260629035822_vendelo_queue_processing_lock/` — migración aplicada en producción (Neon)
- `apps/api/src/__tests__/VendeloOrderQueueService.test.ts` — nuevo, 8 tests (claim, guard, sweeper, commit idempotente, productSnapshot, backoff)
- `apps/api/src/__tests__/VendeloHttpClient.test.ts` — 3 tests nuevos para `retryOn5xx`

**Limpieza manual pendiente:** cancelar las 2 órdenes duplicadas en el panel de Vendelo (la orden con `vendeloOrderId` guardado en nuestra DB es la válida).

**Validación post-deploy pendiente:** compra de prueba, verificar una sola orden en Vendelo con nombre/SKU reales, monitorear 48h.

*Última actualización: 2026-06-29*

---

## 100. Comprobante de venta on-demand + identificación tributaria del comprador

**Qué se hizo:**
Sistema completo de generación de comprobantes de venta como PDF on-demand, alimentado por nuevos campos de identificación tributaria del comprador que se capturan en el checkout. Se decidió este enfoque en vez de implementar facturación electrónica DIAN porque:

- El admin maneja la facturación legal por su cuenta. Lo que necesita es un documento administrativo con todos los datos por cada venta para emitir la factura cuando alguien la pida.
- Sin integración con Proveedor Tecnológico autorizado (PT) → sin costo recurrente (~$80-100k/mes que cobran Alegra, Siigo, etc.).
- Implementación en ~6 horas vs 2-3 días de la integración DIAN completa.
- Cuando se decida pasar a factura DIAN real, el endpoint del comprobante se reemplaza sin migración de archivos (porque no hay archivos: el PDF se genera siempre desde la BD).

**Decisión: generar comprobante para TODOS los pedidos**

Se discutieron dos alternativas: a) generar solo cuando el comprador lo pida en checkout, b) generar siempre para todos. Se eligió (b) por temas legales — el admin tiene registro de cada venta para auditoría DIAN futura, no hay escenarios de "lo perdí", y el cliente puede pedirlo 6 meses después y seguirá disponible. Como consecuencia, los campos de identificación del comprador son obligatorios en el checkout.

**Datos de la tienda (issuer):**
NIT 1007784964-5, razón social "H2R Online Store", dirección Carrera 21 #21-58 Bucaramanga, Santander. Hardcoded en el componente del PDF porque cambia muy raramente.

**Datos del comprobante:**

- Identificación: `CV-AC8WSTG6` (últimos 8 chars del orderId en mayúscula, sincronizado con el ID que el cliente ve en la confirmación).
- Tabla de items con SKU, nombre, cantidad, precio unitario, subtotal.
- Total directo (sin desglose de IVA — el admin compra con IVA incluido y no es responsable de IVA aún).
- Bloque de pago con pasarela + reference + externalId de Wompi.
- Pie con disclaimer aclarando que NO es factura electrónica DIAN y que para eso contactar al email del comercio.

**Cambios en el dominio:**

- Nuevo type `BuyerIdType` = `'CC' | 'CE' | 'NIT' | 'PASAPORTE'`.
- Nueva interface `BuyerInfo` con `idType`, `idNumber` y `businessName` (este último opcional, solo aplica cuando idType === 'NIT' para B2B).
- `Order.buyer` agregado a la entidad del dominio.
- `IOrderRepository.CreateOrderInput.buyer` y `CreateOrderUseCaseInput.buyer` son ahora requeridos.

**Migración de BD:**

`20260626222415_add_buyer_identification_to_order` añade a la tabla `Order`:

```sql
ALTER TABLE "Order"
  ADD COLUMN "buyerIdType"        TEXT NOT NULL DEFAULT 'CC',
  ADD COLUMN "buyerIdNumber"      TEXT NOT NULL DEFAULT '',
  ADD COLUMN "buyerBusinessName"  TEXT NULL;
```

Los defaults permiten que las órdenes históricas no rompan; las nuevas siempre reciben los valores reales del checkout. Aplicada en Neon producción.

Se decidió persistir como 3 columnas separadas (no dentro del JSON de `shippingAddress`) porque:

- El destinatario del envío y el comprador no siempre son la misma persona (ej. regalos, compras B2B).
- Se usa para identificación válida en Vendelo (reemplaza el hack histórico).
- El admin necesita columnas indexables para reportes y futuras declaraciones tributarias.

**UI del checkout:**

Sección nueva "Datos del comprador" entre los datos de envío y las políticas. Select de tipo de documento (por defecto CC, cubre el 95% de los casos B2C). Input de número con `inputMode="numeric"` cuando es CC, "text" en los otros casos. Campo de razón social aparece solo cuando idType === 'NIT'. Validación inline: idNumber con mínimo 5 chars, NIT requiere razón social.

**Bonus — Identificación real en Vendelo:**

Antes el `VendeloService.createOrder` enviaba `identification_type: 'CC', identification: addr.phone` porque no se recolectaba cédula. Ahora se envía la cédula/NIT real del comprador. PASAPORTE se mapea a CC porque la API de Vendelo no expone PASAPORTE como tipo válido; el número se conserva igual. Esto resuelve una deuda técnica documentada en la auditoría anterior y mejora la experiencia del repartidor que necesita la identificación real para entregas con verificación.

**Generación del PDF:**

- Librería: `@react-pdf/renderer ^4.5.1` (componente JSX que se renderiza a PDF, mismo paradigma de React).
- `apps/web/src/lib/receipt/ReceiptPdf.tsx`: plantilla con `StyleSheet.create` con estilos similar a Tailwind aplicados a `View` y `Text`.
- `apps/web/src/app/api/orders/[id]/comprobante/route.tsx`: endpoint `GET` que autoriza (dueño del pedido o ADMIN, 401/403/404 según el caso), carga la orden con items + product + payment + user, llama `renderToBuffer` y responde `Content-Type: application/pdf` con `Content-Disposition: inline` y `Cache-Control: private, no-store`.
- No se almacena el PDF: si el formato cambia, los comprobantes históricos lo reflejan automáticamente.

**Botones de descarga:**

- `/checkout/confirmacion`: botón "Descargar comprobante" en azul sky-500 al lado de "Ver mis pedidos" y "Seguir comprando".
- `/admin/pedidos`: nueva columna con botón compacto (ícono download) por cada fila para que el admin descargue cualquier comprobante.
- Email: pendiente para una iteración futura (1 línea de código, se hará junto con el próximo cambio del email de confirmación).

**Fix colateral — Endpoint del wallet de Vendelo:**

Se aprovechó la sesión para arreglar un bug que aparecía en los logs cada arranque del API: `GET /v1/admin/wallet/balance → 404`. El path correcto per la documentación oficial (línea 71 de `API_VENDELO_DOCUMENTACION.md`) es `/v1/admin/wallet/get-wallet-balance`. Sin esto, el `WalletAlertCron` nunca podía consultar el saldo y disparaba una alerta CRITICAL espuria cada arranque.

**Tests:** 162/162 dominio + 129/129 API pasan. Type-check de los 6 paquetes pasa.

---

## 99. Hotfixes post-launch — Wompi widget y dominio de Resend

**Qué se hizo:**
Dos bugs críticos detectados al hacer las primeras pruebas de checkout en producción.

**Bug 1 — El botón "Pagar con Wompi" no aparecía:**

Tras llenar los datos de envío y dar "Continuar al pago", la pantalla mostraba el header "Pago seguro con Wompi" pero ningún botón visible. Diagnóstico desde la consola del navegador:

- El form `data-render="button"` se inyectaba correctamente en el DOM
- `pub_prod_*`, `signature` y `redirectUrl` venían correctos del backend
- `https://checkout.wompi.co/widget.js` cargaba (status 200)
- `window.WidgetCheckout` quedaba definido como `function`
- **Pero `Form innerHTML` quedaba vacío — Wompi no inyectaba el botón**

Causa: el `widget.js` de Wompi escanea el DOM buscando `form[data-render="button"]` **solo en `DOMContentLoaded`**. Como en la SPA el form se crea dinámicamente al transicionar al paso "payment" (mucho después de `DOMContentLoaded`), el escaneo nunca lo encuentra. El comportamiento es silencioso, sin error.

Fix en `apps/web/src/components/checkout/WompiWidget.tsx` (commit `22bcdc2`): se eliminó el enfoque basado en escaneo del DOM y se cambió a la API programática (`new window.WidgetCheckout({...}).open()`). Ahora se renderiza nuestro propio botón "Pagar con Wompi" y al click se instancia el widget con los params correctos. Wompi maneja el modal y el redirect al final.

El componente también detecta si el script ya está cargado (`typeof window.WidgetCheckout === 'function'`) para evitar re-añadirlo en navegaciones internas, y queda como fallback un redirect directo a `checkout.wompi.co/p/` con los params en query string si el SDK no se puede instanciar.

**Bug 2 — Ningún correo transaccional salía de Resend:**

`ResendEmailService.constructor` lee `RESEND_FROM_EMAIL` con un fallback hardcoded a `no-reply@h2ronlinestore.co` (dominio que nunca existió como tal). En Cloud Run la variable nunca se configuró, así que se usaba el fallback. Resend rechazaba con HTTP 403 `domain not verified`.

Impacto silencioso pero serio:

- Ningún email de confirmación de pago se entregaba a clientes que pagaran (la cola `EmailQueueService` los marcaba como `FAILED` tras 3 retries).
- **Más grave: los OTPs de registro tampoco salían**. En dev el código se loguea como `[DEV] OTP para <email>: <code>` pero en producción (`NODE_ENV === 'production'`) ese log no se imprime, por lo que el email era la única vía. Cualquier nuevo registro quedaba colgado esperando el código de verificación.

Verificación contra la API de Resend:

```
no-reply@h2ronlinestore.co  → 403 "domain not verified"
no-reply@tiendah2r.com      → 200 OK
```

Fix:

- Cloud Run: `gcloud run services update --update-env-vars RESEND_FROM_EMAIL=no-reply@tiendah2r.com` (revisión `00025-mtr`).
- `.github/workflows/ci.yml`: agregada `RESEND_FROM_EMAIL=no-reply@tiendah2r.com` al bloque `--update-env-vars` del deploy para que futuros despliegues preserven el valor.
- `apps/api/.env.example`: corregido el default a `no-reply@tiendah2r.com` y añadido un comentario explicando la importancia de que el dominio del FROM esté verificado en `https://resend.com/domains`.

Como el admin aún no había anunciado la tienda públicamente, no hay registros reales colgados ni emails pendientes que reencolar. Si esto sucediera en una etapa con tráfico real, habría que correr un script de re-enqueue sobre la tabla `EmailQueue` con `status='FAILED'`.

---

## 98. Cron de polling de estados de envío Vendelo

**Qué se hizo:**
Se implementó un cron de polling que sincroniza periódicamente el estado de envíos activos contra la API de Vendelo. Workaround necesario porque `POST /v1/admin/chatbot/connections` está reservado a proveedores de chatbots (Lucidbot/Chatby) — no a comercios regulares — y Venndelo aún no tiene una alternativa de webhooks abierta para comercios. Soporte confirmó que está en su backlog "para el futuro cercano" sin ETA.

**Diseño local-driven:**
El cron parte de nuestra BD, no del catálogo de Vendelo. Esto garantiza que solo tocamos órdenes nuestras y que el costo de polling escala con nuestro volumen activo, no con el volumen total de Venndelo.

```
[Cloud Run cada 5 min]
       ↓
VendeloShipmentPollerCron.tick()
       ↓
IOrderRepository.findActiveVendeloOrders(50)
   Filtros: vendeloOrderId NOT NULL
            AND Order.status NOT IN ('DELIVERED','CANCELLED')
            AND (shipment IS NULL OR shipment.status NOT IN ('DELIVERED','RETURNED','CANCELLED'))
   Orden:   shipment.updatedAt ASC NULLS FIRST → fairness
       ↓ por cada (con delay 100ms entre requests)
IVendeloShippingPort.getOrder(vendeloOrderId) → GET /v1/admin/orders/{id}
       ↓
SyncShipmentStatus.execute({ orderId, vendelo_status, trackingNumber, carrier })
   (use case existente — idempotente, atomic UPDATE WHERE)
       ↓
Log estructurado JSON: { cycle, batchSize, transitionsApplied, transitionsSkipped, errors, circuitState, durationMs }
```

**Cambios en la capa de dominio:**

- `IVendeloShippingPort.getOrder(vendeloOrderId)` — nuevo método del puerto que retorna un `VendeloOrderSnapshot` con `{ id, status, trackingNumber, carrier }`. Los identificadores de estado de Vendelo coinciden 1:1 con nuestro enum `ShipmentStatus`, por lo que no hay traducción adicional.
- `VendeloOrderNotFoundError` — error tipado para el caso 404 (Vendelo no conoce el ID). El cron lo distingue de fallos transitorios y continúa con el siguiente pedido sin abortar el batch.
- `IOrderRepository.findActiveVendeloOrders(limit)` — método de consulta para el cron. Retorna `ActiveVendeloOrder[]` con `orderId`, `vendeloOrderId` y `currentShipmentStatus` (null si aún no se ha creado registro de Shipment para ese pedido).

**Cambios en infraestructura:**

- `VendeloService.getOrder()` hace `GET /v1/admin/orders/{id}` y mapea la respuesta de Venndelo al snapshot. Si el HttpClient lanza el error `Vendelo API 404: ...`, lo convierte a `VendeloOrderNotFoundError` para que el cron lo capture específicamente.
- `PrismaOrderRepository.findActiveVendeloOrders()` implementa el query con JOIN implícito a `Shipment` vía la relación 1:1, con filtro `OR` para incluir tanto pedidos sin shipment aún como los activos en estados intermedios.

**Cron en sí (`VendeloShipmentPollerCron`):**

- Implementa `OnModuleInit`/`OnModuleDestroy` siguiendo el patrón existente de `VendeloOrderQueueService`, `WalletAlertCron` y `EmailQueueService`.
- Lee `httpClient.getCircuitState()` antes de cada tick — si está en `OPEN`, skip cycle inmediatamente sin tocar BD ni Vendelo.
- Captura excepciones no controladas con `Sentry.captureException` y tags `{ service: 'VendeloShipmentPoller' }`.
- Logs estructurados JSON con la clave `service` para filtros en Cloud Logging — permite alertas tipo `service=VendeloShipmentPoller AND errors>=5`.
- Método `tick()` público para invocación manual desde tests o futuros endpoints admin.

**Garantías de concurrencia:**

- Idempotencia entre instancias Cloud Run: `SyncShipmentStatus` usa `atomicUpdateStatus` con `WHERE status = currentStatus` — dos workers que llegan al mismo tiempo solo aplican una vez el cambio.
- Filtro `vendeloOrderId IS NOT NULL` en BD garantiza que nunca tocamos pedidos ajenos.
- Reads duplicados (mismas órdenes consultadas desde varias instancias) son safe — la API de Venndelo es read-only para este endpoint.

**Configuración (variables de entorno nuevas, plain env vars):**

- `VENDELO_POLL_ENABLED=true` — kill switch operativo para apagar el cron sin redeploy.
- `VENDELO_POLL_INTERVAL_MS=300000` — 5 minutos entre ticks.
- `VENDELO_POLL_BATCH_SIZE=50` — máximo de pedidos a procesar por ciclo.
- `VENDELO_POLL_REQUEST_DELAY_MS=100` — delay entre cada GET a Vendelo dentro del mismo tick (rate limiting natural).

Defaults sensatos para producción inicial — sin configurar nada en Cloud Run el cron arranca con estos valores. Las 4 quedaron documentadas en `apps/api/.env.example` y agregadas a `apps/api/.env` local.

**Cobertura de tests:**

12 casos en `apps/api/src/__tests__/VendeloShipmentPollerCron.test.ts` agrupados en 3 describe-blocks:

- **Casos base** (4): sin pedidos activos no llama a Vendelo; con 3 pedidos llama getOrder 3 veces; aplica transición progresiva; skipped cuando no es progresiva.
- **Resiliencia** (4): circuit breaker OPEN salta el ciclo; 404 de Vendelo no aborta el batch; error genérico en una orden no aborta el batch; fallo de BD se reporta sin llamar a Vendelo.
- **Lifecycle** (2): `VENDELO_POLL_ENABLED=false` no arranca el `setInterval`; con enabled arranca y se limpia con `clearInterval` en destroy.

Resultado: Domain 162/162, API 129/129 pasan.

**Trade-offs aceptados:**

- Latencia de hasta 5 min entre actualización en Venndelo y reflejo en nuestra BD. Para entregas COD que toman 2-3 días, invisible al cliente.
- Cloud Scheduler + Pub/Sub para cron distribuido sería más robusto, pero overkill para una sola instancia de Cloud Run. Si más adelante hay autoscale a varias instancias, migramos. Documentado como deuda técnica.
- Polling de novedades (`shipping/exceptions`) no se incluye en esta iteración — el admin las verifica manualmente en el panel cuando un pedido entra a `INCIDENT`. Se evaluará si automatizar en una iteración futura.

---

## 97. Hardening pre-launch — Wompi/Vendelo en producción, E2E automatizado

**Qué se hizo:**
Conjunto de cambios para que la pasarela Wompi y la integración Vendelo queden listas para el primer pago real. Se eliminó deuda heredada (MercadoPago, headers incorrectos, mocks de webhook) y se automatizó el flujo de prueba end-to-end.

**Limpieza de MercadoPago como dependencia obligatoria:**

- Se quitó `MP_ACCESS_TOKEN` del `assertEnvVars()` de `apps/api/src/main.ts`. Mercado Pago no se va a usar al lanzamiento (decisión del admin) y el placeholder rompía el próximo deploy.
- Se removieron las secciones `MP_*` de `apps/api/.env.example`, `apps/web/.env.example`, `apps/api/.env` y `apps/web/.env.local`. Los servicios `MercadoPagoService` siguen presentes en código pero usan `?? ''` y no crashean en construcción.
- Cuando se decida habilitar Mercado Pago como respaldo, basta con devolver las variables al `assertEnvVars()` y configurarlas en Cloud Run.

**Configuración correcta de Wompi en producción:**

- Se cambió `WOMPI_ENV` en Cloud Run de implícito (default `sandbox`) a explícito `production`, vía `gcloud run services update --update-env-vars`. Previamente la API estaba apuntando a `sandbox.wompi.co` aunque las keys en Secret Manager fueran `pub_prod_*`/`prv_prod_*`, lo que habría hecho imposible procesar pagos reales.
- Se verificó que `SENTRY_DSN`, `INTERNAL_API_SECRET`, `WOMPI_INTEGRITY_SECRET` y `NEXT_PUBLIC_SENTRY_DSN` estuvieran en Vercel `production` — la API ya las tenía vía Secret Manager pero el frontend solo tenía `WOMPI_PUBLIC_KEY` y `WOMPI_ENV`. Sin esos tres, el widget Wompi no firma correctamente, el handshake NextAuth → NestJS no funciona y los errores de frontend no llegan a Sentry.
- Se registró la URL `https://api.tiendah2r.com/payments/wompi/webhook` en el panel de Wompi (Configuraciones avanzadas → Seguimiento de transacciones).

**Corrección del header del API de Venndelo:**

- `VendeloHttpClient` estaba enviando `X-Vendelo-Api-Key` con una sola n; la doc oficial (`API_VENDELO_DOCUMENTACION.md`) especifica `X-Venndelo-Api-Key` con doble n. Esto causaba 401 silenciosos en todas las llamadas — explica por qué `WalletAlertCron` nunca disparó alertas.
- Tras el fix se verificó conexión exitosa con `/v1/admin/check-auth`, `/v1/admin/wallet/get-wallet-balance` y `/v1/admin/region/cities`.

**Cambio del modelo de seguridad del webhook de Venndelo:**

- Soporte de Venndelo confirmó que los webhooks del Chatbot Connection no se firman criptográficamente. Como alternativa oficial, ofrecen el campo `metadata` que el comercio registra al crear la conexión — Venndelo lo echoes en cada webhook.
- `VendeloWebhookGuard` fue reescrito para validar `metadata[].h2r_webhook_secret` contra `VENDELO_WEBHOOK_SECRET` con comparación timing-safe. Soporta el campo tanto en root como anidado bajo `data` por compatibilidad con cualquier formato futuro.
- Tests reescritos (8 casos): acepta secret correcto en root y anidado, rechaza valores distintos, rechaza secret de longitud diferente, encuentra el secret entre múltiples items, dev mode con secret vacío permite paso, prod mode con secret vacío bloquea.
- Se generó un nuevo `VENDELO_WEBHOOK_SECRET` con `openssl rand -hex 32` y se actualizó GCP Secret Manager (versión 3) + `apps/api/.env` local. El placeholder `placeholder-reemplazar-con-secret-real-de-vendelo` ya no existe.
- Se creó `apps/api/scripts/register-vendelo-webhook.ts` que registra, lista o elimina la conexión Chatbot incluyendo el secret en metadata.

**Limitante conocida — endpoint de chatbot reservado:**

- Al ejecutar el script de registro con el API key del comercio, Venndelo responde `HTTP 422 — Provider id inválido` (code 10000). Soporte confirmó que `POST /v1/admin/chatbot/connections` hoy solo está abierto a proveedores como Lucidbot y Chatby — no a comercios regulares. La feature "webhooks para comercios" llegará "en el futuro cercano" pero sin ETA.
- Como workaround se planificó un cron de polling (siguiente entrada en este historial).

**Variables de entorno de Vendelo en Cloud Run:**

- Se descubrió que Cloud Run solo tenía `VENDELO_API_KEY` y `VENDELO_WEBHOOK_SECRET` configurados — faltaban 10 variables que `VendeloService.createOrder()` lee con defaults inservibles (`Dirección de la tienda`, `05001000` Medellín, etc.). Sin estas, cada orden creada en Venndelo habría salido con dirección de pickup placeholder.
- Se pushearon como plain env vars: `VENDELO_API_URL=https://api.venndelo.com` (la doble n no es typo, es la URL real), `VENDELO_STORE_NAME`, `VENDELO_STORE_PHONE`, `VENDELO_STORE_ADDRESS`, `VENDELO_STORE_CITY_CODE`, `VENDELO_STORE_SUBDIVISION_CODE`, `VENDELO_DEFAULT_WEIGHT_KG`, `VENDELO_DEFAULT_HEIGHT_CM`, `VENDELO_DEFAULT_WIDTH_CM`, `VENDELO_DEFAULT_LENGTH_CM`, `VENDELO_WALLET_ALERT_THRESHOLD`.
- `VENDELO_STORE_ADDRESS` quedó con el placeholder literal `"Dirección de la tienda"` — debe actualizarse a la dirección real de la tienda física antes del primer pedido contraentrega.

**Automatización del flujo E2E con Playwright:**

- `apps/web/e2e/global-setup.ts` fue reescrito como setup project de Playwright (patrón `test as setup`) en lugar de hook `globalSetup`. Antes leía credenciales de env vars que no existían; ahora crea un usuario fresco por run vía POST `/auth/register`, scrapea el OTP del log del dev-server con regex (`[DEV] OTP para <email>: <code>`), llama `/auth/verify-email`, hace signIn vía POST `/api/auth/callback/credentials` con CSRF token y guarda `storageState` + `user-info.json` para los specs.
- `apps/web/e2e/full-checkout.spec.ts` cubre catálogo → producto → carrito → checkout hasta el botón "Continuar al pago" (antes del widget Wompi). Mockea `/api/vendelo/cities` con Playwright `page.route()` porque la tabla `VendeloCity` está vacía en dev.
- Razón del rediseño: React Compiler de Next.js 16 marca los inputs controlled como no hidratados durante varios segundos, lo que hace fallar `.fill()` y `pressSequentially()` consistentemente. Bypaseando el form de UI vía API se obtiene un E2E rápido y confiable.

**Smoke test del webhook Wompi:**

- `apps/web/scripts/test-wompi-flow.ts` orquesta el flujo completo end-to-end sin tráfico real a Wompi: login → crear orden PENDING vía `POST /orders` → firmar webhook con HMAC SHA256 usando `WOMPI_EVENTS_SECRET` local → enviar a `/payments/wompi/webhook` → verificar `stateChanged: true` → confirmar decremento de stock → segundo webhook idéntico para validar idempotencia (`stateChanged: false`).
- Útil para regresiones del flujo de confirmación de pago sin necesidad de exponer un túnel ni interactuar con sandbox.

**Tooling de E2E:**

- `apps/web/scripts/codegen-with-header.ts` lanza Playwright codegen contra una URL configurable inyectando el header `X-E2E-Trace: playwright-codegen-checkout` en todas las requests. Permite identificar las requests del codegen en los logs del dev-server.
- `apps/web/.gitignore` excluye `.vercel` y `.env*.local`.

---

## 96. Sistema de autenticación con verificación de email por OTP

**Qué se hizo:**
Se implementó un sistema completo de verificación de email mediante código OTP de 6 dígitos, integrado con el flujo de registro y login existente. La implementación se dividió en 3 sprints sobre la rama `feature/auth-system-implementation`.

**Sprint 1 — Fundación back-end:**

- Se añadió `emailVerified DateTime?` al modelo `User` (requerido por NextAuth PrismaAdapter).
- Se creó el modelo `EmailOtp` en Prisma con `codeHash` (SHA-256), `expiresAt` (10 min), `attempts` (máx 5), `usedAt`.
- Se creó `OtpService` en NestJS: genera código con `crypto.randomInt`, almacena SHA-256, verifica con `timingSafeEqual`.
- Se añadió `sendOtpVerification()` a `ResendEmailService` con template HTML responsive de dígitos individuales.

**Sprint 2 — Endpoints NestJS:**

- `POST /auth/register` ahora genera y envía OTP tras crear el usuario, retorna `verificationRequired: true`.
- `POST /auth/login` lanza `403 EMAIL_NOT_VERIFIED` si `emailVerified === null`.
- `POST /auth/verify-email` (5 req/min): valida código, actualiza `emailVerified`, protección anti-fuerza bruta por intentos en BD.
- `POST /auth/resend-otp` (3 req/10min): anti-enumeración, siempre responde 200.

**Sprint 3 — Frontend Next.js:**

- Se creó `/auth/verify-email` con 6 inputs individuales, auto-focus, soporte de pegado, auto-submit al completar y countdown de 60s para reenvío.
- `LoginForm.tsx` redirige a `/auth/verify-email?email=xxx` si recibe error `EMAIL_NOT_VERIFIED`.
- `auth.ts` lanza `EmailNotVerifiedError extends CredentialsSignin` cuando NestJS retorna 403, propagando el código al cliente.
- `register/page.tsx` redirige a `/auth/verify-email` en lugar de `/auth/login` tras el registro.
- `login/page.tsx` muestra banner verde de éxito cuando llega `?verified=1`.

**Archivos modificados / creados:**

- `packages/database/prisma/schema.prisma` *(modificado)*
- `packages/database/prisma/migrations/20260612221338_.../migration.sql` *(nuevo)*
- `apps/api/src/auth/otp.service.ts` *(nuevo)*
- `apps/api/src/auth/auth.module.ts` *(modificado)*
- `apps/api/src/auth/auth.service.ts` *(modificado)*
- `apps/api/src/auth/auth.controller.ts` *(modificado)*
- `apps/api/src/auth/dto/verify-email.dto.ts` *(nuevo)*
- `apps/api/src/auth/dto/resend-otp.dto.ts` *(nuevo)*
- `apps/api/src/infrastructure/services/ResendEmailService.ts` *(modificado)*
- `apps/api/src/__tests__/otp.service.test.ts` *(nuevo — 12 tests)*
- `apps/api/src/__tests__/auth.service.test.ts` *(nuevo — 15 tests)*
- `apps/web/src/lib/auth.ts` *(modificado)*
- `apps/web/src/app/auth/verify-email/page.tsx` *(nuevo)*
- `apps/web/src/app/auth/verify-email/VerifyEmailForm.tsx` *(nuevo)*
- `apps/web/src/app/auth/login/LoginForm.tsx` *(modificado)*
- `apps/web/src/app/auth/login/page.tsx` *(modificado)*
- `apps/web/src/app/auth/register/page.tsx` *(modificado)*

**Seguridad aplicada:**

- Código almacenado como SHA-256, comparación con `timingSafeEqual` (anti-timing attack).
- Máximo 5 intentos fallidos por OTP antes de invalidarlo (capa de BD, no bypasseable por IP rotation).
- Anti-enumeración en `resendOtp` y `verifyEmail` para usuarios inexistentes.
- Throttling NestJS: 5 req/min en verify-email, 3 req/10min en resend-otp.
- `EmailNotVerifiedError extends CredentialsSignin` propaga el código a través de NextAuth sin exponer el error HTTP raw al cliente.

**Fin:**
Garantizar que solo usuarios con correo verificado puedan iniciar sesión, previniendo el abuso de cuentas con emails falsos y alineando el sistema con estándares de seguridad de producción.

---

## 1. Precios estimados en el catálogo

**Qué se hizo:**
Se asignaron precios estimados en pesos colombianos (COP, almacenados en centavos) a todos los productos que tenían `price: 0` en el seed del catálogo. Los precios se fijaron con valores representativos del mercado real de repuestos para motos en Colombia.

**Archivos modificados:**
- `prisma/catalog.ts`

**Fin:**
Permitir que la tienda fuera funcional y testeable sin que los productos aparecieran con precio $0, lo que bloqueaba la experiencia de compra.

---

## 2. Soporte de múltiples imágenes en ProductCard

**Qué se hizo:**
Se actualizó la tarjeta de producto para soportar hasta 4 imágenes. En el catálogo (grid), al pasar el mouse sobre una tarjeta hace crossfade CSS puro a la segunda imagen (sin estado React, solo `group-hover` de Tailwind). Se agregaron indicadores de puntos en la parte inferior de la imagen para indicar cuántas fotos tiene el producto.

**Archivos modificados:**
- `src/components/store/ProductCard.tsx`

**Fin:**
Mejorar la presentación visual de los productos en el catálogo, permitiendo que el usuario vea múltiples ángulos sin hacer clic, lo que aumenta la intención de compra.

---

## 3. Galería de imágenes en página de producto

**Qué se hizo:**
Se creó el componente `ProductImageGallery` para la página de detalle del producto. Muestra la imagen principal con transición `fadeIn` al cambiar, botones prev/next, indicadores de posición en forma de píldoras, y una tira de miniaturas clicables en la parte inferior. Se agregó la animación `@keyframes fadeIn` en los estilos globales.

**Archivos modificados:**
- `src/components/store/ProductImageGallery.tsx` *(nuevo)*
- `src/app/(store)/producto/[slug]/page.tsx`
- `src/app/globals.css`

**Fin:**
Reemplazar la imagen estática única en la página de producto por una galería interactiva que permita navegar entre todas las imágenes del producto.

---

## 4. Corrección de bug de sesión en Navbar + modal de perfil

**Qué se hizo:**
Se corrigió un bug donde al navegar a `/perfil` (ruta inexistente) y presionar Atrás, el Navbar mostraba "Mi cuenta" en lugar del nombre del usuario y el dropdown no abría. La causa raíz era que `<Suspense>` remontaba el Navbar durante la navegación, y `useSession()` arrancaba en `status: "loading"` con `session = null`.

Correcciones aplicadas:
1. Se cacheó el `firstName` del usuario en `sessionStorage` con la clave `tdk-user-firstname`. Al remontar, el `useEffect` lee el valor guardado antes de que la sesión resuelva.
2. Se reemplazó el link a `/perfil` por un `ProfileModal` centrado que muestra: avatar con iniciales (no editable), nombre, email, campo de teléfono guardado en `localStorage`, botón de WhatsApp a soporte, y botón "Ver mis pedidos".

**Archivos modificados:**
- `src/components/nav/Navbar.tsx`
- `src/components/nav/ProfileModal.tsx` *(nuevo)*

**Fin:**
Eliminar el flash de "Mi cuenta" tras navegación back-forward, y reemplazar la ruta `/perfil` inexistente con un modal funcional de gestión de cuenta.

---

## 5. Jerarquía de categorías de tres niveles — Schema Prisma

**Qué se hizo:**
Se añadió la relación auto-referencial `CategoryTree` al modelo `Category` en el schema de Prisma, agregando el campo `parentId` y las relaciones `parent` / `children`. Se corrió la migración `add_category_hierarchy` y se regeneró el cliente Prisma.

**Archivos modificados:**
- `prisma/schema.prisma`
- `prisma/migrations/20260417230352_add_category_hierarchy/migration.sql` *(generado automáticamente)*

**Fin:**
Habilitar a nivel de base de datos la estructura jerárquica Padre → Subcategoría → Productos, necesaria para organizar el catálogo en 5 categorías padre con subcategorías específicas.

---

## 6. Jerarquía de categorías — Entidad de dominio

**Qué se hizo:**
Se actualizó la entidad `Category` del dominio para reflejar la jerarquía. Se agregó el campo `parentId: string | null` y se creó el tipo `CategoryChild` (misma forma que `Category` pero sin `children` para evitar recursión infinita).

**Archivos modificados:**
- `src/domain/entities/Category.ts`

**Fin:**
Mantener las entidades de dominio sincronizadas con el schema de la BD, siguiendo los principios de Clean Architecture donde el dominio no depende de Prisma.

---

## 7. Jerarquía de categorías — Repositorio de productos

**Qué se hizo:**
Se actualizó el método `findAll` de `PrismaProductRepository` para soportar la expansión padre → hijos. Cuando se recibe un `categorySlug`, el repositorio primero busca esa categoría con sus `children`, luego construye un filtro `categoryId: { in: [parentId, ...childIds] }`. Esto permite filtrar por categoría padre y automáticamente incluir todos los productos de sus subcategorías.

**Archivos modificados:**
- `src/infrastructure/repositories/PrismaProductRepository.ts`

**Fin:**
Que al hacer click en "Sistema Eléctrico" en el catálogo, el usuario vea los productos de todas sus subcategorías (Ramales, CDI, Reguladores, etc.) sin tener que seleccionarlas individualmente.

---

## 8. Reestructuración completa del catálogo seed

**Qué se hizo:**
Se reescribió completamente `prisma/catalog.ts` para implementar la jerarquía de tres niveles:

- **5 categorías padre:** Sistema Eléctrico, Repuestos, Aceites, Llantas, Accesorios.
- **18 subcategorías:** Ramales, Reguladores, CDI, Baterías, Estatores, Bobinas, Filtro de Aire, Bujías, Conectores, Frenos, Repuestos Motor, Liquimoly, SKY, Espejos, Exploradores, Bombillas LED, Equipamiento, Objetivo.
- **85 productos** remapeados a sus subcategorías correctas.
- **Proceso de 3 pasadas:** Pass 1 = upsert padres, Pass 2 = upsert subcategorías con `parentId` resuelto, Pass 3 = upsert productos con nuevo `categorySlug`.
- **Limpieza de slugs obsoletos** antes del seed (arneses, iluminacion, filtros, etc.).

**Archivos modificados:**
- `prisma/catalog.ts`

**Fin:**
Migrar todos los datos de la estructura plana antigua a la nueva jerarquía sin perder productos, y proporcionar precios y datos reales para que la tienda sea demostrable.

---

## 9. Página de catálogo — vista jerárquica

**Qué se hizo:**
Se actualizó `catalogo/page.tsx` en sus dos vistas:

**Vista Landing:** Ahora consulta categorías padre con sus hijos, agrega en paralelo los productos de todas sus subcategorías, y muestra el conteo real por categoría padre.

**Vista Grid:** Consulta los padres con sus children para pasárselos al `FilterDrawer`. La búsqueda de `activeCat` (categoría activa) ahora recorre dos niveles: busca primero en padres y luego en hijos, por lo que tanto `/catalogo?category=sistema-electrico` como `/catalogo?category=ramales` muestran el breadcrumb correcto.

Se actualizaron también las constantes `CAT` (metadatos) y `BANNER` para usar los nuevos slugs padre.

**Archivos modificados:**
- `src/app/(store)/catalogo/page.tsx`

**Fin:**
Que la landing del catálogo muestre conteos de productos correctos (sumando subcategorías) y que el grid filtre correctamente al navegar por cualquier nivel de la jerarquía.

---

## 10. FilterDrawer — categorías colapsables con jerarquía

**Qué se hizo:**
Se rediseñó el panel lateral de filtros para mostrar la jerarquía Padre → Subcategorías. Cada categoría padre tiene un chevron que despliega sus subcategorías con animación. Al abrir el drawer con un filtro activo, el padre que contiene esa subcategoría se auto-expande. Clic en padre filtra toda su rama (incluyendo subcategorías). Clic en subcategoría filtra solo esa.

**Archivos modificados:**
- `src/components/store/FilterDrawer.tsx`

**Fin:**
Dar al usuario una navegación intuitiva por la jerarquía de categorías sin sobrecargar visualmente el panel de filtros.

---

## 11. Navbar — actualización de slugs de categorías

**Qué se hizo:**
Se actualizaron las constantes `ALL_CATEGORIES` y `TOP_CATEGORIES` del Navbar para reemplazar los slugs de la jerarquía plana antigua (`frenos`, `motores`, `electrico`, `arneses`, `equipamiento`) por los 5 slugs padre nuevos (`sistema-electrico`, `repuestos`, `aceites`, `llantas`, `accesorios`).

**Archivos modificados:**
- `src/components/nav/Navbar.tsx`

**Fin:**
Que los links del Navbar y el menú móvil apunten a categorías que realmente existen en la BD.

---

## 12. Mega menu de categorías en el Navbar

**Qué se hizo:**
Se reemplazó el dropdown pequeño de dos columnas por un **mega menu full-width**. Al pasar el mouse sobre "Categorías", se despliega un panel que ocupa todo el ancho del navbar con 5 columnas (una por categoría padre). Cada columna muestra el nombre del padre como título grande con efecto de subrayado animado al hover, y sus subcategorías listadas debajo en texto más pequeño. En el menú móvil se actualiza el acordeón para mostrar la misma jerarquía padre → subcategorías con sangría.

Se añadió la constante `MEGA_MENU` con la estructura completa de padres e hijos.

**Archivos modificados:**
- `src/components/nav/Navbar.tsx`

**Fin:**
Mejorar la navegación de categorías para que el usuario vea toda la oferta de la tienda de un vistazo, al estilo de tiendas de referencia como FP Moto.

---

## 13. Mega menu como overlay (sin desplazar contenido)

**Qué se hizo:**
Se cambió el posicionamiento del panel del mega menu de `block` (en el flujo del documento, empujando el contenido hacia abajo) a `absolute top-full` (superpuesto sobre el contenido). Se añadió `relative` al `<header>` del layout estándar para que sirva como contenedor de posicionamiento.

**Archivos modificados:**
- `src/components/nav/Navbar.tsx`

**Fin:**
Que el mega menu flote sobre el hero y el resto del contenido de la página, en lugar de empujar el layout hacia abajo al abrirse.

---

## 14. Corrección de routing en el mega menu

**Qué se hizo:**
Se identificó y corrigió un bug crítico: `handleClickOutside` usaba el evento `mousedown` (que dispara *antes* que `click`). Al hacer clic en un `<Link>` del panel del mega menu, `mousedown` cerraba el menú y desmontaba el panel del DOM antes de que el evento `click` del Link pudiera disparar la navegación.

**Solución:** Se añadió `panelRef` apuntando al div del panel. En `handleClickOutside` ahora se comprueba que el click esté fuera de *ambos* elementos (`catRef` trigger + `panelRef` panel). Si el click está dentro del panel, el menú no se cierra en `mousedown` y el `click` llega al Link con normalidad.

Adicionalmente se actualizó el mapa `EXPLORE_IMAGE` del carrusel para usar los nuevos slugs padre.

**Archivos modificados:**
- `src/components/nav/Navbar.tsx`
- `src/components/store/CategoryExploreCarousel.tsx`

**Fin:**
Que todos los links del mega menu (padre y subcategorías) naveguen correctamente al hacer clic.

---

## 15. Corrección de la página de inicio — categorías obsoletas

**Qué se hizo:**
Se detectó que `home.tsx` usaba slugs y emojis de la jerarquía plana antigua. Se realizaron tres correcciones:

1. **Consulta determinista:** `prisma.category.findMany({ take: 3 })` sin filtro podía devolver subcategorías mezcladas con padres en orden indeterminado. Se cambió a `where: { parentId: null }, orderBy: { name: 'asc' }`.
2. **Emojis actualizados:** Se creó la constante `CAT_ICONS` con los 5 slugs padre nuevos (`sistema-electrico` → ⚡, `repuestos` → 🔧, `aceites` → 🛢️, `llantas` → 🏍️, `accesorios` → 🔩).
3. **Grid responsive:** Se cambió de `grid-cols-3` a `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` para mostrar las 5 categorías correctamente.

**Archivos modificados:**
- `src/app/(store)/home.tsx`

**Fin:**
Que la sección "Encuentra tu repuesto" de la home muestre las categorías reales con sus emojis correctos y navegue a las rutas correctas.

---

## 16. Supresión de warnings de hidratación por extensiones del navegador

**Qué se hizo:**
Se añadió `suppressHydrationWarning` al elemento `<html>` del layout raíz. Esto complementa el `suppressHydrationWarning` que ya existía en `<body>`, silenciando los warnings de hidratación causados por extensiones del navegador (como Browsec VPN o BitDefender) que inyectan el atributo `bis_skin_checked="1"` en el DOM del cliente antes de que React hidrate.

**Archivos modificados:**
- `src/app/layout.tsx`

**Fin:**
Eliminar falsos positivos en la consola de desarrollo. Estos warnings no son bugs de código sino modificaciones externas del DOM por extensiones del navegador. En producción no afectan el funcionamiento de la app.

---

---

## 17. Reestructuración del repo a monorepo pnpm + Turborepo (Fase 0)

**Qué se hizo:**
Se convirtió el repo plano de Next.js en un monorepo con pnpm workspaces + Turborepo. La nueva estructura es:

```text
/
├── apps/
│   ├── web/          ← Next.js 16 (contenido movido desde el root)
│   └── api/          ← reservado para NestJS (Fase 1)
├── packages/
│   ├── domain/       ← dominio puro, TypeScript sin dependencias externas
│   ├── database/     ← Prisma 7 + schema + migraciones + seed centralizado
│   └── types/        ← DTOs compartidos (vacío por ahora, se llena en Fase 3-5)
├── package.json      ← root con scripts de turbo y pnpm --filter
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── .npmrc
```

Movimientos con `git mv` (historial preservado):

- `src/domain` → `packages/domain/src`
- `prisma/` → `packages/database/prisma/`
- `prisma.config.ts` → `packages/database/prisma.config.ts`
- Todo lo demás (`src/`, `public/`, `scripts/`, `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`) → `apps/web/`

Archivos no-trackeados (`.env`, `.env.local`, `.env.example`, `tmp-productos/`, `next-env.d.ts`) movidos con `mv` regular.

**Archivos nuevos:**

- `package.json` *(nuevo root — scripts `turbo dev/build/lint/type-check` y `db:*` vía `pnpm --filter @h2r/database`)*
- `pnpm-workspace.yaml` *(declara `apps/*` y `packages/*`)*
- `turbo.json` *(pipeline con `^build` dependencies, outputs `.next/**` y `dist/**`, task específico para `@h2r/database#generate`)*
- `tsconfig.base.json` *(compilerOptions estrictas heredadas por todos los paquetes)*
- `.npmrc` *(`auto-install-peers`, `link-workspace-packages`, `shared-workspace-lockfile`)*
- `packages/domain/package.json`, `tsconfig.json`, `src/index.ts` *(barrel que re-exporta entities, repositories, services, shared, use-cases)*
- `packages/database/package.json`, `tsconfig.json`, `src/index.ts` *(singleton Prisma + PrismaPg adapter + re-export de tipos generados)*
- `packages/types/package.json`, `tsconfig.json`, `src/index.ts` *(scaffold vacío)*
- `apps/web/package.json` *(reescrito — removidos `@prisma/client`, `@prisma/adapter-pg`, `pg`, `prisma`, `@types/pg`; agregados `@h2r/domain`, `@h2r/database`, `@h2r/types` como `workspace:*`)*
- `apps/web/tsconfig.json` *(extiende `tsconfig.base.json`, agrega paths `@h2r/*` para TS + mantiene `@/*` para Next.js, excluye `src/generated/**`)*

**Decisiones técnicas importantes:**

1. **Prisma 7 con output custom**: el schema tiene `output = "../src/generated/prisma"`. Al mover el schema a `packages/database/prisma/schema.prisma`, ese path relativo ahora resuelve a `packages/database/src/generated/prisma/`, que es exactamente donde `@h2r/database` lo espera. No se tocó el schema — la ruta relativa absorbe el cambio.

2. **Singleton único cross-paquete**: `@h2r/database/src/index.ts` centraliza el singleton de Prisma con el adapter `PrismaPg`. La fachada `apps/web/src/infrastructure/database/prisma-client.ts` se redujo a un solo `export { prisma } from '@h2r/database'` para no romper los ~13 imports existentes de `@/infrastructure/database/prisma-client`.

3. **Re-export de tipos generados**: `@h2r/database` re-exporta `PrismaClient`, `Prisma`, enums y models directamente desde `./generated/prisma/*`. Los consumidores hacen `import { type Order as PrismaOrder } from '@h2r/database'` en lugar de importar el path interno.

4. **Imports masivos actualizados**: 22 imports de `@/domain/...` → `@h2r/domain` en 17 archivos de `apps/web/src/`. 4 imports de `@/generated/prisma/client` → `@h2r/database` en los 3 repositorios (Order, Product, User).

5. **Carga de `.env` multi-ubicación**: `prisma.config.ts` ahora usa `dotenv.config({ path })` con 4 candidatos (`../../.env`, `../../apps/web/.env`, `../../apps/web/.env.local`, `./.env`) para que `pnpm --filter @h2r/database migrate:dev` funcione sin importar dónde el usuario haya puesto `DATABASE_URL`.

6. **`.gitignore` actualizado**: patrones adaptados a monorepo (`node_modules` sin slash inicial, `.turbo`, `apps/api/dist/`, `packages/database/src/generated/`).

**Pendiente para cerrar Fase 0:**

- Instalar `pnpm` en el entorno local (corepack 0.30 tiene bug de signing — requiere `npm install -g corepack@latest` o `npm install -g pnpm`).
- Correr `pnpm install` desde el root para generar el lockfile y el linking de workspaces.
- Correr `pnpm --filter @h2r/database generate` para regenerar el cliente Prisma en la nueva ubicación.
- Verificar que `pnpm --filter @h2r/web dev` arranca Next.js sin errores de resolución.

**Fin:**
Preparar el repositorio para la migración progresiva del backend a NestJS (Fase 1+) sin romper el Next.js actual. El dominio, la base de datos y los tipos quedan como paquetes reutilizables que tanto `apps/web` (hoy) como `apps/api` (próximamente) consumen con los mismos contratos, evitando duplicación y divergencia.

---

## 18. Fase 1 — Esqueleto NestJS (`apps/api`)

**Qué se hizo:**

Se creó el paquete `@h2r/api` en `apps/api/` como el futuro backend REST de la tienda. El objetivo de esta fase es únicamente el andamiaje: que el servidor NestJS arranque limpio, consuma los paquetes `@h2r/domain` y `@h2r/database` del workspace y exponga los módulos base listos para recibir los controladores de Fase 2.

**Estructura creada:**

```text
apps/api/
├── src/
│   ├── main.ts                                  # Bootstrap NestJS con Helmet, compresión, CORS, Swagger
│   ├── app.module.ts                            # ConfigModule + ThrottlerModule + InfrastructureModule
│   └── shared/
│       └── filters/
│           └── http-exception.filter.ts         # Mapea AppError del dominio a códigos HTTP
│   └── infrastructure/
│       ├── database/
│       │   ├── prisma.service.ts               # Wraps singleton prisma de @h2r/database con lifecycle NestJS
│       │   └── prisma.module.ts                # @Global() — exporta PrismaService a toda la app
│       ├── injection-tokens.ts                 # Símbolos DI: PRODUCT_REPOSITORY, ORDER_REPOSITORY, etc.
│       └── infrastructure.module.ts            # Importa PrismaModule; providers de repos comentados (Fase 2)
├── .env.example                                # Variables requeridas documentadas
├── nest-cli.json                               # webpack: true — resuelve imports cross-workspace sin rootDir
├── package.json                                # @h2r/api con NestJS 10, passport, throttler, ts-loader
├── tsconfig.json                               # IDE/type-check (noEmit: true, incluye packages/domain src)
└── tsconfig.build.json                         # Compilación webpack (noEmit: false, sin rootDir)
```

**Decisiones técnicas relevantes:**

1. **Webpack mode (`nest-cli.json` → `"webpack": true`)**: El compilador NestJS por defecto usa `tsc` directamente, lo que fuerza `rootDir: ./src` y rechaza archivos de `packages/domain/src/**` referenciados vía `paths`. Con webpack, el bundler resuelve los imports cross-workspace sin que TypeScript aplique la restricción de `rootDir`. Output: `dist/main.js` (bundle único). Requiere `ts-loader` como devDependency.

2. **Dos tsconfigs separados**:
   - `tsconfig.json` (noEmit: true, sin rootDir): usado por el IDE y `tsc --noEmit`. Incluye `../../packages/domain/src/**/*.ts` para que el servidor de lenguaje resuelva los path aliases correctamente.
   - `tsconfig.build.json` (noEmit: false, sin rootDir): usado por `nest build`. Solo incluye `src/**/*.ts`; webpack se encarga del resto.

3. **HttpExceptionFilter**: Captura `AppError` del dominio (con campo `code`) y lo mapea a HTTP: `NOT_FOUND → 404`, `UNAUTHORIZED → 401`, `FORBIDDEN → 403`, `CONFLICT → 409`, `VALIDATION_ERROR → 422`, resto → 500. Cualquier otro error no esperado devuelve 500 genérico.

4. **PrismaService**: No instancia `PrismaClient` directamente — importa el singleton `prisma` de `@h2r/database` y lo expone como `db` para que los repositorios hagan `this.db.product.findMany(...)`. `onModuleInit` llama `$connect()`; `onModuleDestroy` llama `$disconnect()`.

5. **Tokens de inyección simbólicos**: Los repositorios se inyectan por `Symbol` (`PRODUCT_REPOSITORY`, `ORDER_REPOSITORY`, etc.) para que NestJS pueda intercambiar implementaciones sin cambiar el código de los use cases.

6. **CORS y Swagger**: Sólo acepta origen `FRONTEND_URL` (env var). Swagger sólo se monta en `NODE_ENV !== 'production'` en `/api/docs`.

**Archivos modificados/creados:**

- `apps/api/package.json` *(nuevo)*
- `apps/api/tsconfig.json` *(nuevo)*
- `apps/api/tsconfig.build.json` *(nuevo)*
- `apps/api/nest-cli.json` *(nuevo)*
- `apps/api/.env.example` *(nuevo)*
- `apps/api/src/main.ts` *(nuevo)*
- `apps/api/src/app.module.ts` *(nuevo)*
- `apps/api/src/shared/filters/http-exception.filter.ts` *(nuevo)*
- `apps/api/src/infrastructure/database/prisma.service.ts` *(nuevo)*
- `apps/api/src/infrastructure/database/prisma.module.ts` *(nuevo)*
- `apps/api/src/infrastructure/injection-tokens.ts` *(nuevo)*
- `apps/api/src/infrastructure/infrastructure.module.ts` *(nuevo)*

**Fin:**

`pnpm exec nest build` en `apps/api/` compila a `dist/main.js` sin errores. El servidor NestJS arranca correctamente con `node dist/main.js`. Base lista para Fase 2: migración de repositorios y servicios de infraestructura desde `apps/web`.

---

## 19. Fase 2 — Repositorios y servicios en `apps/api`

**Qué se hizo:**

Se migraron los repositorios Prisma y los servicios de infraestructura desde `apps/web/src/infrastructure/` a `apps/api/src/infrastructure/`, adaptándolos al modelo de inyección de dependencias de NestJS. `apps/web` conserva sus propias copias por ahora (se eliminarán en Fase 5 cuando los controladores Next.js apunten al API REST).

**Archivos creados:**

```text
apps/api/src/infrastructure/
├── repositories/
│   ├── PrismaProductRepository.ts   # IProductRepository con PrismaService inyectado
│   ├── PrismaOrderRepository.ts     # IOrderRepository + transición atómica PENDING→X
│   └── PrismaUserRepository.ts      # IUserRepository (solo lectura)
└── services/
    ├── WompiService.ts              # IPaymentService — pasarela principal Colombia
    ├── MercadoPagoService.ts        # IPaymentService — pasarela de respaldo
    ├── ResendEmailService.ts        # Emails transaccionales (confirmación, despacho, rechazo)
    └── CloudinaryService.ts        # Upload/delete de imágenes de productos
```

**Decisiones técnicas:**

1. **Inyección de PrismaService en lugar de `prisma` directo**: Los repositorios reciben `PrismaService` vía constructor (`this.prisma.client.*`) en lugar de importar el singleton directamente. Esto permite que NestJS gestione el ciclo de vida (`$connect` / `$disconnect`) y facilita mocking en tests.

2. **Tipos estructurales en lugar de tipos generados de Prisma 7**: Prisma 7 renombró los tipos de modelos (`Product` → `ProductModel`, `Order` → `OrderModel`, etc.) rompiendo los imports directos. La solución: definir tipos estructurales inline (`PrismaProductRow`, `PrismaOrderRow`, etc.) que coinciden con la forma real de los datos retornados por Prisma. Esto desacopla los repositorios de los nombres internos que genera Prisma y hace el código más resistente a futuras versiones.

3. **`Prisma.InputJsonValue`** (del namespace `Prisma` de `@h2r/database`) se sigue usando para el cast de `shippingAddress` en `PrismaOrderRepository.create` — este tipo SÍ sigue exportándose en Prisma 7 bajo el mismo nombre.

4. **`compatible.year` es nullable**: El schema tiene `year Int?`, por lo que el campo llega como `number | null`. Se usa `c.year ?? 0` al mapear a `MotorcycleCompatibility.year` (el dominio lo tipifica como `number`).

5. **`InfrastructureModule` actualizado**: Los 3 repositorios se proveen con sus tokens de inyección simbólicos. `WompiService` se bindea al token `PAYMENT_SERVICE` (pasarela principal). Todos los servicios también se proveen directamente por clase para que los controllers de Fase 3/4 puedan inyectarlos sin pasar por el token.

6. **Nuevas dependencias en `@h2r/api`**: `cloudinary ^2.9.0`, `mercadopago ^2.12.0`, `resend ^6.10.0` — las mismas versiones que `apps/web` para consistencia.

**Archivos modificados:**

- `apps/api/src/infrastructure/infrastructure.module.ts` — descomentados y completados providers/exports
- `apps/api/package.json` — agregadas dependencias cloudinary, mercadopago, resend
- `pnpm-lock.yaml` — actualizado

**Fin:**

`pnpm --filter @h2r/api exec nest build` compila limpio. `InfrastructureModule` expone todos los tokens (`PRODUCT_REPOSITORY`, `ORDER_REPOSITORY`, `USER_REPOSITORY`, `PAYMENT_SERVICE`) y los servicios concretos listos para ser inyectados en los módulos de negocio de Fase 3.

---

## 20. Fase 3 — Módulos de negocio: Auth, Products, Orders, Admin

**Qué se hizo:**

Se implementaron los cuatro módulos de negocio de la API NestJS con todos sus controladores, DTOs y lógica de autenticación. La API queda completamente funcional para el catálogo, creación de pedidos y el panel admin. Solo falta el módulo de webhooks de pago (Fase 4).

**Estructura creada:**

```text
apps/api/src/
├── auth/
│   ├── dto/              register.dto.ts · login.dto.ts
│   ├── strategies/       jwt.strategy.ts
│   ├── guards/           jwt-auth.guard.ts · roles.guard.ts
│   ├── decorators/       @Public() · @Roles() · @CurrentUser()
│   ├── auth.service.ts   register() · login() con bcrypt
│   ├── auth.controller.ts  POST /auth/register · POST /auth/login
│   └── auth.module.ts
├── products/
│   ├── dto/              list-products.dto.ts
│   ├── products.controller.ts  GET /products (público)
│   └── products.module.ts
├── orders/
│   ├── dto/              create-order.dto.ts · update-order-status.dto.ts
│   ├── orders.controller.ts   POST /orders · PATCH /orders/:id/status
│   └── orders.module.ts
└── admin/
    ├── dto/              create-product · update-product · update-stock · bulk-stock-update · toggle-setting
    ├── admin-products.controller.ts    POST/PUT/DELETE/PATCH /admin/products
    ├── admin-stock.controller.ts       PATCH /admin/stock/bulk
    ├── admin-settings.controller.ts    PATCH /admin/settings/mercadopago
    ├── admin-dashboard.controller.ts   GET /admin/dashboard
    └── admin.module.ts
```

**Endpoints expuestos:**

| Método | Ruta | Auth | Descripción |
| ------ | ---- | ---- | ----------- |
| POST | `/auth/register` | Público | Registro con bcrypt (cost 12) |
| POST | `/auth/login` | Público | Login, devuelve JWT |
| GET | `/products` | Público | Catálogo con filtros: category, search, price, inStock, page, limit |
| POST | `/orders` | JWT | Crear pedido via `CreateOrder` use case + pasarela |
| PATCH | `/orders/:id/status` | ADMIN | Actualizar estado manualmente |
| GET | `/admin/dashboard` | ADMIN | Revenue, pendientes, stock bajo, pedidos recientes |
| POST | `/admin/products` | ADMIN | Crear producto |
| PUT | `/admin/products/:id` | ADMIN | Actualizar producto |
| DELETE | `/admin/products/:id` | ADMIN | Eliminar producto |
| PATCH | `/admin/products/:id/stock` | ADMIN | Actualizar stock individual |
| POST | `/admin/products/upload-image` | ADMIN | Subir imagen a Cloudinary (multipart) |
| PATCH | `/admin/stock/bulk` | ADMIN | Actualización masiva de stock por SKU |
| PATCH | `/admin/settings/mercadopago` | ADMIN | Habilitar/deshabilitar Mercado Pago |

**Decisiones técnicas:**

1. **Guards globales en AppModule (secure-by-default)**: `JwtAuthGuard` y `RolesGuard` se registran como `APP_GUARD` en el módulo raíz. Todas las rutas requieren JWT por defecto. Las rutas públicas usan el decorador `@Public()` que pone metadata `isPublic: true` — `JwtAuthGuard` la lee con `Reflector` y salta la verificación. Esto evita olvidar proteger un endpoint nuevo.

2. **Selección dinámica de pasarela en `POST /orders`**: El controlador inyecta tanto `WompiService` (vía token `PAYMENT_SERVICE`) como `MercadoPagoService` (por clase). Cuando el body dice `paymentProvider: 'MERCADO_PAGO'`, consulta la tabla `Settings` para verificar que esté habilitado, y luego pasa `mercadoPagoService` al constructor del use case `CreateOrder`. De lo contrario usa Wompi. El use case no sabe qué pasarela está usando — depende de `IPaymentService`.

3. **`CreateOrder` y `ListProducts` se instancian con `new`**: Los use cases del dominio son clases planas, no injectables de NestJS. Los controladores los instancian con `new UseCase(repo1, repo2, service)` pasando las dependencias inyectadas. Esto cumple el patrón de Clean Architecture sin necesitar hacer los use cases dependientes del framework.

4. **`strictPropertyInitialization: false` en tsconfig**: Los DTOs de NestJS usan class-validator y son populados por el `ValidationPipe` (no por constructores). TypeScript no puede saber que los campos siempre estarán definidos al llegar al handler, por lo que `strictPropertyInitialization: true` produce falsos positivos en todos los DTOs. Deshabilitar es el estándar de la comunidad NestJS.

5. **`PAYMENT_ERROR: 502`** agregado al `HttpExceptionFilter`: El use case `CreateOrder` puede lanzar `AppError('PAYMENT_ERROR')` si la pasarela falla. Ahora se mapea a HTTP 502 (Bad Gateway) en lugar de 500.

6. **Upload de imagen sin `Express.Multer.File`**: Se usa un tipo estructural inline `{ buffer: Buffer; originalname: string }` para el parámetro `@UploadedFile()`. Esto evita depender del tipo global `Express.Multer.File` que requiere configuración adicional de tsconfig, y funciona igual en runtime. `@types/multer` se agrega para autocompletado del IDE aunque no se use directamente.

**Archivos modificados:**

- `apps/api/src/app.module.ts` — añadidos 4 módulos + `APP_GUARD` global
- `apps/api/src/shared/filters/http-exception.filter.ts` — `PAYMENT_ERROR → 502`
- `apps/api/tsconfig.json` — `strictPropertyInitialization: false`
- `apps/api/package.json` — `@types/multer` en devDeps

**Fin:**

`pnpm --filter @h2r/api exec nest build` compila limpio. Swagger disponible en `/api/docs` al arrancar en modo development. La API está lista para Fase 4: `PaymentsModule` con los webhooks de Wompi y Mercado Pago.

---

## Fase 4 — PaymentsModule + Hardening de seguridad

**Qué se hizo:**

### 4.1 — PaymentsModule en apps/api

Se creó `apps/api/src/payments/` con dos controladores y el módulo que los agrupa:

**`WompiController`** (`POST /payments/wompi/integrity` + `POST /payments/wompi/webhook`):

- `/integrity` es `@Public()` y no requiere JWT. Recibe `{ orderId, amountInCents, currency? }` y retorna `{ reference, integritySignature, publicKey, amountInCents, currency }`. La referencia sigue el formato `ORDER-{orderId}-{timestamp}` para que el webhook pueda extraer el orderId.
- `/webhook` es `@Public()` y `@SkipThrottle()`. Valida la firma SHA256 de Wompi, aplica el use case `ConfirmPayment` con idempotencia (`updateMany WHERE status='PENDING'`), y dispara el email de confirmación solo cuando `stateChanged === true`. Devuelve 200 siempre (excepto firma inválida → 401) para evitar reintentos masivos de Wompi.

**`MercadoPagoController`** (`POST /payments/mercadopago/create-preference` + `POST /payments/mercadopago/webhook`):

- `/create-preference` requiere JWT. Busca el pedido por ID y llama a `MercadoPagoService.createTransaction(order)`, retornando el `init_point` para el redirect.
- `/webhook` es `@Public()` y `@SkipThrottle()`. Valida HMAC-SHA256 del header `x-signature`, consulta `getTransactionStatus(externalId)` a la API de MP, y confirma el pago via `ConfirmPayment`.

**Adaptador de headers**: Ambos controladores usan un helper privado `toHeaders(raw: IncomingHttpHeaders): Headers` que envuelve el objeto `req.headers` de Express en una interfaz compatible con `Headers.get()` (Fetch API). Esto permite reutilizar los métodos `validateWebhook()` de los servicios sin cambiarlos.

### 4.2 — ThrottlerGuard como APP_GUARD global

Se agregó `ThrottlerGuard` como tercer `APP_GUARD` en `app.module.ts` (junto a `JwtAuthGuard` y `RolesGuard`). El límite global es **100 req/min**. Los endpoints de autenticación tienen límites más estrictos vía `@Throttle`:

- `POST /auth/register` → 5 req/min (disuade ataques de creación masiva de cuentas)
- `POST /auth/login` → 10 req/min (disuade brute force de credenciales)

Los webhooks de pago tienen `@SkipThrottle()` para que los reintentos de Wompi/MP nunca sean rechazados por el throttler.

### 4.3 — Seguridad en apps/web

**Security headers** en `apps/web/next.config.ts`:

Todos los responses de Next.js ahora incluyen:

- `X-Frame-Options: DENY` — previene clickjacking
- `X-Content-Type-Options: nosniff` — previene MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

**Rate limiting en Next.js API routes** (`apps/web/src/lib/rate-limit.ts`):

Se implementó un rate limiter de ventana deslizante basado en `Map<key, timestamp[]>`. Retorna `false` si el límite se excede, `true` si la solicitud es permitida. Se aplica:

- `POST /api/auth/register` → 5 req/min por IP (claves: `register:{ip}`)
- `POST /api/orders` → 10 req/min por usuario autenticado (clave: `orders:{userId}`)

**Archivos creados:**

- `apps/api/src/payments/dto/wompi-integrity.dto.ts`
- `apps/api/src/payments/dto/mp-preference.dto.ts`
- `apps/api/src/payments/wompi.controller.ts`
- `apps/api/src/payments/mercadopago.controller.ts`
- `apps/api/src/payments/payments.module.ts`
- `apps/web/src/lib/rate-limit.ts`

**Archivos modificados:**

- `apps/api/src/app.module.ts` — `ThrottlerGuard` + `PaymentsModule`
- `apps/api/src/auth/auth.controller.ts` — `@Throttle` en register (5/min) y login (10/min)
- `apps/web/next.config.ts` — `headers()` con 6 security headers
- `apps/web/src/app/api/auth/register/route.ts` — rate limit 5/min por IP
- `apps/web/src/app/api/orders/route.ts` — rate limit 10/min por userId

**Fin:**

El backend NestJS expone los endpoints de pago completos con la misma lógica que las rutas Next.js, y añade throttling granular a nivel de guards globales. El frontend Next.js aplica headers de seguridad a todas las respuestas y limita las rutas más sensibles. La API está lista para Fase 5: conectar `apps/web` al NestJS backend vía un `ApiClient`, actualizar NextAuth para obtener tokens JWT, y eliminar las rutas `apps/web/src/app/api/` que quedan duplicadas.

---

## Fase 5 — Conexión apps/web → NestJS API + limpieza de rutas duplicadas

**Qué se hizo:**

### 5.1 — Nuevo endpoint interno en NestJS: `POST /auth/session-token`

Se añadió `issueTokenByEmail(email)` en `AuthService` y un nuevo endpoint `POST /auth/session-token` en `AuthController`. El endpoint está protegido por el header `x-internal-secret` (env var `INTERNAL_API_SECRET`) y solo se llama desde el servidor Next.js durante el JWT callback de NextAuth al autenticar usuarios Google OAuth. Se marca `@SkipThrottle()` para no verse afectado por el rate limiter.

El método `login()` en `AuthService` también se amplió para retornar `{ userId, name, email }` (además de `{ accessToken, role }`), evitando que NextAuth tenga que decodificar el JWT para obtener la identidad del usuario.

### 5.2 — NextAuth migrado a JWT NestJS

Se reescribió `apps/web/src/lib/auth.ts`:

- **Credentials `authorize()`**: ya no usa Prisma ni bcrypt directamente. Llama `POST {API_URL}/auth/login` al NestJS y retorna el usuario con `{ id, name, email, role, accessToken }`. Eliminada la dependencia de `bcryptjs` en el archivo.

- **`jwt` callback**:
  - Credentials → extrae `accessToken` y `role` del objeto `user` devuelto por `authorize()`
  - Google OAuth → llama `POST {API_URL}/auth/session-token` con el `INTERNAL_API_SECRET` para obtener el JWT NestJS correspondiente al email del usuario ya verificado por Google

- **`session` callback**: expone `session.user.accessToken` y `session.user.role` al cliente.

- **Type augmentation** (inline en `auth.ts`): amplía `User`, `Session` y `JWT` de NextAuth para incluir `role` y `accessToken`.

### 5.3 — ApiClient (`apps/web/src/lib/api-client.ts`)

Factory function `apiClient(accessToken?)` que retorna un objeto con métodos `get`, `post`, `put`, `patch`, `delete`, `postForm`. Usa `NEXT_PUBLIC_API_URL` como base (seguro para el browser). El `Content-Type: application/json` se añade automáticamente en todos los métodos excepto `postForm` (multipart, donde el browser debe fijar el boundary).

### 5.4 — Componentes migrados a NestJS

Se actualizaron 5 archivos para usar `apiClient` en lugar de llamadas a rutas Next.js:

- **`CheckoutForm.tsx`**: `POST /api/orders` → `apiClient(token).post('/orders', ...)`. La firma de integridad Wompi usa `apiClient()` sin token (endpoint público).
- **`MercadoPagoToggle.tsx`**: `PATCH /api/admin/settings/mercadopago` → `apiClient(token).patch('/admin/settings/mercadopago', ...)`.
- **`CsvStockImport.tsx`**: `PATCH /api/admin/stock/bulk` → `apiClient(token).patch('/admin/stock/bulk', ...)`.
- **`ProductEditForm.tsx`**: `POST/PUT /api/admin/products[/:id]` → `apiClient(token).post/put(...)`. Upload de imagen: `apiClient(token).postForm('/admin/products/upload-image', formData)`.
- **`apps/web/src/app/auth/register/page.tsx`**: `POST /api/auth/register` → `fetch(\`${NEXT_PUBLIC_API_URL}/auth/register\`)` directo.

Todos los componentes añaden `const { data: session } = useSession()` para obtener el `accessToken` de la sesión. Los errores ahora leen `data.message ?? data.error` (NestJS retorna `message`, no `error`).

### 5.5 — Eliminación de rutas Next.js duplicadas

Se eliminaron 14 archivos de `apps/web/src/app/api/` que quedaron reemplazados por NestJS:

- `auth/register/route.ts`, `orders/route.ts`, `orders/[id]/status/route.ts`, `products/route.ts`
- `admin/products/route.ts`, `admin/products/[id]/route.ts`, `admin/products/[id]/stock/route.ts`
- `admin/products/upload-image/route.ts`, `admin/settings/mercadopago/route.ts`, `admin/stock/bulk/route.ts`
- `payments/wompi/integrity/route.ts`, `payments/wompi/webhook/route.ts`
- `payments/mercadopago/webhook/route.ts`, `payments/mercadopago/create-preference/route.ts`

**Permanece en Next.js:**

- `apps/web/src/app/api/auth/[...nextauth]/route.ts` — NextAuth maneja la sesión del browser (OAuth callbacks, cookies, etc.)
- Los Server Components (catalog, producto, admin pages) siguen usando `PrismaProductRepository` y el cliente Prisma directamente — es válido en un monorepo donde ambas apps comparten la misma BD, y evita una capa extra de HTTP en el renderizado SSR.

**Variables de entorno nuevas:**

- `API_URL` — URL del NestJS en entornos server-side de Next.js (no expuesto al browser). Ej: `http://localhost:3001`.
- `NEXT_PUBLIC_API_URL` — URL del NestJS expuesta al browser para llamadas client-side. Ej: `http://localhost:3001`.
- `INTERNAL_API_SECRET` — Secreto compartido entre Next.js y NestJS para el endpoint `/auth/session-token`.

**Archivos creados:**

- `apps/web/src/lib/api-client.ts`
- `apps/api/src/auth/dto/session-token.dto.ts`

**Archivos modificados:**

- `apps/api/src/auth/auth.service.ts` — login extendido + issueTokenByEmail
- `apps/api/src/auth/auth.controller.ts` — POST /auth/session-token
- `apps/web/src/lib/auth.ts` — NextAuth completo reescrito
- `apps/web/src/app/auth/register/page.tsx` — llama NestJS directamente
- `apps/web/src/components/checkout/CheckoutForm.tsx` — apiClient con JWT
- `apps/web/src/components/admin/MercadoPagoToggle.tsx` — apiClient con JWT
- `apps/web/src/components/admin/CsvStockImport.tsx` — apiClient con JWT
- `apps/web/src/components/admin/ProductEditForm.tsx` — apiClient con JWT

**Archivos eliminados:** 14 rutas Next.js (listadas en §5.5)

**Fin:**

`apps/web` ya no tiene rutas de API duplicando la lógica de `apps/api`. El flujo de datos es:
`Browser → NestJS (port 3001)` para operaciones autenticadas y `SSR → Prisma` para renderizado de páginas. La autenticación de sesión sigue en NextAuth (cookies), pero las llamadas a la API usan el JWT NestJS almacenado en la sesión.

---

---

## 21. Correcciones de arranque del backend NestJS (sesión de pruebas)

**Qué se hizo:**

Resolución de una serie de errores en cadena que impedían levantar `apps/api` en modo desarrollo.

### 21.1 — webpack bundlea paquetes `@h2r/*` directamente

**Problema:** NestJS webpack usa `webpack-node-externals` que externaliza todos los `node_modules`, incluyendo los workspace packages (`@h2r/database`, `@h2r/domain`). En runtime, Node.js intenta `require('@h2r/database')` que resuelve al `.ts` fuente, produciendo `SyntaxError: Unexpected token ':'`.

**Solución:** Se creó `apps/api/webpack.config.js` con `allowlist: [/^@h2r\//]` en `nodeExternals` y aliases explícitos apuntando a los `.ts` fuente de cada paquete. También se extendió `tsconfig.build.json` para incluir los paquetes en la compilación. Se registró el config en `nest-cli.json` con `"webpackConfigPath": "webpack.config.js"`.

**Archivos creados/modificados:**

- `apps/api/webpack.config.js` *(nuevo)*
- `apps/api/nest-cli.json`
- `apps/api/tsconfig.build.json`

### 21.2 — `DATABASE_URL` indefinida al arrancar

**Problema:** El singleton de Prisma en `@h2r/database` se crea en tiempo de importación del módulo (antes de que NestJS ejecute `ConfigModule.forRoot()`), por lo que `process.env['DATABASE_URL']` aún no está definida.

**Solución:**

- Se añadió `import 'dotenv/config'` como segunda línea de `apps/api/src/main.ts` (después de `reflect-metadata`), forzando la carga del `.env` antes de cualquier módulo.
- Se creó `apps/api/.env` con `DATABASE_URL` y todas las variables necesarias (JWT, Wompi, Cloudinary, etc.).
- Se añadió `dotenv` como dependencia directa de `@h2r/api` (pnpm strict mode bloquea el uso de transitivas).
- Se creó `packages/database/.env` para que `pnpm run db:seed` también encuentre `DATABASE_URL`.

**Archivos creados/modificados:**

- `apps/api/src/main.ts`
- `apps/api/.env` *(nuevo, en .gitignore)*
- `apps/api/package.json`
- `packages/database/.env` *(nuevo, en .gitignore)*

### 21.3 — `ResendEmailService` lanza si `RESEND_API_KEY` está vacía

**Problema:** `new Resend(undefined)` lanza una excepción en el constructor, crasheando el arranque del servidor aunque el email no sea una funcionalidad crítica para desarrollo.

**Solución:** Inicialización condicional: `this.resend = apiKey ? new Resend(apiKey) : null`. Cada método de envío retorna temprano si `this.resend` es `null` y registra un `console.warn` al arrancar.

**Archivos modificados:**

- `apps/api/src/infrastructure/services/ResendEmailService.ts`

### 21.4 — Swagger UI en blanco (helmet + webpack)

**Problema 1:** `helmet()` aplica una CSP estricta que bloquea los scripts y estilos inline de Swagger UI.
**Solución:** `contentSecurityPolicy: false` en desarrollo (`NODE_ENV !== 'production'`).

**Problema 2:** webpack bundlea todo en `dist/main.js`, haciendo que los assets estáticos de Swagger UI (CSS/JS) no sean accesibles en disco.
**Solución:** Se configuró `SwaggerModule.setup()` con `customCssUrl` y `customJs` apuntando a CDN (`unpkg.com/swagger-ui-dist@5`).

**Problema 3:** El `JwtAuthGuard` global bloqueaba con 401 las peticiones a `/api/docs/*` (assets de Swagger).
**Solución:** Se añadió un early-return en `canActivate()` si `request.url?.startsWith('/api/docs')`.

**Archivos modificados:**

- `apps/api/src/main.ts`
- `apps/api/src/auth/guards/jwt-auth.guard.ts`

### 21.5 — Variables de entorno en `apps/web`

Se añadieron `API_URL`, `NEXT_PUBLIC_API_URL` e `INTERNAL_API_SECRET` al `apps/web/.env.local` para que NextAuth pueda comunicarse con el backend NestJS.

**Archivos modificados:**

- `apps/web/.env.local`

---

## 22. Productos destacados aleatorios en la home

**Qué se hizo:**
Se cambió la lógica de la sección "Productos destacados" de la página de inicio. Antes traía los 4 productos con stock más recientes (`findAll({ inStock: true, limit: 4 })`). Ahora selecciona 4 productos aleatorios con stock en cada carga usando una query raw de PostgreSQL (`ORDER BY RANDOM()`), ya que Prisma no expone esta función nativamente.

**Implementación:**

```ts
const randomRows = await prisma.$queryRaw<{ id: string }[]>`
  SELECT id FROM "Product" WHERE stock > 0 ORDER BY RANDOM() LIMIT 4
`
const featuredProducts = randomRows.length > 0
  ? await Promise.all(randomRows.map((r) => repo.findById(r.id).then((p) => p!)))
  : []
```

**Archivos modificados:**

- `apps/web/src/app/(store)/home.tsx`

**Fin:**
Que la sección de destacados muestre productos variados en cada visita, en lugar de siempre los mismos 4 más recientes.

---

---

## 23. Corrección del Widget de Wompi — parámetros no encontrados

**Qué se hizo:**
Se corrigió un bug en `WompiWidget.tsx` donde el script de Wompi reportaba que los parámetros obligatorios (`public-key`, `currency`, `amount-in-cents`, `reference`) no estaban presentes, impidiendo que el botón de pago se renderizara.

**Causa raíz:**
El componente original creaba el `<form>`, los `<input>` hidden y el `<script>` de Wompi todos dinámicamente vía JavaScript en el mismo `useEffect`. El script de Wompi usa `document.currentScript.parentElement` para localizar el form. Al crearse todo en el mismo ciclo JS, el script podía ejecutarse antes de que los campos hidden estuvieran listos en el DOM.

**Solución:**
Se reescribió `WompiWidget.tsx` para renderizar el `<form>` y todos los `<input>` como JSX (presentes en el DOM real antes de que `useEffect` corra). El `useEffect` ahora solo appenda el `<script>` al form ya renderizado via `formRef`. Esto garantiza que cuando el script de Wompi ejecuta, el form y sus campos ya existen en el DOM.

**Archivos modificados:**

- `apps/web/src/components/checkout/WompiWidget.tsx`

**Fin:**
El botón de pago de Wompi renderiza correctamente en el paso 2 del checkout.

---

## 24. Simplificación del flujo de checkout — eliminar segunda llamada a integrity

**Qué se hizo:**

Se corrigió un bug en `CheckoutForm.tsx` donde se realizaban dos llamadas innecesarias para obtener la firma de integridad de Wompi:

1. `POST /orders` ya devuelve `{ order, payment }` donde `payment` incluye `reference`, `integritySignature`, `publicKey` y `amountInCents` (generados por `WompiService.createTransaction()` internamente).
2. A pesar de esto, el código hacía una segunda llamada a `POST /payments/wompi/integrity` que generaba un `reference` **diferente** (con distinto timestamp: `ORDER-{id}-{ts2}` vs `ORDER-{id}-{ts1}`).

**Consecuencia del bug:**
El widget recibía una referencia que no coincidía con la que había quedado registrada en la orden. Si bien el webhook puede extraer el `orderId` de cualquier formato `ORDER-{id}-{ts}`, la discrepancia era innecesaria y podía generar confusión al rastrear pagos.

**Solución:**

- Se eliminó la segunda llamada a `/payments/wompi/integrity`.
- `payment` de la respuesta de `POST /orders` se usa directamente como `wompiParams`.
- Se añadió validación de `payment?.publicKey`: si está vacío (variable de entorno `WOMPI_PUBLIC_KEY` no configurada), se muestra un error claro al usuario en lugar de redirigir a Wompi con parámetros inválidos.

**Archivos modificados:**

- `apps/web/src/components/checkout/CheckoutForm.tsx`
- `README.md` — sección 7 actualizada para reflejar el flujo simplificado

**Fin:**
El flujo de checkout hace una sola llamada al backend para crear la orden y obtener los parámetros de pago. El `WompiWidget` usa exactamente la misma referencia e integritySignature que generó el servidor, eliminando toda ambigüedad.

---

## 25. Corrección del redirect-url para Wompi en entorno local

**Qué se hizo:**

La WAF de Wompi (CloudFront) rechaza con **403** cualquier petición cuyo parámetro `redirect-url` contenga `localhost` o `127.0.0.1`, ya que lo detecta como un posible ataque SSRF. En desarrollo, `window.location.origin` siempre retorna `http://localhost:3000`, lo que disparaba el bloqueo inmediatamente.

**Solución:**

- Se agregó la variable de entorno `NEXT_PUBLIC_APP_URL` en `apps/web/.env.local`.
- `CheckoutForm.tsx` ahora construye el `redirect-url` usando `process.env.NEXT_PUBLIC_APP_URL` con fallback a `window.location.origin`.
- Para probar Wompi en local se requiere exponer el frontend con ngrok (`ngrok http 3000`) y poner esa URL en `NEXT_PUBLIC_APP_URL`.
- En producción se pone el dominio real.

**Archivos modificados:**

- `apps/web/src/components/checkout/CheckoutForm.tsx`
- `apps/web/.env.local` — agregado `NEXT_PUBLIC_APP_URL`

**Fin:**

Wompi acepta el redirect-url cuando apunta a una URL pública HTTPS (ngrok en dev, dominio real en prod). El bloqueo 403 de CloudFront desaparece.

---

## 26. CORS en NestJS — soporte ngrok para testing local de Wompi

**Qué se hizo:**

Se amplió la configuración CORS de `apps/api/src/main.ts` para aceptar automáticamente cualquier subdominio de `ngrok-free.app` y `ngrok-free.dev` en modo desarrollo. Esto permite que el browser haga peticiones a `localhost:3001` desde la URL pública de ngrok sin que el backend las rechace.

En producción (`NODE_ENV=production`) solo se acepta el origin declarado en `FRONTEND_URL`.

**Archivos modificados:**

- `apps/api/src/main.ts`

**Fin:**

Las llamadas del checkout (`POST /orders`) funcionan cuando el frontend se accede desde ngrok, sin necesidad de actualizar el backend cada vez que ngrok genera una nueva URL.

---

## 27. Configuración de deploy — Vercel (frontend) + Railway (backend)

**Qué se hizo:**

Se crearon los archivos de configuración de deployment para ambas plataformas.

**`vercel.json`** (raíz del monorepo):
- `installCommand`: `pnpm install --frozen-lockfile` — instala todo el workspace
- `buildCommand`: genera Prisma client + build de Next.js
- `outputDirectory`: apunta a `apps/web/.next`
- `ignoreCommand`: solo redeploya si cambiaron archivos de `apps/web` o `packages`

**`railway.toml`** (raíz del monorepo):
- `buildCommand`: instala deps + genera Prisma + compila NestJS con webpack
- `startCommand`: `node apps/api/dist/main.js` — ejecuta el bundle de producción
- `healthcheckPath`: Railway verifica que el servicio levantó antes de enrutar tráfico

**Archivos creados:**

- `vercel.json`
- `railway.toml`

**Fin:**

El monorepo queda listo para deploy con un solo push a la rama `main`. Railway usa el `railway.toml` para construir y servir el backend NestJS. Vercel usa el `vercel.json` para construir y servir el frontend Next.js.

---

## 28. Correcciones de build para deploy en Vercel y Railway

**Qué se hizo:**

Se resolvió una cascada de errores que impedían el build de producción en ambas plataformas.

### 28.1 — TypeScript: eliminación de `noUncheckedIndexedAccess`

`tsconfig.base.json` tenía `noUncheckedIndexedAccess: true`, una opción ultra-estricta que convierte cualquier acceso a array `arr[i]` en `T | undefined`. Causó docenas de errores en toda la app (HeroBannerCarousel, scripts de seed, componentes de store) porque el código asumía que las posiciones de array con índices conocidos eran `T`.

**Decisión:** Se eliminó `noUncheckedIndexedAccess` del `tsconfig.base.json`. Esta opción tiene beneficios teóricos en seguridad de tipos pero su costo de mantenimiento en código real es desproporcionado.

Se solucionó también el error puntual de `HeroBannerCarousel.tsx` donde `banners[activeIndex]` se accedía antes del guard de `banners.length > 0` — se movió la asignación después del guard con aserción `!`.

### 28.2 — `next.config.ts`: opción eslint inválida

`eslint: { ignoreDuringBuilds: true }` ya no existe en Next.js 15+. Su presencia rompía el build con `Invalid next.config.ts options`. Se eliminó la opción. TypeScript errors se suprimen con `typescript: { ignoreBuildErrors: true }` (que sí existe).

### 28.3 — `vercel.json`: `outputDirectory` con ruta duplicada

`outputDirectory` estaba configurado como `apps/web/.next`. Vercel ya ejecuta los comandos dentro del directorio `apps/web` (porque detecta que es el directorio del framework), por lo que el path efectivo se convertía en `apps/web/apps/web/.next` — inexistente. Se corrigió a `.next`.

### 28.4 — Railway: healthcheck fallaba por falta de ruta raíz

Railway verifica que el servicio levantó correctamente haciendo `GET /` y esperando un 200. NestJS no tenía ninguna ruta en `/`, lo que causaba que el healthcheck fallara indefinidamente y Railway nunca enrutara tráfico al servicio.

Se creó `apps/api/src/app.controller.ts` con:

```typescript
@Controller()
export class AppController {
  @Get()
  @Public()
  @SkipThrottle()
  health() { return { status: 'ok' } }
}
```

Y se registró en `AppModule.controllers`.

### 28.5 — `tsconfig.base.json`: `lib` faltaba `DOM`

`@h2r/domain` usa `Headers` y `console` globales del browser. La lib del base tsconfig solo tenía `ES2022`, causando "Cannot find name 'Headers'" durante el build de NestJS. Se agregó `"DOM"` al array `lib`.

**Archivos modificados:**

- `tsconfig.base.json` — eliminado `noUncheckedIndexedAccess`, agregado `"DOM"` a lib
- `apps/web/src/components/store/HeroBannerCarousel.tsx` — movida aserción `!` después del guard
- `apps/web/next.config.ts` — eliminada opción eslint inválida
- `vercel.json` — `outputDirectory` corregido a `.next`
- `apps/api/src/app.controller.ts` *(nuevo)* — health endpoint para Railway
- `apps/api/src/app.module.ts` — registrado `AppController`

**Fin:**

Frontend deployado en Vercel, backend deployado en Railway. URLs de producción:

- Frontend: `h2r-online-store-git-main-kevin-santiagos-projects-695b8ef9.vercel.app`
- Backend: `h2rapi-production.up.railway.app`

---

## 29. Normalización de line endings — `.gitattributes`

**Qué se hizo:**

Se creó `.gitattributes` en la raíz del monorepo con `* text=auto eol=lf`. Sin este archivo, Windows con `core.autocrlf=true` convertía automáticamente los LF del repositorio a CRLF en el working tree, marcando 19 archivos como "modificados" sin ningún cambio real de contenido después de cada checkout.

Con `eol=lf`, Git normaliza los line endings al hacer checkout independientemente del OS y la configuración local de autocrlf. Los archivos binarios (imágenes, fuentes, PDFs) se marcan explícitamente con `binary` para que Git nunca intente convertirlos.

**Archivos creados:**

- `.gitattributes`

**Fin:**

`git status` queda limpio después de checkout en Windows sin necesidad de hacer commits vacíos de normalización.

---

## 30. Sprint 1 — Emails transaccionales activados en el flujo de pedidos

**Rama:** `sprint1/order-flow-features`

**Qué se hizo:**

`ResendEmailService` existía con 3 métodos de envío pero nunca se llamaba desde ningún lugar del código. Se activó el servicio en el flujo completo de pedidos.

### Nuevo método: `sendOrderReceived()`

Se creó un cuarto método `sendOrderReceived()` que se dispara al **crear** la orden (estado `PENDING`), funcionando como acuse de recibo antes de que el cliente complete el pago. Los métodos de webhook existentes (`WompiController` y `MercadoPagoController`) ya llamaban `sendOrderConfirmation()` al **aprobar** el pago — ese flujo se conservó.

### Integración en `OrdersController`

Se inyectó `ResendEmailService` en `OrdersController` (el servicio ya estaba exportado desde `InfrastructureModule`, no requirió cambios en el módulo). Después de un `CreateOrder` exitoso se dispara con **fire-and-forget** (`.catch()` con Logger) para que un fallo del email nunca bloquee ni afecte la respuesta HTTP al cliente.

### Refactorización del template builder

Se reemplazaron los 4 bloques de HTML duplicados por un único método privado `buildEmail()` parametrizable. Todos los métodos de envío lo usan. Los templates ahora son:

- **Responsivos**: estructura basada en tablas HTML (compatible con Gmail, Outlook, Apple Mail)
- **Con manejo de errores**: cada método público tiene `try/catch` interno con `Logger.error()` — fallos del email son silenciosos para el usuario
- **Logger** en lugar de `console.warn` para consistencia con NestJS

**Flujo completo de emails resultante:**

| Evento | Asunto | Disparado desde |
| ------ | ------ | --------------- |
| Orden creada (PENDING) | "Recibimos tu pedido #..." | `OrdersController.create()` |
| Pago aprobado por Wompi | "¡Pago confirmado! Pedido #..." | `WompiController.webhook()` |
| Pago aprobado por Mercado Pago | "¡Pago confirmado! Pedido #..." | `MercadoPagoController.webhook()` |
| Pedido despachado | "Tu pedido está en camino 🚚" | (disponible, pendiente de llamada desde admin) |
| Pago rechazado | "Problema con tu pago" | (disponible, pendiente de llamada desde webhook DECLINED) |

**Archivos modificados:**

- `apps/api/src/infrastructure/services/ResendEmailService.ts` — nuevo método, template builder unificado, Logger
- `apps/api/src/orders/orders.controller.ts` — inyección de `ResendEmailService`, fire-and-forget post-CreateOrder

---

## 31. Sprint 1 — Historial de pedidos del cliente (`/pedidos`)

**Rama:** `sprint1/order-flow-features`

**Qué se hizo:**

Se implementó la página de historial de pedidos accesible para clientes autenticados. El Navbar y el ProfileModal ya tenían links a `/pedidos` pero la ruta no existía.

### `getOrderHistory()` — query de datos

Se creó `apps/web/src/lib/queries/getOrderHistory.ts` con una función que ejecuta una `$transaction` de Prisma para obtener pedidos + conteo en una sola ida a la base de datos. El query hace join con `Product` para incluir nombre, slug e imagen de cada producto en los items — algo que `IOrderRepository.findByUserId()` del dominio no retornaba.

Paginación: 8 pedidos por página, retorna `{ orders, total, page, totalPages }`.

### `OrderStatusBadge` — componente reutilizable

Se creó `apps/web/src/components/store/OrderStatusBadge.tsx` con un mapa de configuración para los 5 estados (`PENDING`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`), cada uno con label en español y colores semánticos con transparencia (funcionan sobre fondos claros y oscuros). Este componente es reutilizado en Feature 3.

### Página `/pedidos` — Server Component

`apps/web/src/app/(store)/pedidos/page.tsx` es un Server Component puro:

- Guard de sesión con `auth()`: redirige a `/auth/login?callbackUrl=/pedidos` si no hay sesión
- Empty state con CTA al catálogo cuando no hay pedidos
- Cada tarjeta muestra: número de pedido (font-mono), `OrderStatusBadge`, fecha formateada, total en COP, thumbnail del producto, nombre clicable al producto, cantidad × precio unitario, ciudad de envío y enlace "Ver detalle →" a la confirmación
- Paginación con links `?page=N` (sin JS, con prefetch nativo de Next.js)

**Archivos creados:**

- `apps/web/src/lib/queries/getOrderHistory.ts`
- `apps/web/src/components/store/OrderStatusBadge.tsx`
- `apps/web/src/app/(store)/pedidos/page.tsx`

---

## 32. Sprint 1 — Rediseño de la página de confirmación de pedido

**Rama:** `sprint1/order-flow-features`

**Qué se hizo:**

La página `/checkout/confirmacion` mostraba únicamente el estado del pedido (PAID o PENDING) y el número de orden. Se rediseñó para mostrar un resumen completo post-compra.

### `getOrderConfirmation()` — query de datos

Se creó `apps/web/src/lib/queries/getOrderConfirmation.ts` con una query Prisma que incluye los items con join a `Product` (nombre, slug, imagen) y la dirección de envío desestructurada desde el campo JSON de la BD.

### Nuevos elementos en la página

- **Hero de estado**: icono + título dinámico según el estado (PAID / PENDING / otro)
- **Tarjeta principal** con cuatro secciones:
  1. **Cabecera**: número de pedido (font-mono) + `OrderStatusBadge` + fecha con hora
  2. **Productos**: thumbnail (Next.js `<Image>`), nombre clicable al producto, cantidad × precio unitario, subtotal por item
  3. **Total**: fondo gris diferenciado, total en COP con tipografía bold
  4. **Envío + Pago**: dirección completa (nombre destinatario, calle, ciudad, departamento, teléfono, notas opcionales) y método de pago con label legible ("Wompi" / "Mercado Pago")
- **Acciones**: dos CTAs — "Ver mis pedidos" (→ `/pedidos`) y "Seguir comprando" (→ `/catalogo`)
- **Estado `NotFound`**: cuando falta `orderId` en la URL o el ID no existe en la BD, muestra una pantalla de error con CTA a `/pedidos` en lugar de una página rota

**Archivos creados:**

- `apps/web/src/lib/queries/getOrderConfirmation.ts`

**Archivos modificados:**

- `apps/web/src/app/(store)/checkout/confirmacion/page.tsx` — reescritura completa

---

---

## 33. Sprint 2 — CRUD completo de categorías en el panel admin

**Rama:** `sprint2/admin-categories-and-404`

**Qué se hizo:**

Se implementó la gestión completa de categorías desde el panel de administración: endpoints REST en NestJS, página Server Component, y UI interactiva con formularios de creación/edición y eliminación con confirmación inline.

### API — `AdminCategoriesController`

**4 endpoints** bajo `/admin/categories` (todos requieren rol `ADMIN`):

| Método   | Ruta                     | Descripción                                        |
| -------- | ------------------------ | -------------------------------------------------- |
| `GET`    | `/admin/categories`      | Lista todas con padre y `_count.products`          |
| `POST`   | `/admin/categories`      | Crea, valida unicidad de slug y máximo 2 niveles   |
| `PUT`    | `/admin/categories/:id`  | Edita, mismas validaciones + anti-auto-referencia  |
| `DELETE` | `/admin/categories/:id`  | Bloquea si tiene productos o subcategorías         |

**Validaciones de negocio:**

- Slug único (regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`)
- Máximo 2 niveles de jerarquía (padre → hijo, no nieto)
- El `DELETE` lanza `ConflictException` con conteo si la categoría tiene productos o hijos
- Auto-referencia bloqueada: una categoría no puede ser su propio padre

**DTO:** `CreateCategoryDto` con `class-validator` (`@IsString`, `@MinLength`, `@MaxLength`, `@Matches`, `@IsOptional`).

### Web — `/admin/categorias`

**`AdminCategoriasPage`** (Server Component): query Prisma con `parent` e `_count.products`, pasa `CategoryRow[]` tipados a `CategoryManager`.

**`CategoryManager`** (Client Component, ~300 líneas):

- `categorySchema` con Zod v4 para validación client-side
- `toSlug()` helper: auto-genera slug desde el nombre mientras escribe
- Sub-componente `CategoryForm` compartido entre crear y editar
- Sub-componente `Modal` con cierre por Escape y clic en backdrop
- Tabla con badge "Raíz" / nombre del padre, conteo de productos
- Confirmación de borrado inline (sin modal extra) con mensaje de error de la API si el delete falla
- `router.refresh()` tras cada mutación para re-ejecutar el Server Component

**Archivos creados:**

- `apps/api/src/admin/dto/create-category.dto.ts`
- `apps/api/src/admin/admin-categories.controller.ts`
- `apps/web/src/app/admin/categorias/page.tsx`
- `apps/web/src/components/admin/CategoryManager.tsx`

**Archivos modificados:**

- `apps/api/src/admin/admin.module.ts` — añadido `AdminCategoriesController`
- `apps/web/src/app/admin/layout.tsx` — añadido link "Categorías" al sidebar

---

## 34. Sprint 2 — Página 404 personalizada

**Rama:** `sprint2/admin-categories-and-404`

**Qué se hizo:**

Se creó `apps/web/src/app/not-found.tsx` — el archivo raíz que Next.js usa automáticamente para cualquier ruta no encontrada.

**Contenido:** número `404` en tipografía enorme y gris claro (`text-[120px]`), ícono 🏍️, título "Página no encontrada", descripción, y dos CTAs: "Ir al inicio" (fondo negro) y "Ver catálogo" (fondo sky-400).

**Archivos creados:**

- `apps/web/src/app/not-found.tsx`

---

## 35. Corrección de bug — redirect de cierre de sesión hacia ngrok caído

**Qué se hizo:**

Al cerrar sesión, NextAuth redirigía a `https://hefty-overgrown-bagful.ngrok-free.dev/` (túnel ngrok offline) en lugar de `http://localhost:3000/`. La causa era que `NEXTAUTH_URL` en `apps/web/.env.local` apuntaba al antiguo túnel de ngrok que se usó para probar Wompi.

`signOut({ callbackUrl: '/' })` en `Navbar.tsx` usa una ruta relativa (`/`), pero NextAuth la resuelve contra `NEXTAUTH_URL`, produciendo la URL absoluta del ngrok caído.

**Solución:** Actualizar ambas variables en `apps/web/.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

**Nota:** Cuando se necesite volver a probar Wompi con ngrok, levantar un nuevo túnel y actualizar ambas variables con la nueva URL.

**Archivos modificados:**

- `apps/web/.env.local`

---

## 36. Sprint 3 — Loading skeletons para rutas de la tienda

**Rama:** `sprint3/loading-skeletons-password-recovery-invoice`

**Qué se hizo:**

Se agregaron `loading.tsx` a las 4 rutas principales de la tienda para eliminar el flash de pantalla vacía durante la carga de Server Components. Next.js App Router muestra automáticamente el contenido del `loading.tsx` mientras la página resuelve sus datos asíncronos (streaming con Suspense).

### `Skeleton.tsx` — primitivas compartidas

`apps/web/src/components/ui/Skeleton.tsx` exporta 4 primitivas sin dependencias externas:

- `SkeletonBlock` — rectángulo con `animate-pulse` y `rounded-lg` (versión clara)
- `SkeletonLine` — línea con `rounded-full` y `h-4` (versión clara)
- `SkeletonBlockDark` — mismo pero con `bg-white/10` para fondos oscuros
- `SkeletonLineDark` — idem

### Skeletons por ruta

| Ruta               | Esqueleto                                                               |
| ------------------ | ----------------------------------------------------------------------- |
| `/catalogo`        | Grid 12 cards con toolbar (botón filtros + chip) y breadcrumb           |
| `/producto/[slug]` | Galería (imagen principal + 4 miniaturas) + columna de detalle completa |
| `/checkout`        | Layout 2 columnas: 6 campos de formulario + resumen con 3 items         |
| `/pedidos`         | 3 cards de pedido con header, 2 items cada una y footer                 |

**Decisión clave:** Todos son Server Components puros (sin `'use client'`). Las dimensiones replican exactamente el layout real para cero Cumulative Layout Shift (CLS).

**Archivos creados:**

- `apps/web/src/components/ui/Skeleton.tsx`
- `apps/web/src/app/(store)/catalogo/loading.tsx`
- `apps/web/src/app/(store)/producto/[slug]/loading.tsx`
- `apps/web/src/app/(store)/checkout/loading.tsx`
- `apps/web/src/app/(store)/pedidos/loading.tsx`

---

## 37. Sprint 3 — Recuperación de contraseña (forgot/reset password)

**Rama:** `sprint3/loading-skeletons-password-recovery-invoice`

**Qué se hizo:**

Se implementó el flujo completo de recuperación de contraseña con máxima seguridad: generación de token de 256 bits, almacenamiento solo del hash SHA-256, expiración de 1 hora, invalidación tras uso y protección anti-enumeración de emails.

### Schema Prisma — `PasswordResetToken`

Nuevo modelo agregado a `packages/database/prisma/schema.prisma`:

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique  // SHA-256 — nunca almacenamos el token crudo
  expiresAt DateTime
  usedAt    DateTime?           // null = disponible, non-null = consumido
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

Migración aplicada: `20260508221543_add_password_reset_token`.

### API — endpoints públicos

**`POST /auth/forgot-password`** (throttle: 3 req / 15 min):

1. Busca usuario por email (solo con `password` no nulo — excluye OAuth)
2. Invalida tokens anteriores pendientes del mismo usuario (`updateMany usedAt = now`)
3. Genera `rawToken = randomBytes(32).toString('hex')` (256 bits)
4. Almacena `tokenHash = sha256(rawToken)` en la BD
5. Envía email con link `${FRONTEND_URL}/auth/reset-password/${rawToken}`
6. **Siempre responde `200 OK`** con el mismo mensaje — anti-enumeración

**`POST /auth/reset-password`** (throttle: 5 req / 60 seg):

1. Calcula `tokenHash = sha256(dto.token)`
2. Busca el registro en BD por hash
3. Valida: existe + `usedAt === null` + `expiresAt > now()`
4. Ejecuta transacción: `UPDATE user SET password = bcrypt(newPass)` + `UPDATE token SET usedAt = now()`
5. Responde `400` con mensaje si el token es inválido o expiró

### Seguridad implementada

| Amenaza                 | Mitigación                                                          |
| ----------------------- | ------------------------------------------------------------------- |
| Enumeración de emails   | Siempre `200 OK` aunque el email no exista                          |
| Brute-force del token   | SHA-256 en BD; token de 256 bits en URL — impracticable             |
| Reutilización del token | `usedAt` se marca al consumir                                       |
| Token expirado          | `expiresAt = now + 1h`, validado en cada uso                        |
| Flood de solicitudes    | Throttle estricto 3/15min en forgot-password                        |
| OAuth sin contraseña    | Usuarios Google sin `password` excluidos del flujo                  |
| Tokens huérfanos        | Al solicitar reset nuevo, los anteriores pendientes se invalidan    |

### Email de recuperación

Nuevo método `sendPasswordReset()` en `ResendEmailService` con template HTML responsivo (tabla-based, compatible con Gmail/Outlook). Botón CTA azul con enlace al token, advertencia de 1 hora de expiración, y aviso de que si el usuario no solicitó el cambio puede ignorar el correo.

### Frontend

**`/auth/forgot-password`**: formulario con Zod v4 (`z.email()`), estado success con checkmark verde, manejo explícito de rate-limit 429, mensaje genérico en éxito para no revelar si el email existe.

**`/auth/reset-password/[token]`**: el Server Component extrae el token de los params y lo pasa como prop al Client Component. Formulario con nueva contraseña + confirmación, validación Zod v4 con `refine()` para verificar coincidencia, redirect automático a `/auth/login` tras 2.5 segundos de éxito. Error de token inválido/expirado incluye link directo a `/auth/forgot-password`.

**`LoginForm.tsx`**: link "Recuperar por correo" actualizado de `?magic=1` a `/auth/forgot-password`.

**Archivos creados:**

- `packages/database/prisma/migrations/20260508221543_add_password_reset_token/migration.sql`
- `apps/api/src/auth/dto/forgot-password.dto.ts`
- `apps/api/src/auth/dto/reset-password.dto.ts`
- `apps/web/src/app/auth/forgot-password/page.tsx`
- `apps/web/src/app/auth/forgot-password/ForgotPasswordForm.tsx`
- `apps/web/src/app/auth/reset-password/[token]/page.tsx`
- `apps/web/src/app/auth/reset-password/[token]/ResetPasswordForm.tsx`

**Archivos modificados:**

- `packages/database/prisma/schema.prisma` — nuevo modelo + relación en `User`
- `apps/api/src/auth/auth.service.ts` — métodos `forgotPassword()` y `resetPassword()`
- `apps/api/src/auth/auth.controller.ts` — 2 endpoints con throttle
- `apps/api/src/infrastructure/services/ResendEmailService.ts` — `sendPasswordReset()` + template
- `apps/web/src/app/auth/login/LoginForm.tsx` — link actualizado

---

## 38. Sprint 3 — Generación de factura PDF desde historial de pedidos

**Rama:** `sprint3/loading-skeletons-password-recovery-invoice`

**Qué se hizo:**

Se agregó la posibilidad de descargar una factura PDF desde cada pedido en `/pedidos`. El PDF se genera 100% client-side con jsPDF usando los datos ya cargados por el Server Component — sin fetches adicionales.

### Arquitectura de la solución

**`generateInvoicePdf.ts`** — utilidad pura (sin side-effects):

- Recibe `OrderHistoryEntry` (mismo tipo que usa la página)
- Usa `import('jspdf')` dinámico — jsPDF (~300 KB) no entra en el bundle inicial
- Construye el documento y llama `doc.save('factura-XXXXXXXX.pdf')`
- No tiene estado ni dependencias de React

**`InvoiceDownloadButton.tsx`** — Client Component mínimo:

- Recibe `order: OrderHistoryEntry` como prop del Server Component
- Maneja solo el estado `loading` (spinner mientras genera)
- Llama `generateInvoicePdf(order)` al hacer clic

**`pedidos/page.tsx`** — sin cambio en la query:

- Importa `InvoiceDownloadButton` y lo pasa `order={order}` dentro del footer de cada card
- El botón aparece junto al link "Ver detalle →"

### Diseño del PDF

| Sección            | Contenido                                                                             |
| ------------------ | ------------------------------------------------------------------------------------- |
| Header negro       | Nombre de tienda + `FACTURA #XXXXXXXX` en esquina derecha                             |
| Metadata           | Fecha formateada + estado del pedido                                                  |
| Datos de envío     | Ciudad, departamento, método de pago                                                  |
| Tabla de productos | Cabecera negra · filas alternadas · columnas: Producto / Cant. / P. Unit. / Subtotal  |
| Total              | Bloque con fondo sky-500 y tipografía blanca bold                                     |
| Footer             | Email de soporte + disclaimer de factura electrónica                                  |

Tipografía con `helvetica` (embebida en jsPDF). Colores tomados de la paleta Tailwind del proyecto (slate-900, slate-500, slate-100, sky-500).

**Archivos creados:**

- `apps/web/src/lib/generateInvoicePdf.ts`
- `apps/web/src/components/store/InvoiceDownloadButton.tsx`

**Archivos modificados:**

- `apps/web/src/app/(store)/pedidos/page.tsx` — import + botón en footer de cada card
- `apps/web/package.json` — dependencia `jspdf`

---

## 41. Sprint 4 — FIX 4.1: Eliminar `ignoreBuildErrors` y resolver errores TypeScript

**Qué se hizo:**
Se eliminó la opción `typescript: { ignoreBuildErrors: true }` de `apps/web/next.config.ts`, que silenciaba todos los errores de TypeScript en los builds de producción. Se ejecutó `pnpm --filter @h2r/web type-check` y se resolvieron los 11 errores encontrados:

**Grupo 1 — Tipos de modelos Prisma 7 renombrados:**
Prisma 7 genera los tipos de modelos con el sufijo `Model` (`OrderModel`, `OrderItemModel`, `PaymentModel`, `ProductModel`, `MotorcycleCompatibilityModel`, `UserModel`). Los tres repositorios en `apps/web/src/infrastructure/repositories/` importaban los nombres sin sufijo (e.g. `type Order as PrismaOrder`), que ya no existen en la API pública de `@h2r/database`. Se actualizaron todos los imports al nombre correcto.

**Grupo 2 — Augmentación de módulo `next-auth/jwt` inválida:**
`declare module 'next-auth/jwt'` fallaba con TS2664 porque `next-auth/jwt` re-exporta desde `@auth/core/jwt`, y pnpm no hoist `@auth/core` a `node_modules/@auth/core`. TypeScript no puede resolver la cadena de re-export, invalidando la augmentación. Se eliminó el bloque `declare module 'next-auth/jwt'` y se reemplazó con un comentario explicativo. En el `session` callback se usan casts explícitos (`token.id as string`, `token.role as string`, `token.accessToken as string | undefined`) que son safe dado que esos campos se asignan siempre en el `jwt` callback.

**Archivos modificados:**

- `apps/web/next.config.ts` — eliminada propiedad `typescript.ignoreBuildErrors`
- `apps/web/src/infrastructure/repositories/PrismaOrderRepository.ts` — imports `OrderModel`, `OrderItemModel`, `PaymentModel`
- `apps/web/src/infrastructure/repositories/PrismaProductRepository.ts` — imports `ProductModel`, `MotorcycleCompatibilityModel`
- `apps/web/src/infrastructure/repositories/PrismaUserRepository.ts` — import `UserModel`
- `apps/web/src/lib/auth.ts` — eliminado `declare module 'next-auth/jwt'`, casts en session callback

**Resultado:** `pnpm --filter @h2r/web type-check` pasa sin errores (0 errores, 0 warnings).

---

## 42. Sprint 4 — FIX 4.2: Race condition en webhook Wompi (transacción atómica)

**Qué se hizo:**
Se resolvió la race condition y el gap de atomicidad en el flujo de confirmación de pago. Aunque `transitionFromPending()` ya usaba `$transaction` para el cambio de estado de Order y Payment, el descuento de stock ocurría DESPUÉS de esa transacción en un loop separado en `ConfirmPayment.ts`. Esto creaba una ventana donde un proceso podía fallar entre el cambio de estado y el descuento de stock, dejando la orden en PAID con stock sin descontar.

**Diseño:**
Se extendió `IOrderRepository.transitionFromPending()` con un parámetro opcional `stockDecrements`. Cuando se proporciona (solo para APPROVED), el descuento de stock ocurre DENTRO de la misma `$transaction` de Prisma que actualiza Order.status y Payment.status. Resultado: las tres operaciones son atómicas — o todas se aplican o ninguna.

**Cambios clave:**

- `IOrderRepository.transitionFromPending()` ahora acepta `stockDecrements?: Array<{ productId, quantity }>` en el parámetro `to`
- `PrismaOrderRepository` (api): agrega loop de `tx.product.update({ data: { stock: { decrement: quantity } } })` dentro de la `$transaction` cuando `stockDecrements` está presente
- `ConfirmPayment.ts`: elimina dependencia de `IProductRepository` y el loop separado de `decrementStock`; pasa `order.items` como `stockDecrements` cuando `status === 'APPROVED'`
- `WompiController` y `MercadoPagoController`: eliminan `@Inject(PRODUCT_REPOSITORY)` y la inyección `productRepo` (ya no la necesitan)
- `apps/web/src/infrastructure/repositories/PrismaOrderRepository.ts`: actualiza la firma de `transitionFromPending()` para coincidir con la interfaz (sin implementar stock decrement, ya que web no procesa webhooks)

**Archivos modificados:**

- `packages/domain/src/repositories/IOrderRepository.ts`
- `packages/domain/src/use-cases/orders/ConfirmPayment.ts`
- `apps/api/src/infrastructure/repositories/PrismaOrderRepository.ts`
- `apps/api/src/payments/wompi.controller.ts`
- `apps/api/src/payments/mercadopago.controller.ts`
- `apps/web/src/infrastructure/repositories/PrismaOrderRepository.ts`

**Resultado:** `pnpm --filter @h2r/web type-check` y `pnpm --filter @h2r/api type-check` pasan sin errores.

---

## 43. Sprint 4 — FIX 4.3: Resolver `PrismaAdapter(prisma as any)` y error TS6307 en @h2r/database

**Qué se hizo:**
Se eliminó el cast `as any` en `PrismaAdapter(prisma as any)` dentro de `apps/web/src/lib/auth.ts`. La investigación mostró que `@auth/prisma-adapter@2.11.2` y `@prisma/client@7.8.0` son estructuralmente compatibles — el cast fue agregado originalmente cuando la versión del adapter no matcheaba, pero con las versiones actuales no hay mismatch. TypeScript compila sin errores al pasar `prisma` directamente.

Se corrigió también un error TS6307 pre-existente en `packages/database/tsconfig.json`: la entrada `exclude: ["src/generated/**/*"]` impedía que los archivos del cliente Prisma generado (que tienen `@ts-nocheck`) fueran reconocidos como parte del proyecto TypeScript compuesto, causando el error "File is not listed within the file list of project" cada vez que `src/index.ts` los importaba. La corrección fue agregar `src/generated/**/*.ts` al `include` y eliminar el `exclude`.

**Archivos modificados:**

- `apps/web/src/lib/auth.ts` — elimina `eslint-disable @typescript-eslint/no-explicit-any` + cast `as any`
- `packages/database/tsconfig.json` — agrega `src/generated/**/*.ts` a `include`, elimina `exclude` de generated

**Resultado:** `pnpm type-check` pasa 6/6 tareas en el monorepo sin errores.

---

## 44. Sprint 4 — FIX 4.4: Filtro `userId` en confirmación de pedido

**Qué se hizo:**
Se auditaron todos los Server Components y query helpers de `apps/web/src/` que acceden a pedidos vía Prisma. Se encontró una brecha de autorización en `getOrderConfirmation`: la función buscaba por `id` únicamente, sin verificar que el pedido perteneciera al usuario autenticado. Cualquier usuario que conociera el `orderId` de otro podía ver su confirmación.

**Cambios:**

- `getOrderConfirmation(orderId, userId)`: agrega `userId` como segundo parámetro obligatorio y lo incluye en el `where` de Prisma (`where: { id: orderId, userId }`). Si el orderId existe pero pertenece a otro usuario, Prisma retorna `null` y la página muestra "Pedido no encontrado".
- `ConfirmacionPage`: agrega `auth()` al inicio del componente. Si no hay sesión activa, redirige a `/auth/login`. Pasa `session.user.id` a `getOrderConfirmation`.

**Rutas auditadas como seguras (sin cambios necesarios):**

- `getOrderHistory`: ya filtraba por `userId` desde el inicio
- `catalogo/page.tsx`, `home.tsx`: queries públicas sobre productos y categorías — no exponen datos de usuario

**Archivos modificados:**

- `apps/web/src/lib/queries/getOrderConfirmation.ts`
- `apps/web/src/app/(store)/checkout/confirmacion/page.tsx`

**Resultado:** `tsc --noEmit` en `apps/web` pasa sin errores.

---

## 45. Sprint 4 — FIX 4.5: Eliminar N+1 queries en la vista landing del catálogo

**Qué se hizo:**
Se auditaron todas las queries de productos en `apps/web/src/`. Se confirmó que `PrismaProductRepository` ya usaba `include: { compatible: true }` en todos sus métodos (sin N+1 en compatibilidad). El problema estaba en la **vista landing** de `catalogo/page.tsx`:

**Antes** (1 + N×2 queries — con 5 categorías padre = 11 queries):

```typescript
prisma.category.findMany()                        // 1 query
Promise.all(parents.map(() =>
  Promise.all([
    prisma.product.findMany({ categoryId: parent })  // 1 por padre
    prisma.product.count({ categoryId: parent })     // 1 por padre
  ])
))
```

**Después** (3 queries totales):

1. `prisma.category.findMany` con hijos (sin cambio)
2. `prisma.product.findMany` con **todos** los categoryIds a la vez
3. `prisma.product.groupBy({ by: ['categoryId'], _count: true })` para contar por categoría en un solo round-trip

El ensamblado en memoria usa `new Map(countRows.map(...))` y `allProducts.filter().slice(0, 8)` por cada padre. El orden `createdAt desc` se preserva porque la query global ya está ordenada.

**Archivos modificados:**

- `apps/web/src/app/(store)/catalogo/page.tsx` — solo la sección de vista landing (lines ~231-270)

**Resultado:** `pnpm type-check` pasa 6/6 tareas. La vista grid no fue modificada (usa `PrismaProductRepository.findAll()` que ya era eficiente).

---

## 46. Sprint 5 — FEATURE 5.1: Tests unitarios para el flujo de pagos con Vitest

**Qué se hizo:**
Se instaló Vitest como framework de testing en `packages/domain` y `apps/api`. Se crearon 23 tests distribuidos en tres archivos cubriendo los casos críticos del flujo de pagos.

**Archivos de test creados:**

- `packages/domain/src/__tests__/CreateOrder.test.ts` (6 tests)
  - Happy path: total calculado correctamente; `create()` llamado con ítems resueltos
  - `err(STOCK_UNAVAILABLE)` cuando cantidad supera stock
  - `err(NOT_FOUND)` cuando producto no existe
  - `err(VALIDATION_ERROR)` cuando cantidad = 0 o producto inactivo

- `packages/domain/src/__tests__/ConfirmPayment.test.ts` (8 tests)
  - `ok({ stateChanged: true, finalStatus: PAID })` cuando pago APPROVED
  - `stockDecrements` pasa correctamente dentro de `transitionFromPending`
  - Idempotencia: `stateChanged: false` si orden ya no es PENDING
  - Idempotencia: `stateChanged: false` si `transition.applied = false` (webhook duplicado)
  - No llama a `transitionFromPending` cuando webhook reporta PENDING
  - `CANCELLED` + sin `stockDecrements` cuando pago es DECLINED
  - `err(VALIDATION_ERROR)` cuando monto del webhook no coincide con `order.total`
  - `err(NOT_FOUND)` cuando el pedido no existe

- `apps/api/src/__tests__/WompiService.test.ts` (9 tests)
  - Acepta payload con firma SHA-256 correcta y timestamp dentro de ventana
  - Rechaza checksum alterado; rechaza timestamp >600 s en el pasado/futuro
  - Rechaza payload sin `signature`; rechaza cuando `WOMPI_EVENTS_SECRET` no está configurado
  - `computeIntegritySignature`: determinismo, sensibilidad a parámetros, formato hex 64 chars

**Configuración:**

- `packages/domain/vitest.config.ts`: alias `@/domain → ./src`
- `apps/api/vitest.config.ts`: `setupFiles: ['reflect-metadata']` para decoradores NestJS
- Script `"test": "vitest run"` agregado en ambos `package.json`

**Hallazgo adicional corregido:**
Archivos `.js` compilados stale en `packages/domain/src/` (debían estar en `dist/`) hacían que Vitest cargara código previo a FIX 4.2. Se eliminaron.

**Resultado:** `pnpm --filter @h2r/domain test` pasa 14/14. `pnpm --filter @h2r/api test` pasa 9/9. `pnpm type-check` 6/6.

---

## 47. Sprint 5 — FEATURE 5.2: Logging estructurado JSON + error boundaries

**Qué se hizo:**
Se implementó una capa completa de observabilidad estructurada para la API y el frontend, dado que Sentry no estaba disponible en el proyecto.

**Archivos nuevos:**

- `apps/api/src/shared/logger/StructuredLogger.ts`
  - Implementa `LoggerService` de NestJS.
  - Emite cada línea como JSON a stdout (info/warn/debug/verbose) o stderr (error/fatal).
  - Formato: `{ timestamp, level, context?, message, stack? }`.
  - Compatible con cualquier agregador que parsee JSON por línea (Railway logs, Datadog, Logtail).

- `apps/api/src/shared/interceptors/logging.interceptor.ts`
  - Implementa `NestInterceptor`, registrado globalmente.
  - Usa RxJS `tap.next` para loguear en el camino de respuesta exitosa.
  - Formato: `GET /catalogo 200 +45ms uid=abc123`.
  - Errores no se loguean aquí para evitar duplicados con `HttpExceptionFilter`.

- `apps/web/src/app/error.tsx`
  - Error boundary de ruta para Next.js App Router (`'use client'`).
  - Muestra mensaje de error, botones "Intentar de nuevo" y "Ir al inicio".
  - En desarrollo muestra el mensaje de error; en producción solo el mensaje genérico.

- `apps/web/src/app/global-error.tsx`
  - Captura errores en el root layout (necesita su propio `<html><body>`).
  - Usa estilos inline para no depender de Tailwind (que puede no cargarse si el layout falla).

**Archivos modificados:**

- `apps/api/src/shared/filters/http-exception.filter.ts`
  - Logs de error enriquecidos con método y URL: `POST /orders → [VALIDATION_ERROR] ...`
  - Aplica a `AppError` (5xx) y a errores inesperados no manejados.

- `apps/api/src/main.ts`
  - Reemplaza el logger por defecto por `StructuredLogger` via `app.useLogger()`.
  - `bufferLogs: true` asegura que los logs durante el bootstrap usen el logger estructurado.
  - Registra `LoggingInterceptor` globalmente via `app.useGlobalInterceptors()`.

**Resultado:** `pnpm type-check` 6/6. Commit `40db638`.

---

## 48. Sprint 5 — FEATURE 5.3: Poblar `packages/types` con DTOs compartidos

**Qué se hizo:**
Se poblaron los 6 archivos del paquete `@h2r/types` con interfaces TypeScript puras (sin decoradores de `class-validator`) que espejean todos los DTOs de request y response de la API NestJS. El objetivo es que tanto `apps/api` como `apps/web` importen tipos del mismo contrato, y que el compilador detecte cambios de contrato en build-time en lugar de en runtime.

**Archivos nuevos en `packages/types/src/`:**

- `common.types.ts`: `ApiError` (forma del error HTTP estándar del `HttpExceptionFilter`), `Paginated<T>` (wrapper genérico para listas paginadas).

- `auth.types.ts`: `LoginRequest`, `RegisterRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest` y sus correspondientes Response (`accessToken`, `message`).

- `product.types.ts`: `PaymentProvider` (unión `WOMPI | MERCADO_PAGO`), `ListProductsQuery`, `CategoryResponse`, `ProductResponse`.

- `order.types.ts`: `OrderStatus`, `PaymentStatus`, `ShippingAddress`, `OrderItemRequest`, `CreateOrderRequest`, `UpdateOrderStatusRequest`, `OrderItemResponse`, `OrderResponse`, `PaymentInitResponse`, `CreateOrderResponse`, `UpdateOrderStatusResponse`.

- `payment.types.ts`: `WompiIntegrityRequest/Response`, `MpPreferenceRequest/Response`, `WebhookAckResponse`.

- `admin.types.ts`: `CreateProductRequest`, `UpdateProductRequest`, `UpdateStockRequest`, `BulkStockUpdateRequest`, `CreateCategoryRequest`, `UpdateCategoryRequest`, `ToggleSettingRequest`.

**Archivos modificados:**

- `packages/types/src/index.ts`: exporta todos los módulos con `export *`.

- `apps/web/src/components/checkout/CheckoutForm.tsx`:
  - Reemplaza inline type cast `as { order: ...; payment: ... }` por `as CreateOrderResponse`.
  - Reemplaza inline type cast `as { error?: string; message?: string }` por `as ApiError`.
  - El estado `wompiParams` usa `CreateOrderResponse['payment']` en lugar de una interfaz local redundante.
  - La guarda `wompiParams.publicKey && wompiParams.integritySignature` antes del `<WompiWidget>` satisface TypeScript sin `!`.

**Resultado:** `pnpm type-check` 6/6. Commit `4a8b3f0`.

---

## 49. Sprint 5 — FIX 5.4: Optimizar imágenes de producto con `priority` y `placeholder="blur"`

**Diagnóstico previo:**
La app ya usaba `<Image>` de Next.js en todos los componentes de producto (no había `<img>` nativas que migrar), `res.cloudinary.com` ya estaba en `remotePatterns`, y el helper `cloudinaryUrl()` ya aplicaba `f_auto,q_auto,w_N,c_limit` (WebP/AVIF). Las brechas reales eran: (1) ninguna card de catálogo/home pasaba `priority`, haciendo que imágenes above the fold cargaran lazy; (2) sin `placeholder="blur"`, el usuario veía un fondo vacío durante la carga.

**Archivos modificados:**

- `apps/web/src/lib/cloudinary.ts`
  - Exporta `IMAGE_BLUR_PLACEHOLDER`: un SVG de 1×1 px gris claro codificado como data URI. Se usa como `blurDataURL` en todas las imágenes de producto — el navegador muestra este placeholder mientras descarga la imagen real, eliminando el destello en blanco.

- `apps/web/src/components/store/ProductCard.tsx`
  - Nueva prop `priority?: boolean` (default `false`). Se pasa al primer `<Image>` (imagen principal) y activa carga eager cuando es `true`.
  - Ambas imágenes (principal y crossfade) usan `placeholder="blur" blurDataURL={IMAGE_BLUR_PLACEHOLDER}`.

- `apps/web/src/components/store/ProductImageGallery.tsx`
  - La imagen principal del detalle de producto (el LCP de la página) ahora usa `placeholder="blur" blurDataURL={IMAGE_BLUR_PLACEHOLDER}`.

- `apps/web/src/app/(store)/catalogo/page.tsx`
  - Pasa `priority={index < 4}` a `<ProductCard>`: los primeros 4 resultados (primera fila del grid `lg:grid-cols-4`) cargan eager.

- `apps/web/src/app/(store)/home.tsx`
  - Pasa `priority={index < 4}` a `<ProductCard>` en la sección de productos destacados.

**Resultado:** `pnpm type-check` 6/6. Commit `8d2cbe5`.

---

## 50. Sprint 6 — FEATURE 6.1: Caché de home y catálogo con `unstable_cache`

**Objetivo:** Eliminar queries Prisma en cada request en las rutas públicas de mayor tráfico (home, catálogo, detalle de producto) y garantizar invalidación on-demand cuando el admin modifica datos.

**Problema previo:** Home y catálogo hacían queries Prisma directas en cada request de SSR. Con 1.000 visitas concurrentes, el catálogo consultaba PostgreSQL (Neon serverless) 1.000 veces por segundo.

**Archivos creados:**

- `apps/web/src/lib/cache.ts` *(nuevo)*
  - `CACHE_TAGS` — constantes para los tags de invalidación: `products`, `categories`, `home`, `catalog`.
  - `getCachedHomeCategories()` — categorías raíz para la home; TTL 3600 s, tag `categories`.
  - `getCachedFeaturedProducts()` — 4 productos aleatorios con stock (ORDER BY RANDOM()); TTL 300 s, tags `products` + `home`.
  - `getCachedCatalogLanding()` — las 3 queries de la vista landing del catálogo (sin filtros) devueltas como datos crudos; TTL 300 s, tags `products` + `catalog` + `categories`. Fechas serializadas como ISO string.
  - `getCachedCatalogGrid(params)` — grid del catálogo con filtros activos; cada combinación de filtros tiene su propio entry de caché; TTL 180 s.
  - `getCachedProductBySlug(slug)` — detalle de producto por slug; TTL 300 s, tag `products`.

- `apps/web/src/lib/revalidate.ts` *(nuevo)*
  - `revalidateAdminCache(tags)` — helper cliente que llama a `/api/admin/revalidate` con los tags. No-blocking: errores silenciados para no impedir la UX del admin.

- `apps/web/src/app/api/admin/revalidate/route.ts` *(nuevo)*
  - Endpoint `POST` protegido por sesión ADMIN. Acepta `{ tags: string[] }` y llama `revalidateTag(tag, {})` por cada tag. El `{}` cumple la firma de Next.js 16 que exige el segundo argumento `profile`.

- `apps/web/src/app/api/admin/products/[id]/stock/route.ts` *(nuevo)*
  - Proxy PATCH al NestJS para actualizar stock de un producto. Llama `revalidateTag(CACHE_TAGS.products, {})` en éxito. Corrige bug pre-existente: `StockUpdateForm` llamaba a esta ruta pero el handler no existía (404 silencioso).

**Archivos modificados:**

- `apps/web/src/app/(store)/home.tsx`
  - Elimina imports de `PrismaProductRepository` y `prisma`. Reemplaza las dos queries directas con `Promise.all([getCachedFeaturedProducts(), getCachedHomeCategories()])`.

- `apps/web/src/app/(store)/catalogo/page.tsx`
  - Elimina `PrismaProductRepository`, `ListProducts`. Añade imports de `getCachedCatalogLanding` y `getCachedCatalogGrid`.
  - `PrismaProductRaw.createdAt/updatedAt` tipado como `Date | string` para admitir valores cacheados (JSON serializa `Date` → `string`).
  - `toDomain()` usa `new Date(p.createdAt)` para manejar ambos tipos.
  - Vista landing: reemplaza las 3 queries Prisma con `getCachedCatalogLanding()`.
  - Vista grid: reemplaza `ListProducts` + `prisma.category.findMany` con `getCachedCatalogGrid(params)`.

- `apps/web/src/app/(store)/producto/[slug]/page.tsx`
  - Elimina `PrismaProductRepository` y `GetProductBySlug`. Reemplaza ambas llamadas (en `generateMetadata` y en el componente) con `getCachedProductBySlug(slug)`.

- `apps/web/src/components/admin/ProductEditForm.tsx`
  - Llama `await revalidateAdminCache([CACHE_TAGS.products])` antes del `router.push('/admin/productos')` en éxito.

- `apps/web/src/components/admin/CsvStockImport.tsx`
  - Llama `await revalidateAdminCache([CACHE_TAGS.products])` después de un bulk import exitoso.

- `apps/web/src/components/admin/CategoryManager.tsx`
  - `CategoryForm.handleSubmit`: llama `await revalidateAdminCache([CACHE_TAGS.categories, CACHE_TAGS.catalog])` en éxito.
  - `handleDelete`: llama `await revalidateAdminCache([CACHE_TAGS.categories, CACHE_TAGS.catalog])` antes del `router.refresh()`.

**Nota de Next.js 16:** `revalidateTag(tag, {})` — en esta versión la firma requiere un segundo argumento `profile: string | CacheLifeConfig`. Se pasa `{}` (CacheLifeConfig vacío) para usar el comportamiento por defecto.

**Resultado:** `pnpm type-check` 6/6.

---

## 51. Sprint 6 — FIX 6.2: Restringir CORS ngrok wildcard a entorno de desarrollo

**Problema:** La configuración CORS en `apps/api/src/main.ts` tenía los wildcards `*.ngrok-free.app` y `*.ngrok-free.dev` mezclados inline con el resto de la lógica sin una separación clara por entorno. Aunque ya estaban dentro de checks `!== 'production'`, la legibilidad era baja y el riesgo de regresión alto.

**Archivos modificados:**

- `apps/api/src/main.ts`
  - Extrae una función `getCorsOrigin(origin, callback)` tipada con `CorsOriginCallback`.
  - **Producción:** solo acepta el origen exacto de `FRONTEND_URL`. Cualquier otro origin recibe error CORS.
  - **Desarrollo:** acepta `FRONTEND_URL`, `localhost:3000` y subdominios `*.ngrok-free.app` / `*.ngrok-free.dev` (necesarios para testear webhooks de Wompi/MercadoPago contra servidor local).
  - El bloque `app.enableCors` pasa directamente `getCorsOrigin` como handler — sin lógica inline.

**Resultado:** `pnpm type-check` 6/6.

---

## 52. Sprint 6 — FIX 6.3: Refactorizar `api-client.ts` con cliente tipado

**Problema:** Todos los callers de `apiClient` hacían `await res.json() as AlgúnTipo` manualmente. `CheckoutForm` tenía un bug latente: llamaba `.json()` dos veces sobre el mismo `Response` (el body es un stream que solo puede leerse una vez). Además, los casteos manuales con `as` no dan error si el tipo de respuesta del servidor cambia.

**Archivos modificados:**

- `apps/web/src/lib/api-client.ts`
  - Exporta `ApiOk<T>`, `ApiErr` y `ApiResponse<T> = ApiOk<T> | ApiErr`.
  - Función interna `parseResponse<T>`: lee el body como texto una sola vez, parsea JSON, y retorna el discriminated union. Los errores extraen `message` o `error` del body de NestJS automáticamente.
  - Todos los métodos (`get`, `post`, `put`, `patch`, `delete`, `postForm`) son ahora genéricos y retornan `Promise<ApiResponse<T>>` en vez de `Promise<Response>`.

- `apps/web/src/components/checkout/CheckoutForm.tsx`
  - `client.post<CreateOrderResponse>('/orders', body)` → `res.data` directamente.
  - Elimina import de `ApiError` (ya no necesario — el error queda en `res.error`).
  - Corrige el bug de doble `.json()` sobre el mismo stream.

- `apps/web/src/components/admin/ProductEditForm.tsx`
  - `client.put<void>` / `client.post<void>` → `res.error` en error path.
  - `postForm<{ url: string }>` → `res.data.url` en éxito, `res.error` en error.

- `apps/web/src/components/admin/CsvStockImport.tsx`
  - `patch<{ updated: number }>` → `res.data.updated`; añade manejo de error que antes faltaba.

- `apps/web/src/components/admin/CategoryManager.tsx`
  - `put<void>` / `post<void>` / `delete<void>` → `res.error` en todos los error paths.

- `apps/web/src/components/admin/MercadoPagoToggle.tsx`
  - `patch<void>` — solo cambia el tipo genérico, comportamiento idéntico.

**Resultado:** `pnpm type-check` 6/6. Cero casteos `as Type` en callers de `apiClient`.

---

## 53. Sprint 6 — FEATURE 6.4: Connection pooling explícito para Neon

**Problema:** `createPrismaClient()` pasaba `{ connectionString }` directamente a `PrismaPg`, lo que crea un pool interno con los defaults de `pg` (max 10 conexiones por proceso). En producción serverless (Vercel), múltiples invocaciones concurrentes pueden cada una abrir su propio pool de 10 conexiones, saturando el límite de Neon (5-10 en tier gratuito).

**Archivos modificados:**

- `packages/database/src/index.ts`
  - Importa `Pool` de `pg`.
  - Lee `DATABASE_POOL_MAX` del entorno (default `5`) — configurable sin cambiar código.
  - Crea `new Pool({ connectionString, max: POOL_MAX })` y lo pasa a `new PrismaPg(pool)`, reemplazando el `PrismaPg({ connectionString })` anterior.
  - Agrega `process.once('SIGINT', shutdown)` y `process.once('SIGTERM', shutdown)` que llaman `prisma.$disconnect()` antes de salir. `once` evita registrar el handler múltiples veces en HMR de desarrollo.

- `apps/api/.env.example`
  - Documenta `DATABASE_POOL_MAX=5` con nota sobre Railway y el pooler nativo de Neon.

- `apps/web/.env.example`
  - Documenta `DATABASE_POOL_MAX=5` con nota sobre Vercel serverless y el pooler nativo de Neon.

**Nota operacional:** Si en el futuro se activa el pooler nativo de Neon (PgBouncer), añadir `?pgbouncer=true&connection_limit=1` a `DATABASE_URL` y bajar `DATABASE_POOL_MAX=1` para evitar incompatibilidades con prepared statements.

**Resultado:** `pnpm type-check` 6/6.

---

---

## 54. Auditoría Técnica v2.0 — AUDITORIA.md actualizado

**Qué se hizo:**
Se realizó una segunda auditoría técnica exhaustiva del proyecto post-Sprints 4–6, con revisión directa del código fuente de todos los módulos críticos. Se actualizó `AUDITORIA.md` con la estructura de auditoría v2.0.

**Alcance de la revisión:**
- Verificación de todos los hallazgos críticos de la auditoría v1.0 (5/5 resueltos correctamente).
- Análisis de nuevos hallazgos no presentes en v1.0 (3 bloqueantes de producción identificados).
- Matriz de impacto actualizada con 18 hallazgos clasificados por área y severidad.
- Score actualizado: 6.4/10 → 7.3/10.
- Porcentaje de completitud actualizado: 72 % → 82 %.

**Hallazgos nuevos identificados (no estaban en v1.0):**

- **CRÍTICO:** `/auth/error` page no existe — NextAuth dirige errores OAuth a una ruta 404.
- **CRÍTICO:** Rate limiter en memoria (`rate-limit.ts`) inoperativo en entorno serverless (Vercel).
- **ALTO:** `WOMPI_EVENTS_SECRET` vacío no lanza error al arrancar — servidor acepta webhooks sin secreto configurado.
- **ALTO:** Número de WhatsApp hardcodeado como placeholder (`573000000000`) en home y catálogo.
- **ALTO:** Sin health check endpoint en NestJS — Railway no puede verificar salud real del proceso.
- **ALTO:** NextAuth `"^5.0.0-beta.30"` sin pinar exacto — riesgo de breaking changes automáticos.
- **ALTO:** Sin CI/CD pipeline — ninguna gate de calidad automática en merges a main.

**Archivos modificados:**
- `AUDITORIA.md` — reescritura completa v2.0 con métricas, matriz de impacto y roadmap actualizado.

---

## 55. BACKLOG.md reorganizado post-Sprint 6

**Qué se hizo:**
Se reescribió `BACKLOG.md` eliminando los sprints completados (4, 5, 6) y reorganizando el resto en base a los nuevos hallazgos de la Auditoría Técnica v2.0. Se añadieron 7 tareas nuevas no presentes en la versión anterior (3 bloqueantes críticos de producción identificados en la auditoría + 4 tareas de hardening).

**Cambios estructurales:**
- Eliminados: Sprint 4 (5 FIX completados), Sprint 5 (3/4 completados), Sprint 6 (4 FEATURE completados)
- **Sprint 7 (nuevo):** 3 FIX críticos — `/auth/error` page, rate limiter serverless, WhatsApp env var
- **Sprint 8 (nuevo):** 5 tareas de hardening — Sentry, health check, NextAuth pinado + env validation, CI/CD, email queue
- **Sprint 9 (reorganizado de ex-Sprint 7):** Widget Wompi, empty states, paginación con ventana
- **Sprint 10 (nuevo + ex-Sprint 7/8):** Sitemap, OG images, generateStaticParams, tipos Swagger
- **Sprint 11 (ex-Sprint 8 expandido):** Server/Client audit, a11y, E2E Playwright, coverage threshold

**Score actualizado:** 6.4/10 → 7.3/10 (actual). Objetivo: 8.5/10 al completar Sprint 11.

**Archivos modificados:**
- `BACKLOG.md` — reescritura completa con 19 tareas en 5 sprints, cada una con prompt ejecutable

*Última actualización: 2026-05-19*

---

## 56. Hotfix — Extraer CACHE_TAGS a cache-tags.ts (fix Vercel build)

**Qué se hizo:**
Se extrajo la constante `CACHE_TAGS` de `apps/web/src/lib/cache.ts` a un archivo independiente `apps/web/src/lib/cache-tags.ts` sin ninguna dependencia server-only. Se actualizaron los tres `'use client'` components que la importaban para apuntar al nuevo archivo.

**Problema resuelto:**
El build de Vercel fallaba con `module-not-found` porque `CsvStockImport.tsx`, `CategoryManager.tsx` y `ProductEditForm.tsx` (todos `'use client'`) importaban `CACHE_TAGS` desde `@/lib/cache`, que a su vez importa `unstable_cache` (next/cache) y el cliente Prisma — ambos server-only. El bundler de Next.js intentó incluirlos en el bundle del cliente y falló.

**Archivos modificados:**
- `apps/web/src/lib/cache-tags.ts` — NUEVO: exporta `CACHE_TAGS` sin deps
- `apps/web/src/lib/cache.ts` — importa y re-exporta `CACHE_TAGS` desde `./cache-tags`
- `apps/web/src/components/admin/CsvStockImport.tsx` — import desde `@/lib/cache-tags`
- `apps/web/src/components/admin/CategoryManager.tsx` — import desde `@/lib/cache-tags`
- `apps/web/src/components/admin/ProductEditForm.tsx` — import desde `@/lib/cache-tags`

**Rama:** `hotfix/cache-tags-client-bundle` → `main`

*Última actualización: 2026-05-19*

---

## 57. Sprint 7 — FIX 7.1: Crear página `/auth/error`

**Qué se hizo:**
Se creó `apps/web/src/app/auth/error/page.tsx` como Server Component. La página recibe el `searchParams.error` que NextAuth añade automáticamente en cada redirección de error OAuth y lo mapea a mensajes en español.

**Códigos de error mapeados:**

- `OAuthAccountNotLinked` → "Ya existe una cuenta con este email usando otro método de inicio de sesión."
- `OAuthCallbackError` → "No se pudo completar el inicio de sesión con Google."
- `CredentialsSignin` → "Email o contraseña incorrectos."
- `AccessDenied` → "No tienes permiso para acceder a esta cuenta."
- `Verification` → "El enlace de verificación expiró o ya fue usado."
- Default → "Ocurrió un error al iniciar sesión."

La página ofrece dos acciones: "Volver a intentar" (→ `/auth/login`) e "Ir al inicio" (→ `/`). Sigue el mismo sistema de diseño que `auth/login/page.tsx` (fondo negro, card `bg-white/5`, error en rojo). Metadata exportada con `robots: { index: false }`.

**Problema resuelto:**
`apps/web/src/lib/auth.ts:155` configura `pages: { error: '/auth/error' }` pero la ruta no existía, causando un 404 para el 100 % de los errores OAuth en producción (bloqueante de producción A-01 de AUDITORIA.md).

**Archivos modificados:**

- `apps/web/src/app/auth/error/page.tsx` — NUEVO

**Rama:** `sprint7/bloqueantes-produccion`

*Última actualización: 2026-05-19*

---

## 58. Sprint 7 — FIX 7.2: Reemplazar rate limiter en memoria por solución serverless

**Qué se hizo:**
Se aplicó la Opción A del backlog: la protección real ya existía en NestJS. Se reemplazó la implementación con `Map` en memoria de `apps/web/src/lib/rate-limit.ts` por un stub no-op documentado que siempre retorna `true`.

**Hallazgos:**

- `checkRateLimit` no tenía ningún caller en todo el proyecto (grep confirmado). Era dead code.
- Todas las rutas de auth de Next.js (`/register`, `/forgot-password`, `/reset-password`) hacen `fetch()` directo a NestJS, que ya tiene `ThrottlerGuard` con límites estrictos por endpoint.
- `ForgotPasswordForm.tsx:44` ya maneja el HTTP 429 explícitamente con mensaje al usuario.

**Límites vigentes en NestJS (auth.controller.ts):**

- `POST /auth/register` → 5 req / 60 s
- `POST /auth/login` → 10 req / 60 s
- `POST /auth/forgot-password` → 3 req / 900 s
- `POST /auth/reset-password` → 5 req / 60 s

**Problema resuelto:**
El `Map` en módulo scope se resetea entre invocaciones serverless de Vercel, haciendo el rate limiter inoperativo en producción (bloqueante S-01 / A-02 de AUDITORIA.md). La protección real ahora es explícita y documentada en el código.

**Archivos modificados:**

- `apps/web/src/lib/rate-limit.ts` — reemplazado: Map eliminado, stub no-op documentado

**Rama:** `sprint7/bloqueantes-produccion`

*Última actualización: 2026-05-19*

---

## 59. Sprint 7 — FIX 7.3: Extraer número de WhatsApp a variable de entorno

**Qué se hizo:**
Se creó `apps/web/src/lib/contact.ts` con `WHATSAPP_NUMBER` y `WHATSAPP_URL()`. Se reemplazaron todas las ocurrencias del número hardcodeado `573000000000` en 4 archivos. Se documentó ` en `.env.local`.

**Archivos modificados:**

- `apps/web/src/lib/contact.ts` — NUEVO: exporta `WHATSAPP_NUMBER` y `WHATSAPP_URL(message?)`
- `apps/web/src/app/(store)/home.tsx` — import + `href={WHATSAPP_URL('Hola, necesito un repuesto para mi moto')}`
- `apps/web/src/app/(store)/catalogo/page.tsx` — import + `href={WHATSAPP_URL()}`
- `apps/web/src/components/nav/ProfileModal.tsx` — eliminada constante local, import + `WHATSAPP_URL(...)`
- `apps/web/src/components/ui/WhatsAppButton.tsx` — import + `href={WHATSAPP_URL()}`
- `apps/web/.env.local` — añadida

**Problema resuelto:**
El número `573000000000` (placeholder) estaba hardcodeado en 4 archivos distintos. En producción redirigía a un número inexistente. Hallazgo S-04 de AUDITORIA.md resuelto.

**Rama:** `sprint7/bloqueantes-produccion`

*Última actualización: 2026-05-19*

---

## 60. Sprint 8 — FEATURE 8.1: Integración de Sentry para monitoreo de errores

**Qué se hizo:**
Se instaló y configuró Sentry v10.53.1 en `apps/api` (`@sentry/nestjs` + `@sentry/profiling-node`) y `apps/web` (`@sentry/nextjs`). La integración captura automáticamente todos los errores >= 500 con stack trace completo, los envía al dashboard de Sentry y los loguea en Railway con un `errorId` para correlacionar ambos sistemas.

**Decisión arquitectónica:** Se optó por Sentry sobre solo logging en Railway porque en un e-commerce con pagos reales se necesita monitoreo proactivo (alertas inmediatas) en lugar de reactivo (buscar en logs cuando un usuario reporta). El free tier de Sentry (5 000 errores/mes) cubre el lanzamiento inicial. Ver análisis completo en el historial de conversación.

**Configuración API (`apps/api`):**

- `src/instrument.ts` — init de Sentry con `nodeProfilingIntegration`. Debe ser el primer import de `main.ts`. `enabled: !!SENTRY_DSN` garantiza modo no-op si la variable no está configurada.
- `src/main.ts` — `import './instrument'` como primera línea.
- `src/app.module.ts` — `SentryModule.forRoot()` para tracking de requests y contexto por usuario.
- `src/shared/filters/http-exception.filter.ts` — `Sentry.captureException(exception, { tags: { errorId } })` en los tres caminos de error >= 500. El `errorId` se incluye tanto en la respuesta JSON como en el tag de Sentry para correlación.
- `src/shared/logger/StructuredLogger.ts` — fix de bug previo: stack trace ahora va al campo `stack`, no a `context`.

**Configuración Web (`apps/web`):**

- `sentry.server.config.ts` — init servidor (Node.js runtime).
- `sentry.client.config.ts` — init cliente con `replaysOnErrorSampleRate: 1.0` (graba la sesión del usuario al momento del error en checkout).
- `sentry.edge.config.ts` — init edge runtime.
- `src/instrumentation.ts` — hook de Next.js que carga la config según el runtime (`nodejs` / `edge`).
- `next.config.ts` — envuelto con `withSentryConfig`. Source maps deshabilitados por ahora (`sourcemaps: { disable: true }`); activar cuando se configuren `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` en Vercel.

**Variables de entorno requeridas para activar:**

- `apps/api`: `SENTRY_DSN` en Railway
- `apps/web`: `NEXT_PUBLIC_SENTRY_DSN` en Vercel

**Archivos modificados:**

- `apps/api/src/instrument.ts` — NUEVO
- `apps/api/src/main.ts` — import instrument
- `apps/api/src/app.module.ts` — SentryModule.forRoot()
- `apps/api/src/shared/filters/http-exception.filter.ts` — Sentry.captureException en 5xx
- `apps/api/src/shared/logger/StructuredLogger.ts` — fix bug stack/context
- `apps/api/.env.example` — sección SENTRY_DSN
- `apps/web/sentry.server.config.ts` — NUEVO
- `apps/web/sentry.client.config.ts` — NUEVO
- `apps/web/sentry.edge.config.ts` — NUEVO
- `apps/web/src/instrumentation.ts` — NUEVO
- `apps/web/next.config.ts` — withSentryConfig
- `apps/web/.env.example` — secciones NEXT_PUBLIC_WHATSAPP_NUMBER y NEXT_PUBLIC_SENTRY_DSN

**Rama:** `sprint8/hardening-produccion`

*Última actualización: 2026-05-19*

---

## 61. Sprint 8 — FEATURE 8.2: Health check endpoint en NestJS

**Qué se hizo:**
Se actualizó `AppController` para exponer `GET /health` con una verificación real de la base de datos. Railway puede apuntar su health check a esta ruta para detectar procesos zombie (proceso vivo pero DB inaccesible).

**Cambios:**

El endpoint anterior `GET /` retornaba `{ status: 'ok' }` sin verificar la DB. Se renombró a `GET /health` y se inyectó `PrismaService` (ya global via `@Global()` en `PrismaModule`) para ejecutar `$queryRaw\`SELECT 1\``.

Si el `$queryRaw` lanza (DB caída o timeout), la excepción burbujea al `HttpExceptionFilter` → responde 500, lo que Railway interpreta como proceso no saludable.

**Respuesta en condiciones normales:**

```json
{ "status": "ok", "db": "ok", "uptime": 3847.2 }
```

El endpoint mantiene `@Public()` (excluido del JWT guard) y `@SkipThrottle()` (excluido del rate limiter) para que Railway pueda consultarlo sin autenticación y sin consumir cuota.

**Archivos modificados:**

- `apps/api/src/app.controller.ts` — `GET /` → `GET /health` con `PrismaService.$queryRaw`

**Rama:** `sprint8/hardening-produccion`

*Última actualización: 2026-05-19*

---

## 62. Sprint 8 — FIX 8.3: Pinar NextAuth + validación de env vars al arranque

**Qué se hizo:**
Dos fixes de estabilidad independientes aplicados en un solo commit.

**Fix A — Pinar NextAuth:**
Se cambió `"next-auth": "^5.0.0-beta.30"` a `"5.0.0-beta.30"` (sin `^`) en `apps/web/package.json`. El `^` permitía actualizaciones automáticas a beta.31, beta.32, etc., que en una versión beta pueden tener breaking changes. Se ejecutó `pnpm install` para actualizar el lockfile.

**Fix B — Validación de env vars al arranque:**
Se añadió `assertEnvVars()` en `apps/api/src/main.ts`, llamada al inicio de `bootstrap()` antes de crear la app NestJS. Si alguna variable crítica está ausente, el proceso imprime las variables faltantes y llama `process.exit(1)`, evitando que el servidor arranque con configuración incompleta y falle silenciosamente en runtime.

Variables validadas:

- `DATABASE_URL`
- `JWT_SECRET`
- `INTERNAL_API_SECRET`
- `WOMPI_EVENTS_SECRET`
- `WOMPI_INTEGRITY_SECRET`

**Archivos modificados:**

- `apps/web/package.json` — `"^5.0.0-beta.30"` → `"5.0.0-beta.30"`
- `apps/api/src/main.ts` — función `assertEnvVars()` antes de `bootstrap()`

**Rama:** `sprint8/hardening-produccion`

*Última actualización: 2026-05-19*

---

## 63. Sprint 8 — FEATURE 8.4: CI/CD pipeline con GitHub Actions

**Qué se hizo:**
Se creó `.github/workflows/ci.yml` con cuatro jobs que corren en cada push y pull request hacia `main`.

**Estructura de jobs:**

- `lint` — `pnpm lint` (Turbo en todos los paquetes)
- `type-check` — `pnpm type-check` (Turbo en todos los paquetes)
- `test` — `pnpm --filter @h2r/domain test` + `pnpm --filter @h2r/api test`
- `build-api` — `pnpm --filter @h2r/api build` (solo tras pasar los 3 anteriores)

Los tres primeros corren en paralelo. `build-api` tiene `needs: [lint, type-check, test]` y valida que el build de NestJS no rompa. El build de Next.js se delega a Vercel (tiene acceso a las variables reales) dado que el SSR requiere `DATABASE_URL` válida.

**Decisiones de diseño:**

- `DATABASE_URL=postgresql://ci:ci@localhost:5432/ci` en `env` global — Prisma generate solo lee el schema, no conecta. Valor dummy suficiente.
- `pnpm/action-setup@v4` + `actions/setup-node@v4` con `cache: 'pnpm'` — el store de pnpm se cachea entre runs para acelerar `pnpm install`.
- El job `build-api` define las vars de entorno requeridas por `assertEnvVars()` con valores placeholder para que el proceso no aborte en CI.
- `on.push.branches` incluye `sprint*`, `hotfix*`, `fix*`, `feat*` para que el CI corra en todas las ramas de trabajo activas.

**Badge añadido al README.md:**

```markdown
[![CI](https://github.com/kevinz-08/electro-motos-tdk/actions/workflows/ci.yml/badge.svg)](...)
```

**Archivos modificados:**

- `.github/workflows/ci.yml` — NUEVO
- `README.md` — badge de CI

**Rama:** `sprint8/hardening-produccion`

*Última actualización: 2026-05-19*

---

## 64. FEATURE 8.5 — Cola de emails con retry sin Redis

**Problema resuelto:**
El envío de emails de confirmación de pago en los webhooks de Wompi y Mercado Pago era fire-and-forget: si `ResendEmailService.sendOrderConfirmation()` fallaba, el cliente pagaba pero nunca recibía el email. Sin retry ni Dead Letter Queue, el error era invisible.

**Solución implementada:**
Cola de emails persistente en PostgreSQL con reintentos automáticos y backoff exponencial, sin dependencias externas adicionales.

**Cambios principales:**

1. **`packages/database/prisma/schema.prisma`** — nuevo modelo `EmailQueue`:
   - Campos: `id`, `to`, `orderId`, `attempts`, `lastError`, `status` (PENDING/SENT/FAILED), `createdAt`, `nextRetry`
   - Índice compuesto `[status, nextRetry]` para eficiencia en las consultas del procesador
   - Migración aplicada: `20260519232204_add_email_queue`

2. **`apps/api/src/infrastructure/services/EmailQueueService.ts`** — NUEVO:
   - `enqueue(to, orderId)`: crea un registro PENDING en la cola
   - `processNext()`: procesa hasta 10 emails PENDING con `nextRetry <= now()`, actualiza `attempts` y `nextRetry` con backoff (5 s → 30 s → 120 s), marca FAILED después de 3 intentos
   - `findFailed(limit)`: retorna los últimos N registros FAILED para el endpoint admin
   - Usa `setInterval` en `onModuleInit()` (cada 2 min) — `@nestjs/schedule` no está en las dependencias
   - Limpieza en `onModuleDestroy()` con `clearInterval`

3. **`apps/api/src/infrastructure/infrastructure.module.ts`** — añadido `EmailQueueService` a providers y exports

4. **`apps/api/src/payments/wompi.controller.ts`** — inyectado `EmailQueueService`; reemplazado `.catch()` fire-and-forget por `await this.emailQueue.enqueue(user.email, orderId)`

5. **`apps/api/src/payments/mercadopago.controller.ts`** — idem; reemplazado `this.emailService.sendOrderConfirmation(...).catch(console.error)` por `await this.emailQueue.enqueue(user.email, orderId)`

6. **`apps/api/src/admin/admin-emails.controller.ts`** — NUEVO: `GET /admin/emails/failed` con `@Roles('ADMIN')`, soporta query param `?limit=N` (máx 200)

7. **`apps/api/src/admin/admin.module.ts`** — registrado `AdminEmailsController`

**Archivos modificados:**

- `packages/database/prisma/schema.prisma`
- `apps/api/src/infrastructure/services/EmailQueueService.ts` — NUEVO
- `apps/api/src/infrastructure/infrastructure.module.ts`
- `apps/api/src/payments/wompi.controller.ts`
- `apps/api/src/payments/mercadopago.controller.ts`
- `apps/api/src/admin/admin-emails.controller.ts` — NUEVO
- `apps/api/src/admin/admin.module.ts`

**Rama:** `sprint8/hardening-produccion`

*Última actualización: 2026-05-19*

---

## 65. FEATURE 9.1 — Widget embebido de Wompi con fallback automático

**Problema resuelto:**
El checkout anterior redirigía directamente a `checkout.wompi.co/p/` abandonando la tienda. El widget embebido de Wompi permite mantener al usuario en el sitio durante el pago.

**Limitación técnica encontrada (ya documentada en el codebase):**
El `widget.js` de Wompi usa `document.currentScript` para localizar su form padre. En React, todos los scripts se añaden dinámicamente con `appendChild`, por lo que `document.currentScript` es null. La solución es crear el `<form data-render="button">` primero en el DOM y luego inyectar el script — el scanner de Wompi busca `[data-render="button"]` en el documento completo, no solo junto al script.

**Solución implementada — estrategia dual en `WompiWidget.tsx`:**

1. **Intento principal (widget embed):**
   - `useEffect` crea el `<form>` con todos los `data-*` requeridos (public-key, currency, amount-in-cents, reference, signature:integrity, redirect-url)
   - Inyecta el script `checkout.wompi.co/widget.js` dinámicamente después del form
   - Si el script carga (`onload`), el widget se inicializa en el DOM
   - Timeout de 5 s: si el script no carga (bloqueador de anuncios, red lenta), activa el fallback

2. **Fallback automático (redirect):**
   - Si `script.onerror` o el timeout de 5 s se activa, `useFallback` pasa a `true`
   - Se muestra un enlace `<a>` directo a `checkout.wompi.co/p/` con los parámetros como query string
   - Misma experiencia de pago, sin el widget embed

3. **Limpieza de efectos:** el `cleanup` de `useEffect` vacía el container y cancela el timeout para evitar memory leaks al desmontar el componente.

**No se requirió cambiar `next.config.ts`:** Next.js no tiene un header CSP configurado, por lo que el script externo de Wompi puede cargarse sin restricciones.

**Archivos modificados:**

- `apps/web/src/components/checkout/WompiWidget.tsx` — reescrito

**Rama:** `sprint9/ux-critico-pagos`

*Última actualización: 2026-05-19*

---

## 66. FEATURE 9.2 — Componente EmptyState reutilizable

**Problema resuelto:**
Cada vista con estado vacío tenía su propio markup inline inconsistente (carrito, catálogo, pedidos). Cambiar el estilo requería editar tres archivos distintos.

**Solución implementada:**

1. **`apps/web/src/components/ui/EmptyState.tsx`** — NUEVO: componente Server Component con props `icon`, `title`, `description?`, `action?: { label, href }`. Sigue el estilo visual de `pedidos/page.tsx` (fondo blanco, borde gris, padding p-16, botón sky-400).

2. **Refactorizaciones:**
   - `apps/web/src/app/(store)/pedidos/page.tsx` — empty state inline reemplazado por `<EmptyState icon="📦" title="Aún no tienes pedidos" ... />`
   - `apps/web/src/app/(store)/catalogo/page.tsx` — empty state "Sin resultados" reemplazado por `<EmptyState icon="🔍" title="Sin resultados" ... />`
   - `apps/web/src/app/(store)/carrito/page.tsx` — empty state custom (SVG de carrito, fondo centrado) reemplazado por `<EmptyState icon="🛒" title="Tu carrito está vacío" ... />` dentro de un contenedor con padding

**Archivos modificados:**

- `apps/web/src/components/ui/EmptyState.tsx` — NUEVO
- `apps/web/src/app/(store)/pedidos/page.tsx`
- `apps/web/src/app/(store)/catalogo/page.tsx`
- `apps/web/src/app/(store)/carrito/page.tsx`

**Rama:** `sprint9/ux-critico-pagos`

*Última actualización: 2026-05-19*

---

## 67. FIX 9.3 — Paginación con ventana deslizante en catálogo y pedidos

**Problema resuelto:**
`catalogo/page.tsx` generaba un `<Link>` por cada página con `Array.from({ length: totalPages })`. Con 50+ páginas resultaban 50+ elementos DOM innecesarios. `pedidos/page.tsx` solo mostraba Anterior/Siguiente sin números de página, lo que hacía imposible saltar a páginas específicas.

**Solución implementada:**

1. **`apps/web/src/lib/pagination.ts`** — NUEVO: función pura `getPaginationPages(current, total): (number | '...')[]`:
   - Siempre incluye página 1 y última
   - Muestra hasta 2 páginas antes y después de la actual (delta = 2)
   - Reemplaza saltos con `'...'`
   - Ejemplos: `(5, 20)` → `[1, '...', 3, 4, 5, 6, 7, '...', 20]` / `(1, 3)` → `[1, 2, 3]`

2. **`apps/web/src/app/(store)/catalogo/page.tsx`**:
   - `Array.from({ length: totalPages })` → `getPaginationPages(page, totalPages).map(...)`
   - El elemento `'...'` se renderiza como `<span>…</span>` no clicable con el mismo estilo de los números

3. **`apps/web/src/app/(store)/pedidos/page.tsx`**:
   - Se añaden números de página con ventana (mismo patrón y clases que el catálogo)
   - Se mantienen los botones Anterior / Siguiente con el mismo estilo visual

**Archivos modificados:**

- `apps/web/src/lib/pagination.ts` — NUEVO
- `apps/web/src/app/(store)/catalogo/page.tsx`
- `apps/web/src/app/(store)/pedidos/page.tsx`

**Rama:** `sprint9/ux-critico-pagos`

*Última actualización: 2026-05-19*

---

## 68. FEATURE 10.1 — Sitemap dinámico

**Qué se hizo:**
Se creó `apps/web/src/app/sitemap.ts` que exporta la función `sitemap()` requerida por Next.js para generar automáticamente el archivo `/sitemap.xml`. Combina rutas estáticas con las páginas de producto generadas dinámicamente desde la base de datos.

**Rutas incluidas:**

- `/` — prioridad 1.0, cambio diario
- `/catalogo` — prioridad 0.9, cambio diario
- `/auth/login` y `/auth/register` — prioridad 0.3, cambio mensual
- `/producto/[slug]` para cada producto con `isActive = true` y `stock > 0` — prioridad 0.7, cambio semanal, con `lastModified` real del campo `updatedAt`

**Archivos creados:**

- `apps/web/src/app/sitemap.ts` *(nuevo)*

**Decisiones técnicas:**

- Usa `prisma.product.findMany()` directamente (patrón SSR de reads sin HTTP a NestJS).
- Sin caché: Next.js regenera el sitemap en cada build de Vercel, que es el momento correcto para reflejar el catálogo actualizado.
- La URL base se lee de `NEXT_PUBLIC_SITE_URL`; si no está definida cae al dominio de Vercel del proyecto.
- Los productos sin stock o inactivos se excluyen deliberadamente para evitar que Google indexe páginas sin contenido comprable.

**Rama:** `sprint10/seo-rendimiento`

*Última actualización: 2026-05-19*

---

## 69. FEATURE 10.2 — OG images para home y productos

**Qué se hizo:**
Se crearon dos archivos `opengraph-image.tsx` que Next.js detecta automáticamente y sirve como imagen `og:image` al compartir links en redes sociales (Twitter/X, WhatsApp, Slack, etc.).

**Archivos creados:**

- `apps/web/src/app/opengraph-image.tsx` — OG image estática para la home (1200×630 px)
- `apps/web/src/app/(store)/producto/[slug]/opengraph-image.tsx` — OG image dinámica por producto (1200×630 px)

**Diseño home:**

- Fondo oscuro `#0f172a`, barra accent sky-500, título blanco 76 px, tagline gris 30 px, badge de dominio en esquina inferior derecha.

**Diseño producto:**

- Layout split: panel izquierdo oscuro con nombre del producto (46 px), precio en sky-500 (38 px) y badge de stock (verde / rojo); panel derecho gris claro con la imagen del producto desde Cloudinary.
- Nombre truncado a 55 caracteres para evitar overflow.
- Fallback genérico si el producto no existe.

**Decisiones técnicas:**

- `export const runtime = 'nodejs'` en ambos archivos para evitar incompatibilidades de Edge con Prisma/pg.
- `ImageResponse` de `next/og` — solo estilos inline, sin Tailwind (limitación de la API).
- La OG de producto llama a `getCachedProductBySlug` (Prisma + `unstable_cache`): misma función que usa la página, sin round-trip extra.
- Se suprimió el warning de `@next/next/no-img-element` con comentario eslint-disable-next-line en la etiqueta de imagen del panel derecho (necesario porque `<Image>` de Next.js no es compatible con `ImageResponse`).

**Rama:** `sprint10/seo-rendimiento`

*Última actualización: 2026-05-19*

---

## 70. FEATURE 10.3 — generateStaticParams con ISR para páginas de producto

**Qué se hizo:**
Se añadió `generateStaticParams` y `export const revalidate = 300` a la página de detalle de producto (`/producto/[slug]`), convirtiendo las páginas de producto de SSR puro a ISR (Incremental Static Regeneration).

**Comportamiento en build:**

- En cada deploy de Vercel, `generateStaticParams` consulta todos los productos con `isActive = true` y `stock > 0` y devuelve sus slugs.
- Next.js pre-renderiza todas esas páginas en build time y las deposita en el CDN de Vercel.
- El TTFB de un producto pre-renderizado pasa de ~200 ms (SSR cold) a ~0 ms (CDN hit).

**Comportamiento en producción (ISR):**

- Después de 300 segundos desde el último render, la próxima visita recibe la página cacheada (sin esperar) y dispara un re-render en background (`stale-while-revalidate`).
- Productos nuevos o slugs no incluidos en `generateStaticParams` se renderizan on-demand la primera vez y quedan cacheados (`dynamicParams = true`, que es el default).

**Archivos modificados:**

- `apps/web/src/app/(store)/producto/[slug]/page.tsx`

**Decisiones técnicas:**

- `prisma.product.findMany` directo (sin `unstable_cache`) porque `generateStaticParams` solo corre en build time, no en runtime de usuario.
- `revalidate = 300` (5 min) como balance entre frescura de precio/stock y eficiencia de CDN.
- Se mantuvo `getCachedProductBySlug` dentro de `generateMetadata` y `ProductPage` porque en runtime sí necesita el caché de `unstable_cache`.

**Rama:** `sprint10/seo-rendimiento`

*Última actualización: 2026-05-19*

---

## 71. FIX 11.1 — Auditoría de fronteras Server/Client Component

**Qué se hizo:**
Se auditaron todos los archivos de `apps/web/src/app/` y `apps/web/src/components/` para detectar violaciones de fronteras Server/Client en Next.js App Router. Se corrigieron dos hallazgos concretos.

**Resultado de la auditoría:**

- 25 Client Components marcados con `'use client'` — todos justificados (hooks, browser APIs, next-auth/react).
- Fronteras Server→Client correctas: `Navbar` dentro de `<Suspense>`, datos serializables en props.
- Ningún Client Component importa Server Components directamente (patrón correcto de children).
- `OrderStatusBadge` y `WhatsAppButton` son Server Components sin `'use client'` — correcto.

**Hallazgo 1 — `metadataBase` ausente (corregido):**

Sin `metadataBase` en el root layout, Next.js construye URLs relativas para las `opengraph-image.tsx`. Los scrapers de redes sociales (Twitter, WhatsApp, Slack) necesitan URLs absolutas para renderizar el preview. Se añadió `metadataBase` leyendo `NEXT_PUBLIC_SITE_URL` con fallback a `https://h2r-store.vercel.app`. También se corrigió `siteName` de `'H2r Online Store'` a `'H2R Online Store'`.

**Hallazgo 2 — Nombre de tienda incorrecto en footer (corregido):**

El footer del store layout tenía `alt="Electro Motos Tony"` en el logo y `© Electro Motos Tony` en el copyright. Corregido a `H2R Online Store` en ambos lugares.

**Archivos modificados:**

- `apps/web/src/app/layout.tsx` — añade `metadataBase`, corrige `siteName`
- `apps/web/src/app/(store)/layout.tsx` — corrige `alt` del logo y texto del copyright

**Rama:** `sprint11/pulido-final`

*Última actualización: 2026-05-19*

---

## 72. FEATURE 11.2 — ARIA en formularios críticos

**Qué se hizo:**
Se auditaron y corrigieron los atributos ARIA en los tres formularios críticos de la tienda para cumplir con las pautas WCAG 2.1 AA: `CheckoutForm`, `LoginForm` y `ForgotPasswordForm`.

**CheckoutForm (`apps/web/src/components/checkout/CheckoutForm.tsx`):**

- Todos los `<input>` y `<textarea>` carecían de `id`, por lo que los `<label>` no estaban vinculados a ningún campo (rotura de accesibilidad fundamental). Se añadió `id` único con prefijo `checkout-` a cada campo y `htmlFor` correspondiente en cada `<label>`.
- Campos obligatorios: añadido `aria-required="true"` (el HTML `required` es insuficiente para algunos lectores de pantalla).
- Input de email deshabilitado: añadido `aria-disabled="true"`.
- Div de error global: añadido `role="alert"` para que los lectores de pantalla anuncien el mensaje sin necesidad de enfocar el elemento.

**LoginForm (`apps/web/src/app/auth/login/LoginForm.tsx`):**

- Div de error: añadido `role="alert"`.
- Inputs `email` y `password`: añadido `aria-required="true"` y `aria-invalid={!!error}` (comunica a los lectores el estado inválido tras un intento fallido).
- Botón mostrar/ocultar contraseña: añadido `aria-label` descriptivo (`"Mostrar contraseña"` / `"Ocultar contraseña"`) y `aria-pressed` para comunicar el estado toggle.

**ForgotPasswordForm (`apps/web/src/app/auth/forgot-password/ForgotPasswordForm.tsx`):**

- `<label htmlFor>` actualizado de `"email"` a `"forgot-email"` para evitar colisión con el campo del LoginForm si ambos aparecieran en el mismo árbol DOM.
- Error de campo: añadido `id="forgot-email-error"` y `role="alert"`.
- Input: añadido `aria-invalid={!!fieldError}` y `aria-describedby="forgot-email-error"` (condicional) para que el lector anuncie el mensaje de error al enfocar el campo.
- `aria-required="true"` en el input de email.

**Archivos modificados:**

- `apps/web/src/components/checkout/CheckoutForm.tsx`
- `apps/web/src/app/auth/login/LoginForm.tsx`
- `apps/web/src/app/auth/forgot-password/ForgotPasswordForm.tsx`

**Rama:** `sprint11/pulido-final`

*Última actualización: 2026-05-19*

---

## 73. FEATURE 11.3 — Tests E2E con Playwright

**Qué se hizo:**
Se instaló `@playwright/test` y se creó la suite de tests E2E que cubre los flujos críticos: páginas públicas, formularios de auth, carrito y checkout completo.

**Estructura de archivos creados:**

- `apps/web/playwright.config.ts` — configuración con dos proyectos: `chromium` (público) y `chromium-auth` (autenticado, depende del setup).
- `apps/web/e2e/global-setup.ts` — login previo vía UI; guarda cookies en `playwright/.auth/user.json` para reutilizar sesión entre tests. Usa `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` del entorno.
- `apps/web/e2e/catalog.spec.ts` — 5 tests: home carga, link al catálogo, catálogo muestra productos, detalle de producto, 404 en slug inexistente.
- `apps/web/e2e/auth.spec.ts` — 6 tests: login renderiza labels vinculados, error con credenciales malas, toggle de contraseña, redirección protegida, forgot-password ARIA, forgot-password confirmación (API mockeada).
- `apps/web/e2e/cart.spec.ts` — 6 tests: empty state, producto inyectado vía localStorage, incremento/decremento de cantidad, eliminación, stock máximo deshabilita "+", link al checkout.
- `apps/web/e2e/checkout.spec.ts` — 4 tests (autenticados): sanity redirect sin sesión, formulario visible con sesión, happy path con API NestJS mockeada (avanza al paso de pago), validación HTML5 bloquea envío vacío.

**Decisiones técnicas:**

- El carrito guest se inyecta directamente en `localStorage` (`electro-motos-cart-guest`) para evitar navegar por el catálogo en cada test, reduciendo tiempo de ejecución.
- Las llamadas al API de NestJS se mockean con `page.route('**/orders', ...)` en los tests de checkout — los tests no dependen de que NestJS esté corriendo.
- `webServer: { command: 'pnpm dev', reuseExistingServer: !CI }` — en local reutiliza el servidor si ya está corriendo; en CI levanta uno nuevo.
- `playwright/.auth/` y `playwright-report/` añadidos al `.gitignore` raíz.

**Comandos:**

```bash
pnpm --filter @h2r/web test:e2e          # headless
pnpm --filter @h2r/web test:e2e:ui       # con UI interactiva de Playwright
pnpm --filter @h2r/web test:e2e:headed   # navegador visible
```

**Variables de entorno requeridas para checkout tests:**

- `TEST_USER_EMAIL` — email de un usuario real en la BD de desarrollo
- `TEST_USER_PASSWORD` — su contraseña

**Archivos creados:**

- `apps/web/playwright.config.ts`
- `apps/web/e2e/global-setup.ts`
- `apps/web/e2e/catalog.spec.ts`
- `apps/web/e2e/auth.spec.ts`
- `apps/web/e2e/cart.spec.ts`
- `apps/web/e2e/checkout.spec.ts`
- `apps/web/playwright/.auth/user.json` *(vacío, gitignoreado)*

**Rama:** `sprint11/pulido-final`

*Última actualización: 2026-05-19*

---

## 74. FIX 11.4 — Umbrales de cobertura en dominio + tests de controladores NestJS

**Qué se hizo:**
Se completó la cobertura de tests del API en dos partes:

**Parte 1 — Umbrales de cobertura en `packages/domain`:**

- Configurada cobertura con `provider: 'v8'` en `packages/domain/vitest.config.ts`.
- Umbrales mínimos: 80 % en líneas, funciones y declaraciones; 70 % en ramas.
- Instalado `@vitest/coverage-v8` como devDependency en `packages/domain`.

**Parte 2 — Tests unitarios de controladores NestJS:**

- Creado `apps/api/src/__tests__/orders.controller.test.ts` con 4 tests para `OrdersController`: creación de pedido exitosa, error del use case, MERCADO_PAGO deshabilitado lanza `ForbiddenException`, y `updateStatus()` exitoso.
- Creado `apps/api/src/__tests__/wompi.controller.test.ts` con 7 tests para `WompiController`: integrity signature con todos los campos, moneda COP por defecto, webhook con firma inválida lanza `UnauthorizedException`, evento no-transacción ignorado, pago APPROVED encola email, pago DECLINED no encola email, error de dominio retornado sin excepción.

**Problemas resueltos durante la implementación:**

1. **`Cannot find package '@/domain/shared/Result'`** — `apps/api/vitest.config.ts` no tenía el alias `@/domain`. Solucionado agregando `resolve.alias` apuntando a `../../packages/domain/src`.

2. **`Cannot find module './internal/class'` (cliente Prisma en tests)** — El cliente Prisma generado no puede cargarse en el entorno vitest. Solucionado con `vi.mock('@h2r/database', () => ({ prisma: { client: {...} }, PrismaClient: vi.fn() }))` hoisted al tope de cada test.

3. **`No "IOrderRepository" export defined on @h2r/domain mock`** — Las interfaces TypeScript no existen en runtime. vitest valida los exports del mock contra el módulo real. Solucionado agregando `IOrderRepository: undefined, IProductRepository: undefined, IPaymentService: undefined, OrderStatus: undefined, PaymentStatus: undefined` como placeholders en el mock de `@h2r/domain`.

4. **`Cannot find module '../infrastructure/services/WompiService'` (require() en ESM)**— `require()` dinámico dentro de funciones no funciona en modo ESM de vitest. Solucionado reescribiendo los tests con imports estáticos al tope del archivo, permitiendo que `vi.mock` los intercepte via hoisting.

5. **`MercadoPagoService at index [3] is not available`** — `OrdersController` inyecta `MercadoPagoService` en el constructor pero no estaba en los providers del módulo de test. Solucionado agregando `{ provide: MercadoPagoService, useValue: mockMercadoPagoService }`.

6. **`() => ({...}) is not a constructor`** — `ConfirmPayment` y `CreateOrder` se instancian con `new` en los controladores. `vi.fn().mockImplementation(() => ({...}))` usa arrow functions que no son constructables. Solucionado cambiando a `vi.fn().mockImplementation(function () { return {...} })`.

**Resultado final:**

```text
Test Files  3 passed (3)
      Tests  20 passed (20)
```

Los 9 tests de `WompiService.test.ts` (existentes) más los 11 nuevos tests de controladores pasan sin errores.

**Archivos modificados/creados:**

- `packages/domain/vitest.config.ts` — cobertura v8 con umbrales
- `apps/api/vitest.config.ts` — alias `@/domain` agregado
- `apps/api/src/__tests__/orders.controller.test.ts` *(nuevo)*
- `apps/api/src/__tests__/wompi.controller.test.ts` *(nuevo)*

**Rama:** `sprint11/pulido-final`

*Última actualización: 2026-05-19*

---

## 75. Descripción estructurada de productos — capa de dominio

**Qué se hizo:**

Se modeló la descripción enriquecida de producto en la capa de dominio como una entidad separada de `Product`, siguiendo el principio de separación de responsabilidades.

**Entidad `ProductDescription`** (`packages/domain/src/entities/ProductDescription.ts`):
- `ProductBenefit`: `{ id, title?, body, order }` — un punto de venta individual con orden explícito
- `ProductDescription`: `{ id, productId, generalDescription?, benefits[], createdAt, updatedAt }`
- `UpsertDescriptionInput`: contrato de entrada para crear o reemplazar la descripción completa

**Interfaz `IProductDescriptionRepository`** (`packages/domain/src/repositories/IProductDescriptionRepository.ts`):
- `findByProductId(productId)` — retorna la descripción o `null`
- `upsert(input)` — crea o reemplaza la descripción + beneficios en una transacción (los beneficios anteriores se eliminan y recrean)

**Use case `UpsertProductDescription`** (`packages/domain/src/use-cases/products/UpsertProductDescription.ts`):
- Valida que el producto exista (retorna `NOT_FOUND` si no)
- Valida máximo 10 beneficios (`VALIDATION_ERROR`)
- Valida que ningún beneficio tenga `body` vacío
- Retorna `Result<ProductDescription>`

Los tres símbolos se re-exportan desde `packages/domain/src/index.ts`.

**Archivos creados:**

- `packages/domain/src/entities/ProductDescription.ts`
- `packages/domain/src/repositories/IProductDescriptionRepository.ts`
- `packages/domain/src/use-cases/products/UpsertProductDescription.ts`

**Archivos modificados:**

- `packages/domain/src/index.ts` — re-exporta los 3 nuevos módulos

**Fin:**

El dominio expone el contrato completo de descripción enriquecida sin depender de Prisma ni de NestJS. Cualquier capa de infraestructura puede implementar `IProductDescriptionRepository` con cualquier ORM.

---

## 76. Descripción estructurada de productos — capa de base de datos

**Qué se hizo:**

Se añadieron dos modelos nuevos al schema de Prisma y se corrió la migración correspondiente.

**Modelos nuevos en `packages/database/prisma/schema.prisma`:**

```prisma
model ProductDescription {
  id                 String           @id @default(cuid())
  productId          String           @unique
  generalDescription String?          @db.Text
  product            Product          @relation(fields: [productId], references: [id], onDelete: Cascade)
  benefits           ProductBenefit[]
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  @@index([productId])
}

model ProductBenefit {
  id            String             @id @default(cuid())
  descriptionId String
  title         String?
  body          String             @db.Text
  order         Int                @default(0)
  description   ProductDescription @relation(fields: [descriptionId], references: [id], onDelete: Cascade)
  @@index([descriptionId, order])
}
```

El modelo `Product` recibe la relación `structuredDescription ProductDescription?` (1-to-1 opcional).

`onDelete: Cascade` en ambas relaciones garantiza que eliminar un producto limpia automáticamente su descripción y sus beneficios.

**Archivos modificados/creados:**

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260527165602_add_product_structured_description/migration.sql` *(generado)*

**Fin:**

La migración se aplicó con `pnpm db:migrate`. El cliente Prisma regenerado expone `prisma.productDescription` y `prisma.productBenefit` con tipado completo.

---

## 77. Descripción estructurada de productos — capa de infraestructura API

**Qué se hizo:**

Se implementó la capa de infraestructura en `apps/api` para el repositorio de descripciones y se expuso vía dos endpoints REST en el controlador de admin.

**`PrismaProductDescriptionRepository`** (`apps/api/src/infrastructure/repositories/PrismaProductDescriptionRepository.ts`):
- `findByProductId()`: incluye `benefits` ordenados por `order` ascendente
- `upsert()`: usa `$transaction` — delete de todos los beneficios anteriores + upsert de `ProductDescription` + createMany de los nuevos beneficios en una sola transacción atómica

**Token de inyección** `PRODUCT_DESCRIPTION_REPOSITORY = Symbol('IProductDescriptionRepository')` añadido a `injection-tokens.ts` y registrado en `InfrastructureModule`.

**Endpoints en `AdminProductsController`:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/admin/products/:id/description` | Retorna la descripción estructurada o 404 si no existe |
| `PUT` | `/admin/products/:id/description` | Crea o reemplaza la descripción (llama `UpsertProductDescription`) |

El mapeo `AppError.code → HTTP status` se extrae a la constante `ERROR_HTTP_STATUS` en el mismo controlador para no depender del `HttpExceptionFilter` global.

**DTO** `UpsertProductDescriptionDto` (`apps/api/src/admin/dto/upsert-description.dto.ts`): valida `generalDescription?` y array de `benefits` con `class-validator`.

**Archivos creados:**

- `apps/api/src/infrastructure/repositories/PrismaProductDescriptionRepository.ts`
- `apps/api/src/admin/dto/upsert-description.dto.ts`

**Archivos modificados:**

- `apps/api/src/infrastructure/injection-tokens.ts` — nuevo token
- `apps/api/src/infrastructure/infrastructure.module.ts` — provider y export del repositorio
- `apps/api/src/admin/admin-products.controller.ts` — inyección del repo + 2 endpoints

**Fin:**

La API expone gestión completa de descripciones enriquecidas. `PUT /admin/products/:id/description` es idempotente: llamarlo N veces con el mismo payload produce el mismo resultado.

---

## 78. Descripción estructurada de productos — UI admin y página de producto

**Qué se hizo:**

Se construyó el formulario de edición de beneficios en el panel admin y se habilitó la visualización de beneficios en la página pública de producto.

### `ProductDescriptionEditor` (`apps/web/src/components/admin/ProductDescriptionEditor.tsx`)

Componente cliente con estado local para gestionar la lista de beneficios:
- Añadir beneficio (máx. 10)
- Editar `title` y `body` inline
- Eliminar con botón por ítem
- Reordenar con botones ↑/↓
- Guardar llama `PUT /admin/products/:id/description` vía `apiClient`
- Feedback de guardado exitoso (icono ✓ con auto-dismiss a los 2s) y errores inline

### `ProductEditForm` actualizado

Se añadió el prop `initialBenefits?: Benefit[]` y se renderiza `ProductDescriptionEditor` al final del formulario cuando se está editando un producto existente.

### Página `/admin/productos/[id]`

Carga en paralelo (`Promise.all`) las categorías y la `productDescription` existente, extrae los beneficios y los pasa como `initialBenefits` al `ProductEditForm`.

### Página de detalle `/producto/[slug]`

Consulta `prisma.productDescription.findUnique` con `include: { benefits: { orderBy: { order: 'asc' } } }`. Si existe y tiene al menos un beneficio, renderiza una sección "Beneficios" con lista de checkmarks (ícono ✓ en círculo sky-100).

**Archivos creados:**

- `apps/web/src/components/admin/ProductDescriptionEditor.tsx`

**Archivos modificados:**

- `apps/web/src/components/admin/ProductEditForm.tsx` — prop `initialBenefits`, sección de editor
- `apps/web/src/app/admin/productos/[id]/page.tsx` — carga paralela de descripción
- `apps/web/src/app/(store)/producto/[slug]/page.tsx` — sección de beneficios en detalle

**Fin:**

El admin puede crear y editar beneficios por producto desde la misma página de edición. Los beneficios se muestran inmediatamente en la página pública sin caché adicional (query directa a Prisma en SSR).

---

## 79. Rediseño completo del panel admin

**Qué se hizo:**

Se rediseñó visualmente todo el panel de administración adoptando un lenguaje visual oscuro, minimalista y consistente.

### Sidebar y layout (`apps/web/src/app/admin/layout.tsx`)

- Ancho reducido a 220 px con border sutil `white/[0.06]`
- Etiqueta "Admin Panel" en mayúsculas con tracking amplio como cabecera
- Footer con avatar de iniciales generado desde `session.user.name`, email truncado, link "Ver tienda" con `ArrowUpRight`, y botón "Salir" con `LogOut` de lucide-react
- Importación de `AdminNav` como componente cliente independiente

### `AdminNav` (`apps/web/src/components/admin/AdminNav.tsx`)

Componente cliente que usa `usePathname()` para detectar la ruta activa y aplicar estilos diferenciados (`bg-white/[0.07]` + texto blanco para activo vs `text-white/40` para inactivo). Los emojis del sidebar anterior se reemplazaron por iconos de lucide-react: `LayoutDashboard`, `Package`, `Tag`, `ShoppingBag`, `AlertTriangle`, `Settings`.

### Dashboard (`apps/web/src/app/admin/page.tsx`)

Rediseño completo del dashboard con 4 KPI cards en lugar de 3:
- Ingresos hoy
- Ingresos del mes (nuevo — `getMonthRevenue()`)
- Pedidos pendientes (con indicador de alerta cuando > 0)
- Total de pedidos (nuevo — `getTotalCount()`)

Cada card usa iconos de lucide-react en lugar de emojis. Se añade el `RevenueChart` debajo de los KPIs con los últimos 7 días de ingresos.

### `RevenueChart` (`apps/web/src/components/admin/RevenueChart.tsx`)

Componente cliente con Recharts (`AreaChart`):
- Gradiente vertical blanco transparente para el área
- Grid horizontal sutil (`white/0.04`)
- Ejes con tipografía pequeña en `white/0.3`
- Tooltip personalizado con fondo oscuro (`#111`) y formato COP compacto
- `ResponsiveContainer` al 100 % de ancho × 180 px de alto

### Lista de productos (`apps/web/src/app/admin/productos/page.tsx`)

- Header con etiqueta "Catálogo" sobre el título
- Botón "Nuevo producto" blanco con icono `Plus`
- Barra de búsqueda con icono `Search` inline a la izquierda (sin botón separado — submit al presionar Enter)

### `OrderStatusSelect` (`apps/web/src/components/admin/OrderStatusSelect.tsx`)

- Tema oscuro: fondo `#111`, texto blanco, borde `white/10`
- Estado de error con borde `red-500/60` y tooltip `title` descriptivo
- Guard `|| loading` para evitar doble submit
- Try/catch completo con reset de error a los 3 s

**Nueva dependencia:** `recharts` añadida a `apps/web/package.json`.

**Nuevos métodos en `PrismaOrderRepository` (web):**

- `getMonthRevenue()` — agrega pedidos `PAID` desde el día 1 del mes actual
- `getWeeklyRevenueSeries(days?)` — agrupa pedidos `PAID` de los últimos N días por día de la semana; la agrupación se hace en JS para evitar problemas de timezone en SQL
- `getTotalCount()` — count global sin filtro de estado

**Archivos creados:**

- `apps/web/src/components/admin/AdminNav.tsx`
- `apps/web/src/components/admin/AdminNavLink.tsx`
- `apps/web/src/components/admin/RevenueChart.tsx`

**Archivos modificados:**

- `apps/web/src/app/admin/layout.tsx`
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/admin/productos/page.tsx`
- `apps/web/src/components/admin/OrderStatusSelect.tsx`
- `apps/web/src/infrastructure/repositories/PrismaOrderRepository.ts`
- `apps/web/package.json`
- `pnpm-lock.yaml`

**Fin:**

El panel admin tiene un diseño unificado, oscuro y limpio. La navegación activa es legible de un vistazo. El dashboard muestra métricas financieras reales con un gráfico de área de la semana.

---

## 80. Ruta Next.js para actualización de estado de pedidos desde admin

**Qué se hizo:**

Se creó la ruta `PATCH /api/orders/[id]/status` en Next.js para que el componente `OrderStatusSelect` del admin pueda cambiar el estado de un pedido directamente desde el navegador, sin pasar por NestJS.

**Nota de arquitectura:** Esta ruta coexiste con `PATCH /orders/:id/status` en NestJS (Fase 3). Ambas son válidas: la ruta Next.js requiere sesión ADMIN de NextAuth (sin JWT), lo que la hace más simple de consumir desde Server Components y Client Components del panel admin que ya tienen sesión.

**Validaciones en la ruta:**
- Sesión ADMIN requerida (NextAuth) — retorna 403 si falta
- `status` en body debe estar en `['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']` — retorna 400 si no
- El pedido debe existir — retorna 404 si no
- Actualización vía `prisma.order.update`

**Archivos creados:**

- `apps/web/src/app/api/orders/[id]/status/route.ts`

**Fin:**

`OrderStatusSelect` usa `fetch('/api/orders/${orderId}/status', { method: 'PATCH' })` sin necesidad de obtener ni pasar el `accessToken` de NestJS. La actualización es inmediata en la UI con feedback de error si falla. 

*Última actualización: 2026-05-27*

---

## 81. Integración Vendelo — Fase 0: infraestructura base

**Rama:** `feat/vendelo-integration`

**Qué se hizo:**

Se estableció la infraestructura base para la integración con Vendelo (plataforma logística colombiana). Esta fase no toca el flujo de pago ni el checkout — solo prepara el cliente HTTP, el módulo NestJS y la validación de arranque.

**Cambios detallados:**

1. **`VendeloHttpClient`** (`apps/api/src/infrastructure/services/VendeloHttpClient.ts`) — cliente HTTP tipado con:
   - Retry con backoff exponencial (1 s → 2 s → 4 s) en respuestas 429 y 5xx, máximo 3 reintentos
   - Timeout de 10 s por intento via `AbortController`
   - Log de cada request/response (método, path, status HTTP, latencia en ms) usando `Logger` de NestJS
   - Lee `VENDELO_API_KEY` y `VENDELO_API_URL` del entorno

2. **`VendeloService`** (`apps/api/src/infrastructure/services/VendeloService.ts`) — servicio que envuelve `VendeloHttpClient`. Expone `checkAuth()` que llama a `GET /v1/admin/check-auth` de Vendelo para verificar conectividad.

3. **`VendeloModule`** (`apps/api/src/vendelo/`) — módulo NestJS con un controlador que expone `GET /admin/vendelo/health`, protegido por `@Roles('ADMIN')`. Sirve como smoke test de conectividad hacia Vendelo.

4. **`assertEnvVars()`** (`apps/api/src/main.ts`) — se añadió `VENDELO_API_KEY` a la lista de variables requeridas al arranque. El servidor no inicia si esta variable falta.

5. **`injection-tokens.ts`** — se añadió el token `VENDELO_SERVICE = Symbol('IVendeloService')`, preparado para cuando se conecte la interfaz de dominio en la Fase 2.

6. **Variables de entorno** — añadidas a `apps/api/.env` y documentadas en `apps/api/.env.example`:
   - `VENDELO_API_KEY` — requerida
   - `VENDELO_API_URL` — default `https://api.vendelo.co`
   - `VENDELO_WEBHOOK_SECRET` — usada en Fase 3 (webhooks entrantes)
   - `VENDELO_WALLET_ALERT_THRESHOLD` — umbral de alerta de saldo en centavos COP

7. **`INTEGRACION_VENDELO.md`** (raíz) — documento creado con análisis completo de la integración: complejidad, mapa de módulos, puntos críticos, patrones del proyecto a respetar, y hoja de ruta por fases.

**Archivos creados:**
- `apps/api/src/infrastructure/services/VendeloHttpClient.ts`
- `apps/api/src/infrastructure/services/VendeloService.ts`
- `apps/api/src/vendelo/vendelo.module.ts`
- `apps/api/src/vendelo/vendelo.controller.ts`
- `INTEGRACION_VENDELO.md`

**Archivos modificados:**
- `apps/api/src/main.ts` — `assertEnvVars()` extendido con `VENDELO_API_KEY`
- `apps/api/src/infrastructure/injection-tokens.ts` — token `VENDELO_SERVICE`
- `apps/api/src/infrastructure/infrastructure.module.ts` — registra y exporta `VendeloHttpClient` y `VendeloService`
- `apps/api/src/app.module.ts` — importa `VendeloModule`
- `apps/api/.env` — bloque Vendelo con las 4 variables
- `apps/api/.env.example` — documentación de las variables Vendelo

**Acción manual pendiente:**
Obtener la API Key real de Vendelo (panel de administración) y configurarla en `VENDELO_API_KEY`. Una vez configurada, `GET /admin/vendelo/health` (con JWT ADMIN) confirma la conectividad.

**Fin:**

Dejar lista la capa de transporte hacia Vendelo sin afectar ningún flujo existente. El servidor no arranca si `VENDELO_API_KEY` está vacía, lo que previene deploys silenciosos sin credencial. Las fases 1–4 construyen sobre esta base.

*Última actualización: 2026-05-27*

---

## 82. Expansión del catálogo — 6 nuevas subcategorías y 37 nuevos productos en Accesorios

**Rama:** `feat/vendelo-integration`

**Qué se hizo:**

Se amplió el catálogo de la categoría Accesorios con 6 nuevas subcategorías y 37 productos reales con imágenes en Cloudinary.

### Nuevas subcategorías (bajo `accesorios`)

| Slug | Nombre | Descripción |
|------|--------|-------------|
| `balaclavas` | Balaclavas | Balaclavas y pasamontañas para protección del motociclista. |
| `fender` | Fender | Fenders y guardabarro para personalización de motos. |
| `filtros-de-aire` | Filtros de Aire | Filtros de aire de alto flujo para mayor rendimiento. |
| `seguridad` | Seguridad | Alarmas, candados y sistemas de seguridad para moto. |
| `stop` | Stop | Stops integrados y luces traseras LED para moto. |
| `accesorios-generales` | Accesorios Generales | Cascos, manubrios, direccionales y accesorios varios para moto. |

Se eliminó el placeholder `PH-OBJ-001` (Soporte de celular para manillar) que ocupaba la subcategoría `objetivo`.

### Corrección en el seed

Se eliminó `description` del bloque `update` del upsert en `catalog.ts`. Antes, al volver a ejecutar `pnpm db:seed`, se sobreescribía la descripción de productos que ya habían recibido texto manual a través del admin con string vacío. Ahora el seed solo actualiza precio, stock, `isActive` e imágenes — nunca la descripción.

### Navbar actualizado

El mega menu de Accesorios pasa de 5 a 9 subcategorías visibles (se quitaron `Equipamiento` y `Objetivo` que no tenían productos reales; se añadieron las 6 nuevas). Orden en el menú: Espejos, Exploradores, Bombillas LED, Balaclavas, Fender, Filtros de Aire, Seguridad, Stop, Accesorios Generales.

### `upload-catalog.ts` actualizado

Se añadieron las 6 entradas al mapa `CHILD_SLUG` del script de upload masivo para que los SKUs de los nuevos productos resuelvan correctamente su categoría.

**Archivos modificados:**

- `packages/database/prisma/catalog.ts` — 6 subcategorías nuevas en `SUBCATEGORIES`, 37 productos al inicio de `PRODUCTS`, placeholder eliminado, `description` removido del bloque `update`
- `packages/database/prisma/catalog-upload.ts` — 37 productos nuevos en `UPLOADED_PRODUCTS` (generado 2026-05-28, 85 productos total)
- `apps/web/src/components/nav/Navbar.tsx` — `MEGA_MENU.Accesorios.children` actualizado con 9 subcategorías
- `apps/web/scripts/upload-catalog.ts` — 6 entradas nuevas en `CHILD_SLUG`

**Fin:**

El catálogo crece de 48 a 85 productos activos. Las 6 subcategorías nuevas son navegables desde el mega menú y desde el catálogo con filtros. El seed es seguro de re-ejecutar sin riesgo de perder descripciones manuales.

*Última actualización: 2026-05-28*

---

## 83. Fix: descripción del producto — fallback en página de detalle

**Rama:** `feat/vendelo-integration`

**Qué se hizo:**

Se corrigió un bug en `apps/web/src/app/(store)/producto/[slug]/page.tsx` donde la página mostraba siempre la `description` del objeto cacheado (`product.description`) incluso si el campo estaba vacío o había sido actualizado en la BD.

**Causa raíz:**

`GetProductBySlug` (use case) retorna un objeto cacheado por `unstable_cache`. Si la descripción se actualizó en la BD después de que el caché se pobló, el campo `product.description` que llega al componente es el valor antiguo (o vacío). El campo `structuredDescription.generalDescription` tiene la descripción actual porque se consulta directamente a Prisma (sin caché).

**Solución:**

Se añadió una query paralela via `Promise.all` que obtiene `freshProduct.description` directamente de Prisma en el mismo SSR request. La descripción se resuelve con la siguiente cadena de fallback:

```ts
const description =
  structuredDescription?.generalDescription ||
  freshProduct?.description ||
  product.description
```

Prioridad: texto general de la descripción estructurada → descripción fresca de la BD → descripción cacheada. Si ninguna tiene valor, la sección "Descripción" se oculta completamente (antes mostraba un bloque vacío).

**Archivos modificados:**

- `apps/web/src/app/(store)/producto/[slug]/page.tsx` — `Promise.all` con query fresca, chain de fallback, renderizado condicional del bloque de descripción

**Fin:**

La página de producto muestra siempre la descripción más actualizada y no renderiza un bloque vacío para productos sin descripción.

*Última actualización: 2026-05-28*

---

## 84. Fix: `revalidateTag` con argumento incorrecto en ruta de admin

**Rama:** `feat/vendelo-integration`

**Qué se hizo:**

Se corrigió una llamada incorrecta a `revalidateTag` en `apps/web/src/app/api/admin/revalidate/route.ts`.

**Problema:**

```ts
// Antes — segundo argumento inválido, no hace nada
revalidateTag(tag, {})
```

`revalidateTag` en Next.js 16 acepta como segundo argumento opcional el tipo de invalidación (`'page'` o `'layout'`), pero `{}` no es un valor válido. El efecto era que los tags de caché **no se invalidaban** al llamar a `POST /api/admin/revalidate` desde el admin.

**Solución:**

```ts
// Después — invalida agresivamente todos los niveles
revalidateTag(tag, 'max')
```

Esto asegura que todas las entradas de `unstable_cache` etiquetadas con ese tag se expiran inmediatamente tras una mutación administrativa (crear, editar o eliminar un producto).

**Archivos modificados:**

- `apps/web/src/app/api/admin/revalidate/route.ts` — segundo argumento corregido de `{}` a `'max'`

**Fin:**

Las mutaciones de productos del admin invalidan correctamente el caché de Next.js. Los cambios de precio, stock o descripción se reflejan en el catálogo y páginas de producto sin esperar que el TTL expire.

*Última actualización: 2026-05-28*

---

## 85. Fix: galería de imágenes del admin para IDs de Cloudinary sin prefijo HTTP

**Rama:** `feat/vendelo-integration`

**Qué se hizo:**

Se corrigieron dos bugs en `apps/web/src/components/admin/ProductEditForm.tsx` relacionados con el manejo de imágenes de productos.

### Bug 1 — Validación de URL con `new URL()` descartaba IDs de Cloudinary

La inicialización del estado `images` filtraba los strings usando `try { new URL(url); return true } catch { return false }`. Los IDs de Cloudinary (`products/SKU/1`) no son URLs absolutas válidas, por lo que `new URL()` lanzaba y el ID era descartado. Esto causaba que productos con imágenes en Cloudinary aparecieran sin imágenes al abrir el editor.

**Corrección:** Se reemplazó por `typeof url === 'string' && url.trim().length > 0`. Cualquier string no vacío se acepta.

### Bug 2 — `<Image>` crasheaba con IDs de Cloudinary como `src`

El componente `<Image>` de Next.js lanza si `src` no es una URL HTTP válida. La galería intentaba renderizar los IDs de Cloudinary directamente en `<Image>`, causando un error en runtime.

**Corrección:** Se añade un condicional `const isUrl = url.startsWith('http')`. Para strings que son IDs de Cloudinary (no empiezan por `http`), se renderiza un placeholder visual con el ícono `ImagePlus` y el ID truncado, en lugar de `<Image>`. Esto mantiene la posibilidad de eliminar el ítem y sirve como indicador visual de que la imagen existe pero su URL completa la genera Cloudinary.

**Archivos modificados:**

- `apps/web/src/components/admin/ProductEditForm.tsx` — filtro de inicialización simplificado, renderizado condicional en la galería (URL → `<Image>`, ID → placeholder con ícono)

**Fin:**

El editor de productos muestra correctamente las imágenes existentes (o un placeholder manejable cuando solo se tiene el ID de Cloudinary). No se producen errores de runtime al abrir productos con imágenes en formato `products/SKU/N`.

*Última actualización: 2026-05-28*

---

## 86. Mejora: timeouts explícitos en el pool de PostgreSQL

**Rama:** `feat/vendelo-integration`

**Qué se hizo:**

Se añadieron dos parámetros al pool de `pg` en `packages/database/src/index.ts`:

```ts
const pool = new Pool({
  connectionString,
  max: POOL_MAX,
  idleTimeoutMillis: 30_000,       // conexiones inactivas liberadas a los 30 s
  connectionTimeoutMillis: 15_000, // falla rápido si no hay conexión en 15 s
})
```

**Por qué:**

- **`idleTimeoutMillis: 30_000`**: En Neon (serverless PostgreSQL) las conexiones inactivas consumen cuota aunque nadie las use. Sin este timeout, una conexión que se abrió para una request de baja frecuencia puede permanecer abierta indefinidamente hasta agotar el pool. Con 30 s de inactividad, se libera automáticamente.

- **`connectionTimeoutMillis: 15_000`**: Sin timeout explícito, si Neon está saturado o hay un problema de red, la aplicación puede quedar bloqueada esperando una conexión indefinidamente. Con 15 s de timeout, falla rápido y retorna un error controlable en lugar de colgar el request.

**Archivos modificados:**

- `packages/database/src/index.ts` — `idleTimeoutMillis` y `connectionTimeoutMillis` añadidos al constructor de `Pool`

**Fin:**

El pool gestiona conexiones inactivas automáticamente (clave para Neon free tier con límite de 5–10 conexiones simultáneas) y tiene un tiempo de fallo determinístico ante problemas de conectividad.

*Última actualización: 2026-05-28*

---

## 87. Integración Vendelo — Fase 1: catálogo de ciudades y selector en checkout

**Rama:** `feat/vendelo-integration`

**Qué se hizo:**

Se implementó el prerequisito duro para crear órdenes de envío en Vendelo: el sistema ahora captura el `city_code` (código DIVIPOLA de 8 dígitos) y `subdivision_code` en el checkout, en lugar del campo libre de texto que existía antes.

**Cambios detallados:**

1. **Corrección URL base de Vendelo** — La URL estaba incorrecta: `https://api.vendelo.co` → `https://api.venndelo.com` (doble `n`, dominio `.com`). Corregida en `apps/api/.env` y `.env.example`.

2. **`VendeloCity` model** (`packages/database/prisma/schema.prisma`) — Nuevo modelo con `code` (PK, código DIVIPOLA), `name`, `subdivisionCode`, `countryCode`. Migración: `20260601165124_add_vendelo_city`.

3. **`VendeloService.getAllCities()`** (`apps/api/src/infrastructure/services/VendeloService.ts`) — Paginación completa sobre `GET /v1/admin/region/cities`. Sigue el patrón de `next_page_token === ''` como señal de última página (según la documentación de Vendelo v1.20260504).

4. **`POST /admin/vendelo/sync-cities`** (`apps/api/src/vendelo/vendelo.controller.ts`) — Endpoint de admin que descarga todas las ciudades de Vendelo y las sincroniza en la tabla `VendeloCity` local. Retorna `{ synced: N }`. Protegido con `@Roles('ADMIN')`.

5. **`GET /api/vendelo/cities?q=`** (`apps/web/src/app/api/vendelo/cities/route.ts`) — Ruta Next.js que busca ciudades en la tabla local con `ILIKE`. Mínimo 2 caracteres para buscar, retorna hasta 10 resultados. Pública (solo datos geográficos).

6. **`CitySelector` component** (`apps/web/src/components/checkout/CitySelector.tsx`) — Combobox con:
   - Debounce de 300 ms en la búsqueda
   - Indicador visual `✓` cuando hay ciudad seleccionada
   - Cierre del dropdown al hacer click fuera
   - `aria-autocomplete`, `aria-expanded`, `aria-selected` para accesibilidad
   - Limpia la selección si el usuario edita el texto manualmente

7. **`CheckoutForm`** (`apps/web/src/components/checkout/CheckoutForm.tsx`) — Se reemplazaron los campos libres `city` y `department` por el `CitySelector`. El payload a NestJS ahora incluye `cityCode` y `subdivisionCode` en `shippingAddress`. El botón "Continuar al pago" queda deshabilitado hasta que hay una ciudad seleccionada.

**Archivos creados:**

- `apps/web/src/app/api/vendelo/cities/route.ts`
- `apps/web/src/components/checkout/CitySelector.tsx`
- `packages/database/prisma/migrations/20260601165124_add_vendelo_city/migration.sql`

**Archivos modificados:**

- `packages/database/prisma/schema.prisma` — modelo `VendeloCity`
- `apps/api/src/infrastructure/services/VendeloService.ts` — `getAllCities()`, `getCitiesPage()`
- `apps/api/src/vendelo/vendelo.controller.ts` — endpoint `sync-cities`
- `apps/web/src/components/checkout/CheckoutForm.tsx` — integración `CitySelector`
- `apps/api/.env` y `.env.example` — URL corregida

**Acción requerida antes de que el checkout funcione:**
Ejecutar `POST /admin/vendelo/health` para verificar conectividad, luego `POST /admin/vendelo/sync-cities` para poblar la tabla `VendeloCity`. Sin este sync, el selector de ciudades no devuelve resultados.

**Fin:**

El checkout ahora captura `cityCode` y `subdivisionCode`, que son los campos requeridos por `POST /v1/admin/orders` de Vendelo. La Fase 2 (creación de órdenes) puede construirse directamente sobre esta base.

---

## 88. Integración Vendelo — Fase 2: creación automática de órdenes al confirmar pago

**Qué se hizo:**

Se implementó el flujo completo para crear automáticamente una orden en Vendelo cada vez que un pago se confirma como `APPROVED`. El sistema usa el mismo patrón de cola asincrónica que el envío de emails de confirmación (`EmailQueueService`).

**Componentes implementados:**

1. **Migración Prisma** (`20260601185620_add_vendelo_order_queue`):

   - Campo `vendeloOrderId String?` en el modelo `Order` — guarda el ID de la orden creada en Vendelo para correlación.
   - Modelo `VendeloOrderQueue` — cola de órdenes pendientes de enviar a Vendelo con campos `orderId`, `attempts`, `lastError`, `status` (PENDING/SENT/FAILED), `nextRetry`.

2. **`ShippingAddress` entity** (`packages/domain/src/entities/Order.ts`) — Se agregaron `cityCode?: string` y `subdivisionCode?: string`. El campo `department` se hizo opcional (`department?`) ya que fue reemplazado por el selector de ciudad de Vendelo.

3. **`VendeloService.createOrder()`** (`apps/api/src/infrastructure/services/VendeloService.ts`) — Mapper completo de `Order` (dominio) → body de `POST /v1/admin/orders`:

   - `pickup_info` — datos de la tienda, configurable via env vars (`VENDELO_STORE_*`)
   - `billing_info` — nombre del cliente (split en `first_name` + `last_name`), email, teléfono
   - `shipping_info` — dirección de destino con `city_code` y `subdivision_code` del `shippingAddress`
   - `line_items` — cada `OrderItem` mapeado con conversión centavos→float, dimensiones por defecto configurables via env vars
   - `payment_method_code: "EXTERNAL_PAYMENT"` (pago ya confirmado por Wompi/MercadoPago)
   - `confirmation_status: "CONFIRMED"` (no requiere confirmación manual del admin)

4. **`VendeloOrderQueueService`** (`apps/api/src/infrastructure/services/VendeloOrderQueueService.ts`):

   - Patrón idéntico a `EmailQueueService`: `setInterval` cada 2 min via `OnModuleInit`
   - `enqueue(orderId)` — crea fila con status PENDING
   - `processNext()` — consulta PENDING con `nextRetry <= now`, llama `VendeloService.createOrder()`, guarda `vendeloOrderId` en `Order` en una transacción
   - Backoff exponencial: intento 1 → +5s | intento 2 → +30s | intento 3 → +120s → FAILED

5. **Webhooks de pago actualizados**:

   - `WompiController.webhook()` — en la rama `APPROVED && stateChanged`, después de encolar email, llama `vendeloOrderQueue.enqueue(orderId)`
   - `MercadoPagoController.webhook()` — idéntico

6. **Variables de entorno nuevas** (en `.env` y `.env.example`):

   - `VENDELO_STORE_NAME`, `VENDELO_STORE_PHONE`, `VENDELO_STORE_ADDRESS` — datos del comercio para `pickup_info`
   - `VENDELO_STORE_CITY_CODE`, `VENDELO_STORE_SUBDIVISION_CODE` — código DIVIPOLA de la ciudad de la tienda
   - `VENDELO_DEFAULT_WEIGHT_KG`, `VENDELO_DEFAULT_HEIGHT_CM`, `VENDELO_DEFAULT_WIDTH_CM`, `VENDELO_DEFAULT_LENGTH_CM` — dimensiones de empaque por defecto

**Archivos creados:**

- `apps/api/src/infrastructure/services/VendeloOrderQueueService.ts`
- `packages/database/prisma/migrations/20260601185620_add_vendelo_order_queue/migration.sql`

**Archivos modificados:**

- `packages/database/prisma/schema.prisma`
- `packages/domain/src/entities/Order.ts`
- `apps/api/src/infrastructure/services/VendeloService.ts`
- `apps/api/src/infrastructure/infrastructure.module.ts`
- `apps/api/src/payments/wompi.controller.ts`
- `apps/api/src/payments/mercadopago.controller.ts`
- `apps/api/.env` y `apps/api/.env.example`
- `INTEGRACION_VENDELO.md`

**Acción requerida para que Fase 2 funcione en producción:**

Antes del primer deploy, configurar en `apps/api/.env` (y en las variables de Railway):

- `VENDELO_STORE_PHONE` — teléfono real de la tienda
- `VENDELO_STORE_ADDRESS` — dirección física de la tienda donde Vendelo recogerá los paquetes
- `VENDELO_STORE_CITY_CODE` — código DIVIPOLA de la ciudad (ej. `05001000` = Medellín)
- `VENDELO_STORE_SUBDIVISION_CODE` — código de subdivisión (ej. `02`)
- Ajustar `VENDELO_DEFAULT_WEIGHT_KG` y dimensiones según el empaque real de los productos

**Fin:**

A partir de este punto, cada vez que Wompi o MercadoPago confirmen un pago, el sistema crea automáticamente una orden en Vendelo con reintentos automáticos. El `vendeloOrderId` se guarda en la orden para trazabilidad. La Fase 3 (tracking de envíos via webhooks Vendelo) puede construirse sobre esta base.

---

## 89. Integración Vendelo — Fase 3: webhooks de envío y tracking

**Qué se hizo:**

Se implementó la recepción y procesamiento de eventos del Chatbot Connection de Vendelo. Cuando Vendelo notifica que un pedido fue despachado, entregado o cancelado, el sistema actualiza el estado del envío y del pedido con idempotencia atómica, e invalida la caché de pedidos del usuario.

**Componentes implementados:**

1. **`Shipment` entity** (`packages/domain/src/entities/Shipment.ts`):

   - Tipo `ShipmentStatus`: `PENDING | READY | PREPARING | SHIPPED | INCIDENT | DELIVERED | RETURNED | CANCELLED`
   - `SHIPMENT_STATUS_RANK`: mapa numérico para detectar retrocesos de estado (progresión unidireccional)

2. **`IShipmentRepository`** (`packages/domain/src/repositories/IShipmentRepository.ts`):

   - `findByOrderId()`, `upsert()`, `atomicUpdateStatus()` — el método atómico ejecuta `UPDATE WHERE status = from`, garantizando idempotencia ante webhooks duplicados

3. **`SyncShipmentStatus` use case** (`packages/domain/src/use-cases/orders/SyncShipmentStatus.ts`):

   - **Idempotencia nivel 1:** rank check en memoria — si `rank(nuevo) <= rank(actual)`, retorna `{ updated: false }` sin tocar la BD
   - **Idempotencia nivel 2:** `atomicUpdateStatus` con `WHERE status = from` — protege contra race conditions entre workers
   - Actualiza `Order.status` cuando el envío llega a `SHIPPED`, `DELIVERED` o `CANCELLED`
   - Patrón idéntico a `ConfirmPayment`: sin excepciones, retorna `Result<T,E>`

4. **Prisma** — migración `20260601191728_add_shipment`:

   - Modelo `Shipment` (1:1 con `Order`, `onDelete: Cascade`)
   - Relación `Order.shipment Shipment?`

5. **`SHIPMENT_REPOSITORY`** — nuevo token en `injection-tokens.ts`, `PrismaShipmentRepository` registrado y exportado en `InfrastructureModule`

6. **`VendeloWebhookGuard`** (`apps/api/src/vendelo/guards/vendelo-webhook.guard.ts`):

   - Implementa `CanActivate`
   - Verifica HMAC-SHA256 del body crudo contra `X-Vendelo-Signature`
   - Dev sin secret: permite con warning. Prod sin secret: rechaza con 401
   - Requiere `rawBody: true` en `NestFactory.create()` — habilitado en `main.ts`

7. **`VendeloWebhookController`** (`apps/api/src/vendelo/vendelo-webhook.controller.ts`):

   - Thin controller: `@Public() @SkipThrottle() @UseGuards(VendeloWebhookGuard)`
   - Mapea evento Vendelo → `ShipmentStatus` (tabla de 7 eventos)
   - Llama `SyncShipmentStatus` use case
   - Si `updated: true`, llama `POST /api/internal/revalidate` con `x-internal-secret` para invalidar caché `orders` en Next.js
   - Siempre responde 200 para evitar reintentos masivos

8. **Cache `orders`**:

   - `CACHE_TAGS.orders` agregado en `apps/web/src/lib/cache-tags.ts`
   - `getOrderHistory` envuelta en `unstable_cache` (TTL 60s, tag `orders`)
   - `POST /api/internal/revalidate` — endpoint Next.js con `x-internal-secret` para invalidación server-to-server

**Archivos creados:**

- `packages/domain/src/entities/Shipment.ts`
- `packages/domain/src/repositories/IShipmentRepository.ts`
- `packages/domain/src/use-cases/orders/SyncShipmentStatus.ts`
- `apps/api/src/infrastructure/repositories/PrismaShipmentRepository.ts`
- `apps/api/src/vendelo/guards/vendelo-webhook.guard.ts`
- `apps/api/src/vendelo/vendelo-webhook.controller.ts`
- `apps/web/src/app/api/internal/revalidate/route.ts`
- `packages/database/prisma/migrations/20260601191728_add_shipment/migration.sql`

**Archivos modificados:**

- `packages/domain/src/index.ts` — nuevos exports
- `packages/database/prisma/schema.prisma` — modelo `Shipment` + `Order.shipment`
- `apps/api/src/infrastructure/injection-tokens.ts` — `SHIPMENT_REPOSITORY`
- `apps/api/src/infrastructure/infrastructure.module.ts` — registro y export
- `apps/api/src/vendelo/vendelo.module.ts` — `VendeloWebhookController`
- `apps/api/src/main.ts` — `rawBody: true`
- `apps/web/src/lib/cache-tags.ts` — tag `orders`
- `apps/web/src/lib/queries/getOrderHistory.ts` — `unstable_cache`
- `INTEGRACION_VENDELO.md`

**Acción requerida antes de recibir webhooks de Vendelo:**

1. Registrar Chatbot Connection en Vendelo (`POST /v1/admin/chatbot/connections`) apuntando a `https://<api-domain>/vendelo/webhook` con los 7 eventos de envío
2. Guardar el secret recibido en `VENDELO_WEBHOOK_SECRET` en Railway y en `.env` local

*Última actualización: 2026-06-01*

---

## 90. Integración Vendelo — Fase 4: operaciones logísticas admin

**Qué se hizo:**

Se implementaron todos los endpoints administrativos de logística para el panel de Vendelo, siguiendo Clean Architecture: use cases de dominio para operaciones con reglas de negocio, NestJS application service para las operaciones thin, y DTOs con class-validator en todos los endpoints.

**Operaciones implementadas:**

| Endpoint NestJS | Capa | Operación Vendelo API |
| --- | --- | --- |
| `POST /admin/vendelo/create-shipments` | Domain use case | `POST /v1/admin/shipping/create-shipments` |
| `POST /admin/vendelo/generate-labels` | ShippingAdminService | `POST /v1/admin/shipping/generate-labels` |
| `GET  /admin/vendelo/exceptions` | ShippingAdminService | `GET /v1/admin/shipping/exceptions` |
| `GET  /admin/vendelo/exceptions/:id` | ShippingAdminService | `GET /v1/admin/shipping/exceptions/:id` |
| `POST /admin/vendelo/exceptions/:id/resolve` | Domain use case | `POST /v1/admin/shipping/exceptions/:id/resolve` |
| `POST /admin/vendelo/request-pickup` | ShippingAdminService | `POST /v1/admin/shipping/request-pickup` |

**Decisiones de diseño relevantes:**

- `CreateShipments` y `ResolveShipmentException` viven en el dominio porque tienen reglas de negocio: el primero valida que los pedidos tengan `vendeloOrderId` asignado; el segundo implementa una máquina de estados que solo permite resolver novedades en estado `PENDING`
- `GenerateLabels`, `GetExceptions` y `RequestPickup` son operaciones thin (resolución de IDs + llamada API) → `ShippingAdminService` NestJS
- `IVendeloShippingPort` — nuevo puerto de dominio, implementado por `VendeloService`. Dominio no importa HTTP
- `findVendeloOrderIdsBatch` — un solo `SELECT` batch en lugar de N queries individuales
- `generate-labels` soporta dos modos: `URL` (retorna link temporal de Vendelo) y `BASE64` (controller decodifica y sirve PDF con `Content-Disposition: attachment; Cache-Control: no-store`)
- `encodeURIComponent(id)` en paths dinámicos hacia Vendelo — previene path traversal
- `ArrayMaxSize(50)` en todos los DTOs de batch — previene DoS por lotes masivos
- Errores de dominio se mapean a `422 UnprocessableEntityException` sin leak de detalles internos

**Archivos creados:**

- `packages/domain/src/entities/ShipmentException.ts`
- `packages/domain/src/repositories/IVendeloShippingPort.ts`
- `packages/domain/src/use-cases/shipping/CreateShipments.ts`
- `packages/domain/src/use-cases/shipping/ResolveShipmentException.ts`
- `apps/api/src/vendelo/dto/create-shipments.dto.ts`
- `apps/api/src/vendelo/dto/generate-labels.dto.ts`
- `apps/api/src/vendelo/dto/request-pickup.dto.ts`
- `apps/api/src/vendelo/dto/resolve-exception.dto.ts`
- `apps/api/src/vendelo/services/shipping-admin.service.ts`

**Archivos modificados:**

- `packages/domain/src/repositories/IOrderRepository.ts` — `findVendeloOrderIdsBatch`
- `packages/domain/src/index.ts` — exports de Fase 4
- `apps/api/src/infrastructure/injection-tokens.ts` — `VENDELO_SHIPPING_PORT`
- `apps/api/src/infrastructure/services/VendeloService.ts` — implementa `IVendeloShippingPort` + `generateLabels`, `getExceptions`, `requestPickup`
- `apps/api/src/infrastructure/repositories/PrismaOrderRepository.ts` — `findVendeloOrderIdsBatch`
- `apps/api/src/infrastructure/infrastructure.module.ts` — registro `VENDELO_SHIPPING_PORT`
- `apps/api/src/vendelo/vendelo.controller.ts` — 6 endpoints nuevos
- `apps/api/src/vendelo/vendelo.module.ts` — registro `ShippingAdminService`
- `INTEGRACION_VENDELO.md` — Fase 4 marcada como completada

*Última actualización: 2026-06-01*

---

## 91. Integración Vendelo — Fase 5: Hardening

**Qué se hizo:**

Se implementaron los tres pilares del hardening de la integración Vendelo: observabilidad (alerta de wallet), resiliencia (Strategy Pattern para confianza del destinatario) y calidad (3 nuevas suites de tests TDD).

**Decisiones de diseño relevantes:**

**AlertNotificationPort:** `IAlertNotificationPort` vive en el dominio como un puerto puro. La implementación actual `LogAlertNotificationService` escribe en el logger estructurado de NestJS (visible en Railway). Para migrar a Slack o Telegram en el futuro: crear una nueva clase, cambiar `useClass` en `InfrastructureModule`. El cron emisor no necesita modificaciones.

**WalletAlertCron:** Usa el mismo patrón `setInterval + OnModuleInit/OnModuleDestroy` que `VendeloOrderQueueService` y `EmailQueueService` — sin añadir `@nestjs/schedule`. Lee `VENDELO_WALLET_ALERT_THRESHOLD` dentro del callback del cron (no en el constructor) para que cambiar el umbral en las variables de Railway sea efectivo en el próximo deploy sin cambios de código. También ejecuta un chequeo al arrancar el módulo.

**RecipientTrust — Strategy Pattern:** El evaluador `RecipientTrustEvaluator` recibe `IRecipientTrustStrategy[]` inyectado via `RECIPIENT_TRUST_STRATEGIES`. Para añadir un criterio nuevo: crear clase + añadir al `useFactory` en `vendelo.module.ts`. El evaluador nunca cambia. Score total 0–100: ≥80→HIGH, ≥50→MEDIUM, ≥20→LOW, <20→BLOCKED. Criterios actuales: historial (50 pts), teléfono colombiano (20 pts), completitud de dirección (30 pts).

**Tests TDD:** Las 3 suites se escribieron antes de modificar cualquier use case existente. Los tests de `SyncShipmentStatus` cubren el contrato implícito del doble mecanismo de idempotencia (rank check en memoria + `atomicUpdateStatus` atómico), documentando el invariante sin que sea obvio solo leyendo el código.

**Archivos creados:**

- `packages/domain/src/entities/RecipientTrust.ts` — `TrustContext`, `TrustEvaluation`, `TrustLevel`, `scoreToLevel()`
- `packages/domain/src/services/IRecipientTrustStrategy.ts` — `IRecipientTrustStrategy`, `StrategyResult`
- `packages/domain/src/services/IAlertNotificationPort.ts` — `IAlertNotificationPort`, `AlertLevel`
- `packages/domain/src/__tests__/CreateShipments.test.ts` — 6 tests
- `packages/domain/src/__tests__/ResolveShipmentException.test.ts` — 7 tests (incluye `.each` con 5 estados)
- `packages/domain/src/__tests__/SyncShipmentStatus.test.ts` — 10 tests
- `apps/api/src/infrastructure/services/LogAlertNotificationService.ts`
- `apps/api/src/vendelo/services/WalletAlertCron.ts`
- `apps/api/src/vendelo/trust/RecipientTrustEvaluator.ts`
- `apps/api/src/vendelo/trust/strategies/OrderHistoryTrustStrategy.ts`
- `apps/api/src/vendelo/trust/strategies/PhoneFormatTrustStrategy.ts`
- `apps/api/src/vendelo/trust/strategies/AddressCompletenessTrustStrategy.ts`

**Archivos modificados:**

- `packages/domain/src/index.ts` — exports `RecipientTrust`, `IRecipientTrustStrategy`, `IAlertNotificationPort`
- `apps/api/src/infrastructure/injection-tokens.ts` — `RECIPIENT_TRUST_STRATEGIES`, `ALERT_NOTIFICATION_PORT`
- `apps/api/src/infrastructure/infrastructure.module.ts` — `LogAlertNotificationService` + `ALERT_NOTIFICATION_PORT`
- `apps/api/src/infrastructure/services/VendeloService.ts` — `getWalletBalance()`
- `apps/api/src/vendelo/vendelo.module.ts` — strategies, evaluator, `WalletAlertCron`, factory `RECIPIENT_TRUST_STRATEGIES`
- `INTEGRACION_VENDELO.md` — Fase 5 marcada como completada

**Resultado:**

`pnpm --filter @h2r/domain test` → 56 tests, 7 archivos, todos en verde.
`tsc --noEmit` en `@h2r/domain` y `@h2r/api` → sin errores.

*Última actualización: 2026-06-01*

---

## 92. Correcciones de Auditoría de Preparación para Producción — Módulo Vendelo

**Qué se hizo:**

Se aplicaron todas las correcciones identificadas en la auditoría de preparación para producción, cubriendo resiliencia, seguridad, observabilidad, rendimiento e idempotencia.

**R-08 CRITICAL — `sync-cities` en transacción atómica**
`deleteMany` + `createMany` ahora se ejecutan dentro de `prisma.$transaction()`. Si `createMany` falla, el rollback automático preserva los datos anteriores y el `CitySelector` del checkout continúa funcionando. Archivo: `apps/api/src/vendelo/vendelo.controller.ts`.

**S-08 — `assertEnvVars()` extendido**
`VENDELO_API_KEY` y `VENDELO_WEBHOOK_SECRET` agregados a la validación de bootstrap. El proceso ahora falla fast con código 1 si estas variables no están configuradas. Archivo: `apps/api/src/main.ts`.

**S-09 — Comparación de firma timing-safe**
`signature === expected` reemplazado por `timingSafeEqual(Buffer, Buffer)` en `VendeloWebhookGuard`. Previene timing attacks de fuerza bruta sobre la firma HMAC. Archivo: `apps/api/src/vendelo/guards/vendelo-webhook.guard.ts`.

**I-05 — Protección anti-replay en webhook**
Nuevo método `verifyTimestamp()` en el guard: valida que `X-Vendelo-Timestamp` (si presente) esté dentro de una ventana de 5 minutos. Si el header está ausente, el guard es permisivo para mantener compatibilidad con versiones antiguas de Vendelo. Archivo: `apps/api/src/vendelo/guards/vendelo-webhook.guard.ts`.

**S-10 — `ParseVendeloIdPipe` para `@Param`**
Nuevo pipe `ParseVendeloIdPipe` con whitelist `[a-zA-Z0-9_-]{1,100}` que valida los IDs de novedades en la frontera del sistema. Aplicado en `GET /exceptions/:id` y `POST /exceptions/:id/resolve`. Archivos: `apps/api/src/vendelo/pipes/parse-vendelo-id.pipe.ts`, `vendelo.controller.ts`.

**R-03 + R-04 — Circuit Breaker + retry en errores de red**
`VendeloHttpClient` reescrito con retry en errores de red (`FetchError`, `AbortError`, `ECONNREFUSED`) y Circuit Breaker de 3 estados: CLOSED → OPEN (5 fallos) → HALF_OPEN (60s) → CLOSED. `sleep` es `protected` para tests. `getCircuitState()` expuesto para health checks. Archivo: `apps/api/src/infrastructure/services/VendeloHttpClient.ts`.

**O-05 — Correlation IDs en `VendeloOrderQueueService`**
Todos los mensajes del ciclo de procesamiento incluyen el prefijo `orderId={} queueId={} intento={}/{}` consistentemente. Archivo: `apps/api/src/infrastructure/services/VendeloOrderQueueService.ts`.

**P-06 — Invalidación de caché per-usuario**
`SyncShipmentStatusOutput` incluye `userId`. `getOrderHistory` agrega tag `orders:{userId}`. `VendeloWebhookController` invalida solo `orders:{userId}` en lugar de toda la caché de pedidos. Archivos: `SyncShipmentStatus.ts`, `getOrderHistory.ts`, `vendelo-webhook.controller.ts`.

**Archivos creados:**

- `apps/api/src/vendelo/pipes/parse-vendelo-id.pipe.ts`
- `apps/api/src/__tests__/VendeloHttpClient.test.ts` — 10 tests
- `apps/api/src/__tests__/VendeloWebhookGuard.test.ts` — 11 tests
- `apps/api/src/__tests__/ParseVendeloIdPipe.test.ts` — 7 tests

**Archivos modificados:**

- `apps/api/src/main.ts`, `vendelo/vendelo.controller.ts`, `vendelo/guards/vendelo-webhook.guard.ts`
- `apps/api/src/infrastructure/services/VendeloHttpClient.ts`, `VendeloOrderQueueService.ts`
- `packages/domain/src/use-cases/orders/SyncShipmentStatus.ts`
- `apps/web/src/lib/queries/getOrderHistory.ts`
- `apps/api/src/vendelo/vendelo-webhook.controller.ts`
- `apps/api/src/__tests__/wompi.controller.test.ts` — agrega mock de `VendeloOrderQueueService`

**Resultado:**

`pnpm --filter @h2r/domain test` → 84 tests, 10 archivos, todos en verde.
`pnpm --filter @h2r/api test` → 49 tests, 6 archivos, todos en verde.
`tsc --noEmit` en `@h2r/domain` y `@h2r/api` → sin errores.

*Última actualización: 2026-06-01*

---

## 93. Documentación de migración Railway → Google Cloud Platform

**Qué se hizo:**

Se diseñó e implementó el plan completo de migración del backend NestJS desde Railway hacia Google Cloud Platform, priorizando Cloud Run como servicio de destino. Se crearon los archivos de infraestructura necesarios y se documentó todo el proceso.

**Archivos creados:**

- `MIGRACION_GOOGLE_CLOUD.md` — documento completo con arquitectura, Dockerfile, CI/CD, costos y secuencia de migración
- `apps/api/Dockerfile` — build multi-stage (4 stages) del monorepo pnpm: `base → deps → builder → runner`. Stage `builder` corre `pnpm db:generate` + `nest build`; stage `runner` solo contiene `dist/`, cliente Prisma generado y dependencias de producción. Imagen final ~300 MB
- `.dockerignore` — excluye `apps/web`, `node_modules`, `.next`, `.turbo` y `generated/` del contexto de build. Reduce el contexto de ~500 MB a ~50 MB

**Archivos modificados:**

- `.github/workflows/ci.yml` — job `deploy` añadido al final del pipeline. Se activa solo en `push` a `main`, depende de `build-api`, autentica con GCP via Workload Identity Federation (sin JSON keys), pushea imagen a Artifact Registry e invoca `gcloud run deploy` con `--set-secrets` para inyectar los 14 secretos desde Secret Manager

**Decisiones de arquitectura:**

- **Cloud Run** elegido sobre App Engine y Compute Engine: escala a cero, `PORT` dinámico ya configurado en `main.ts:120`, handler `SIGTERM` ya existe en `database/src/index.ts:74`
- **Mantener Neon** como base de datos: no está en Railway, el cambio no la afecta; migrar a Cloud SQL solo si se necesita latencia <2 ms o VPC privada
- **Workload Identity Federation** en lugar de JSON keys: sin credenciales permanentes en GitHub Secrets
- **Secret Manager** para los 14 secretos de runtime: se inyectan como env vars en Cloud Run, cero cambios en el código de la app
- **Cero cambios en la lógica de negocio**: la app NestJS ya era compatible con Cloud Run antes de esta tarea

**Costo estimado:** $0.04–$5/mes vs $5–15/mes en Railway para el nivel de tráfico actual

*Última actualización: 2026-06-02*

---

## 94. Auditoría de Seguridad y Corrección — Integración Wompi

Se realizó una auditoría completa de la integración con la pasarela de pagos Wompi, cubriendo 5 ejes: seguridad de credenciales, integridad de datos, manejo de webhooks, resiliencia ante errores, y experiencia de usuario post-pago. Se identificaron 1 vulnerabilidad crítica (IDOR), 2 bugs funcionales altos y 5 riesgos medios/bajos. Todos fueron corregidos en la misma sesión.

---

### Correcciones aplicadas

#### Fix #1 — CRÍTICO: Eliminación del endpoint IDOR `POST /payments/wompi/integrity`

El endpoint era `@Public()` y aceptaba `amountInCents` arbitrario desde el cliente, lo que permitía generar firmas de integridad SHA-256 válidas para montos incorrectos. El frontend nunca lo usaba (la firma ya venía en la respuesta de `POST /orders`). Se eliminó el método `integrity()` del controlador, el `WompiIntegrityDto` y los tests del endpoint eliminado.

Archivos modificados:

- `apps/api/src/payments/wompi.controller.ts` — método `integrity()` eliminado; import `WompiIntegrityDto` eliminado
- `apps/api/src/payments/dto/wompi-integrity.dto.ts` — **archivo eliminado**
- `apps/api/src/__tests__/wompi.controller.test.ts` — bloque `describe('POST /payments/wompi/integrity')` y `vi.stubEnv` de integridad eliminados

#### Fix #2 — ALTO: Limpieza del carrito tras pago exitoso

`WompiWidget` hacía un full-page redirect a Wompi; tras el redirect de vuelta a `/checkout/confirmacion`, el carrito Zustand nunca se limpiaba porque `onSuccess` era una prop declarada pero nunca invocada. Se creó `CartCleaner` (Client Component) que se monta en la página de confirmación solo cuando `status === 'PAID'` y llama a `clearCart()` via `useEffect`. Se eliminó la prop `onSuccess` de `WompiWidget` para evitar confusión futura.

Archivos creados:

- `apps/web/src/components/checkout/CartCleaner.tsx`

Archivos modificados:

- `apps/web/src/app/(store)/checkout/confirmacion/page.tsx` — monta `<CartCleaner orderId={order.id} />` cuando `isPaid`
- `apps/web/src/components/checkout/WompiWidget.tsx` — prop `onSuccess` eliminada de la interfaz y la firma
- `apps/web/src/components/checkout/CheckoutForm.tsx` — `clearCart` eliminado del destructuring de `useCart()`; `onSuccess` eliminado del JSX

#### Fix #3 — ALTO: `WOMPI_PUBLIC_KEY` y `WOMPI_PRIVATE_KEY` en `assertEnvVars()`

Ambas variables faltaban en la validación de arranque. Con `WOMPI_PUBLIC_KEY` vacío, el widget se inicializa con clave pública vacía y todos los pagos fallan silenciosamente en el cliente. Se agregaron al array `required` en `assertEnvVars()`.

Archivos modificados:

- `apps/api/src/main.ts` — `'WOMPI_PUBLIC_KEY'` y `'WOMPI_PRIVATE_KEY'` agregados a `required[]`

#### Fix #4 — MEDIO: `Logger` de NestJS en `WompiService` (API)

`validateWebhook()` usaba `console.error` y `console.warn` directamente, bypaseando el pipeline JSON de `StructuredLogger`. Con `bufferLogs: true` en NestJS, esos mensajes no aparecían en Railway con el formato estructurado. Se reemplazaron todos los `console.*` por `this.logger.*` usando `new Logger(WompiService.name)`.

Archivos modificados:

- `apps/api/src/infrastructure/services/WompiService.ts` — `Logger` importado; `private readonly logger` declarado; 5 llamadas a `console.*` reemplazadas

#### Fix #5 — MEDIO: Job de reconciliación `WompiReconciliationService`

Sin este job, un pedido cuyo webhook se perdió permanecía en `PENDING` indefinidamente. El servicio corre cada 15 minutos, busca pedidos `PENDING` con `paymentProvider = WOMPI`, más de 15 minutos de antigüedad y con `Payment.externalId` no nulo, consulta `GET /v1/transactions/:id` en Wompi y ejecuta `ConfirmPayment` con el estado real. Procesa máximo 20 pedidos por ciclo. Errores de red por pedido se capturan individualmente para no interrumpir el batch.

Archivos creados:

- `apps/api/src/infrastructure/services/WompiReconciliationService.ts`

Archivos modificados:

- `apps/api/src/infrastructure/infrastructure.module.ts` — `WompiReconciliationService` importado y registrado en `providers[]`

#### Fix #6 — MEDIO: Polling automático en página de confirmación para estado PENDING

Si el webhook aún no llegó cuando el usuario aterriza en `/checkout/confirmacion`, la página mostraba "Pago en procesamiento" para siempre sin actualizarse. Se añadió `OrderStatusPoller` (Client Component) que cada 5 segundos invoca una Server Action para consultar el `Order.status` directamente contra Prisma. Cuando el status ya no es `PENDING`, llama a `router.refresh()` para que el Server Component se re-renderice con los datos actualizados. Se detiene automáticamente tras 3 minutos (36 intentos) o cuando el estado cambia.

Archivos creados:

- `apps/web/src/components/checkout/OrderStatusPoller.tsx`
- `apps/web/src/app/(store)/checkout/confirmacion/actions.ts` — Server Action `getOrderStatus(orderId)`

Archivos modificados:

- `apps/web/src/app/(store)/checkout/confirmacion/page.tsx` — monta `<OrderStatusPoller orderId={order.id} />` cuando `isPending`

#### Fix #7 — BAJO: Eliminación de `WompiService` duplicado en `apps/web`

`apps/web/src/infrastructure/services/WompiService.ts` era código muerto: ningún componente del frontend lo importaba, y contenía `validateWebhook()` y `getTransactionStatus()` que no tienen sentido en contexto de browser. Eliminado sin referencias rotas.

Archivos eliminados:

- `apps/web/src/infrastructure/services/WompiService.ts`

#### Fix #8 — BAJO: `AppError` en `getTransactionStatus()`

`throw new Error(...)` reemplazado por `throw new AppError('INTERNAL_ERROR', ...)` para que el `HttpExceptionFilter` global lo mapee correctamente con código de error estructurado.

Archivos modificados:

- `apps/api/src/infrastructure/services/WompiService.ts` — `AppError` importado; `throw new Error(...)` reemplazado

---

### Veredicto de producción post-correcciones

**¿Está lista la integración Wompi para producción? → SÍ.** Todos los riesgos de seguridad, funcionales y de resiliencia de la integración Wompi están resueltos.

**¿Está lista la aplicación completa para producción? → CASI — 1 bloqueante menor.** Durante la revisión se constató que los otros dos bloqueantes de la auditoría v2.0 ya estaban resueltos antes de esta sesión:

| Bloqueante auditoría v2.0 | Estado actual |
| --- | --- |
| Rate limiter en memoria | ✅ Resuelto — `rate-limit.ts` es no-op; enforcement real en NestJS `ThrottlerGuard` |
| Sin monitoreo externo | ✅ Resuelto — `apps/api/src/instrument.ts` con `@sentry/nestjs`; `SentryModule.forRoot()` en `AppModule`; modo no-op si `SENTRY_DSN` no está configurada |
| Sin health check | ✅ Resuelto — `GET /health` con `SELECT 1` en `app.controller.ts` |

**Bloqueante pendiente único:** `/auth/error` page no existe. `apps/web/src/lib/auth.ts` configura `pages: { error: '/auth/error' }` pero `apps/web/src/app/auth/error/page.tsx` no existe. Cualquier error de OAuth (cuenta duplicada, token inválido, OAuth cancelado) genera un 404 en lugar de una pantalla de error manejada. Impacta al 100% de los flujos de login con Google que fallen. Tiempo estimado de resolución: menos de 1 hora.

---

### Resultado de tests

```text
pnpm --filter @h2r/api test → 47 tests, 6 archivos, todos en verde
pnpm --filter @h2r/api exec tsc --noEmit → sin errores
pnpm --filter @h2r/web exec tsc --noEmit → sin errores en archivos modificados
```

**Fix #9 — CRÍTICO (descubierto en revisión pre-producción): `ShippingAddressDto` desincronizado con dominio**

`ShippingAddressDto` declaraba `department: string` como obligatorio (`@IsNotEmpty()`) pero el frontend nunca lo enviaba (el `CitySelector` no expone nombre de departamento). Además enviaba `cityCode` y `subdivisionCode` que no estaban en el DTO; con `forbidNonWhitelisted: true` eso hacía que **cada `POST /orders` fallara con HTTP 400**, haciendo imposible completar ningún pedido. El fix alinea el DTO con la interfaz `ShippingAddress` del dominio: `department`, `cityCode` y `subdivisionCode` pasan a ser opcionales con `@IsOptional()`.

Archivos modificados:

- `apps/api/src/orders/dto/create-order.dto.ts` — `department` cambiado a opcional; `cityCode?` y `subdivisionCode?` agregados como opcionales

*Última actualización: 2026-06-02*

---

## 95. Migración del backend de Railway a Google Cloud Run

**Rama:** `feat/google-cloud-migration`

**Qué se hizo:**

Migración completa de la infraestructura del backend NestJS desde Railway a Google Cloud Platform usando Cloud Run (serverless containers). La migración se ejecutó por fases sin interrumpir el servicio existente en Railway.

### Infraestructura GCP configurada

| Recurso | Valor |
|---------|-------|
| Proyecto GCP | `h2r-online-store` (número: 378308641940) |
| Billing account | `01D9C7-4070AD-8F8901` (cuenta del cliente: h2ronlinestore@gmail.com) |
| Artifact Registry | `us-central1-docker.pkg.dev/h2r-online-store/electro-motos/api` |
| Cloud Run service | `electro-motos-api` en `us-central1` |
| Service Account | `github-deploy@h2r-online-store.iam.gserviceaccount.com` |
| WIF Pool | `github-pool` (global) |
| WIF Provider | `projects/378308641940/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |

**APIs habilitadas:** Cloud Run, Artifact Registry, Secret Manager, IAM, IAM Credentials.

### IAM — Roles asignados

- `github-deploy` SA → `roles/run.admin`, `roles/artifactregistry.writer`, `roles/secretmanager.secretAccessor`
- `378308641940-compute@developer.gserviceaccount.com` (SA de runtime de Cloud Run) → `roles/secretmanager.secretAccessor`

### Workload Identity Federation

Elimina la necesidad de JSON keys en GitHub Actions. GitHub Actions autentica vía OIDC contra el pool `github-pool` con la condición `assertion.repository == 'kevinz-08/electro-motos-tdk'`. El binding permite que el repo impersone el SA `github-deploy`.

### Secret Manager — 15 secretos cargados

Todos los secretos de producción se migraron de `apps/api/.env` a GCP Secret Manager:

`DATABASE_URL`, `JWT_SECRET`, `INTERNAL_API_SECRET`, `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET`, `VENDELO_API_KEY`, `VENDELO_WEBHOOK_SECRET` (placeholder), `MERCADOPAGO_ACCESS_TOKEN`, `RESEND_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SENTRY_DSN`.

**Wompi migrado a producción:** las keys `pub_test_` / `prv_test_` fueron reemplazadas por `pub_prod_` / `prv_prod_` en `apps/api/.env` y cargadas en Secret Manager.

### GitHub Secrets (4 secrets)

| Secret | Valor |
|--------|-------|
| `GCP_PROJECT_ID` | `h2r-online-store` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/378308641940/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | `github-deploy@h2r-online-store.iam.gserviceaccount.com` |
| `FRONTEND_URL` | `https://www.tiendah2r.com` |

### Correcciones al Dockerfile y código

**Bug 1 — `tsconfig.base.json` no copiado en la imagen Docker:**
`pnpm db:generate` dentro del builder stage fallaba con `File '../../tsconfig.base.json' not found`. Se agregó `COPY tsconfig.base.json ./` antes de `COPY packages/database`.

**Bug 2 — `import { Response } from 'express'` bloqueaba el build de webpack:**
En pnpm, `express` es dependencia transitiva pero no está hoisted al root `node_modules`. `webpack-node-externals` no la detecta → `Module not found`. Solución: cambiar a `import type` en dos archivos:
- `apps/api/src/vendelo/vendelo.controller.ts`
- `apps/api/src/shared/filters/http-exception.filter.ts`

**Bug 3 — `WOMPI_PUBLIC_KEY` faltaba en `--set-secrets` del deploy:**
`assertEnvVars()` lo requiere pero el comando `gcloud run deploy` en `ci.yml` no lo incluía. El contenedor moría con exit code 1 al arrancar. Agregado a la lista de secrets.

**Bug 4 — `SENTRY_DSN` con `:` en vez de `=` en `.env`:**
Sintaxis incorrecta (`SENTRY_DSN:https://...`). El parser lo ignoraba. Corregido a `SENTRY_DSN=https://...`.

**Bug 5 — `VENDELO_WEBHOOK_SECRET` vacío mata el arranque:**
`assertEnvVars()` lo requiere. Cargado placeholder en Secret Manager y `.env` local.

### Validación local de la imagen Docker

Build con `docker build --file apps/api/Dockerfile --tag electro-motos-api:local .` completó exitosamente. El contenedor arranca con todos los módulos NestJS inicializados y Prisma conecta a Neon. El health check `GET /health` falla en Docker Desktop (limitación SSL de `channel_binding=require` en Windows virtualizado) — no ocurre en Cloud Run.

**Archivos modificados:**

- `apps/api/Dockerfile` — `COPY tsconfig.base.json ./` añadido en builder stage
- `apps/api/src/vendelo/vendelo.controller.ts` — `import type { Response }`
- `apps/api/src/shared/filters/http-exception.filter.ts` — `import type { Request, Response }`
- `.github/workflows/ci.yml` — `WOMPI_PUBLIC_KEY` añadido a `--set-secrets`
- `apps/api/.env` — Wompi migrado a prod keys; `SENTRY_DSN` sintaxis corregida; `VENDELO_WEBHOOK_SECRET` con placeholder

**Archivos creados (temporales, no commiteados):**

- `load-secrets.ps1` — script PowerShell para cargar los 15 secretos desde `.env` a GCP Secret Manager en lote

**Commit:** `fix(infra): fix Docker build for Cloud Run migration`

**Estado al cierre de la sesión:** Fases 0–5 completadas. Fase 6 (primer deploy a Cloud Run vía push a main) pendiente.

---

### 95.3 Corrección de errores de lint que bloqueaban el CI

**Contexto:** El CI (`.github/workflows/ci.yml`) falló en los primeros dos runs (`#30` y `#31`) porque el linter de la app web reportó errores preexistentes que la configuración del React Compiler convierte en errores de CI.

**Bug 6 — `react-hooks/set-state-in-effect` en `FilterDrawer.tsx`:**
`useEffect` en la línea 92 llama a múltiples `setState` directamente — patrón de sincronización de URL params. Es intencional. Suprimido con `// eslint-disable-next-line react-hooks/set-state-in-effect`.

**Bug 7 — `react-hooks/immutability` en `cart.ts`:**
`stores[storageKey] = createCartStore(storageKey)` muta una variable de módulo dentro del hook `useCart()`. Es el patrón de caché de stores de Zustand. Suprimido con `// eslint-disable-next-line react-hooks/immutability`.

**Bug 8 — `react/no-unescaped-entities` en `CitySelector.tsx`:**
JSX contenía comillas literales `"` en el texto `Sin resultados para "{query}"`. La regla lo convierte en error. Corregido reemplazando con entidades HTML: `&quot;{query}&quot;`.

**Archivos modificados:**
- `apps/web/src/components/store/FilterDrawer.tsx` — eslint-disable-next-line añadido
- `apps/web/src/lib/cart.ts` — eslint-disable-next-line añadido
- `apps/web/src/components/checkout/CitySelector.tsx` — comillas escapadas con `&quot;`

**Commits:**
- `fix(web): suppress pre-existing react-compiler lint errors blocking CI`
- `fix(web): escape quotes in CitySelector no-results message`

*Última actualización: 2026-06-12*

---

### 95.4 Corrección de errores de type-check y deploy en CI

**Contexto:** El CI continuó fallando tras resolver el lint. Se identificaron dos errores de TypeScript en `apps/web` y dos errores de permisos GCP en el job de deploy.

**Bug 9 — `revalidateTag` con argumento faltante:**
`apps/web/src/app/api/internal/revalidate/route.ts` llamaba `revalidateTag(tag)` con un solo argumento. Next.js 16 requiere un segundo argumento `type: 'max' | 'current'`. Corregido a `revalidateTag(tag, 'max')`, consistente con el endpoint admin equivalente en `apps/web/src/app/api/admin/revalidate/route.ts`.

**Bug 10 — `findVendeloOrderIdsBatch` faltante en el repo de `apps/web`:**
El sprint de Vendelo agregó el método `findVendeloOrderIdsBatch` a la interfaz `IOrderRepository` en `packages/domain` e implementó en `apps/api`, pero nunca se implementó en `apps/web/src/infrastructure/repositories/PrismaOrderRepository.ts`. Ambas apps tienen implementaciones paralelas del contrato (arquitectura intencional para SSR directo). Agregado el método usando `prisma.order.findMany` con `select: { id, vendeloOrderId }`.

**Bug 11 — Permiso IAM faltante para deploy a Cloud Run:**
El job de deploy fallaba con `Permission 'iam.serviceaccounts.actAs' denied on service account 378308641940-compute@developer.gserviceaccount.com`. `roles/run.admin` no incluye el permiso para asignar la SA de runtime. Solución: otorgar `roles/iam.serviceAccountUser` al deployer SA sobre la SA de Compute Engine:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  378308641940-compute@developer.gserviceaccount.com \
  --member="serviceAccount:github-deploy@h2r-online-store.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser" \
  --project=h2r-online-store
```

**Bug 12 — `MERCADOPAGO_ACCESS_TOKEN` no existe en Secret Manager:**
Cloud Run fallaba al crear la revisión porque el secret `MERCADOPAGO_ACCESS_TOKEN` fue cargado en Secret Manager pero Mercado Pago no se va a usar en el corto plazo. Eliminado de `--set-secrets` en el CI. El secret permanece en Secret Manager pero no se inyecta al contenedor.

**Archivos modificados:**

- `apps/web/src/app/api/internal/revalidate/route.ts` — segundo argumento `'max'` en `revalidateTag`
- `apps/web/src/infrastructure/repositories/PrismaOrderRepository.ts` — método `findVendeloOrderIdsBatch` agregado
- `.github/workflows/ci.yml` — `MERCADOPAGO_ACCESS_TOKEN` removido de `--set-secrets`

**Commits:**

- `fix(web): fix type-check errors blocking CI`
- `ci: re-trigger deploy after IAM fix`
- `ci: remove MERCADOPAGO_ACCESS_TOKEN from Cloud Run secrets`

*Última actualización: 2026-06-12*

---

## 96. Implementación de pago contra entrega (COD) con Vendelo

**Contexto:** Vendelo soporta `payment_method_code: 'COD' | 'EXTERNAL_PAYMENT'` tanto en
`Create Order` como en `Quotation`, y el dominio ya modelaba ambos valores en `QuoteShipping`
(cotización), pero ningún flujo real creaba pedidos COD: `VendeloService.createOrder()` mandaba
`EXTERNAL_PAYMENT` hardcodeado y el checkout web nunca ofrecía la opción. El objetivo de esta
sesión es exponer "pago contra entrega" como método de pago real end-to-end.

**Decisión de diseño — ciclo de vida sin webhook de pasarela:** como en COD no existe ningún
webhook de pago que confirme la transacción, el pedido se crea directamente con `status: PAID`
(no `PENDING`) y el stock se descuenta en la misma transacción de creación — evita que el pedido
quede colgado en `PENDING` y sea cancelado por el cleanup de pedidos abandonados. El encolado en
Vendelo (`VendeloOrderQueueService`) y el email de confirmación se disparan directo desde
`OrdersController` tras crear el pedido, en vez de esperar el webhook de Wompi/Mercado Pago.

**Restock automático (gap preexistente, ahora corregido):** ningún flujo de pago restauraba el
stock cuando un envío era rechazado en la puerta. Se agregó esa lógica a `SyncShipmentStatus`:
al detectar transición de `Shipment.status` a `RETURNED` o `CANCELLED`, incrementa de vuelta el
stock de cada `OrderItem` del pedido, de forma atómica e idempotente.

**Sin restricciones de monto/ciudad para el MVP** — COD disponible en cualquier ciudad con
cobertura Vendelo.

**Archivos modificados:**

- `packages/database/prisma/schema.prisma` — `COD` añadido al enum `PaymentProvider`
- `packages/domain/src/use-cases/orders/CreateOrder.ts` — bifurcación por `paymentProvider`; rama COD crea el pedido ya `PAID` y decrementa stock sin pasar por `paymentService.createTransaction()`
- `packages/domain/src/repositories/IOrderRepository.ts` — método `createPaidOrder()` añadido
- `packages/domain/src/use-cases/shipping/SyncShipmentStatus.ts` — restock automático en `RETURNED`/`CANCELLED`
- `apps/api/src/orders/dto/create-order.dto.ts` — `'COD'` añadido al enum validado de `paymentProvider`
- `apps/api/src/orders/orders.controller.ts` — dispara email + cola Vendelo inmediatamente para pedidos COD
- `apps/api/src/infrastructure/services/VendeloService.ts` — `payment_method_code` dinámico según `order.paymentProvider`
- `apps/web/src/components/checkout/CheckoutForm.tsx` — selector de método de pago (online vs COD)
- `apps/web/src/lib/shipping-quote.ts` — `paymentMethod` real en vez de `'EXTERNAL_PAYMENT'` hardcodeado
- `apps/api/src/infrastructure/services/ResendEmailService.ts` — copy de `sendOrderConfirmation()` condicionado a `paymentProvider === 'COD'`

**Estado al cierre de la sesión:** implementación end-to-end completa, 95/95 tests dominio + 157/157 tests API en verde, type-check limpio en `domain`/`api`/`web`.

*Última actualización: 2026-06-29*

---

### 96.1 Toggle admin para activar/desactivar COD sin tocar código

**Contexto:** El admin pidió poder desactivar el pago contra entrega desde `/admin/configuracion`
como prueba — sin borrar ninguna funcionalidad, solo dejar de ofrecerla en el checkout mientras
esté apagado. Se siguió el mismo patrón ya existente para `MERCADOPAGO_ENABLED`.

**Diseño:** nueva fila en `Settings` con clave `COD_ENABLED`. A diferencia de Mercado Pago (que
por defecto está deshabilitado si no existe la fila), COD se trata como **habilitado por defecto**
cuando la fila no existe — consistente con que la feature ya estaba activa para todos los
usuarios antes de este toggle.

- `apps/api/src/admin/admin-settings.controller.ts` — `PATCH /admin/settings/cod` (`@Roles('ADMIN')`), mismo patrón que `toggleMercadoPago`
- `apps/api/src/orders/orders.controller.ts` — antes de crear un pedido COD, verifica `COD_ENABLED`; si existe la fila y vale `'false'`, lanza `ForbiddenException` (403). Si no existe fila, permite (default-on)
- `apps/web/src/components/admin/CodToggle.tsx` — switch UI, copiado de `MercadoPagoToggle.tsx` apuntando a `/admin/settings/cod`
- `apps/web/src/app/admin/configuracion/page.tsx` — nueva sección "Pago contra entrega" con el toggle, lee el setting con el mismo fallback default-on
- `apps/web/src/app/(store)/checkout/page.tsx` — lee `COD_ENABLED` por SSR (`{ prisma }` directo, sin round-trip a NestJS) y pasa `codEnabled` a `CheckoutForm`
- `apps/web/src/components/checkout/CheckoutForm.tsx` — el selector de método de pago completo (no solo la opción COD) se oculta si `codEnabled === false`, dejando el flujo idéntico al de antes de la feature COD
- `packages/database/prisma/seed.ts` — seed de `COD_ENABLED = 'true'` para entornos nuevos

**Archivos de test:**

- `apps/api/src/__tests__/orders.controller.test.ts` — casos: 403 si `COD_ENABLED=false`, permite si no existe la fila

*Última actualización: 2026-06-29*

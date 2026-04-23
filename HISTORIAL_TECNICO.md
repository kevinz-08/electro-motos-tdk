# Historial Técnico — H2r Online Store

Registro cronológico de todos los cambios de código realizados durante el desarrollo del proyecto.

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

*Última actualización: 2026-04-23*

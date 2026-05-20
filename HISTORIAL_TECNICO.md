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

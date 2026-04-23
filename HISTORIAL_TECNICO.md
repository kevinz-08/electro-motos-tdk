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

*Última actualización: 2026-04-22*

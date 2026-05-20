# ⚡ H2R Online Store — E-commerce de Repuestos para Motos

[![CI](https://github.com/kevinz-08/electro-motos-tdk/actions/workflows/ci.yml/badge.svg)](https://github.com/kevinz-08/electro-motos-tdk/actions/workflows/ci.yml)

E-commerce completo para una tienda de motos colombiana. Permite a los clientes comprar
repuestos en línea con pago a través de **Wompi** (principal) o **Mercado Pago** (respaldo),
mientras que los administradores gestionan productos, pedidos y stock desde un panel dedicado.

---

## Tabla de contenidos

1. [Stack tecnológico](#1-stack-tecnológico)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Estructura del monorepo](#3-estructura-del-monorepo)
4. [Flujo de datos general](#4-flujo-de-datos-general)
5. [Esquema de base de datos](#5-esquema-de-base-de-datos)
6. [Flujo de autenticación](#6-flujo-de-autenticación)
7. [Flujo de pago con Wompi](#7-flujo-de-pago-con-wompi)
8. [Flujo de pago con Mercado Pago](#8-flujo-de-pago-con-mercado-pago)
9. [API NestJS — Referencia completa](#9-api-nestjs--referencia-completa)
10. [Variables de entorno](#10-variables-de-entorno)
11. [Instalación y ejecución local](#11-instalación-y-ejecución-local)
12. [Credenciales de prueba](#12-credenciales-de-prueba)
13. [Panel de administración](#13-panel-de-administración)
14. [Roles de usuario](#14-roles-de-usuario)
15. [Manejo de precios (centavos COP)](#15-manejo-de-precios-centavos-cop)
16. [Integración Wompi — Detalles técnicos](#16-integración-wompi--detalles-técnicos)
17. [Integración Mercado Pago — Detalles técnicos](#17-integración-mercado-pago--detalles-técnicos)
18. [Preguntas frecuentes](#18-preguntas-frecuentes)

---

## 1. Stack tecnológico

| Capa | Tecnología | Versión | Para qué se usa |
|---|---|---|---|
| Monorepo | **pnpm workspaces** + Turborepo | — | Gestión de paquetes y build pipeline |
| Frontend | **Next.js** | 16 (App Router) | SSR, páginas, componentes, sesión |
| Backend | **NestJS** | 10 | REST API, autenticación JWT, webhooks |
| Lenguaje | **TypeScript** | strict | Todo el código |
| Estilos | **Tailwind CSS** | 4 | Diseño UI |
| ORM | **Prisma** | 7 | Acceso a base de datos |
| Base de datos | **PostgreSQL** (Neon) | — | Almacenamiento principal |
| Autenticación | **NextAuth.js** v5 + JWT NestJS | — | Sesiones browser + tokens API |
| Pago (principal) | **Wompi** | Widget | Tarjetas, Nequi, PSE, Bancolombia |
| Pago (respaldo) | **Mercado Pago** | SDK v2 | Preference + redirect |
| Email | **Resend** | — | Emails transaccionales |
| Imágenes | **Cloudinary** | — | Subida y almacenamiento de fotos |
| Estado del carrito | **Zustand** | — | Carrito persistido en localStorage |
| Validación API | **class-validator** | — | DTOs en NestJS |
| Hash contraseñas | **bcryptjs** | cost 12 | Usuarios con contraseña |

---

## 2. Arquitectura del sistema

El proyecto es un **monorepo** con dos aplicaciones (`apps/web` y `apps/api`) que comparten
paquetes internos (`packages/domain`, `packages/database`, `packages/types`).

### Visión general

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTE (browser)                          │
│  React Client Components · Zustand (carrito) · NextAuth session     │
└───────────────────────┬─────────────────────────────────────────────┘
                        │ HTTP
          ┌─────────────▼──────────────────────────┐
          │           apps/web  (Next.js :3000)     │
          │                                         │
          │  Server Components → SSR catálogo/home  │
          │  proxy.ts          → protección rutas   │
          │  /api/auth/[...]   → NextAuth handler   │
          └────────────────────┬────────────────────┘
                               │ fetch con Bearer JWT
          ┌────────────────────▼────────────────────┐
          │           apps/api  (NestJS :3001)       │
          │                                         │
          │  AuthModule       → /auth/*              │
          │  ProductsModule   → /products            │
          │  OrdersModule     → /orders              │
          │  AdminModule      → /admin/*             │
          │  PaymentsModule   → /payments/*          │
          └────────────────────┬────────────────────┘
                               │
          ┌────────────────────▼────────────────────┐
          │        packages/domain (compartido)      │
          │  Entidades · Interfaces · Use Cases      │
          └────────────────────┬────────────────────┘
                               │
          ┌────────────────────▼────────────────────┐
          │       packages/database (compartido)     │
          │  Prisma 7 · PrismaPg · Singleton         │
          └────────────────────┬────────────────────┘
                               │
          ┌────────────────────▼────────────────────┐
          │         PostgreSQL — Neon                │
          └─────────────────────────────────────────┘
```

### Clean Architecture en el dominio

```
┌─────────────────────────────────────────────────────────────────┐
│                           DOMAIN  (packages/domain)             │
│                                                                 │
│  Entidades: Product · Order · User · Category                   │
│  Interfaces: IProductRepository · IOrderRepository · IPayment   │
│  Use Cases: CreateOrder · ConfirmPayment · ListProducts          │
│  Shared: Result<T,E> · AppError                                 │
└───────────────────────────▲─────────────────────────────────────┘
                            │ implementa
┌───────────────────────────┴─────────────────────────────────────┐
│              INFRASTRUCTURE  (apps/api + apps/web)              │
│                                                                 │
│  PrismaProductRepository · PrismaOrderRepository                │
│  WompiService · MercadoPagoService                              │
│  ResendEmailService · CloudinaryService                         │
└───────────────────────────▲─────────────────────────────────────┘
                            │ usa
┌───────────────────────────┴─────────────────────────────────────┐
│                    PRESENTATION  (apps/web + apps/api)          │
│                                                                 │
│  NestJS Controllers · Next.js Server Components · Pages         │
└─────────────────────────────────────────────────────────────────┘
```

**Regla de dependencias:** las capas internas no conocen las externas.
El dominio no importa nada de Prisma, NestJS ni Next.js.

---

## 3. Estructura del monorepo

```
electro-motos-tdk/
│
├── apps/
│   ├── web/                        ← Next.js 16 (frontend + SSR)
│   │   ├── src/
│   │   │   ├── proxy.ts            ← Protección de rutas /admin y /checkout
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts         ← Config NextAuth (Credentials + Google OAuth)
│   │   │   │   ├── api-client.ts   ← Factory apiClient(token) para llamadas al API
│   │   │   │   └── cart.ts         ← Store Zustand del carrito (localStorage)
│   │   │   ├── infrastructure/
│   │   │   │   ├── database/
│   │   │   │   │   └── prisma-client.ts  ← Re-exporta singleton de @h2r/database
│   │   │   │   ├── repositories/   ← Repos Prisma (usados en Server Components)
│   │   │   │   └── services/       ← Servicios (Wompi, MP, Cloudinary, Resend)
│   │   │   ├── app/
│   │   │   │   ├── (store)/        ← Tienda pública (home, catálogo, producto, carrito)
│   │   │   │   ├── admin/          ← Panel admin (solo ADMIN)
│   │   │   │   ├── auth/           ← Login, registro
│   │   │   │   └── api/auth/       ← Solo NextAuth handler (demás rutas están en NestJS)
│   │   │   └── components/         ← Componentes React
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                        ← NestJS 10 (REST API backend)
│       ├── src/
│       │   ├── main.ts             ← Bootstrap: dotenv, Helmet, CORS, Swagger, validación
│       │   ├── app.module.ts       ← Módulo raíz + guards globales
│       │   ├── auth/               ← AuthModule: registro, login, JWT, Google session-token
│       │   ├── products/           ← ProductsModule: GET /products (público)
│       │   ├── orders/             ← OrdersModule: POST /orders, PATCH status
│       │   ├── admin/              ← AdminModule: CRUD productos, stock, settings
│       │   ├── payments/           ← PaymentsModule: webhooks Wompi y Mercado Pago
│       │   ├── infrastructure/     ← Repos Prisma + servicios inyectables NestJS
│       │   └── shared/             ← Filtros, guards, decoradores
│       ├── webpack.config.js       ← Bundlea @h2r/* directamente (evita error TS en runtime)
│       ├── nest-cli.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       └── package.json
│
├── packages/
│   ├── domain/                     ← Dominio puro — cero dependencias externas
│   │   └── src/
│   │       ├── entities/           ← Product, Order, User, Category
│   │       ├── repositories/       ← IProductRepository, IOrderRepository, IUserRepository
│   │       ├── services/           ← IPaymentService
│   │       ├── use-cases/          ← CreateOrder, ConfirmPayment, ListProducts, UpdateStock
│   │       └── shared/             ← Result<T,E>, AppError
│   │
│   ├── database/                   ← Prisma centralizado
│   │   ├── prisma/
│   │   │   ├── schema.prisma       ← Modelos y relaciones
│   │   │   ├── seed.ts             ← Datos iniciales (admin, productos, pedidos)
│   │   │   ├── catalog.ts          ← 85 productos con jerarquía de categorías
│   │   │   └── migrations/         ← Historial de migraciones
│   │   ├── src/
│   │   │   ├── index.ts            ← Singleton PrismaClient + PrismaPg adapter
│   │   │   └── generated/          ← Auto-generado por prisma generate (no editar)
│   │   └── prisma.config.ts        ← Carga DATABASE_URL desde múltiples ubicaciones
│   │
│   └── types/                      ← DTOs y tipos compartidos entre apps
│
├── HISTORIAL_TECNICO.md            ← Registro cronológico de todos los cambios
├── turbo.json                      ← Pipeline de Turborepo
├── pnpm-workspace.yaml
├── tsconfig.base.json              ← CompilerOptions base heredadas por todos los paquetes
└── package.json                    ← Scripts raíz con turbo y pnpm --filter
```

---

## 4. Flujo de datos general

### Tienda — cliente viendo el catálogo (SSR)

```
Navegador
    │  GET /catalogo
    ▼
apps/web — Server Component
    │  PrismaProductRepository.findAll(filters)  ← acceso directo a BD (sin HTTP)
    ▼
packages/database — Prisma + Neon
    │  rows[]  →  toDomain()  →  Product[]
    ▼
Next.js renderiza HTML y lo envía al navegador
```

### Operaciones autenticadas (checkout, admin)

```
Browser — Client Component
    │  apiClient(accessToken).post('/orders', body)
    ▼
apps/api — NestJS :3001
    │  JwtAuthGuard verifica Bearer token
    │  Controller → Use Case → Repository → Prisma → Neon
    ▼
Response JSON
```

### Carrito — estado del cliente

```
Usuario hace click "Agregar al carrito"
    │  useCart().addItem(product)
    ▼
Zustand store (memoria RAM)
    │  persist middleware
    ▼
localStorage["electro-motos-cart:{userId}"]
```

---

## 5. Esquema de base de datos

```
┌─────────────┐         ┌──────────────────────────┐
│    User     │         │         Account           │
│─────────────│         │──────────────────────────│
│ id (PK)     │◄────────│ userId (FK)               │
│ email       │  1 : N  │ provider                  │
│ name        │         │ providerAccountId         │
│ image       │         └──────────────────────────┘
│ password?   │         ← NULL para usuarios Google
│ role        │         ← 'ADMIN' o 'CUSTOMER'
│ createdAt   │
└──────┬──────┘
       │ 1 : N
       ▼
┌─────────────┐         ┌─────────────┐
│    Order    │◄────────│   Payment   │
│─────────────│  1 : 1  │─────────────│
│ id (PK)     │         │ orderId(FK) │
│ userId (FK) │         │ provider    │
│ status      │         │ externalId  │ ← ID de Wompi / MP
│ total (Int) │         │ status      │
│ shipping    │         │ amount      │
│ paymentProv │         └─────────────┘
│ createdAt   │
└──────┬──────┘
       │ 1 : N
       ▼
┌─────────────────┐
│   OrderItem     │
│─────────────────│
│ orderId (FK)    │
│ productId (FK)──┼──────────────────┐
│ quantity        │                  │
│ priceAtPurchase │                  ▼
└─────────────────┘      ┌──────────────────────┐
                         │       Product        │
┌──────────────────┐     │──────────────────────│
│    Category      │◄────│ categoryId (FK)      │
│──────────────────│1:N  │ id (PK)              │
│ id (PK)          │     │ name · slug          │
│ name · slug      │     │ description          │
│ parentId?        │     │ price (Int)          │ ← centavos COP
│  (jerarquía)     │     │ stock · sku          │
└──────────────────┘     │ images[]             │
                         │ isActive             │
                         └──────────┬───────────┘
                                    │ 1 : N
                                    ▼
                       ┌─────────────────────────┐
                       │  MotorcycleCompatibility │
                       │─────────────────────────│
                       │ productId (FK)           │
                       │ brand · model · year?    │
                       └─────────────────────────┘

┌─────────────┐
│  Settings   │  ← Configuración clave-valor
│─────────────│     Ej: MERCADOPAGO_ENABLED=true
│ key (UNIQUE)│
│ value       │
└─────────────┘
```

### Categorías — jerarquía de tres niveles

```
Sistema Eléctrico
  ├── Ramales
  ├── Reguladores
  ├── CDI
  ├── Baterías
  ├── Estatores
  └── Bobinas

Repuestos
  ├── Filtro de Aire
  ├── Bujías
  ├── Conectores
  ├── Frenos
  └── Repuestos Motor

Aceites          → Liquimoly · SKY
Llantas          → (subcategorías)
Accesorios       → Espejos · Exploradores · Bombillas LED · Equipamiento
```

---

## 6. Flujo de autenticación

### Registro con email y contraseña

```
Browser — /auth/register
    │  fetch(`${NEXT_PUBLIC_API_URL}/auth/register`, { email, password, name })
    ▼
NestJS — POST /auth/register
    │  class-validator valida el DTO
    │  userRepo.findByEmail(email) → ¿ya existe? → 409
    │  bcrypt.hash(password, 12)
    │  prisma.user.create(...)
    │  → 201 { message: "Usuario registrado correctamente" }
    ▼
Browser — redirect a /auth/login
```

### Login con email y contraseña

```
Browser — /auth/login
    │  signIn('credentials', { email, password, redirect: false })
    ▼
NextAuth — Credentials.authorize()
    │  fetch(`${API_URL}/auth/login`, { email, password })
    ▼
NestJS — POST /auth/login
    │  bcrypt.compare(password, hash)
    │  jwtService.sign({ sub, email, role })
    │  → { accessToken, role, userId, name, email }
    ▼
NextAuth — jwt callback
    │  token.accessToken = data.accessToken
    │  token.role = data.role
    ▼
NextAuth — session callback
    │  session.user.accessToken = token.accessToken
    │  session.user.role = token.role
    ▼
Browser — router.push(callbackUrl ?? '/')
```

### Login con Google OAuth

```
Browser — signIn('google')
    ▼
Google — pantalla de consentimiento
    ▼
NextAuth — PrismaAdapter crea/vincula usuario
    ▼
NextAuth — jwt callback (account.provider === 'google')
    │  fetch(`${API_URL}/auth/session-token`, { email })
    │  header: x-internal-secret: INTERNAL_API_SECRET
    ▼
NestJS — POST /auth/session-token (endpoint interno)
    │  jwtService.sign({ sub, email, role })
    │  → { accessToken, role }
    ▼
NextAuth — token.accessToken = data.accessToken
    ▼
Browser — sesión activa con JWT NestJS
```

### Protección de rutas (proxy.ts)

```
Request a /admin/* o /checkout/*
    ▼
proxy.ts  (Node.js runtime)
    │
    ├── /admin/*  → sin sesión → redirect /auth/login
    │             → role !== 'ADMIN' → redirect /
    │             → ADMIN → next() ✓
    │
    └── /checkout/* → sin sesión → redirect /auth/login?callbackUrl=/checkout
                    → con sesión → next() ✓
```

---

## 7. Flujo de pago con Wompi

```
Browser — checkout paso 1
    │  apiClient(token).post('/orders', { items, shippingAddress, paymentProvider: 'WOMPI' })
    ▼
NestJS — POST /orders
    │  CreateOrder use case: valida stock → crea Order(PENDING)
    │  WompiService.createTransaction(order) → SHA256(reference + amount + COP + secret)
    │  → { order: { id }, payment: { reference, integritySignature, publicKey, amountInCents } }
    ▼
Browser — checkout paso 2
    │  WompiWidget construye URL directa a Wompi con todos los params como query string:
    │  https://checkout.wompi.co/p/?public-key=...&amount-in-cents=...&reference=...
    │  <a href> redirige al usuario — misma experiencia que el widget oficial
    │  Usuario paga (tarjeta / Nequi / PSE / Bancolombia)
    ▼
Wompi — procesa el pago
    │  POST /payments/wompi/webhook  (directo a NestJS)
    ▼
NestJS — valida firma SHA256 → ConfirmPayment use case
    │  APPROVED → Order.status=PAID, descuenta stock, email de confirmación
    │  DECLINED → Order.status=CANCELLED
    ▼
Browser — redirect a /checkout/confirmacion?orderId=xxx
```

> **Por qué no usamos el `widget.js` de Wompi:** el widget usa `document.currentScript`
> para localizar su form padre. Esto solo funciona en scripts parseados desde HTML estático,
> no en scripts añadidos dinámicamente (que es lo que hace React/Next.js siempre).
> La URL directa hace exactamente lo mismo que el widget internamente.

---

## 8. Flujo de pago con Mercado Pago

```
Browser — checkout
    │  paymentProvider: 'MERCADO_PAGO'
    ▼
NestJS — POST /orders
    │  ¿MERCADOPAGO_ENABLED = 'true'? NO → 403
    │  MercadoPagoService.createTransaction(order) → init_point URL
    │  → { payment: { redirectUrl } }
    ▼
Browser — redirect a mercadopago.com.co
    ▼
Mercado Pago — pago
    │  POST /payments/mercadopago/webhook (IPN a NestJS)
    ▼
NestJS — valida HMAC-SHA256 → getTransactionStatus(externalId) → ConfirmPayment
    ▼
Browser — back_url → /checkout/success o /checkout/failure
```

---

## 9. API NestJS — Referencia completa

Base URL: `http://localhost:3001` (dev) · Documentación interactiva: `/api/docs`

### Autenticación

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/auth/register` | Público | Registro con email + contraseña |
| `POST` | `/auth/login` | Público | Login → devuelve JWT NestJS |
| `POST` | `/auth/session-token` | Internal secret | Emite JWT para usuarios Google OAuth |

**POST `/auth/login`**

```json
// Request
{ "email": "admin@electromotos-tony.co", "password": "Admin123!" }

// 200 — OK
{
  "accessToken": "eyJhbGci...",
  "role": "ADMIN",
  "userId": "cuid_xxx",
  "name": "Admin Tony",
  "email": "admin@electromotos-tony.co"
}

// 401 — Credenciales inválidas
{ "message": "Credenciales inválidas", "statusCode": 401 }
```

---

### Productos (público)

| Método | Ruta        | Auth    | Descripción                            |
|--------|-------------|---------|----------------------------------------|
| `GET`  | `/products` | Público | Lista productos con filtros opcionales |

```
GET /products?category=sistema-electrico&inStock=true&page=1&limit=12
GET /products?search=yamaha&minPrice=5000000&maxPrice=20000000
```

---

### Pedidos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/orders` | JWT | Crea pedido y prepara pago |
| `PATCH` | `/orders/:id/status` | JWT + ADMIN | Actualiza estado manualmente |

---

### Pagos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/payments/wompi/integrity` | Público | Genera firma SHA256 para el widget |
| `POST` | `/payments/wompi/webhook` | Firma Wompi | Webhook IPN de Wompi |
| `POST` | `/payments/mercadopago/create-preference` | JWT | Crea preferencia MP |
| `POST` | `/payments/mercadopago/webhook` | Firma MP | Webhook IPN de Mercado Pago |

---

### Admin (requieren JWT + rol ADMIN)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/dashboard` | Métricas: revenue, pendientes, stock bajo |
| `POST` | `/admin/products` | Crear producto |
| `PUT` | `/admin/products/:id` | Editar producto |
| `DELETE` | `/admin/products/:id` | Eliminar producto |
| `PATCH` | `/admin/products/:id/stock` | Stock individual |
| `POST` | `/admin/products/upload-image` | Subir imagen a Cloudinary |
| `PATCH` | `/admin/stock/bulk` | Stock masivo por SKU |
| `PATCH` | `/admin/settings/mercadopago` | Activar/desactivar Mercado Pago |

---

### Seguridad global (NestJS)

- **ThrottlerGuard**: 100 req/min global. Login → 10/min. Registro → 5/min.
- **JwtAuthGuard**: todas las rutas requieren JWT salvo las marcadas `@Public()`.
- **RolesGuard**: rutas admin verifican `role === 'ADMIN'`.
- **Helm** + compresión en todos los responses.

---

## 10. Variables de entorno

### `apps/api/.env`

```bash
# ── Base de datos ──────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=verify-full"

# ── JWT ────────────────────────────────────────────────────────────────────
# Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
JWT_SECRET=
JWT_EXPIRES_IN=7d

# ── Google OAuth ───────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Wompi ──────────────────────────────────────────────────────────────────
WOMPI_PUBLIC_KEY=pub_test_xxxx
WOMPI_PRIVATE_KEY=prv_test_xxxx
WOMPI_INTEGRITY_SECRET=test_integrity_xxxx
WOMPI_EVENTS_SECRET=test_events_xxxx
WOMPI_ENV=sandbox

# ── Mercado Pago ───────────────────────────────────────────────────────────
MP_ACCESS_TOKEN=TEST-xxx
MP_PUBLIC_KEY=TEST-xxx
MP_WEBHOOK_SECRET=

# ── Email (Resend) ─────────────────────────────────────────────────────────
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=no-reply@electromotos-tony.co

# ── Imágenes (Cloudinary) ──────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── App ────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# ── Seguridad interna (NextAuth → NestJS) ──────────────────────────────────
INTERNAL_API_SECRET=   ← mismo valor que en apps/web/.env.local
```

### `apps/web/.env.local`

```bash
# ── Base de datos (para Server Components que acceden directo a Prisma) ────
DATABASE_URL="postgresql://..."

# ── NestJS API ─────────────────────────────────────────────────────────────
API_URL=http://localhost:3001              ← server-side (NextAuth, Server Actions)
NEXT_PUBLIC_API_URL=http://localhost:3001  ← client-side (componentes React)

# ── NextAuth ───────────────────────────────────────────────────────────────
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# ── Seguridad interna ──────────────────────────────────────────────────────
INTERNAL_API_SECRET=   ← mismo valor que en apps/api/.env

# ── Google OAuth ───────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Wompi (keys públicas para el widget del browser) ──────────────────────
WOMPI_PUBLIC_KEY=pub_test_xxxx

# ── Cloudinary ─────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### `packages/database/.env`

```bash
# Necesario para pnpm run db:seed y pnpm run db:studio
DATABASE_URL="postgresql://..."
```

---

## 11. Instalación y ejecución local

### Requisitos previos

- **Node.js 20+**
- **pnpm 9+** — `npm install -g pnpm`

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd electro-motos-tdk

# 2. Instalar dependencias de todo el monorepo
pnpm install

# 3. Crear los archivos de entorno
#    Copiar las plantillas y completar los valores reales
cp apps/api/.env.example apps/api/.env
# Crear apps/web/.env.local y packages/database/.env manualmente

# 4. Generar el cliente Prisma
pnpm --filter @h2r/database generate

# 5. Aplicar migraciones a la base de datos
pnpm --filter @h2r/database exec prisma migrate deploy

# 6. Poblar la base de datos con datos de prueba
pnpm run db:seed

# 7. Levantar el backend (NestJS en :3001)
pnpm --filter @h2r/api dev

# 8. Levantar el frontend (Next.js en :3000) — en otra terminal
pnpm --filter @h2r/web dev
```

### Comandos útiles

```bash
# Monorepo
pnpm run db:seed               # Re-ejecutar seed (datos de prueba)
pnpm run db:studio             # Abrir Prisma Studio en :5555
pnpm --filter @h2r/database exec prisma migrate dev --name <nombre>

# Backend
pnpm --filter @h2r/api dev     # Dev con hot-reload (webpack --watch)
pnpm --filter @h2r/api build   # Build de producción → dist/main.js

# Frontend
pnpm --filter @h2r/web dev     # Dev con Turbopack
pnpm --filter @h2r/web build   # Build de producción

# Swagger (solo con backend corriendo)
# http://localhost:3001/api/docs
```

---

## 12. Credenciales de prueba

Después de ejecutar `pnpm run db:seed`:

### Administrador del sistema

| Campo | Valor |
|---|---|
| Email | `admin@electromotos-tony.co` |
| Contraseña | `Admin123!` |
| Acceso al panel | `http://localhost:3000/admin` |

### Cliente de prueba

| Campo | Valor |
|---|---|
| Email | `cliente@ejemplo.co` |
| Contraseña | `Cliente123!` |

### Tarjeta de prueba Wompi (sandbox)

| Campo | Valor |
|---|---|
| Número | `4242 4242 4242 4242` |
| Vencimiento | Cualquier fecha futura |
| CVV | `123` |

---

## 13. Panel de administración

Acceso exclusivo para usuarios con rol `ADMIN`. URL: `/admin`

| Ruta | Qué hace |
|---|---|
| `/admin` | Dashboard: ingresos del día, pedidos pendientes, stock bajo |
| `/admin/productos` | Lista de productos con crear, editar, eliminar |
| `/admin/productos/[id]` | Formulario edición de producto |
| `/admin/pedidos` | Todos los pedidos con filtro por estado |
| `/admin/stock` | Productos con stock ≤ 5 + importación masiva CSV |
| `/admin/configuracion` | Toggle para activar/desactivar Mercado Pago |

### Importación de stock por CSV

```csv
sku,stock
FRE-BRE-FZ25-001,50
MOT-PIS-YBR125-001,10
```

Ir a `/admin/stock` → "Importar CSV" → seleccionar archivo.

---

## 14. Roles de usuario

```
CUSTOMER (por defecto)            ADMIN
──────────────────────            ──────────────────────
✓ Ver catálogo                    ✓ Todo lo de CUSTOMER
✓ Ver detalle de producto         ✓ Panel /admin
✓ Agregar al carrito              ✓ CRUD de productos
✓ Hacer checkout                  ✓ Gestionar pedidos
✓ Ver confirmación de pedido      ✓ Actualizar stock
                                  ✓ Importar CSV
                                  ✓ Toggle Mercado Pago
```

### Asignar rol ADMIN

```bash
# Opción 1: Prisma Studio
pnpm run db:studio
# → tabla User → campo role → cambiar a "ADMIN"

# Opción 2: SQL directo
psql $DATABASE_URL -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'nuevo@admin.co';"
```

### Triple verificación de seguridad

```
1. proxy.ts          ← nivel de ruta (antes de renderizar)
2. admin/layout.tsx  ← nivel de servidor (al renderizar)
3. NestJS guards     ← nivel de API (antes de operar en BD)
```

---

## 15. Manejo de precios (centavos COP)

Todos los precios se almacenan en **centavos** como enteros para evitar errores de punto flotante.

```
Precio visible:   $85.000 COP  →  BD: 8.500.000
Precio visible: $1.580.000 COP  →  BD: 158.000.000
```

```typescript
// Mostrar al usuario
new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
  .format(cents / 100)   // 8500000 → "$85.000"

// Guardar desde formulario admin
Math.round(parseFloat(inputValue) * 100)   // "85000" → 8500000
```

---

## 16. Integración Wompi — Detalles técnicos

### Firma de integridad

```
SHA256( reference + amountInCents + currency + WOMPI_INTEGRITY_SECRET )
```

Sin esta firma, un usuario podría modificar el monto en el HTML del widget.
La firma la calcula el servidor (NestJS) y nunca expone el secret al cliente.

### Validación de webhook

```
SHA256( properties + timestamp + WOMPI_EVENTS_SECRET )
```

Si la firma no coincide → 401. Evita que terceros falsifiquen eventos de pago.

### Idempotencia

```typescript
if (order.status !== 'PENDING') return ok(undefined)  // ya procesado, no hacer nada
```

Wompi puede reenviar el mismo webhook. El use case `ConfirmPayment` es idempotente.

---

## 17. Integración Mercado Pago — Detalles técnicos

| Aspecto | Wompi | Mercado Pago |
|---|---|---|
| Experiencia | Widget embebido | Redirect completo a MP |
| Validación webhook | SHA256 events | HMAC-SHA256 x-signature |
| Estado en webhook | Directo en el evento | Requiere consultar la API de MP |
| Activación | Siempre disponible | Toggle en admin → Configuración |

### Mapeo de estados

| Mercado Pago | Dominio |
|---|---|
| `approved` / `authorized` | `APPROVED` |
| `pending` / `in_process` / `in_mediation` | `PENDING` |
| `rejected` | `DECLINED` |
| `cancelled` / `refunded` / `charged_back` | `VOIDED` |
| cualquier otro | `ERROR` |

---

## 18. Preguntas frecuentes

**¿Por qué hay dos apps separadas (Next.js + NestJS)?**
> Clean Architecture con separación real de capas. Next.js maneja el SSR y la sesión del
> browser. NestJS maneja toda la lógica de negocio, autenticación JWT y webhooks. Ambas
> comparten el dominio (`packages/domain`) y la base de datos (`packages/database`) sin duplicar código.

**¿Por qué los Server Components acceden directo a Prisma y no al API?**
> En un monorepo donde ambas apps comparten la misma BD, el SSR puede ir directo a Prisma
> sin pasar por HTTP. Es más rápido y evita una capa de latencia innecesaria en el renderizado.
> Las operaciones que necesitan lógica de negocio (crear pedidos, pagos) sí pasan por NestJS.

**¿Por qué `proxy.ts` en vez de `middleware.ts`?**
> En Next.js 16 el archivo fue renombrado. Además corre en Node.js (no Edge Runtime),
> lo que permite usar NextAuth con sesiones JWT directamente.

**¿Por qué los precios en centavos si en Colombia no hay centavos?**
> Evita errores de punto flotante en JavaScript. Los procesadores de pago (Wompi, Stripe)
> también usan la unidad mínima de la moneda (`amount_in_cents`).

**¿Por qué JWT en vez de database sessions con NextAuth?**
> El proveedor Credentials de NextAuth requiere JWT cuando se usa con PrismaAdapter.
> Con database sessions, NextAuth intenta insertar registros en la tabla Session al
> hacer signIn con Credentials, lo cual falla.

**¿Cómo probar webhooks localmente?**

```bash
ngrok http 3001
# Copiar la URL pública → configurar en panel Wompi sandbox:
# Webhook URL: https://abc123.ngrok.io/payments/wompi/webhook
```

**¿Cómo habilitar Mercado Pago?**
> `/admin/configuracion` → activar el toggle → guarda `MERCADOPAGO_ENABLED=true` en la tabla `Settings`.

# ⚡ H2R Online Store — E-commerce de Repuestos para Motos

[![CI](https://github.com/kevinz-08/electro-motos-tdk/actions/workflows/ci.yml/badge.svg)](https://github.com/kevinz-08/electro-motos-tdk/actions/workflows/ci.yml)

E-commerce completo para una tienda de motos colombiana. Permite a los clientes comprar
repuestos en línea con pago a través de **Wompi** (principal) o **Mercado Pago** (respaldo),
despacho logístico integrado con **Vendelo**, y confirmaciones automáticas por correo
electrónico. Los administradores gestionan productos, pedidos y stock desde un panel dedicado.

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
9. [Integración de despacho con Vendelo](#9-integración-de-despacho-con-vendelo)
   - [9.1 Pago contra entrega (COD)](#91-pago-contra-entrega-cod)
   - [9.4 Apartado "Guía Vendelo" en el panel admin](#94-apartado-guía-vendelo-en-el-panel-admin)
10. [Servicios de background (colas y reconciliación)](#10-servicios-de-background-colas-y-reconciliación)
11. [API NestJS — Referencia completa](#11-api-nestjs--referencia-completa)
12. [Variables de entorno](#12-variables-de-entorno)
13. [Instalación y ejecución local](#13-instalación-y-ejecución-local)
14. [Despliegue en producción](#14-despliegue-en-producción)
15. [Credenciales de prueba](#15-credenciales-de-prueba)
16. [Panel de administración](#16-panel-de-administración)
17. [Roles de usuario](#17-roles-de-usuario)
18. [Manejo de precios (centavos COP)](#18-manejo-de-precios-centavos-cop)
19. [Detalles técnicos: Wompi](#19-detalles-técnicos-wompi)
20. [Detalles técnicos: Mercado Pago](#20-detalles-técnicos-mercado-pago)
21. [Preguntas frecuentes](#21-preguntas-frecuentes)
22. [Optimización de conversión (CRO)](#22-optimización-de-conversión-cro)
23. [Imágenes de OpenGraph por categoría](#23-imágenes-de-opengraph-por-categoría)
24. [Buscador del catálogo](#24-buscador-del-catálogo)
25. [Pop-up promocional y swipe del Hero](#25-pop-up-promocional-y-swipe-del-hero)

---

## 1. Stack tecnológico

| Capa | Tecnología | Versión | Uso |
|---|---|---|---|
| Monorepo | **pnpm workspaces** + Turborepo | — | Gestión de paquetes y build pipeline |
| Frontend | **Next.js** | 16 (App Router) | SSR, páginas, componentes, sesión |
| Backend | **NestJS** | 10 | REST API, autenticación JWT, webhooks |
| Lenguaje | **TypeScript** | strict | Todo el código |
| Estilos | **Tailwind CSS** | 4 | Diseño UI |
| ORM | **Prisma** | 7 | Acceso a base de datos |
| Base de datos | **PostgreSQL** (Neon) | — | Almacenamiento principal |
| Autenticación | **NextAuth.js** v5 + JWT NestJS | — | Sesiones browser + tokens API |
| Pago (principal) | **Wompi** | URL directa | Tarjetas, Nequi, PSE, Bancolombia |
| Pago (respaldo) | **Mercado Pago** | SDK v2 | Preference + redirect |
| Logística | **Vendelo** | REST API | Despacho y seguimiento de envíos |
| Email | **Resend** | — | Emails transaccionales (con cola de reintentos) |
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
│  WompiService · MercadoPagoService · VendeloService             │
│  ResendEmailService · EmailQueueService · CloudinaryService     │
│  WompiReconciliationService · VendeloOrderQueueService          │
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
│   │   │   │   ├── cache.ts        ← unstable_cache con TTLs y tags de invalidación
│   │   │   │   ├── cache-tags.ts   ← Constantes CACHE_TAGS
│   │   │   │   └── cart.ts         ← Store Zustand del carrito (localStorage)
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/   ← Repos Prisma (usados en Server Components)
│   │   │   │   └── services/       ← Servicios (Cloudinary, Resend)
│   │   │   ├── app/
│   │   │   │   ├── (store)/        ← Tienda pública (home, catálogo, producto, carrito)
│   │   │   │   │   └── checkout/confirmacion/  ← Página de confirmación post-pago
│   │   │   │   ├── admin/          ← Panel admin (solo ADMIN)
│   │   │   │   ├── auth/           ← Login, registro
│   │   │   │   └── api/auth/       ← Solo NextAuth handler
│   │   │   └── components/
│   │   │       └── checkout/
│   │   │           ├── CheckoutForm.tsx      ← Formulario de checkout
│   │   │           ├── WompiWidget.tsx       ← Botón de pago Wompi
│   │   │           ├── CartCleaner.tsx       ← Limpia el carrito post-pago
│   │   │           └── OrderStatusPoller.tsx ← Polling del estado del pedido
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── api/                        ← NestJS 10 (REST API backend)
│       ├── src/
│       │   ├── main.ts             ← Bootstrap: dotenv, Helmet, CORS, Swagger, validación env
│       │   ├── app.module.ts       ← Módulo raíz + guards globales
│       │   ├── auth/               ← AuthModule: registro, login, JWT, Google session-token
│       │   ├── products/           ← ProductsModule: GET /products (público)
│       │   ├── orders/             ← OrdersModule: POST /orders, PATCH status
│       │   ├── admin/              ← AdminModule: CRUD productos, stock, settings
│       │   ├── payments/           ← PaymentsModule: webhooks Wompi y Mercado Pago
│       │   └── infrastructure/
│       │       ├── services/
│       │       │   ├── WompiService.ts              ← Firma SHA256, validación webhook
│       │       │   ├── WompiReconciliationService.ts← Job cada 15 min (pedidos PENDING)
│       │       │   ├── MercadoPagoService.ts        ← Preference, HMAC, estado
│       │       │   ├── VendeloService.ts            ← Creación y seguimiento de envíos
│       │       │   ├── VendeloHttpClient.ts         ← HTTP client con retry + circuit breaker
│       │       │   ├── VendeloOrderQueueService.ts  ← Cola de despacho (Prisma, cada 2 min)
│       │       │   ├── EmailQueueService.ts         ← Cola de emails (Prisma, cada 2 min)
│       │       │   ├── ResendEmailService.ts        ← Envío real vía Resend API
│       │       │   └── CloudinaryService.ts         ← Upload de imágenes
│       │       └── injection-tokens.ts              ← Symbols para inyección de dependencias
│       ├── webpack.config.js
│       └── package.json
│
├── packages/
│   ├── domain/                     ← Dominio puro — cero dependencias externas
│   │   └── src/
│   │       ├── entities/           ← Product, Order, User, Category
│   │       ├── repositories/       ← IProductRepository, IOrderRepository, IUserRepository
│   │       ├── services/           ← IPaymentService, IVendeloShippingPort
│   │       ├── use-cases/          ← CreateOrder, ConfirmPayment, ListProducts, UpdateStock
│   │       └── shared/             ← Result<T,E>, AppError
│   │
│   ├── database/                   ← Prisma centralizado
│   │   ├── prisma/
│   │   │   ├── schema.prisma       ← Modelos y relaciones
│   │   │   ├── seed.ts             ← Datos iniciales (admin, productos, pedidos)
│   │   │   ├── catalog.ts          ← 85 productos con jerarquía de categorías
│   │   │   └── migrations/         ← Historial de migraciones
│   │   └── src/
│   │       ├── index.ts            ← Singleton PrismaClient + PrismaPg adapter (pool máx 5)
│   │       └── generated/          ← Auto-generado por prisma generate (no editar)
│   │
│   └── types/                      ← DTOs compartidos: auth, product, order, payment, admin
│
├── HISTORIAL_TECNICO.md            ← Registro cronológico de todos los cambios
├── AUDITORIA.md                    ← Auditoría técnica v2.0 (mayo 2026)
├── turbo.json                      ← Pipeline de Turborepo
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

---

## 4. Flujo de datos general

### Catálogo — lectura SSR (sin HTTP a NestJS)

```
Navegador
    │  GET /catalogo
    ▼
apps/web — Server Component
    │  PrismaProductRepository.findAll(filters)  ← acceso directo a BD
    ▼
packages/database — Prisma + Neon
    │  rows[]  →  toDomain()  →  Product[]
    ▼
Next.js renderiza HTML con unstable_cache (TTL 180–3600 s)
    ▼
Respuesta HTML al navegador
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
Response JSON  →  Browser actualiza UI
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

┌─────────────────┐    ┌──────────────────────┐
│    Settings     │    │     EmailQueue       │
│─────────────────│    │──────────────────────│
│ key (UNIQUE)    │    │ orderId · to         │
│ value           │    │ status · attempts    │
└─────────────────┘    │ nextRetry            │
                       └──────────────────────┘

┌──────────────────────────┐
│    VendeloOrderQueue     │
│──────────────────────────│
│ orderId · status         │
│ attempts · nextRetry     │
│ vendeloShipmentId?       │
└──────────────────────────┘
```

### Categorías — jerarquía de tres niveles

```
Sistema Eléctrico
  ├── Ramales · Reguladores · CDI · Baterías · Estatores · Bobinas

Repuestos
  ├── Filtro de Aire · Bujías · Conectores · Frenos · Repuestos Motor

Aceites          → Liquimoly · SKY
Llantas          → (subcategorías)
Accesorios       → Espejos · Exploradoras · Bombillos LED · Equipamiento
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

```mermaid
sequenceDiagram
    participant B as Browser
    participant W as apps/web
    participant A as apps/api (NestJS)
    participant WP as Wompi
    participant DB as PostgreSQL

    B->>W: Completa checkout (dirección + datos)
    W->>A: POST /orders {items, shippingAddress, provider: WOMPI}
    A->>DB: CreateOrder → Order(status=PENDING)
    A->>A: WompiService.createTransaction(order)<br/>SHA256(reference+amount+COP+secret)
    A-->>B: {reference, integritySignature, publicKey, amountInCents}

    B->>WP: Redirect a checkout.wompi.co con query params
    WP->>B: Formulario de pago (tarjeta / Nequi / PSE)
    B->>WP: Usuario paga

    WP->>A: POST /payments/wompi/webhook
    A->>A: Validar firma SHA256 (WOMPI_EVENTS_SECRET)
    A->>DB: ConfirmPayment use case
    alt APPROVED
        A->>DB: Order.status = PAID, decrementStock()
        A->>A: EmailQueueService.enqueue(email, orderId)
        A->>A: VendeloOrderQueueService.enqueue(orderId)
    else DECLINED
        A->>DB: Order.status = CANCELLED
    end
    A-->>WP: 200 OK

    B->>W: Redirect a /checkout/confirmacion?orderId=xxx
    W->>DB: OrderStatusPoller consulta estado
    W-->>B: Página de confirmación
```

> **Por qué no usamos el `widget.js` de Wompi:** el widget usa `document.currentScript`
> para localizar su form padre. Esto solo funciona en scripts parseados desde HTML estático,
> no en scripts añadidos dinámicamente (que es lo que hace React/Next.js siempre).
> La URL directa produce exactamente la misma experiencia de pago.

---

## 8. Flujo de pago con Mercado Pago

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as apps/api (NestJS)
    participant MP as Mercado Pago
    participant DB as PostgreSQL

    B->>A: POST /orders {provider: MERCADO_PAGO}
    A->>DB: ¿Settings.MERCADOPAGO_ENABLED = true?
    alt Deshabilitado
        A-->>B: 403 Forbidden
    else Habilitado
        A->>MP: MercadoPagoService.createTransaction(order)
        MP-->>A: {init_point URL}
        A->>DB: Order(status=PENDING) + Payment(externalId)
        A-->>B: {redirectUrl}
        B->>MP: Redirect completo a Mercado Pago
        B->>MP: Usuario paga
        MP->>A: POST /payments/mercadopago/webhook (IPN)
        A->>A: Validar HMAC-SHA256 (x-signature header)
        A->>MP: getTransactionStatus(externalId) ← consulta activa
        A->>DB: ConfirmPayment (APPROVED / DECLINED / VOIDED)
        MP-->>B: back_url → /checkout/success o /checkout/failure
    end
```

---

## 9. Integración de despacho con Vendelo

Tras la confirmación de pago (webhook `APPROVED`), el pedido se encola automáticamente
para despacho a través de **Vendelo**, el operador logístico integrado.

### Flujo de despacho

```mermaid
sequenceDiagram
    participant WH as Webhook Wompi
    participant VQ as VendeloOrderQueueService
    participant VS as VendeloService
    participant HC as VendeloHttpClient
    participant VE as API Vendelo
    participant DB as PostgreSQL

    WH->>VQ: enqueue(orderId) → VendeloOrderQueue(PENDING)

    loop Cada 2 minutos
        VQ->>DB: findMany {status: PENDING, nextRetry <= now}
        VQ->>VS: createShipment(order)
        VS->>HC: POST /shipments (con retry + circuit breaker)
        HC->>VE: Llamada HTTP
        alt Éxito
            VE-->>HC: {shipment_id, tracking_code}
            HC-->>VS: respuesta
            VS-->>VQ: OK
            VQ->>DB: status=DONE, vendeloShipmentId saved
        else Error transitorio (5xx / 429 / red)
            HC->>HC: Retry con backoff 1s → 2s → 4s
            HC-->>VQ: Error
            VQ->>DB: attempts++, nextRetry = now + backoff(5s/30s/120s)
        else 3 intentos agotados
            VQ->>DB: status=FAILED, lastError logged
        end
    end
```

### Circuit Breaker en `VendeloHttpClient`

El cliente HTTP hacia Vendelo implementa un **circuit breaker** de tres estados para
proteger el sistema cuando la API de Vendelo experimenta fallas sostenidas:

| Estado | Condición | Comportamiento |
|---|---|---|
| `CLOSED` | Normal | Todas las llamadas pasan |
| `OPEN` | ≥ 5 fallos consecutivos | Rechaza llamadas inmediatamente durante 60 s |
| `HALF_OPEN` | Después de 60 s en OPEN | Permite una llamada de prueba |

Si la prueba tiene éxito, el circuito vuelve a `CLOSED`. Si falla, regresa a `OPEN`.

### Endpoints de Vendelo utilizados

| Operación | Endpoint | Descripción |
|---|---|---|
| Autenticación | `POST /auth/token` | Obtiene access token |
| Catálogo de ciudades | `GET /cities` | Ciudades disponibles con paginación |
| Crear envío | `POST /shipments` | Crea la orden de despacho |
| Estado del envío | `GET /shipments/{id}` | Consulta tracking |
| Sincronizar estado | `PATCH /orders/:id/sync-shipment` | Actualiza estado desde Vendelo |
| Cotizar envío | `POST /v1/admin/orders/quotation` | Estima el costo de envío sin crear el pedido |

### Cotización de envío (carrito/checkout)

`POST /shipping/quote` (NestJS, público vía `@Public()`) envuelve el use case `QuoteShipping`
para mostrarle al cliente un estimado de envío **antes de pagar**. Es puramente informativo:
Vendelo cobra el envío directamente al cliente al momento de la entrega, no nuestro Wompi — el
monto cargado en el checkout no cambia. Si el subtotal del carrito alcanza
`FREE_SHIPPING_THRESHOLD_CENTS`, ni siquiera se consulta a Vendelo.

```
/carrito, /checkout
    │  useShippingQuote(city, items) — debounce 500ms, hook compartido
    ↓
POST /api/shipping/quote (Next.js)         ← valida con zod, timeout 8s
    ↓
POST /shipping/quote (NestJS)              ← @Throttle 10 req/min/IP + 100/min global
    │  QuoteShipping use case               ← precios/stock siempre desde la BD
    ↓
VendeloService.quoteOrder()
    ↓
POST /v1/admin/orders/quotation (Vendelo)
```

Cache cliente en `useShippingQuoteStore` (Zustand + `sessionStorage`, TTL 5 min), compartida
entre carrito y checkout por clave `${cityCode}-${items ordenados}`. La ciudad seleccionada se
persiste en el store de carrito (`selectedCity`) para no pedirla dos veces.

### 9.1 Pago contra entrega (COD)

Además de Wompi/Mercado Pago, el checkout ofrece **pago contra entrega** (`paymentProvider: 'COD'`)
— el cliente paga en efectivo al repartidor de Vendelo, no a través de nuestra pasarela. Como no
existe un webhook de pasarela que confirme el pago, el ciclo de vida del pedido es distinto:

| Paso | Online (Wompi/MP) | COD |
| --- | --- | --- |
| Estado inicial del pedido | `PENDING` (espera webhook) | `PAID` (inmediato, sin paso de autorización) |
| Descuento de stock | Al recibir webhook `APPROVED` | En la misma transacción de creación del pedido |
| Encolado en Vendelo / email confirmación | Disparado por el webhook | Disparado directo desde `OrdersController` tras crear el pedido |
| `payment_method_code` enviado a Vendelo | `EXTERNAL_PAYMENT` | `COD` |

**Restock automático:** si Vendelo reporta el envío como `RETURNED` o `CANCELLED` (paquete
rechazado en la puerta), `SyncShipmentStatus` restaura el stock de los `OrderItem` del pedido,
de forma atómica e idempotente — aplica a cualquier método de pago, no solo COD.

No hay restricción de monto ni de ciudad para ofrecer COD (MVP) — disponible en cualquier
ciudad con cobertura Vendelo.

**Toggle admin (`/admin/configuracion`):** el admin puede desactivar COD sin tocar código.
Estado persistido en la tabla `Settings` (clave `COD_ENABLED`, mismo patrón que
`MERCADOPAGO_ENABLED`). Si no existe la fila aún, se trata como **habilitado por defecto**.

| Estado | Checkout (cliente) | `POST /orders` con `paymentProvider: 'COD'` |
| --- | --- | --- |
| Habilitado (o sin fila en Settings) | Muestra el selector "Pago en línea" / "Pago contra entrega" | Acepta el pedido |
| Deshabilitado | Solo aparece "Pago en línea" — el selector ni se renderiza | `403 ForbiddenException` |

No borra ninguna funcionalidad: el código de creación de pedidos COD, Vendelo y el webhook de
envío siguen intactos — el toggle solo controla si se *ofrece* la opción. `PATCH /admin/settings/cod`
(`AdminSettingsController`, `@Roles('ADMIN')`) escribe el setting; `CodToggle.tsx` es el switch en la UI.

### 9.2 Peso y dimensiones reales de envío

`Product` tiene 4 campos opcionales — `weightKg`, `heightCm`, `widthCm`, `lengthCm` (nullable,
cargados por el admin en `/admin/productos/[id]`, sección "Envío"). `VendeloService.createOrder()`
y `.quoteOrder()` los usan como override del default genérico configurado por env var
(`VENDELO_DEFAULT_WEIGHT_KG=1`, `VENDELO_DEFAULT_HEIGHT_CM=25`, `VENDELO_DEFAULT_WIDTH_CM=25`,
`VENDELO_DEFAULT_LENGTH_CM=10`):

```ts
weight: productSnapshot.weightKg ?? defaultWeightKg
```

**Por qué existe esto:** antes, *todos* los productos usaban el mismo peso/dimensiones fijos sin
importar qué se estuviera enviando. Coordinadora recalcula el flete real con el peso pesado en
bodega al despachar — cualquier producto más pesado/grande que el default genérico generaba un
flete real mayor al cotizado en el checkout, cobrando de más al negocio sobre lo ya cobrado al
cliente. El default (1kg, 25x25x10cm) se eligió deliberadamente sobredimensionado — mientras el
admin no cargue el dato real, es preferible sobreestimar el flete (margen a favor del negocio)
que subestimarlo (pérdida).
Mientras un producto no tenga estos campos cargados, sigue usando el default (comportamiento legacy,
sin romper nada) — pero la cotización para ese producto seguirá siendo aproximada.

`QuoteShipping` (cotización en carrito/checkout) resuelve estos campos desde la BD junto con el
precio, así que el estimado que ve el cliente ya refleja el peso real si está cargado.

### 9.3 Flete cobrado en línea junto con el producto

En vez de que el negocio absorba el costo del flete (comportamiento legado, siempre así antes de
esta función), el cliente puede pagar **producto + envío en un solo cargo** de Wompi/Mercado Pago.
El negocio le sigue pagando a Vendelo el flete desde su billetera al despachar (sin cambios ahí) —
ahora recupera ese costo del cliente en vez de asumirlo en silencio.

Reemplaza el intento anterior de que Vendelo recaudara *solo el flete* en efectivo al entregar
(`Order.shippingCod`, ver historial abajo) — Vendelo rechazó las dos formas probadas de lograrlo, así
que se abandonó esa vía y en su lugar se suma el flete al cobro que ya funciona de forma confiable.

**Política global, no elección del cliente** — controlada por el admin desde `/admin/configuracion`
con el toggle **"Flete pagado en línea"** (setting `SHIPPING_ONLINE_ENABLED`, **default
desactivado** — deliberado, para no empezar a cobrar flete extra sin opt-in explícito). El checkout
no tiene checkbox: `orders.controller.ts` lee el setting y decide para todo pedido `WOMPI`/`MERCADO_PAGO`.

```
SHIPPING_ONLINE_ENABLED=false (default) → comportamiento legado: shippingTotal=0, el negocio
                                           absorbe el flete desde su billetera Vendelo
SHIPPING_ONLINE_ENABLED=true            → CreateOrder cotiza el flete (delegando en QuoteShipping,
                                           misma lógica de peso real + umbral de envío gratis) y lo
                                           suma al total: total = productSubtotal + shippingTotal
```

`Order.total` pasa a significar el **total cobrado** (producto + flete cuando se cobra en línea) —
así `WompiService`/`MercadoPagoService`/`ConfirmPayment`, que ya leen `order.total` directamente,
funcionan sin ningún cambio de código. `Order.shippingTotal` (nuevo campo, default `0`) guarda el
componente de flete por separado, para desglosarlo en el comprobante y el panel admin.

**Falla segura — nunca bloquea el checkout:** si falta `cityCode`/`subdivisionCode` en la dirección,
si la cotización a Vendelo falla, o si el flete cotizado supera `MAX_SHIPPING_CHARGE_CENTS`
(tope defensivo, $50.000 COP por defecto), `CreateOrder.execute()` degrada a `shippingTotal: 0` — el
pedido se crea igual y el negocio absorbe el flete como en el caso legado. `CreateOrderOutput.shippingQuoteFallback`
señala cuándo pasó esto para que `orders.controller.ts` lo loggee como warning.

`CreateOrder` compone el use case `QuoteShipping` ya existente (constructor 4º parámetro
**opcional**, para no romper instanciaciones de 3 argumentos que no cobran flete en línea) — no
duplica la lógica de cotización, peso real por producto, ni el umbral de envío gratis.

El comprobante de venta y el modal de detalle en `/admin/pedidos` desglosan Subtotal / Envío / Total
cuando `shippingTotal > 0`, para que los números siempre cuadren.

**Rollout:** al desplegar esta función se borró cualquier fila `SHIPPING_ONLINE_ENABLED` existente
en `Settings` (el toggle traía un significado distinto de un intento anterior) — todo ambiente
arranca en el default seguro (desactivado) hasta que el admin lo active manualmente.

### 9.4 Apartado "Guía Vendelo" en el panel admin

Todo el flujo de despacho es automático (webhook → `VendeloOrderQueueService` → Vendelo), pero
cuando algo falla el admin no tenía forma de verlo ni de recuperarlo sin tocar la base de datos.
El modal de detalle de `/admin/pedidos` incluye la sección **Guía Vendelo**, que expone el estado
consolidado del despacho y las acciones correctivas.

**Máquina de estados que se le muestra al admin:**

| Situación | Qué ve | Acción disponible |
|---|---|---|
| `deliveryMethod = STORE_PICKUP` | "Retiro en tienda — sin guía" | ninguna (nunca se despacha) |
| Cola en `PENDING` / `PROCESSING` | "En cola — intento N/3" + próximo reintento | ninguna (esperar al worker) |
| Cola en `FAILED` | Banner rojo con el `lastError` crudo de Vendelo | **Reintentar envío a Vendelo** |
| `vendeloOrderId` asignado, sin `Shipment` | "Pedido creado en Vendelo" | **Generar guía** |
| `Shipment` existente | Estado, tracking y transportador | **Ver / Descargar guía PDF** |

**Flujo de datos** (el navegador nunca habla directo con la API de Vendelo ni con NestJS):

```
VendeloGuiaSection (client component)
    │  GET  /api/admin/vendelo/orders/[id]           ← estado consolidado
    │  POST /api/admin/vendelo/orders/[id]/requeue   ← reencolar pedido fallido
    │  POST /api/admin/vendelo/orders/[id]/shipment  ← crear envío (guía)
    │  GET  /api/admin/vendelo/orders/[id]/guia      ← stream del PDF
    ↓  route handlers Next.js — validan session.user.role === 'ADMIN'
NestJS  /admin/vendelo/*  — @Roles('ADMIN')
    ↓
VendeloService → API Vendelo
```

La etiqueta se pide siempre con `output: 'BASE64'` y se re-emite como `application/pdf` desde el
route handler. La alternativa (`output: 'URL'`) devuelve un enlace temporal de Vendelo que expira;
esa URL igual se persiste en `Shipment.labelUrl` como referencia, pero no es lo que consume la UI.

**Idempotencia del reintento:** `VendeloOrderQueueService.requeue()` rechaza el pedido si ya tiene
`vendeloOrderId` (ya existe en Vendelo — reintentarlo lo duplicaría) o si es `STORE_PICKUP`. Sobre
un pedido en `FAILED` resetea la fila existente a `PENDING / attempts: 0` en vez de crear una nueva,
y dispara `processNext()` inmediatamente sin esperar el tick de 2 minutos.

Además, la lista de `/admin/pedidos` tiene una columna **Guía** con un indicador de color por fila
(🟢 con guía · 🔵 en Vendelo · 🟡 en cola · 🔴 fallida · ⚪ retiro en tienda), resuelta en el Server
Component con dos queries agregadas — sin N+1 sobre la tabla.

---

## 10. Servicios de background (colas y reconciliación)

NestJS levanta tres servicios de fondo al iniciar (`OnModuleInit`). Todos usan
**PostgreSQL como broker** (sin Redis ni BullMQ) y se limpian correctamente en `OnModuleDestroy`.

### `EmailQueueService` — Cola de correos de confirmación

Los emails de confirmación **nunca se envían inline** en el webhook. Esto evita que un
fallo de Resend bloquee la respuesta al procesador de pagos.

```
Webhook APPROVED
    │  EmailQueueService.enqueue(email, orderId)
    ▼
EmailQueue { status: PENDING } — escrito en BD

┌─────────────────────────────────────────┐
│  setInterval cada 2 min                 │
│                                         │
│  findMany { status: PENDING,            │
│             nextRetry <= now }          │
│  → ResendEmailService.send(...)         │
│                                         │
│  Éxito → status = DONE                  │
│  Error → attempts++                     │
│          nextRetry = +5s / +30s / +120s │
│  3 fallos → status = FAILED             │
└─────────────────────────────────────────┘
```

### `VendeloOrderQueueService` — Cola de despacho

Idéntico patrón al `EmailQueueService` pero encola pedidos para despacho en Vendelo.
Reintentos: 3 intentos con backoff 5 s → 30 s → 120 s.

**Protección contra duplicados (defense in depth, evita el bug histórico de
órdenes triplicadas en Vendelo):**

1. **Guard de idempotencia** — si `order.vendeloOrderId` ya existe, se marca `SENT` sin volver a llamar a Vendelo.
2. **Claim atómico de fila** — `updateMany({ where: { id, status: 'PENDING' } })` antes de procesar. Si `count === 0`, otra instancia de Cloud Run (o otro tick) ya la reclamó. La fila pasa a `PROCESSING` con `processingStartedAt`.
3. **Sweeper de huérfanas** — al inicio de cada ciclo, libera (`PROCESSING → PENDING`) filas atascadas por más de 5 min, cubriendo el caso de un contenedor que crashea a mitad de proceso.
4. **Commit idempotente** — el `update` final de `Order.vendeloOrderId` usa `updateMany({ where: { vendeloOrderId: null } })` en vez de `update` simple.
5. **`VendeloHttpClient.post()` no reintenta en `5xx`** para `/v1/admin/orders` (parámetro `retryOn5xx: false`) — Vendelo no trata `external_order_id` como key única, así que un retry sobre un 5xx puede crear una orden duplicada si la primera request sí fue procesada. Sigue reintentando en `429` y errores de red.

También carga `product: { select: { sku, name } }` al construir el `domainOrder`, para que `VendeloService` envíe el SKU y nombre comerciales reales en `line_items` (antes enviaba el cuid interno de Prisma).

### `WompiReconciliationService` — Reconciliación de pagos

Cubre el escenario donde Wompi procesó el pago pero su webhook **nunca llegó** al servidor
(falla de red, reinicio, misconfiguration temporal).

```
┌──────────────────────────────────────────────────────────┐
│  setInterval cada 15 min                                 │
│                                                          │
│  Busca: status=PENDING + provider=WOMPI                  │
│         + createdAt < (now - 15 min)                     │
│         + payment.externalId IS NOT NULL                 │
│                                                          │
│  Por cada pedido:                                        │
│    WompiService.getTransactionStatus(externalId)         │
│    → Si APPROVED → ConfirmPayment use case               │
│    → Si DECLINED → Order.status = CANCELLED             │
│    → Si PENDING  → ignorar (aún procesando)              │
└──────────────────────────────────────────────────────────┘
```

> El batch size máximo por ciclo es 20 pedidos para evitar sobrecarga en el primer
> arranque tras un período de inactividad del servidor.

---

## 11. API NestJS — Referencia completa

Base URL: `http://localhost:3001` (dev) · Documentación interactiva: `http://localhost:3001/api/docs`

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

### Productos (público)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/products` | Público | Lista productos con filtros opcionales |

```
GET /products?category=sistema-electrico&inStock=true&page=1&limit=12
GET /products?search=yamaha&minPrice=5000000&maxPrice=20000000
```

### Pedidos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/orders` | JWT opcional (invitados, throttle 10/min) | Crea pedido y prepara transacción de pago. Devuelve `accessToken` para ver el pedido sin sesión |
| `PATCH` | `/orders/:id/status` | JWT + ADMIN | Actualiza estado manualmente |
| `PATCH` | `/orders/:id/sync-shipment` | JWT + ADMIN | Sincroniza estado de envío con Vendelo |

### Pagos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/payments/wompi/integrity` | Público | Genera firma SHA256 para el widget |
| `POST` | `/payments/wompi/webhook` | Firma Wompi | Webhook IPN de Wompi |
| `POST` | `/payments/mercadopago/create-preference` | JWT | Crea preferencia MP |
| `POST` | `/payments/mercadopago/webhook` | Firma MP | Webhook IPN de Mercado Pago |

### Cupones y reseñas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/coupons/validate` | JWT opcional (throttle 20/min) | Valida un cupón. Invitados: 403 si exige cuenta; enviar `buyer` para cupones de un uso |
| `POST` | `/reviews` | Token firmado del correo (throttle 5/min) | Envía reseña verificada (pedido `DELIVERED`, una por ítem) |
| `GET` | `/admin/reviews?status=` | JWT + ADMIN | Lista reseñas por estado |
| `PATCH` | `/admin/reviews/:id` | JWT + ADMIN | Aprueba / rechaza una reseña |
| `PUT` | `/admin/settings/cro` | JWT + ADMIN | Umbrales de prueba social y estimación de entrega |

### Contacto

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/contact` | Público (throttle 3/min) | Envía un mensaje de PQR por correo a `h2ronlinestore@gmail.com` |

### Health check

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Estado del servidor (`{ status: 'ok', uptime }`) |

### Admin (requieren JWT + rol ADMIN)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/dashboard` | Métricas: revenue, pendientes, stock bajo |
| `POST` | `/admin/products` | Crear producto |
| `PUT` | `/admin/products/:id` | Editar producto |
| `DELETE` | `/admin/products/:id` | Eliminar producto |
| `PATCH` | `/admin/products/:id/stock` | Actualizar stock individual |
| `POST` | `/admin/products/upload-image` | Subir imagen a Cloudinary |
| `PATCH` | `/admin/stock/bulk` | Actualizar stock masivo por SKU |
| `PATCH` | `/admin/settings/mercadopago` | Activar/desactivar Mercado Pago |

### Seguridad global (NestJS)

- **ThrottlerGuard**: 100 req/min global. Login → 10/min. Registro → 5/min.
- **JwtAuthGuard**: todas las rutas requieren JWT salvo las marcadas `@Public()`.
- **RolesGuard**: rutas admin verifican `role === 'ADMIN'`.
- **Helmet** + compresión en todos los responses.
- **CORS**: en producción solo acepta `FRONTEND_URL`. En desarrollo acepta localhost y dominios ngrok configurados.

---

## 12. Variables de entorno

### `apps/api/.env`

```bash
# ── Base de datos ──────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=verify-full"

# ── JWT ────────────────────────────────────────────────────────────────────────
# Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
JWT_SECRET=
JWT_EXPIRES_IN=7d

# ── Google OAuth ───────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Wompi ──────────────────────────────────────────────────────────────────────
WOMPI_PUBLIC_KEY=pub_test_xxxx
WOMPI_PRIVATE_KEY=prv_test_xxxx
WOMPI_INTEGRITY_SECRET=test_integrity_xxxx
WOMPI_EVENTS_SECRET=test_events_xxxx
WOMPI_ENV=sandbox                          # sandbox | production

# ── Mercado Pago ───────────────────────────────────────────────────────────────
MP_ACCESS_TOKEN=TEST-xxx
MP_PUBLIC_KEY=TEST-xxx
MP_WEBHOOK_SECRET=

# ── Vendelo (logística) ────────────────────────────────────────────────────────
VENDELO_API_URL=https://api.venndelo.com   # la doble "n" no es typo: es la URL real
VENDELO_API_KEY=
VENDELO_WEBHOOK_SECRET=
# Datos del comercio → pickup_info de cada pedido Vendelo. VENDELO_STORE_NAME es
# el remitente que se imprime en la guía.
VENDELO_STORE_NAME=H2r Online Store
VENDELO_STORE_PHONE=
VENDELO_STORE_ADDRESS=
VENDELO_STORE_CITY_CODE=                   # DIVIPOLA de 8 dígitos (ej. 68001000 = Bucaramanga)
VENDELO_STORE_SUBDIVISION_CODE=            # Debe corresponder a la ciudad (ej. 68 para 68001000)
# Peso/dimensiones por defecto cuando el producto no los tiene cargados
VENDELO_DEFAULT_WEIGHT_KG=1
VENDELO_DEFAULT_HEIGHT_CM=25
VENDELO_DEFAULT_WIDTH_CM=25
VENDELO_DEFAULT_LENGTH_CM=10

# ── Email (Resend) ─────────────────────────────────────────────────────────────
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=no-reply@electromotos-tony.co

# ── Imágenes (Cloudinary) ──────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── App ────────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# ── Seguridad interna (NextAuth ↔ NestJS) ──────────────────────────────────────
# Debe coincidir exactamente con apps/web/.env.local
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
INTERNAL_API_SECRET=
```

### `apps/web/.env.local`

```bash
# ── Base de datos (Server Components acceden directo a Prisma) ─────────────────
DATABASE_URL="postgresql://..."

# ── NestJS API ─────────────────────────────────────────────────────────────────
API_URL=http://localhost:3001              # server-side (NextAuth, Server Actions)
NEXT_PUBLIC_API_URL=http://localhost:3001  # client-side (componentes React)

# ── NextAuth ───────────────────────────────────────────────────────────────────
# Generar con: openssl rand -base64 32
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# ── Seguridad interna ──────────────────────────────────────────────────────────
# Debe coincidir exactamente con apps/api/.env
INTERNAL_API_SECRET=

# ── Google OAuth ───────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Wompi (key pública para el cliente) ───────────────────────────────────────
WOMPI_PUBLIC_KEY=pub_test_xxxx

# ── Cloudinary ─────────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── WhatsApp ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_WHATSAPP_NUMBER=573XXXXXXXXX  # Sin espacios ni guiones
```

### `packages/database/.env`

```bash
# Necesario para pnpm db:seed y pnpm db:studio
DATABASE_URL="postgresql://..."
```

> **Nota de seguridad:** `INTERNAL_API_SECRET` debe tener al menos 32 caracteres.
> `WOMPI_EVENTS_SECRET` y `WOMPI_INTEGRITY_SECRET` son obligatorios; el servidor no
> arranca si están vacíos (validación en `main.ts`).

---

## 13. Instalación y ejecución local

### Requisitos previos

- **Node.js 20+**
- **pnpm 9+** — `npm install -g pnpm`
- Una base de datos PostgreSQL accesible (se recomienda [Neon](https://neon.tech) en desarrollo)

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd electro-motos-tdk

# 2. Instalar dependencias de todo el monorepo
pnpm install

# 3. Crear los archivos de entorno a partir de los ejemplos
cp apps/api/.env.example         apps/api/.env
cp apps/web/.env.local.example   apps/web/.env.local
cp packages/database/.env.example packages/database/.env
# Luego completar los valores reales en cada archivo

# 4. Generar el cliente Prisma
pnpm --filter @h2r/database generate

# 5. Aplicar migraciones
pnpm --filter @h2r/database exec prisma migrate deploy

# 6. Poblar la base de datos con datos de prueba
pnpm run db:seed

# 7. Levantar el backend — NestJS en :3001
pnpm --filter @h2r/api dev

# 8. Levantar el frontend — Next.js en :3000 (otra terminal)
pnpm --filter @h2r/web dev
```

### Comandos de referencia

```bash
# ── Monorepo ───────────────────────────────────────────────────────────────────
pnpm dev                                        # Levanta web + api en paralelo
pnpm build                                      # Build completo con Turborepo
pnpm lint                                       # ESLint en todo el monorepo
pnpm type-check                                 # tsc --noEmit en todos los paquetes

# ── Base de datos ──────────────────────────────────────────────────────────────
pnpm run db:seed                                # Re-ejecutar seed
pnpm run db:studio                             # Prisma Studio en :5555
pnpm --filter @h2r/database exec prisma migrate dev --name <nombre>
pnpm --filter @h2r/database generate           # Regenerar cliente Prisma

# ── Tests ──────────────────────────────────────────────────────────────────────
pnpm --filter @h2r/domain test                 # Tests unitarios del dominio
pnpm --filter @h2r/api test                    # Tests unitarios del API
pnpm --filter @h2r/domain exec vitest run --coverage  # Cobertura (umbral: 80%)

# ── Build individual ───────────────────────────────────────────────────────────
pnpm --filter @h2r/api build                   # Build NestJS → dist/main.js
pnpm --filter @h2r/web build                   # Build Next.js

# ── Swagger ────────────────────────────────────────────────────────────────────
# http://localhost:3001/api/docs  (solo disponible con NODE_ENV=development)
```

---

## 14. Despliegue en producción

### API → Railway

```bash
# Build command
pnpm install --frozen-lockfile && \
  pnpm --filter @h2r/database generate && \
  pnpm --filter @h2r/api build

# Start command
node apps/api/dist/main.js
```

Variables de entorno requeridas en Railway: todas las de `apps/api/.env` con valores
de producción. Cambiar `WOMPI_ENV=production`, `NODE_ENV=production` y `FRONTEND_URL`
al dominio real de Vercel.

### Web → Vercel

```bash
# Build command
pnpm install --frozen-lockfile && \
  pnpm --filter @h2r/database generate && \
  pnpm --filter @h2r/web build
```

Configurar en el panel de Vercel: Framework `Next.js`. Variables de entorno de
`apps/web/.env.local` con valores de producción.

### Webhooks en producción

Configurar en el panel de Wompi (sandbox/producción):

```
Webhook URL: https://tu-api.railway.app/payments/wompi/webhook
```

Para desarrollo local con webhooks reales:

```bash
ngrok http 3001
# Usar la URL pública generada en el panel de Wompi sandbox
# Ejemplo: https://abc123.ngrok.io/payments/wompi/webhook
```

---

## 15. Credenciales de prueba

Después de ejecutar `pnpm run db:seed`:

### Administrador del sistema

| Campo | Valor |
|---|---|
| Email | `admin@electromotos-tony.co` |
| Contraseña | `Admin123!` |
| Panel | `http://localhost:3000/admin` |

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
| Nombre | Cualquier nombre |

---

## 16. Panel de administración

Acceso exclusivo para usuarios con rol `ADMIN`. URL: `http://localhost:3000/admin`

| Ruta | Funcionalidad |
|---|---|
| `/admin` | Dashboard: ingresos del día, pedidos pendientes, stock bajo |
| `/admin/productos` | Lista de productos — crear, editar, mover a papelera |
| `/admin/productos/papelera` | Productos eliminados — restaurar desde la papelera |
| `/admin/productos/[id]` | Formulario de edición con upload a Cloudinary |
| `/admin/pedidos` | Todos los pedidos filtrados por estado + columna "Guía" y sección **Guía Vendelo** en el modal de detalle (reintentar despacho, generar guía, descargar PDF — ver [9.4](#94-apartado-guía-vendelo-en-el-panel-admin)) |
| `/admin/stock` | Productos con stock ≤ 5, actualización individual de stock |
| `/admin/sync` | Sincroniza stock y precio con el export `.xlsx` de Optimun (local físico) |
| `/admin/resenas` | Moderación de reseñas verificadas (pendientes / aprobadas / rechazadas) |
| `/admin/banners` | Banners del Hero: imagen desktop + imagen mobile, texto alternativo y botón CTA |
| `/admin/configuracion` | Toggles de pasarelas y umbrales de prueba social / estimación de entrega |

### Ayuda contextual (botón ⓘ)

Las secciones del panel admin con flujos no obvios (`/admin/sync`, `/admin/pedidos`,
`/admin/stock`, `/admin/productos/[id]`, `/admin/productos/nuevo`, `/admin/categorias`) tienen un botón ⓘ en la
esquina superior derecha que abre un modal explicando qué hace la sección y los pasos para
usarla — pensado para casos donde la UI por sí sola no transmite el contexto necesario (ej.
sincronización con un sistema externo, reglas de negocio silenciosas, límites no aplicados
realmente).

Patrón reusable en `apps/web/src/components/admin/`:

- `AdminHelpButton.tsx` — componente genérico (botón + modal accesible: cierre con Esc, click
  fuera, o botón ✕). No requiere cambios para agregarlo a una nueva sección.
- `help-content/<seccion>.ts` — un archivo por sección con `{ title, summary, steps[] }`. Para
  páginas con más de un modo (ej. producto nuevo vs. editar) se exportan varias variantes desde
  el mismo archivo y la página elige cuál pasar al componente.

**Nota:** la importación masiva de stock por CSV (`CsvStockImport`) se eliminó — quedó cubierta
por `/admin/sync`, que sincroniza todo el inventario desde el export de Optimun en vez de un
archivo CSV manual.

Para agregar ayuda a una nueva sección: crear `help-content/<seccion>.ts` y renderizar
`<AdminHelpButton content={miSeccionHelpContent} />` junto al `<h1>` de la página.

---

## 17. Roles de usuario

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
# Opción 1: Prisma Studio (recomendado)
pnpm run db:studio
# Tabla User → campo role → cambiar a "ADMIN"

# Opción 2: SQL directo
psql $DATABASE_URL -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'nuevo@admin.co';"
```

### Triple capa de protección admin

```
1. proxy.ts          ← nivel de ruta (antes de renderizar la página)
2. admin/layout.tsx  ← nivel de servidor (al renderizar el layout)
3. NestJS @Roles()   ← nivel de API (antes de cualquier operación en BD)
```

---

## 18. Manejo de precios (centavos COP)

Todos los precios se almacenan en **centavos enteros** para evitar errores de punto flotante.

```
Precio visible:   $85.000 COP  →  BD: 8.500.000
Precio visible: $1.580.000 COP  →  BD: 158.000.000
```

```typescript
// Mostrar al usuario
new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0
}).format(cents / 100)   // 8500000 → "$85.000"

// Guardar desde formulario admin
Math.round(parseFloat(inputValue) * 100)   // "85000" → 8500000
```

> Los procesadores de pago (Wompi, Mercado Pago) también usan la unidad mínima de la
> moneda en sus APIs (`amount_in_cents`), lo que hace que esta convención sea natural.

---

## 19. Detalles técnicos: Wompi

### Firma de integridad

```
SHA256( reference + amountInCents + "COP" + WOMPI_INTEGRITY_SECRET )
```

La firma la calcula el servidor (NestJS) y **nunca expone el secret al cliente**.
Sin esta firma, un usuario podría manipular el monto en la URL de pago.

### Validación de webhook

```
SHA256( properties_joined + timestamp + WOMPI_EVENTS_SECRET )
```

Si la firma del header no coincide → `401 Unauthorized`. Previene que terceros
falsifiquen eventos de pago hacia el servidor.

### Idempotencia

```typescript
if (order.status !== 'PENDING') return ok(undefined)  // ya procesado
```

Wompi puede reenviar el mismo webhook múltiples veces. El use case `ConfirmPayment`
es completamente idempotente. Adicionalmente, `PrismaOrderRepository.transitionFromPending()`
usa una transacción atómica con `updateMany({ where: { id, status: 'PENDING' } })` —
si `count === 0` indica que otro proceso ya lo procesó.

### Reconciliación activa

Si el webhook nunca llega, `WompiReconciliationService` consulta activamente el estado
de la transacción cada 15 minutos. Ver [sección 10](#10-servicios-de-background-colas-y-reconciliación).

---

## 20. Detalles técnicos: Mercado Pago

| Aspecto | Wompi | Mercado Pago |
|---|---|---|
| Experiencia | URL directa (mismo efecto que widget) | Redirect completo a MP |
| Validación webhook | SHA256 events secret | HMAC-SHA256 (header `x-signature`) |
| Estado en webhook | Incluido en el evento | Requiere consultar la API de MP |
| Activación | Siempre disponible | Toggle en admin → Configuración |
| Habilitación | `WOMPI_ENV=sandbox/production` | `Settings.MERCADOPAGO_ENABLED=true` |

### Mapeo de estados MP → dominio

| Mercado Pago | Estado en dominio |
|---|---|
| `approved` / `authorized` | `APPROVED` |
| `pending` / `in_process` / `in_mediation` | `PENDING` |
| `rejected` | `DECLINED` |
| `cancelled` / `refunded` / `charged_back` | `VOIDED` |
| cualquier otro | `ERROR` |

---

## 21. Preguntas frecuentes

**¿Por qué hay dos apps separadas (Next.js + NestJS)?**
> Clean Architecture con separación real de capas. Next.js maneja SSR y la sesión del
> browser. NestJS maneja la lógica de negocio, autenticación JWT y webhooks. Ambas
> comparten el dominio y la base de datos sin duplicar código.

**¿Por qué los Server Components acceden directo a Prisma en lugar de llamar al API?**
> En un monorepo donde ambas apps comparten la misma BD, el SSR puede ir directo a Prisma
> sin overhead HTTP. Las operaciones que necesitan lógica de negocio (checkout, pagos,
> admin) sí pasan por NestJS.

**¿Por qué `proxy.ts` en vez de `middleware.ts`?**
> En Next.js 16 el archivo fue renombrado. Corre en Node.js runtime (no Edge), lo que
> permite usar NextAuth con sesiones JWT sin restricciones del Edge Runtime.

**¿Por qué los precios en centavos si en Colombia no hay centavos?**
> Evita errores de punto flotante en JavaScript. Los procesadores de pago (Wompi, Stripe,
> Mercado Pago) también usan la unidad mínima de la moneda.

**¿Por qué JWT en vez de database sessions con NextAuth?**
> El proveedor `credentials` de NextAuth requiere JWT cuando se combina con PrismaAdapter.
> Con database sessions, NextAuth falla al insertar en la tabla `Session` al hacer
> `signIn('credentials', ...)`.

**¿Cómo probar webhooks localmente?**

```bash
ngrok http 3001
# URL generada → panel Wompi sandbox → Webhook URL:
# https://abc123.ngrok.io/payments/wompi/webhook
```

**¿Cómo activar Mercado Pago?**
> Panel `/admin/configuracion` → activar el toggle. Esto guarda `MERCADOPAGO_ENABLED=true`
> en la tabla `Settings`. Para desactivarlo, apagar el toggle o ejecutar:
>
> ```bash
> psql $DATABASE_URL -c "UPDATE \"Settings\" SET value = 'false' WHERE key = 'MERCADOPAGO_ENABLED';"
> ```

**¿Qué pasa si el despacho a Vendelo falla?**
> El pedido queda en la tabla `VendeloOrderQueue` con `status=PENDING` y se reintenta
> automáticamente hasta 3 veces con backoff exponencial. Si los 3 intentos fallan,
> el registro queda en `status=FAILED` para revisión manual en Prisma Studio.

**¿Cómo forzar la reconciliación de un pago Wompi pendiente?**
> La reconciliación automática corre cada 15 minutos. Para forzarla manualmente:
>
> ```bash
> # Llamar al endpoint interno (requiere JWT admin)
> curl -X POST http://localhost:3001/admin/payments/reconcile \
>   -H "Authorization: Bearer <token>"
> ```

---

## 22. Optimización de conversión (CRO)

Conjunto de mejoras orientadas a aumentar la conversión y reducir la fricción de compra.
Se implementan por fases; cada fase es independiente salvo la 5 (depende de la 4).

> **Marco legal (Ley 1480 de 2011 — Estatuto del Consumidor / SIC):** toda la prueba social y
> el precio de referencia se construyen **solo con datos reales**. El precio tachado debe ser un
> precio efectivamente cobrado (respaldo en `ProductPriceHistory`), el contador de ventas sale de
> pedidos confirmados y las reseñas solo pueden escribirlas compradores verificados.

### 22.1 Precio ancla (`compareAtPrice`)

| Campo | Tipo | Regla |
|---|---|---|
| `Product.compareAtPrice` | `Int?` (centavos) | `NULL` = sin ancla. `CHECK (compareAtPrice IS NULL OR compareAtPrice > price)` |
| `ProductPriceHistory` | tabla | una fila por cada cambio de `price`/`compareAtPrice` (`source`: `ADMIN_CREATE` · `ADMIN_UPDATE` · `ERP_SYNC`) |
| `OrderItem.compareAtPriceAtPurchase` | `Int?` | snapshot para mostrar "Ahorraste $X" en el pedido |

- **Dominio:** `validateProductPricing()` y `getDiscountPercent()` en `entities/Product.ts`.
- **Sync Optimun:** si el ERP sube el precio a un valor ≥ `compareAtPrice`, `SyncStock` limpia el
  ancla (`compareAtPrice = null`) en la misma actualización — el `CHECK` nunca rompe la sincronización.
- **UI:** componente `PriceTag` (precio tachado sutil + precio real grande en negrita + badge `-X%` en el azul de la marca, `sky-500`)
  en tarjeta de catálogo, PDP, carrito y checkout. El JSON-LD `Offer` publica solo `price`.
- **Cupones:** el descuento siempre se calcula sobre `price`, nunca sobre `compareAtPrice`.

### 22.2 Hero Banner visual (mobile-first)

`HeroBanner` pierde `title`, `description` e `imageUrl` y gana:

| Campo | Uso |
|---|---|
| `desktopImageUrl` / `desktopImagePublicId` | imagen horizontal (≈ 21:9) — viewport ≥ 768 px |
| `mobileImageUrl` / `mobileImagePublicId` | imagen vertical (≈ 4:5) — viewport < 768 px |
| `altText` | texto alternativo obligatorio (accesibilidad/SEO); no se muestra en pantalla |
| `ctaLabel` | texto del botón (default "Comprar ahora") |
| `ctaUrl` | **obligatorio** — destino del botón |

El carrusel usa `<picture>` con `getImageProps()` de Next (art direction) y ya no muestra texto
superpuesto ni el botón "Explorar todo" (`/catalogo?showAll=true`). La migración copia la imagen
existente a ambos campos; el admin debe subir luego la versión vertical. **Deploy:** la migración
elimina columnas usadas por la versión anterior — desplegar web y API junto con `migrate deploy`.

### 22.3 Prueba social en la PDP

| Elemento | Fuente | Se muestra cuando |
|---|---|---|
| "🔥 +X personas han comprado o recomiendan este producto" | `Product.storeRecommendations` (clientes de la tienda física, lo ingresa el admin en el formulario de producto) + `Product.soldCount` (ventas online: se incrementa al confirmar el pago; COD al crear) | `total ≥ SOCIAL_PROOF_MIN_SOLD` (Settings, default 5) |
| "¡Solo quedan X unidades en stock!" | `Product.stock` | `0 < stock < LOW_STOCK_URGENCY_THRESHOLD` (default 5) |
| Badge "Pago seguro" | estático (Wompi / Mercado Pago) | siempre, bajo el botón de compra |
| Línea de tiempo **Pedido → Enviado → Entregado** — bajo los botones de compra (carrito y Addi) | `estimateDeliveryWindow()` (dominio) — días hábiles, festivos colombianos (Ley Emiliani) y hora de corte | siempre que haya stock. Settings: `SHIPPING_ETA_MIN_DAYS` (2), `SHIPPING_ETA_MAX_DAYS` (5), `SHIPPING_CUTOFF_HOUR` (14) |
| Estrellas + "X% de clientes recomiendan este producto" | `ProductReview` aprobadas | `reseñas ≥ REVIEWS_MIN_COUNT` (default 3) |

`soldCount` se decrementa si el envío termina `RETURNED`/`CANCELLED` (mismo punto donde se repone stock).
La migración inicializa `soldCount` con las unidades de pedidos `PAID`/`SHIPPED`/`DELIVERED`.

Todos los umbrales se editan en `/admin/configuracion` (`PUT /admin/settings/cro`, tag de caché `settings`).
La fecha de entrega se calcula **en el cliente** (`DeliveryEstimate` con `useSyncExternalStore`): la PDP es ISR
y una fecha calculada en el servidor podría servirse horas después.

**Línea de tiempo de entrega** (`DeliveryEstimate.tsx`) — tres hitos con icono, etiqueta y fecha,
unidos por conectores punteados que se completan de color en bucle:

| Hito | Fecha que muestra | Campo de `estimateDeliveryWindow()` |
|---|---|---|
| Pedido | "Hoy" | — |
| Enviado | despacho … despacho + 1 hábil (un pedido del sábado despacha el lunes: "máximo dos días") | `dispatchDate` … `dispatchTo` |
| Entregado | despacho + `minDays` … + `maxDays` hábiles | `from` … `to` |

Las líneas animadas son CSS puro (`@keyframes deliveryTrackFill` + clases `.delivery-track*` en
`globals.css`): una capa punteada gris de fondo y otra en `sky-500` recortada con `clip-path`, que
solo anima composite (sin layout). La segunda línea lleva 0.8 s de retraso para leerse como progreso.
Con `prefers-reduced-motion: reduce` la animación se apaga y las líneas quedan fijas.
Mientras no hay fechas (SSR + primer render) se pinta la misma estructura con placeholders, así la
hidratación no mueve el layout.

### 22.4 Guest checkout (compra sin cuenta)

- `Order.userId` pasa a **opcional** (FK `ON DELETE SET NULL`). Nuevos campos:
  `contactEmail` (destino de **todos** los correos del pedido, invitado o registrado) y
  `buyerIdKey` (documento normalizado con `normalizeBuyerIdKey`: `CC:1000123456`, `NIT:900123456`
  sin dígito de verificación, `CE:E12345AB`). El teléfono sigue en `shippingAddress.phone`.
- `/checkout` deja de exigir sesión (`proxy.ts` solo protege `/admin`). `POST /orders` y
  `POST /coupons/validate` usan `@OptionalAuth()`: sin header `Authorization` la request es de un
  invitado; con header, el JWT se valida normalmente (un token vencido da 401, no degrada a invitado).
- **Acceso al pedido sin sesión:** token determinista
  `HMAC-SHA256(INTERNAL_API_SECRET, "order-access:" + orderId)` (`apps/api/src/shared/order-access-token.ts`
  y su gemelo `apps/web/src/lib/order-access-token.ts`). No se guarda en BD: la cola de correos
  regenera el enlace `/checkout/confirmacion?orderId=…&token=…` cuando quiera. Lo aceptan la página de
  confirmación, el poller de estado y `/api/orders/[id]/comprobante`.
- Los webhooks de Wompi/Mercado Pago y `VendeloOrderQueueService` usan `order.contactEmail` en vez de
  buscar el email del usuario.
- El carrito de invitado vive en `localStorage["electro-motos-cart-guest"]`; `<GuestCartMerger />`
  lo fusiona con el carrito del usuario al iniciar sesión.
- Pendiente (no implementado): vincular automáticamente los pedidos de invitado a una cuenta creada
  después con el mismo email.

### 22.5 Reglas de cupones con invitados

`Coupon.allowGuest` (default `false`) — por defecto todo cupón exige cuenta.

| Restricción | Con cuenta | Invitado |
|---|---|---|
| `NONE` (sin límite por cliente) | ✅ | ✅ solo si `allowGuest` |
| `ONCE_PER_CUSTOMER` | ✅ — no usado por su `userId` **ni** por su documento | ✅ solo si `allowGuest` — no usado por su documento |
| `FIRST_PURCHASE` | ✅ — sin pedidos confirmados por `userId` ni por documento | ❌ siempre exige cuenta |

Invariante: `restriction = FIRST_PURCHASE ⇒ allowGuest = false` (validado en API).

**`CouponRedemption`** registra cada uso, en la misma transacción que el pedido:
`RESERVED` al crear el pedido (COD nace `CONFIRMED`) → `CONFIRMED` cuando el webhook aprueba el pago →
`RELEASED` si el pedido se cancela (webhook rechazado, cleanup de pedidos expirados o admin).

Concurrencia: la columna `activeUniqueKey String? @unique` vale `"couponId:buyerIdKey"` mientras el uso
está activo en cupones con restricción por cliente, y `null` en cupones `NONE` o al liberarse (Postgres
admite múltiples `NULL`). Dos pedidos simultáneos con el mismo cupón y documento chocan en el `@unique`
y el repositorio lo traduce a `AppError('VALIDATION_ERROR', 'Ya utilizaste este cupón')`. Se eligió en
lugar de un índice único parcial porque Prisma no los representa y `migrate dev` los detectaría como drift.
La migración crea un uso por cada pedido histórico con cupón.

El admin activa "Permitir sin cuenta (invitados)" en `/admin/cupones`; el checkbox se deshabilita para
"Solo primera compra".

### 22.6 Reseñas verificadas

`ProductReview` (`rating` 1–5 con `CHECK`, `recommends`, `comment?`, `authorName`, `status`
`PENDING | APPROVED | REJECTED`), única por `OrderItem` y solo para pedidos `DELIVERED` →
solo compradores reales. El nombre público se deriva del destinatario ("Carlos P.").

- **Solicitud por correo:** `ReviewRequestService` (cada hora) busca pedidos `DELIVERED` sin
  `Order.reviewRequestedAt`, creados hace ≥ `REVIEW_REQUEST_MIN_DAYS` (default 7) y ≤ 60 días, marca
  el pedido con un `updateMany` condicionado (idempotente entre instancias) y encola en `EmailQueue`
  con `kind = REVIEW_REQUEST` — hereda los reintentos de la cola. La migración marca como ya
  solicitados los pedidos entregados de hace más de 30 días.
- **Enlace:** `/resena/[orderItemId]?token=…` con `HMAC(INTERNAL_API_SECRET, "review:" + orderItemId)`
  — prefijo distinto al del pedido, un token no sirve para el otro. Funciona para invitados.
- **Moderación:** `/admin/resenas`; aprobar/rechazar invalida el tag `products`.
- **PDP:** estrellas + "X % de clientes recomiendan este producto" junto al título y sección
  `#resenas` con las 6 más recientes, solo si hay ≥ `REVIEWS_MIN_COUNT` aprobadas. JSON-LD
  `Product` con `AggregateRating` bajo la misma condición.

### 22.7 Despliegue

Migraciones (en orden): `20260916000000_product_compare_at_price`, `…0100_hero_banner_visual`,
`…0200_product_sold_count`, `…0300_guest_checkout_coupons`, `…0400_product_reviews`.

- La migración del Hero **elimina** `title`/`description`/`imageUrl`: aplicar `migrate deploy` y
  desplegar web y API juntas.
- `INTERNAL_API_SECRET` ya era obligatoria; ahora además firma los enlaces de pedido y de reseña —
  rotarla invalida los enlaces enviados por correo.
- Nueva variable opcional de la API: `REVIEW_REQUEST_MIN_DAYS` (default 7).

---

## 23. Imágenes de OpenGraph por categoría

Al compartir un enlace del catálogo (`/catalogo?category=<slug>`), la vista previa (WhatsApp,
Facebook, X, etc.) muestra la imagen de esa categoría o subcategoría.

- **Fuente de verdad:** `apps/web/src/lib/opengraph.ts` → `CATEGORY_OG_IMAGES` (slug → archivo en
  `apps/web/public/assets/opengraph/`). El mapa es explícito porque varios archivos no se llaman
  igual que su slug (ej. `repuestos` → `respuestos.jpg`, `exploradores` → `exploradoras.jpg`).
- **Fallback:** cualquier categoría o subcategoría sin entrada en el mapa, la búsqueda, el catálogo
  general y el resto del sitio usan `op-image.jpg`. Una subcategoría sin imagen **no** hereda la del padre.
- **Por qué no hay `app/opengraph-image.png`:** en Next.js la metadata por archivo tiene prioridad sobre
  `generateMetadata`, así que ese archivo tapaba las imágenes dinámicas. La imagen global se declara
  en `openGraph.images` del layout raíz.
- `openGraph` de una página **reemplaza** el del layout (no se fusiona): usar siempre
  `buildOpenGraph()` para conservar `type`, `locale` y `siteName`.
- Las URLs son absolutas vía `metadataBase` (`NEXT_PUBLIC_SITE_URL`), requisito de los scrapers.

**Agregar la imagen de una categoría:** subir el archivo a `public/assets/opengraph/` y añadir la
entrada `slug → archivo` en `CATEGORY_OG_IMAGES`. Todas las imágenes de categoría deben ser **JPEG de
1280 × 560 px** (el tamaño se declara una sola vez en `CATEGORY_OG_SIZE`). La global `op-image.jpg` es JPEG de 1200 × 630 (tamaño recomendado por las redes).

---

## 24. Buscador del catálogo

El buscador (barra del Navbar, overlay móvil, `/catalogo?search=`, sugerencias y filtro del admin)
usa **un único motor** en memoria, sin dependencias externas ni cambios de esquema.

```
Consulta ──► normalizar ──► tokens ──► índice en memoria ──► ranking ──► paginación ──► Prisma (por id)
              (tildes,       (ns200 →   (productos activos,    (nombre >
              mayúsculas,     ns 200)    cache 5 min, tags      SKU > cat.)
              símbolos)                  products+categories)
```

- **Lógica pura** (testeable): `packages/domain/src/search/` — `normalizeText`, `tokenize`, `stem`,
  `buildSearchDoc`, `searchDocs`. Sin Prisma ni Next.
- **Índice**: `apps/web/src/lib/search-index.ts` — carga producto + categoría + categoría padre +
  compatibilidad de motos, y lo cachea con `unstable_cache` (tags `products` y `categories`).
  El admin (`includeInactive`) lo reconstruye sin caché para ver cambios al instante.
- **Qué se indexa**: nombre, SKU, categoría y subcategoría, marca/modelo de moto compatible
  (hace de "etiquetas": no existe campo `tags`) y descripción (peso bajo, sin fuzzy).
- **Reglas**: ignora tildes/mayúsculas/símbolos; separa letras de números (`ns200` = `ns 200`,
  `10w40` = `10w-40`); singular/plural (`ramales` = `ramal`); typos de 1–2 letras en palabras de
  4+ letras (nunca en números: `200` ≠ `250`); prefijo mientras se escribe; todas las palabras
  deben coincidir (AND) en algún campo.
- **UX**: cada búsqueda nueva desde el buscador navega a `/catalogo?search=<texto>` **sin** conservar
  categoría, precio ni stock de la búsqueda anterior. El drawer de filtros sí refina la búsqueda actual.
- Ya no existe el mapa `CATEGORY_KEYWORDS` (slugs de categoría fijos en código): las categorías
  nuevas se vuelven buscables solas porque su nombre entra al índice.

---

## 25. Pop-up promocional y swipe del Hero

### 25.1 Pop-up promocional (modal de la home)

Modal superpuesto que aparece al entrar a la home. Se administra en `/admin/promocion` y reutiliza la
arquitectura del Hero Banner (dos imágenes + destino + texto alternativo).

**Datos — `PromoModal` (fila única, `id = "default"`):**

| Campo | Uso |
|---|---|
| `isActive` | Switch de activación. `false` = no se muestra nada en la home |
| `desktopImageUrl` / `desktopImagePublicId` | Imagen horizontal (sugerido 1200 × 800 px), viewport ≥ 768 px |
| `mobileImageUrl` / `mobileImagePublicId` | Imagen vertical (sugerido 900 × 1200 px), viewport < 768 px |
| `altText` | Texto alternativo (accesibilidad y SEO) |
| `ctaUrl` | Destino al hacer clic: categoría, subcategoría, producto o URL libre |
| `updatedAt` | Versión del modal: al cambiarlo, vuelve a mostrarse a quien ya lo había cerrado |

Una sola fila: el admin edita la promoción vigente en lugar de acumular registros. Las imágenes viven en
Cloudinary (`h2r-online-store/promo-modal`); al reemplazar una variante se borra la anterior del CDN salvo que
la otra variante siga usándola.

**Frontend (`PromoModal.tsx`, client component):**

- Overlay centrado con fondo atenuado; la imagen completa es un enlace al destino.
- Cierre con la X, clic en el fondo o tecla `Esc`. Al abrir se bloquea el scroll del body y el foco pasa al
  botón de cerrar; al cerrar, el foco vuelve al elemento anterior.
- `<picture>` + `getImageProps()` (art direction): imagen vertical en móvil y horizontal en escritorio.
- **Frecuencia:** `localStorage["promo-modal-seen"]` guarda la versión (`updatedAt`) y la fecha en que se cerró.
  No se vuelve a mostrar hasta que pasen 24 h o el admin publique una promoción distinta. Si `localStorage`
  falla (modo privado), el modal simplemente se muestra.

**Destino del enlace:** el admin elige tipo (catálogo, categoría/subcategoría, producto o enlace libre) y el
formulario arma el `ctaUrl` (`/catalogo?category=<slug>`, `/producto/<slug>`, etc.), igual que en los banners.

**Caché:** `getCachedPromoModal()` con tag `promo`; guardar en el admin invalida ese tag.

### 25.2 Swipe táctil en el carrusel del Hero

El carrusel soporta gestos en móvil con eventos táctiles nativos (sin librerías): un desplazamiento
horizontal de más de 50 px cambia de slide, y los verticales se ignoran para no bloquear el scroll de la
página. El autoplay se pausa mientras el dedo está sobre el carrusel y los puntos de paginación siguen
sincronizados.

---

## 26. Proyecto SEO / GEO / CRO

Trabajo por fases para llevar la tienda a rankear en Google Colombia, ser citada por asistentes de IA y
convertir mejor. Toda la documentación vive en `docs/seo/`:

| Archivo | Qué contiene |
|---------|--------------|
| `AGENT-BRIEF.md` | Prompt maestro: rol, contexto de negocio, reglas no negociables y las 8 fases |
| `ROADMAP.md` | Estado de cada fase — se actualiza al cerrar cada una |
| `00-auditoria.md` | **Fase 0**: auditoría medida del sitio en producción (rutas, metadatos, indexación, JSON-LD, Lighthouse móvil, crawlers de IA, modelo de datos y conversión) |
| `HUMAN_TASKS.md` | Todo lo que el agente no puede hacer: decisiones de negocio, datos verificados y accesos externos |

**Reglas del proyecto** (detalle en el brief): nunca inventar compatibilidades, referencias OEM, precios,
stock, reseñas ni tiempos de envío — lo que falte se marca `TODO(humano)` y se registra en `HUMAN_TASKS.md`;
migraciones de Prisma siempre aditivas y reversibles; sin patrones oscuros de conversión; y aprobación
explícita antes de cambiar URLs ya indexadas.

### 26.1 Estado — Fase 0 terminada (2026-09-22)

Auditoría de solo lectura, sin cambios en el código de la aplicación. Los hallazgos que mandan la
priorización:

1. `/catalogo` pesa **31,8 MB**: `/assets/video-hero-catalog.mp4` son 30 MB (94 % del total) y además es el
   elemento LCP, que llega a 6,8 s en móvil.
2. **No existe ni un solo `canonical`** en el sitio y ningún filtro del catálogo (`?page`, `?search`,
   `?minPrice`, `?maxPrice`, `?inStock`, `?showAll`) lleva `noindex`.
3. **`robots.txt` devuelve 404** — no hay `robots.ts` en el repo.
4. **No hay sistema de compatibilidad por modelo de moto**: `MotorcycleCompatibility` está sin uso y lo único
   vivo es `ProductCompatibilityItem`, texto libre que escribe el admin.
5. El único JSON-LD del sitio es `Product` en la PDP: faltan `Organization`, `WebSite`, `BreadcrumbList`,
   `ItemList` y `FAQPage` (este último con el FAQ que ya es visible en la home).

Lo que ya está bien y no se toca: ningún crawler de IA bloqueado (verificado con `curl` para GPTBot,
OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Bingbot y Googlebot), HTML completo con precio y stock
sin ejecutar JavaScript, TTFB de 70-80 ms, CLS en 0, cero bloqueo por scripts de terceros, `noindex` correcto
en todo el área transaccional y prueba social de producto basada en datos reales (`soldCount` y reseñas
verificadas por compra).

Lighthouse móvil (2026-09-22, producción):

| Plantilla | Rendimiento | SEO | LCP | CLS | TBT | Peso |
|-----------|-------------|-----|-----|-----|-----|------|
| Home | 80 | 91 | 4,3 s | 0 | 160 ms | 888 KB |
| Catálogo | 72 | 100 | 6,8 s | 0 | 100 ms | 31.803 KB |
| Producto | 88 | 100 | 3,4 s | 0 | 30 ms | 487 KB |

**Pendiente de decisión del negocio:** `components/store/SocialProof.tsx` muestra en la home cuatro
testimonios con nombre propio etiquetados "Cliente verificado" y las cifras "500+ clientes satisfechos",
"1.200+ repuestos vendidos" y "98% recomendación", todo escrito a mano en el código. Si no corresponden a
clientes y pedidos reales hay que alimentarlos desde `ProductReview` o retirarlos (tarea H-01).

La Fase 1 (base técnica de SEO) no arranca hasta que se apruebe la auditoría.

### 26.2 Fase 1 — Base técnica de SEO (2026-09-22)

Detalle completo en `docs/seo/01-resultados.md`. Sin migraciones de base de datos.

**Nuevas rutas generadas:**

| Ruta | Qué sirve |
|------|-----------|
| `/robots.txt` | `app/robots.ts` — antes devolvía 404 |
| `/sitemap.xml` | Índice de sitemaps (antes era una lista de 128 URLs) |
| `/sitemap-paginas.xml` | Home, catálogo, contacto y las 4 legales (7 URLs) |
| `/sitemap-categorias.xml` | Una URL por categoría con productos (25 URLs) |
| `/sitemap-productos.xml` | Productos activos, con y sin stock (132 URLs) |

**`lib/seo.ts` — fuente única de verdad del SEO técnico.** Define el host canónico
(`https://www.tiendah2r.com`, sin barra final), `canonical()` (emite `<link rel="canonical">` + `hreflang`
`es-CO` y `x-default`) y `catalogSeo()`, que decide qué URL del catálogo entra al índice:

| URL | Indexación |
|-----|------------|
| `/catalogo` y `/catalogo?category=<slug>` (con su paginación) | indexable, canonical a sí misma |
| `?search=` | `noindex, follow` — texto libre, espacio de rastreo infinito |
| `?minPrice=` `?maxPrice=` `?inStock=` `?showAll=` y cualquier combinación | `noindex, follow`, canonical a la versión limpia |
| categoría sin productos o slug inexistente | `noindex, follow` |

Los filtros **no** se bloquean en `robots.txt` a propósito: para que un buscador vea el `noindex` tiene que
poder rastrear la página. Sí se bloquea `?search=`.

**IndexNow** (`apps/api/src/infrastructure/services/IndexNowService.ts`): avisa a Bing, Yandex, Seznam y
Naver cuando se crea o edita un producto o cambia su stock. Cola en memoria con *debounce* de 30 s (o lote
de 100), así que guardar 30 productos seguidos manda una sola petición. Sin `INDEXNOW_KEY` queda
desactivado sin error. La clave se publica en `apps/web/public/<clave>.txt` y se inyecta en Cloud Run desde
el workflow de CI. Google no participa del protocolo: para Google vale el sitemap.

**Rendimiento.** El hero de `/catalogo` cargaba un MP4 de 87,8 MB (unos 30 MB transferidos) con
`autoplay preload="auto"`, y era el elemento LCP: 6,8 s y 31,8 MB de página en móvil. Ahora:

- El vídeo se recomprimió a 720p sin pista de audio (siempre estuvo `muted`): **87,8 MB → 3,7 MB**.
- El elemento LCP pasa a ser un póster WebP de 12 KB que se pinta de inmediato.
- `CatalogHeroVideo` (client) monta el vídeo **solo** si la pantalla es ≥ 1024 px, no hay
  `prefers-reduced-motion`, el navegador no reporta `saveData` ni conexión 2G/3G, y el hilo principal está
  libre (`requestIdleCallback`). **En móvil el vídeo ya no se descarga.**
- Se quitaron 4 `<link rel="preload">` de imágenes muy por debajo del pliegue (destacados de la home y
  productos relacionados de la ficha) que competían con el elemento LCP real.
- Los 5 banners de categoría pasaron de JPG a WebP: 734 KB → 429 KB.

**Comprobación automática:** `pnpm seo:check [url]` (42 comprobaciones de robots, sitemaps, canonical,
idioma, reglas de indexación y acceso de los crawlers de IA) y `pnpm seo:lighthouse [url]` (presupuesto de
Core Web Vitals que falla si LCP > 2,5 s, CLS > 0,1, TBT > 300 ms o la página supera su techo de peso).
Ambos corren semanalmente y a demanda en `.github/workflows/seo.yml`.

**Bug corregido de paso:** la home devolvía HTTP 500 de forma intermitente porque
`getCachedFeaturedProducts()` seleccionaba productos con SQL crudo sin filtrar `deletedAt IS NULL` y luego
los resolvía con `findById()`, que sí los filtra — un producto de la papelera con stock devolvía `null` y
reventaba el `.map()`. Detectado al verificar esta fase.

### 26.3 Fase 2 — Sistema de compatibilidad por modelo de moto (2026-09-22)

Es el núcleo del proyecto: en repuestos de moto todo gira alrededor de "¿esto le sirve a mi moto?".
Detalle completo en `docs/seo/02-compatibilidad.md`.

**Migración `20260922000000_motorcycle_fitment_system`** — aditiva y reversible, ya aplicada. Crea
dos enums, cuatro tablas y cuatro columnas opcionales en `Product`; no borra ni modifica nada:

| Tabla | Qué guarda |
|-------|------------|
| `MotorcycleBrand` | Marca de moto: nombre, slug, orden en el selector |
| `MotorcycleModel` | Modelo: nombre, slug, `cc?`, `yearFrom?`, `yearTo?`, `aliases[]`, `intro?` |
| `Fitment` | Producto ↔ modelo, con posición, rango de años, notas, **fuente** y **verificación** |
| `OemReference` | Referencia original del fabricante, con forma normalizada para buscar |

`Product` gana `mpn`, `partBrand`, `partType` y `warrantyMonths`, las cuatro opcionales y **fuera de
todo DTO del admin**: ningún formulario existente cambia por tenerlas.

**La regla que gobierna el sistema:**

> Solo se publica un `Fitment` con `verified = true`.

Una compatibilidad equivocada genera una devolución y destruye la confianza. El dato sin verificar
existe en la base (cargado de un CSV, pendiente de revisión) pero no se muestra, no se cuenta y no
se indexa. La regla vive en `isPublishable()` (`packages/domain/src/entities/Motorcycle.ts`), no
repartida por la interfaz. En consecuencia: **un modelo sin compatibilidades verificadas responde
404 y no entra al sitemap** — nada de páginas por modelo que solo cambian el nombre.

**Rutas nuevas:**

| Ruta | Render |
|------|--------|
| `/repuestos/[marca]/[modelo]` | Hub del modelo: categorías con conteo real y productos. SSG + ISR 10 min |
| `/repuestos/[marca]/[modelo]/[categoria]` | Listado filtrado con `ItemList`. SSG + ISR 10 min |
| `/referencia/[oem]` | Búsqueda por número de parte original. Dinámica, `noindex, follow` |
| `/sitemap-modelos.xml` | Solo hubs y categorías publicables |

**Importación masiva:** `POST /admin/fitments/import` con un CSV
(`sku,marca_moto,modelo_moto,posicion,anio_desde,anio_hasta,fuente,notas,verificado`; plantilla en
`docs/seo/plantilla-compatibilidades.csv`). La validación es estricta a propósito: `fuente` es
obligatoria, los años tienen que ser coherentes, se detectan duplicados dentro del archivo y **no se
crean modelos que no existan** — una errata crearía un modelo duplicado compitiendo con el bueno.
Una fila que falla no aborta la importación: se aplica lo bueno y se informa del resto con su línea
y su motivo.

**Selector "¿Qué moto tienes?"** en el header (marca → modelo → año opcional), persistido en la
cookie `h2r-moto`. El badge de compatibilidad **no** lee la cookie en el servidor: la ficha de
producto es estática (`generateStaticParams` + ISR) y llamar a `cookies()` la habría vuelto dinámica.
El badge es un Client Component que lee la cookie al hidratar. No se pierde SEO — un crawler nunca
tiene moto seleccionada, y lo que sí necesita ver, la tabla "Compatible con", se renderiza en el
servidor. El badge distingue "✓ Compatible con tu NKD 125" de "No confirmado para tu NKD 125":
**no confirmado no es lo mismo que no sirve**, y el catálogo está en construcción.

**Buscador:** los `tags` del índice ahora incluyen las motos compatibles verificadas con sus alias,
así que "pastillas nkd" encuentra el producto aunque su nombre no diga NKD.

**Catálogo de motos:** `pnpm db:motos` carga 8 marcas y 32 modelos (idempotente, nunca borra). Los 10
modelos prioritarios salen del brief; los otros 22 los añadió el agente desde el mercado colombiano
y están pendientes de confirmar. El cilindraje solo se declara cuando aparece en el nombre del modelo
(NKD **125**, NMAX **155**); donde no, queda en `null` y la web no lo muestra.

**Estado:** el sistema está completo y verificado, pero hay **0 compatibilidades cargadas**. Mientras
siga así no se publica ningún hub. No es un fallo: el sistema no inventa compatibilidades. Cargar los
datos reales es la tarea H-02 de `docs/seo/HUMAN_TASKS.md`.

### 26.4 Fase 3 — Datos estructurados (2026-09-22)

Hace legible el negocio para Google y para los motores generativos. Detalle en
`docs/seo/03-datos-estructurados.md`. Sin migraciones.

**Todo el JSON-LD se construye en `apps/web/src/lib/structured-data.ts`** y se inserta con el
componente `<JsonLd>`, que aplica el escape de `<` (sin él, una descripción de producto que contenga
`</script>` cerraría la etiqueta antes de tiempo).

| Tipo | Dónde |
|------|-------|
| `Organization` (NIT, dirección, `contactPoint`, `sameAs`) | Layout raíz — todas las páginas |
| `WebSite` + `SearchAction` | Layout raíz |
| `Product` completo | Ficha de producto |
| `BreadcrumbList` | Ficha, categoría del catálogo y rutas de modelo |
| `ItemList` | Categoría del catálogo y modelo × categoría |
| `FAQPage` | Home |

**Las dos reglas del marcado:**

1. **Nada que no se pueda sostener.** Cada campo opcional sale de la base de datos, de `Settings` o
   de una página legal publicada; si el dato no existe, el campo **se omite**. Un
   `OfferShippingDetails` con tiempos inventados es peor que no tenerlo, porque Google lo contrasta
   con la realidad del envío. Por eso quedan fuera `shippingRate` (el flete se cotiza por ciudad, no
   hay tarifa plana — H-13), `returnFees` (H-15), `LocalBusiness` (H-10) y el `sameAs` de Mercado
   Libre, cuya URL del brief devuelve 404 (H-12). Instagram, Facebook y TikTok sí se marcan: se
   verificó uno por uno que responden 200.
2. **El marcado refleja lo visible.** Las migas emiten el `<nav>` y el `BreadcrumbList` del mismo
   array; el FAQ de la home se extrajo a `lib/faq.ts` y lo consumen el acordeón y el `FAQPage`; el
   `ItemList` lleva los productos de esa página y en su orden.

**Lo que desbloquea para GEO:** el `Product` declara `isAccessoryOrSparePartFor` con entidades
`Motorcycle` (marca, modelo, `vehicleModelDate` y cilindrada) construidas desde los fitments
**verificados** de la Fase 2. Sin eso, la compatibilidad solo existe como texto en una tabla; con
eso, un motor generativo puede responder "¿qué pastillas le sirven a una XR190L?" citando a H2R.

**Validación:** `pnpm seo:schema [url]` recorre home, ficha, categoría y hub de modelo, extrae todo
el JSON-LD y comprueba que sea parseable y que cada tipo traiga sus campos obligatorios, incluidos
los anidados (`offers.price`, `offers.availability`…). Corre en `.github/workflows/seo.yml` junto a
`seo:check` y `seo:lighthouse`.

### 26.5 Primera carga real de compatibilidades (2026-09-22)

**55 fitments verificados en 20 de 41 modelos**, confirmados por Santiago tras revisar dos borradores
generados a partir de datos reales del propio catálogo (nunca inventados): el nombre de cada producto
y las notas de compatibilidad que el negocio ya tenía escritas a mano en el acordeón de cada ficha.
Detalle completo, incluidos los 9 modelos y 2 marcas que se dieron de alta en el camino, en
`docs/seo/compatibilidades-importadas-2026-09-22.md`.

Verificado en producción: `/repuestos/yamaha/fz-2-0`, `/repuestos/suzuki/gixxer-150` y
`/repuestos/ktm/duke-200` ya responden 200. Quedan 21 modelos sin ninguna compatibilidad — se siguen
cargando con `docs/seo/plantilla-compatibilidades.csv` y `POST /admin/fitments/import`.

**De paso:** `.gitignore` bloqueaba en silencio los CSV de `docs/seo/` (regla `*.csv` pensada para los
exports de inventario de Optimun); corregido con la excepción `!docs/seo/*.csv`. Y se encontró que
importar compatibilidades hoy no invalida la caché de Next (`revalidateTag('fitments')`), así que el
selector de moto y el sitemap de modelos tardan hasta 1 hora en reflejar una carga nueva — se
autocorrige solo, y queda anotado como H-40 para cuando exista una pantalla de admin (H-37).

### 26.6 Fase 4 — Conversión (en curso, 2026-09-23)

Detalle en `docs/seo/04-conversion.md`. **Sin migraciones de base de datos** en esta primera entrega.

- **`SocialProof` (H-01, decidida): se alimenta solo de `ProductReview`.** `getCachedStoreReviews()` lee
  las reseñas `APPROVED` con comentario (las 8 más recientes, sin filtrar por estrellas) y el resumen de
  todas. Sin reseñas con comentario la sección **no se pinta** (nada de relleno). Las cifras (promedio,
  cantidad, % que recomienda) solo salen con ≥ `REVIEWS_MIN_COUNT` reseñas aprobadas. Se eliminaron los
  4 testimonios y las 4 cifras escritas a mano.
- **Umbral de envío gratis en `Settings`** (`FREE_SHIPPING_THRESHOLD`, centavos, default $500.000, 0 = no
  se promete). Editable en `/admin/configuracion` (en pesos). Alimenta el acordeón de la ficha, el
  estimador y el carrito, que ahora muestra `FreeShippingProgress` (barra de progreso). `/carrito` pasó
  a ser un Server Component delgado que lee el umbral y renderiza `CartView`. **Pendiente H-14:**
  confirmar que $500.000 sigue vigente; FAQ, footer, `TrustBadges` y las páginas legales aún lo llevan
  escrito a mano.
- **Ficha de producto:** `StickyBuyBar` (barra fija móvil, aparece al pasar el bloque de compra),
  `ProductShippingEstimate` (cotizador real de Vendelo por ciudad, comparte la ciudad del carrito),
  `ConfirmCompatibilityButton` (WhatsApp con producto, SKU y moto seleccionada) y `ProductTrustBlock`
  (medios de pago, garantía, razón social y NIT desde la misma constante del JSON-LD).

**Segunda entrega (2026-09-23):**

- **Garantía y umbral unificados:** "hasta 6 meses" y envío gratis desde $500.000 (H-14 y H-17 confirmadas). El umbral se lee de `Settings` en FAQ, footer, `TrustBadges`, ficha, carrito y páginas legales.
- **Reseñas con moto:** `ProductReview.installedModelId` + `installedCity` (migración `20260923000000_review_installed_motorcycle`, aditiva). `POST /reviews` acepta `installedModelId` opcional; el formulario de `/resena/[orderItemId]` ofrece el selector. Se muestra "Le sirvió a una Suzuki DR150 · Cali". No crea `Fitment`.
- **GA4:** variable `NEXT_PUBLIC_GA_ID` (opcional; sin ella no se carga nada). Solo tras aceptar el aviso de cookies. Ver `lib/analytics.ts`.
- **Páginas nuevas:** `/sobre-nosotros` y `/garantias`.

### 26.7 Venta cruzada (2026-09-24, rama `feat/cro-cross-selling-kits`)

Plan y decisiones en `docs/seo/plan-venta-cruzada.md`. Migración aditiva `20260924000000_product_cross_sell` (tabla `ProductCrossSell`, con CHECK contra autovínculo).

- **Admin:** en `/admin/productos/[id]`, sección "Venta cruzada": buscador de productos por nombre o SKU, hasta 4 sugerencias ordenables, motivo opcional (120 caracteres) y casilla "también sugerir en sentido inverso" por sugerencia. API: `GET|PUT /admin/products/:id/cross-sells` y `GET /admin/products/search`.
- **Público:** `CrossSellBlock` en la ficha (título de una lista de 10, elegido de forma determinista por producto) y `CartCrossSells` en `/carrito` (`GET /api/cross-sells?ids=…`). Solo se muestran productos activos, no borrados y con stock. Si el sugerido tiene compatibilidades verificadas y ninguna es de la moto elegida por el comprador, se oculta; sin compatibilidades cargadas se muestra. Sin sugerencias, no se pinta nada.
- **Medición:** `view_item_list`, `select_item` y `add_to_cart` con `item_list_name` `venta_cruzada_ficha` / `venta_cruzada_carrito`.

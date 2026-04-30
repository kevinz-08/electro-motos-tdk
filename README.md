# ⚡ H2R Online Store — E-commerce de Repuestos para Motos

E-commerce completo para un taller de motos colombiano. Permite a los clientes comprar
repuestos en línea con pago a través de **Wompi** (principal) o **Mercado Pago** (respaldo),
mientras que los administradores gestionan productos, pedidos y stock desde un panel dedicado.

---

## Tabla de contenidos

1. [Stack tecnológico](#1-stack-tecnológico)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Flujo de datos general](#3-flujo-de-datos-general)
4. [Esquema de base de datos](#4-esquema-de-base-de-datos)
5. [Flujo de autenticación](#5-flujo-de-autenticación)
6. [Flujo de pago con Wompi](#6-flujo-de-pago-con-wompi)
7. [Flujo de pago con Mercado Pago](#7-flujo-de-pago-con-mercado-pago)
8. [Estructura de carpetas](#8-estructura-de-carpetas)
9. [API — Referencia completa](#9-api--referencia-completa)
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
| Framework web | **Next.js** | 16 (App Router) | Rutas, SSR, API routes, proxy |
| Lenguaje | **TypeScript** | strict | Todo el código |
| Estilos | **Tailwind CSS** | 4 | Diseño UI |
| ORM | **Prisma** | 7 | Acceso a base de datos |
| Base de datos | **PostgreSQL** (Neon) | — | Almacenamiento principal |
| Autenticación | **NextAuth.js** | v5 (beta) | Sesiones, OAuth, Credentials |
| Pago (principal) | **Wompi** | Widget | Tarjetas, Nequi, PSE, Bancolombia |
| Pago (respaldo) | **Mercado Pago** | SDK v2 | Preference + redirect |
| Email | **Resend** | — | Emails transaccionales |
| Imágenes | **Cloudinary** | — | Subida y almacenamiento de fotos |
| Estado del carrito | **Zustand** | — | Carrito persistido en localStorage |
| Validación | **Zod** | — | Schemas en API routes |
| Hash contraseñas | **bcryptjs** | cost 12 | Usuarios con contraseña |

---

## 2. Arquitectura del sistema

El proyecto sigue **Clean Architecture** en 3 capas. La regla central es:
**las capas internas no conocen las externas**. El dominio no importa nada de Prisma, Next.js, ni de ninguna librería externa.

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTATION                            │
│  ┌─────────────────────────┐   ┌─────────────────────────────┐  │
│  │    Next.js App Router   │   │      API Routes             │  │
│  │  (store) / admin / auth │   │  /api/products              │  │
│  │  pages, layouts         │   │  /api/orders                │  │
│  │  Server + Client comps  │   │  /api/payments/wompi/...    │  │
│  └──────────┬──────────────┘   └──────────────┬──────────────┘  │
└─────────────┼────────────────────────────────┼─────────────────┘
              │ llama                          │ llama
              ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE                           │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │   Repositories       │  │          Services                │ │
│  │  PrismaProductRepo   │  │  WompiService                    │ │
│  │  PrismaOrderRepo     │  │  MercadoPagoService              │ │
│  │  PrismaUserRepo      │  │  ResendEmailService              │ │
│  │                      │  │  CloudinaryService               │ │
│  └──────────┬───────────┘  └──────────────┬───────────────────┘ │
│             │ implementa                   │ implementa          │
│  ┌──────────┴───────────────────────────────────────────────┐   │
│  │              prisma-client.ts (singleton)                │   │
│  │              PrismaClient + PrismaPg adapter             │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ usa
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                           DOMAIN                                │
│                                                                 │
│  Entidades (tipos puros, sin dependencias)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Product  │ │  Order   │ │   User   │ │    Category      │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│                                                                 │
│  Interfaces de repositorios (contratos, no implementaciones)    │
│  ┌────────────────┐ ┌──────────────────┐ ┌──────────────────┐  │
│  │IProductRepo    │ │IOrderRepo        │ │IPaymentService   │  │
│  └────────────────┘ └──────────────────┘ └──────────────────┘  │
│                                                                 │
│  Use Cases (lógica de negocio pura)                             │
│  ┌──────────────┐ ┌────────────────┐ ┌───────────────────────┐ │
│  │ CreateOrder  │ │ConfirmPayment  │ │ ListProducts          │ │
│  │ GetBySlug    │ │ UpdateStock    │ │                       │ │
│  └──────────────┘ └────────────────┘ └───────────────────────┘ │
│                                                                 │
│  Shared: Result<T, E>  AppError                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Regla de dependencias

```
Presentation  →  Infrastructure  →  Domain
     ↓                 ↓               ↑
     └─────────────────┴───────────────┘
           solo dependen de →
```

- **Domain**: sin imports externos. Solo TypeScript puro.
- **Infrastructure**: implementa las interfaces del dominio. Usa Prisma, Wompi SDK, etc.
- **Presentation**: importa infrastructure y usa los use cases como orquestadores.

---

## 3. Flujo de datos general

### Tienda — cliente viendo el catálogo

```
Navegador del usuario
    │
    │  GET /catalogo  (Server Component — se renderiza en el servidor)
    ▼
Next.js Server
    │
    │  instancia ListProducts use case
    ▼
PrismaProductRepository.findAll(filters)
    │
    │  prisma.product.findMany({ where, include, skip, take })
    ▼
PostgreSQL (Neon) — devuelve filas
    │
    │  rows[]
    ▼
toDomain()  →  Product[]  (sin tipos de Prisma, solo el dominio)
    │
    │  Result<PaginatedProducts>
    ▼
Next.js Server  →  renderiza HTML con los productos
    │
    │  HTML + Tailwind CSS
    ▼
Navegador  →  muestra catálogo con filtros y paginación
```

### Carrito — estado del cliente

```
Usuario hace click en "Agregar al carrito"
    │
    │  AddToCartButton onClick → useCart().addItem(product)
    ▼
Zustand store (memoria RAM del navegador)
    │
    │  persist middleware  →  serializa el estado a JSON
    ▼
localStorage["electro-motos-cart"]
    ↑
    │  Al recargar la página:
    │  persist middleware  →  deserializa y restaura el estado
    └── CartPage, CheckoutForm leen el carrito desde el store
```

### Result<T, E> — manejo de errores

Los use cases nunca lanzan excepciones. Retornan un tipo discriminado:

```typescript
// Éxito:
{ ok: true, value: PaginatedProducts }

// Error:
{ ok: false, error: AppError }

// En API routes:
const result = await useCase.execute(input)
if (!result.ok) {
  return Response.json({ error: result.error.message }, { status: 422 })
}
return Response.json(result.value)
```

---

## 4. Esquema de base de datos

### Diagrama de relaciones (ER simplificado)

```
┌─────────────┐         ┌──────────────────────────┐
│    User     │         │         Account           │
│─────────────│         │──────────────────────────│
│ id (PK)     │◄────────│ userId (FK)               │
│ email       │  1 : N  │ provider                  │
│ name        │         │ providerAccountId         │
│ image       │         │ access_token              │
│ password?   │         └──────────────────────────┘
│ role        │         ← NULL para usuarios Google
│ createdAt   │         ← 'ADMIN' o 'CUSTOMER'
└──────┬──────┘
       │ 1 : N
       │
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
       │
       ▼
┌─────────────────┐
│   OrderItem     │
│─────────────────│
│ orderId (FK)    │
│ productId (FK)──┼──────────────────┐
│ quantity        │                  │
│ priceAtPurchase │                  ▼
└─────────────────┘      ┌─────────────────┐
                         │    Product      │
┌──────────────────┐     │─────────────────│
│    Category      │◄────│ categoryId (FK) │
│──────────────────│1:N  │ id (PK)         │
│ id (PK)          │     │ name            │
│ name             │     │ slug            │
│ slug             │     │ description     │
│ description      │     │ price (Int)     │ ← centavos COP
│ imageUrl         │     │ stock           │
└──────────────────┘     │ sku             │
                         │ images []       │
                         │ isActive        │
                         └────────┬────────┘
                                  │ 1 : N
                                  ▼
                    ┌─────────────────────────┐
                    │  MotorcycleCompatibil.  │
                    │─────────────────────────│
                    │ productId (FK)          │
                    │ brand                   │ ← "Yamaha"
                    │ model                   │ ← "FZ25"
                    │ year?                   │ ← 2022
                    └─────────────────────────┘

┌─────────────┐
│  Settings   │  ← Configuración clave-valor. Ej: MERCADOPAGO_ENABLED=true
│─────────────│
│ key (UNIQUE)│
│ value       │
└─────────────┘
```

### Tipos de datos importantes

| Campo | Tipo en BD | Tipo en dominio | Nota |
|---|---|---|---|
| `price` | `Int` | `number` | Centavos COP. $85.000 = `8500000` |
| `total` | `Int` | `number` | Centavos COP |
| `priceAtPurchase` | `Int` | `number` | Precio capturado al crear el pedido |
| `shippingAddress` | `Json` | `ShippingAddress` | Objeto serializado como JSON |
| `images` | `String[]` | `string[]` | URLs de Cloudinary |
| `password` | `String?` | `string \| null` | Null para usuarios de Google OAuth |

---

## 5. Flujo de autenticación

### Registro con email y contraseña

```
Navegador — /auth/register
    │
    │  Usuario llena: nombre, email, contraseña, confirmar contraseña
    │  (validación en cliente: contraseñas coinciden, min 8 chars)
    │
    │  POST /api/auth/register
    ▼
route.ts
    │
    ├── Zod valida el body (name min 2, email válido, password min 8)
    │
    ├── prisma.user.findUnique({ where: { email } })
    │       ├── YA EXISTE  →  409 "Este correo ya está registrado"
    │       └── NO EXISTE  →
    │               bcrypt.hash(password, cost=12)
    │               prisma.user.create({ name, email, hashedPassword, role: CUSTOMER })
    │               →  201 { success: true }
    │
    │  éxito  →  redirect /auth/login?registered=1
    ▼
Navegador — /auth/login
```

### Login con email y contraseña

```
Navegador — /auth/login
    │
    │  Usuario llena email y contraseña
    │  signIn('credentials', { email, password, redirect: false })
    ▼
NextAuth — Credentials.authorize()
    │
    ├── prisma.user.findUnique({ where: { email } })
    │       ├── NO EXISTE  →  return null  →  error 'CredentialsSignin'
    │       └── EXISTE pero password es null (usuario de Google)  →  return null
    │
    ├── bcrypt.compare(password, user.password)
    │       ├── no coincide  →  return null  →  error 'CredentialsSignin'
    │       └── coincide     →  return { id, email, name, image }
    │
    │  [JWT callback — solo ejecuta en el PRIMER inicio de sesión]
    │  prisma.user.findUnique(email) → obtiene el rol de la BD
    │  token.id   = user.id
    │  token.role = user.role  ← 'ADMIN' o 'CUSTOMER'
    │
    │  [session callback — ejecuta en CADA request autenticado]
    │  session.user.id   = token.id
    │  session.user.role = token.role
    │
    │  éxito  →  router.push(callbackUrl ?? '/')
    ▼
Navegador — home o destino original
```

### Login con Google OAuth

```
Navegador — /auth/login
    │
    │  Usuario hace click en "Continuar con Google"
    │  server action: signIn('google', { redirectTo: '/' })
    ▼
Google — pantalla de consentimiento
    │
    │  usuario autoriza
    ▼
NextAuth callback — PrismaAdapter
    │
    ├── ¿el email de Google ya existe en la BD?
    │       ├── SÍ  →  vincula la cuenta de Google al usuario existente
    │       └── NO  →  crea nuevo User { email, name, image, role: CUSTOMER, password: null }
    │
    │  [JWT callback] — igual que Credentials, agrega rol al token
    ▼
Navegador — home
```

### Protección de rutas (proxy.ts)

```
Request a /admin/* o /checkout/*
    │
    ▼
proxy.ts  (corre en Node.js — NO en Edge Runtime)
    │
    ├── ¿pathname empieza con /admin?
    │       ├── sin sesión  →  redirect /auth/login
    │       └── con sesión  →  ¿session.user.role === 'ADMIN'?
    │               ├── NO   →  redirect /  (usuario normal, sin acceso)
    │               └── SÍ   →  NextResponse.next() ✓
    │
    └── ¿pathname empieza con /checkout?
            ├── sin sesión  →  redirect /auth/login?callbackUrl=/checkout
            └── con sesión  →  NextResponse.next() ✓

Nota: admin/layout.tsx hace una segunda verificación en el servidor
      como defensa adicional (defense in depth).
```

---

## 6. Flujo de pago con Wompi

Wompi es la pasarela principal. Usa un **Widget embebido** con firma SHA256.
La firma se calcula en el servidor para que el cliente no pueda modificar el monto.

```
                   CLIENTE (navegador)           SERVIDOR (Next.js)
                          │                              │
  /checkout — paso 1      │                              │
  Usuario llena datos     │                              │
  de envío y hace click   │                              │
  "Continuar al pago"     │                              │
                          │──── POST /api/orders ───────►│
                          │     { items, address,        │
                          │       paymentProvider:WOMPI }│
                          │                              │ CreateOrder use case:
                          │                              │  ✓ valida stock de cada ítem
                          │                              │  ✓ calcula total
                          │                              │  ✓ crea Order(status=PENDING)
                          │                              │  ✓ crea Payment(status=PENDING)
                          │◄─── { order: { id } } ──────│
                          │                              │
                          │──── POST /api/payments/ ────►│
                          │     wompi/integrity          │
                          │     { orderId, amount, COP } │
                          │                              │ SHA256(ref + amount + COP + secret)
                          │◄─── { reference,            │
                          │       integritySignature,    │
                          │       publicKey }            │
                          │                              │
  /checkout — paso 2      │                              │
  WompiWidget renderiza   │                              │
  el formulario con los   │                              │
  datos de pago           │                              │
  → click "Pagar" ───────►│                              │
                          │                              │
  Redirect a              │                              │
  checkout.wompi.co       │                              │
  (tarjeta/Nequi/PSE/     │                              │
   Bancolombia)           │                              │
                          │                              │
  Wompi procesa el pago   │                              │
                          │                              │◄─ POST /api/payments/
                          │                              │    wompi/webhook
                          │                              │    { event, data.transaction,
                          │                              │      signature.checksum }
                          │                              │
                          │                              │ validateWebhook:
                          │                              │  SHA256(props+ts+secret)
                          │                              │  ✓ válido → continúa
                          │                              │  ✗ inválido → 401
                          │                              │
                          │                              │ ConfirmPayment use case:
                          │                              │  APPROVED:
                          │                              │   Order.status = PAID
                          │                              │   descuenta stock de cada ítem
                          │                              │   email de confirmación al cliente
                          │                              │
                          │                              │  DECLINED/VOIDED/ERROR:
                          │                              │   Order.status = CANCELLED
                          │                              │
  Wompi redirige de       │◄── redirect_url ─────────────│
  vuelta a:               │
  /checkout/confirmacion  │
  ?orderId=xxx            │
```

### Fórmula de la firma de integridad

```
Dato de entrada:
  reference     = "ORDER-abc123-1712345678"
  amountInCents = 8500000
  currency      = "COP"
  secret        = WOMPI_INTEGRITY_SECRET (de las variables de entorno)

Cálculo:
  SHA256( "ORDER-abc123-17123456788500000COP" + secret )
  = "a3f7c8d9..." (64 caracteres hexadecimales)

Enviado al widget como:  data-signature:integrity="a3f7c8d9..."
```

---

## 7. Flujo de pago con Mercado Pago

Mercado Pago es el respaldo. Se activa desde el panel admin.
El flujo usa **redirect** completo (el cliente va a la web de MP).

```
                   CLIENTE (navegador)           SERVIDOR (Next.js)
                          │                              │
  Usuario selecciona      │                              │
  "Mercado Pago"          │                              │
                          │──── POST /api/orders ───────►│
                          │     { paymentProvider:       │
                          │       "MERCADO_PAGO" }       │
                          │                              │ ¿MERCADOPAGO_ENABLED = 'true'?
                          │                              │   NO → 403 Forbidden
                          │                              │
                          │                              │ MercadoPagoService.createTransaction()
                          │                              │   preference.create({ items, back_urls,
                          │                              │     notification_url, external_reference })
                          │                              │   → obtiene init_point URL
                          │◄─── { payment.redirectUrl } │
                          │                              │
  Cliente redirigido ────►│                              │
  a mercadopago.com.co    │                              │
  (página completa de MP) │                              │
                          │                              │◄─ POST /api/payments/
                          │                              │    mercadopago/webhook (IPN)
                          │                              │    { type:"payment", data:{id} }
                          │                              │
                          │                              │ validateWebhook (HMAC-SHA256)
                          │                              │ getTransactionStatus(externalId)
                          │                              │   → consulta API de MP
                          │                              │ ConfirmPayment use case
                          │                              │   (igual que Wompi)
                          │◄── back_url redirect ────────│
  Cliente vuelve a:       │
  /checkout/success o     │
  /checkout/failure       │
```

---

## 8. Estructura de carpetas

```
electro-motos-tdk/
│
├── prisma/
│   ├── schema.prisma          ← Definición de modelos y relaciones de BD
│   ├── seed.ts                ← Datos iniciales (admin, categorías, 10 productos, pedidos)
│   └── migrations/            ← Historial de cambios en la BD (no editar manualmente)
│
├── src/
│   ├── proxy.ts               ← Protección de rutas /admin y /checkout
│   │                             (equivalente a middleware.ts en Next.js 16)
│   │
│   ├── lib/
│   │   ├── auth.ts            ← Config central de NextAuth (Google + Credentials)
│   │   └── cart.ts            ← Store Zustand del carrito (persiste en localStorage)
│   │
│   ├── domain/                ← CAPA INTERNA — cero dependencias externas
│   │   ├── entities/          ← Tipos de negocio (interfaces TypeScript puras)
│   │   │   ├── Product.ts     ← Product, ProductFilters, MotorcycleCompatibility
│   │   │   ├── Order.ts       ← Order, OrderItem, Payment, ShippingAddress, enums
│   │   │   ├── User.ts        ← User, UserRole
│   │   │   └── Category.ts    ← Category
│   │   ├── repositories/      ← Contratos de acceso a datos (solo interfaces)
│   │   │   ├── IProductRepository.ts    ← findBySlug, findAll, updateStock, save...
│   │   │   ├── IOrderRepository.ts      ← create, findById, updateStatus...
│   │   │   ├── IUserRepository.ts       ← findById, findByEmail, findAll
│   │   │   └── IInventorySyncRepository.ts  ← Fase 2: sync con Optimun (contable)
│   │   ├── services/
│   │   │   └── IPaymentService.ts       ← createTransaction, validateWebhook...
│   │   ├── use-cases/         ← Lógica de negocio (orquesta repositorios)
│   │   │   ├── orders/
│   │   │   │   ├── CreateOrder.ts       ← Valida stock → crea pedido → inicia pago
│   │   │   │   └── ConfirmPayment.ts    ← Webhook → PAID/CANCELLED → descuenta stock
│   │   │   └── products/
│   │   │       ├── ListProducts.ts      ← Lista con filtros y paginación
│   │   │       ├── GetProductBySlug.ts  ← Detalle de un producto
│   │   │       └── UpdateStock.ts       ← Actualiza stock (admin o post-pago)
│   │   └── shared/
│   │       └── Result.ts      ← Result<T,E>, ok(), err(), AppError
│   │
│   ├── infrastructure/        ← CAPA MEDIA — conecta el dominio con servicios externos
│   │   ├── database/
│   │   │   └── prisma-client.ts         ← Singleton de Prisma + PrismaPg adapter
│   │   ├── repositories/      ← Implementaciones concretas de las interfaces
│   │   │   ├── PrismaProductRepository.ts  ← Implementa IProductRepository con Prisma
│   │   │   ├── PrismaOrderRepository.ts    ← Implementa IOrderRepository con Prisma
│   │   │   └── PrismaUserRepository.ts     ← Implementa IUserRepository con Prisma
│   │   └── services/
│   │       ├── WompiService.ts          ← Implementa IPaymentService (Widget + webhooks)
│   │       ├── MercadoPagoService.ts    ← Implementa IPaymentService (Preference + IPN)
│   │       ├── ResendEmailService.ts    ← Emails: confirmación, envío, pago rechazado
│   │       └── CloudinaryService.ts     ← Subida y eliminación de imágenes
│   │
│   ├── app/                   ← CAPA EXTERNA — páginas y API de Next.js
│   │   ├── layout.tsx         ← Layout raíz: fuente Geist, metadata, suppressHydrationWarning
│   │   ├── (store)/           ← Grupo de rutas públicas de la tienda
│   │   │   ├── layout.tsx     ← Header sticky + Footer con nav por categorías
│   │   │   ├── page.tsx       ← Punto de entrada → re-exporta home.tsx
│   │   │   ├── home.tsx       ← Hero, trust badges, categorías, productos destacados
│   │   │   ├── catalogo/
│   │   │   │   └── page.tsx   ← Catálogo con sidebar de filtros y paginación
│   │   │   ├── producto/[slug]/
│   │   │   │   └── page.tsx   ← Detalle: imagen, precio, stock, compatibilidad
│   │   │   ├── carrito/
│   │   │   │   └── page.tsx   ← Carrito: ítems, cantidades, resumen, ir a checkout
│   │   │   └── checkout/
│   │   │       ├── page.tsx   ← Checkout — requiere sesión
│   │   │       └── confirmacion/
│   │   │           └── page.tsx ← Confirmación post-pago
│   │   ├── admin/             ← Panel admin — solo usuarios ADMIN
│   │   │   ├── layout.tsx     ← Sidebar con navegación + verificación de rol
│   │   │   ├── page.tsx       ← Dashboard: métricas del día, pedidos, stock bajo
│   │   │   ├── productos/
│   │   │   │   ├── page.tsx   ← Lista de productos con acciones
│   │   │   │   └── [id]/page.tsx ← Formulario edición de producto
│   │   │   ├── pedidos/
│   │   │   │   └── page.tsx   ← Lista pedidos con filtro por estado
│   │   │   ├── stock/
│   │   │   │   └── page.tsx   ← Stock bajo + importación CSV
│   │   │   └── configuracion/
│   │   │       └── page.tsx   ← Toggle de Mercado Pago
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   ├── page.tsx   ← Página server: sesión activa → redirect
│   │   │   │   └── LoginForm.tsx ← Componente cliente: email+pass + botón Google
│   │   │   └── register/
│   │   │       └── page.tsx   ← Registro con validación en cliente y servidor
│   │   └── api/               ← API Routes (Next.js Route Handlers)
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts  ← Handler NextAuth (GET+POST)
│   │       │   └── register/route.ts       ← POST registro con bcrypt
│   │       ├── products/route.ts           ← GET listado público
│   │       ├── orders/route.ts             ← POST crear pedido (auth requerida)
│   │       ├── payments/
│   │       │   ├── wompi/
│   │       │   │   ├── integrity/route.ts  ← POST firma SHA256
│   │       │   │   └── webhook/route.ts    ← POST evento Wompi (confirma pago)
│   │       │   └── mercadopago/
│   │       │       └── webhook/route.ts    ← POST IPN Mercado Pago
│   │       └── admin/                      ← Todos requieren rol ADMIN
│   │           ├── products/route.ts       ← POST crear producto
│   │           ├── products/[id]/route.ts  ← PUT editar, DELETE eliminar
│   │           ├── products/[id]/stock/route.ts  ← PATCH stock individual
│   │           ├── stock/bulk/route.ts     ← PATCH stock masivo (CSV)
│   │           └── settings/mercadopago/route.ts ← PATCH toggle MP
│   │
│   ├── components/
│   │   ├── store/
│   │   │   ├── ProductCard.tsx     ← Tarjeta con imagen, precio, badge stock
│   │   │   └── AddToCartButton.tsx ← Botón agregar (deshabilitado si agotado)
│   │   ├── checkout/
│   │   │   ├── CheckoutForm.tsx    ← Wizard 2 pasos: datos envío + Wompi Widget
│   │   │   └── WompiWidget.tsx     ← Script + formulario embebido de Wompi
│   │   ├── admin/
│   │   │   ├── ProductEditForm.tsx    ← Crear/editar producto (slug auto-generado)
│   │   │   ├── StockUpdateForm.tsx    ← Actualizar stock de un producto
│   │   │   ├── CsvStockImport.tsx     ← Importar CSV sku,stock
│   │   │   ├── OrderStatusSelect.tsx  ← Cambiar estado de pedido
│   │   │   └── MercadoPagoToggle.tsx  ← Toggle switch activar/desactivar MP
│   │   └── ui/
│   │       └── SignInButton.tsx  ← Botón "Ingresar" en el header (cliente)
│   │
│   └── generated/
│       └── prisma/              ← Auto-generado por `npx prisma generate` (NO editar)
```

---

## 9. API — Referencia completa

### Autenticación

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Registro con email + contraseña |
| `POST` | `/api/auth/[...nextauth]` | — | Handler de NextAuth (login, Google OAuth) |

**POST `/api/auth/register`**
```json
// Request
{ "name": "Juan Pérez", "email": "juan@ejemplo.co", "password": "MinPass8!" }

// 201 — Usuario creado
{ "success": true }

// 409 — Ya existe
{ "error": "Este correo ya está registrado. Intenta iniciar sesión." }

// 422 — Datos inválidos
{ "error": "Datos inválidos", "details": { "fieldErrors": { "password": ["min 8"] } } }
```

---

### Productos (público)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/products` | No | Lista productos con filtros opcionales |

```
GET /api/products?category=frenos&inStock=true&page=1&limit=12
GET /api/products?search=yamaha&minPrice=5000000&maxPrice=20000000
```

Respuesta `200`:
```json
{
  "items": [{ "id": "...", "name": "...", "price": 8500000, "stock": 25, ... }],
  "total": 42,
  "page": 1,
  "limit": 12
}
```

---

### Pedidos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/orders` | Sesión activa | Crea pedido y prepara pago |

```json
// Request
{
  "items": [{ "productId": "cuid_producto", "quantity": 2 }],
  "shippingAddress": {
    "fullName": "Juan Pérez",
    "address": "Calle 45 # 23-10, Apto 302",
    "city": "Medellín",
    "department": "Antioquia",
    "phone": "3001234567",
    "notes": "Tocar timbre dos veces"
  },
  "paymentProvider": "WOMPI"
}

// 201 — Pedido creado
{
  "order": { "id": "cuid_orden", "status": "PENDING", "total": 17000000 },
  "payment": {
    "reference": "ORDER-cuid_orden-1712345678",
    "integritySignature": "a3f7c8...",
    "publicKey": "pub_test_xxxx",
    "amountInCents": 17000000
  }
}

// 409 — Sin stock
{ "error": "Stock insuficiente para \"Pastillas Brembo\"...", "code": "STOCK_UNAVAILABLE" }

// 401 — Sin sesión
{ "error": "No autorizado" }
```

---

### Pagos — Wompi

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/payments/wompi/integrity` | No | Genera firma SHA256 para el widget |
| `POST` | `/api/payments/wompi/webhook` | Firma Wompi | Webhook de confirmación/rechazo |

**POST `/api/payments/wompi/integrity`**
```json
// Request
{ "orderId": "cuid", "amountInCents": 8500000, "currency": "COP" }

// Response 200
{
  "reference": "ORDER-cuid-1712345678",
  "integritySignature": "a3f7c8d9...64chars",
  "publicKey": "pub_test_xxxx",
  "amountInCents": 8500000,
  "currency": "COP"
}
```

---

### Admin (requieren rol ADMIN)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/admin/products` | Crear producto |
| `PUT` | `/api/admin/products/[id]` | Editar producto completo |
| `DELETE` | `/api/admin/products/[id]` | Eliminar producto |
| `PATCH` | `/api/admin/products/[id]/stock` | Actualizar stock individual |
| `PATCH` | `/api/admin/stock/bulk` | Actualizar stock masivo (CSV import) |
| `PATCH` | `/api/admin/settings/mercadopago` | Activar/desactivar Mercado Pago |

**PATCH `/api/admin/stock/bulk`**
```json
// Request
{
  "updates": [
    { "sku": "FRE-BRE-FZ25-001", "stock": 50 },
    { "sku": "MOT-PIS-YBR125-001", "stock": 10 }
  ]
}
// Response
{ "updated": 2 }
```

**PATCH `/api/admin/settings/mercadopago`**
```json
// Request  — activar
{ "enabled": true }
// Response
{ "success": true, "enabled": true }
```

---

## 10. Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
# ─── Base de datos ─────────────────────────────────────────────────────────────
# URL directa de Neon PostgreSQL (sin -pooler para desarrollo local)
# Formato: postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=verify-full
DATABASE_URL=

# ─── NextAuth ──────────────────────────────────────────────────────────────────
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# ─── Google OAuth ──────────────────────────────────────────────────────────────
# Crear en: console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0
# Authorized redirect URI: http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ─── Wompi ─────────────────────────────────────────────────────────────────────
# Obtener en: comercios.wompi.co → Configuración → Llaves API
WOMPI_PUBLIC_KEY=pub_test_xxxx     ← Llave pública (va en el widget del navegador)
WOMPI_PRIVATE_KEY=prv_test_xxxx    ← Llave privada (solo servidor, nunca al cliente)
WOMPI_INTEGRITY_SECRET=test_integrity_xxxx   ← Para firmar transacciones
WOMPI_EVENTS_SECRET=test_events_xxxx         ← Para validar webhooks entrantes
WOMPI_ENV=sandbox                            ← sandbox | production

# ─── Mercado Pago ──────────────────────────────────────────────────────────────
# Obtener en: developers.mercadopago.com → Mis integraciones → Credenciales
MP_ACCESS_TOKEN=TEST-xxx
MP_PUBLIC_KEY=TEST-xxx
MP_WEBHOOK_SECRET=xxx

# ─── Resend (emails) ───────────────────────────────────────────────────────────
# Obtener en: resend.com → API Keys
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=no-reply@electromotos-tony.co

# ─── Cloudinary (imágenes de productos) ────────────────────────────────────────
# Obtener en: cloudinary.com → Dashboard
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 11. Instalación y ejecución local

### Requisitos previos

- **Node.js 20+** — descargar en [nodejs.org](https://nodejs.org)
- **npm 10+** — viene incluido con Node.js
- **Cuenta en Neon** — base de datos PostgreSQL gratuita en [neon.tech](https://neon.tech)

### Pasos paso a paso

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd electro-motos-tdk

# 2. Instalar todas las dependencias
npm install

# 3. Configurar variables de entorno
#    Copiar la plantilla y editar con los valores reales
cp .env.example .env.local

# 4. Crear las tablas en la base de datos
#    Esto aplica todas las migraciones en prisma/migrations/
npx prisma migrate dev --name init

# 5. Generar el cliente de Prisma (tipos TypeScript)
npx prisma generate

# 6. Poblar la base de datos con datos de prueba
#    Crea: admin, cliente, 3 categorías, 10 productos, 2 pedidos de prueba
npm run db:seed

# 7. Iniciar el servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

### Comandos útiles

```bash
npm run dev              # Servidor dev con Turbopack (recarga en caliente)
npm run build            # Compilación de producción con TypeScript strict
npm run start            # Servidor de producción (requiere build previo)
npm run lint             # Verificación de ESLint

npx prisma studio        # Interfaz web para explorar y editar la BD visualmente
npx prisma migrate dev --name <nombre>  # Crear y aplicar una nueva migración
npm run db:seed          # Re-ejecutar el seed (actualiza admin y datos de prueba)
npx prisma generate      # Re-generar el cliente Prisma (después de editar schema.prisma)
```

---

## 12. Credenciales de prueba

Después de ejecutar `npm run db:seed`:

### Administrador del sistema
| Campo | Valor |
|---|---|
| Email | `admin@electromotos-tony.co` |
| Contraseña | `Admin123!` |
| Acceso al panel | [http://localhost:3000/admin](http://localhost:3000/admin) |

### Cliente de prueba
| Campo | Valor |
|---|---|
| Email | `cliente@ejemplo.co` |
| Contraseña | `Cliente123!` |

### Tarjeta de prueba Wompi (entorno sandbox)
| Campo | Valor |
|---|---|
| Número de tarjeta | `4242 4242 4242 4242` |
| Fecha de vencimiento | Cualquier fecha futura (ej: `12/29`) |
| CVV | `123` |
| Cuotas | `1` |

---

## 13. Panel de administración

Acceso exclusivo para usuarios con rol `ADMIN`. URL: `/admin`

### Páginas del panel

| Ruta | Qué hace |
|---|---|
| `/admin` | Dashboard: ingresos del día, pedidos pendientes, alertas de stock bajo |
| `/admin/productos` | Lista de productos con botones crear, editar, eliminar |
| `/admin/productos/nuevo` | Formulario crear producto |
| `/admin/productos/[id]` | Formulario editar producto existente |
| `/admin/pedidos` | Todos los pedidos, filtro por estado, cambiar estado |
| `/admin/stock` | Productos con stock ≤ 5 unidades + importación masiva CSV |
| `/admin/configuracion` | Toggle para activar/desactivar Mercado Pago |

### Importación de stock por CSV

Para actualizar stock de múltiples productos a la vez:

1. Crear un archivo `.csv` con formato `sku,stock` (una línea por producto):
   ```
   sku,stock
   FRE-BRE-FZ25-001,50
   MOT-PIS-YBR125-001,10
   LLA-PIR-100-90-18-001,25
   ```
2. Ir a `/admin/stock` y hacer click en "📁 Importar CSV".
3. Seleccionar el archivo. El sistema muestra cuántos productos se actualizaron.

El sistema ignora automáticamente la línea de encabezado (`sku,stock`) y líneas inválidas.

---

## 14. Roles de usuario

```
┌─────────────────────────────────────────────────────────┐
│                    Sistema de roles                      │
│                                                         │
│  CUSTOMER (por defecto)          ADMIN                  │
│  ─────────────────────           ──────────────────     │
│  ✓ Ver catálogo                  ✓ Todo lo de CUSTOMER  │
│  ✓ Ver detalle de producto       ✓ Panel /admin          │
│  ✓ Agregar al carrito            ✓ CRUD de productos    │
│  ✓ Hacer checkout                ✓ Gestionar pedidos    │
│  ✓ Ver historial de pedidos      ✓ Actualizar stock     │
│                                  ✓ Importar CSV         │
│                                  ✓ Toggle Mercado Pago  │
└─────────────────────────────────────────────────────────┘
```

### Asignar rol ADMIN a un usuario

```bash
# Opción 1: Prisma Studio (interfaz visual, más fácil)
npx prisma studio
# → ir a tabla User → buscar usuario → cambiar campo role a "ADMIN" → guardar

# Opción 2: SQL directo
psql $DATABASE_URL -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'nuevo@admin.co';"
```

### Dónde se verifica el rol

```
1. proxy.ts              ← Primera verificación (a nivel de ruta, antes de renderizar)
2. admin/layout.tsx      ← Segunda verificación (en el servidor, al renderizar)
3. API routes /admin/*   ← Tercera verificación (antes de operar en la BD)
```

La triple verificación garantiza que un atacante no pueda llegar a las operaciones de
administración incluso si logra bypassear una de las capas.

---

## 15. Manejo de precios (centavos COP)

Todos los precios se almacenan en **centavos de pesos colombianos** como números enteros.
Esto evita errores de redondeo con punto flotante.

```
Precio visible:      $85.000 COP
Almacenado en BD:     8.500.000  (multiplicado por 100)

Precio visible:      $1.580.000 COP
Almacenado en BD:   158.000.000  (multiplicado por 100)
```

### Conversión en el formulario admin

```typescript
// Al cargar un producto existente para editar:
price: product.price / 100   // 8500000 → muestra "85000" en el input

// Al enviar el formulario para guardar:
price: Math.round(parseFloat(input) * 100)   // "85000" → guarda 8500000 en BD
```

### Formato de visualización al cliente

Todos los componentes de la tienda usan la misma función:
```typescript
function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}
// formatCOP(8500000) → "$85.000"
// formatCOP(15800000) → "$158.000"
```

---

## 16. Integración Wompi — Detalles técnicos

### Entornos disponibles

| `WOMPI_ENV` | URL base API |
|---|---|
| `sandbox` | `https://sandbox.wompi.co/v1` |
| `production` | `https://production.wompi.co/v1` |

### Firma de integridad (por qué es importante)

Sin firma, un usuario podría modificar el HTML del widget y poner `amountInCents=1`.
La firma vincula criptográficamente la referencia + el monto + el secret del servidor.
Wompi verifica esta firma antes de mostrar el botón de pago.

```
Servidor calcula:
  SHA256( reference + amountInCents + currency + WOMPI_INTEGRITY_SECRET )

Cliente recibe solo el hash (nunca el secret).
Wompi verifica el hash con su copia del secret.
Si no coincide → el widget no se activa.
```

### Validación de webhook (por qué es importante)

Sin validación, cualquiera podría enviar una solicitud a tu webhook
indicando que un pago fue aprobado (fraude). La firma garantiza que el evento
viene realmente de Wompi.

```
Wompi firma el evento con WOMPI_EVENTS_SECRET.
Tu servidor recalcula la firma y compara.
Si no coincide → 401 Unauthorized → ignoras el evento.
```

### Idempotencia del procesamiento de webhooks

Wompi puede enviar el mismo webhook más de una vez (reintentos). El use case
`ConfirmPayment` verifica si el pedido ya fue procesado:
```typescript
if (order.status !== 'PENDING') {
  return ok(undefined)  // ya está procesado, no hacer nada
}
```

---

## 17. Integración Mercado Pago — Detalles técnicos

### Diferencias clave vs Wompi

| Aspecto | Wompi | Mercado Pago |
|---|---|---|
| Experiencia de pago | Widget embebido en la página | Redirect a MP (sale de tu sitio) |
| Firma de transacción | SHA256 integrity | — |
| Validación webhook | SHA256 events | HMAC-SHA256 x-signature |
| Estado en webhook | Directo en el evento | Requiere consultar la API de MP |
| Activación | Siempre disponible | Toggle en admin → Settings |
| Montos | Centavos COP | Pesos COP (dividir entre 100) |

### Mapeo de estados

```
Mercado Pago     →     Dominio interno
────────────────────────────────────────
pending          →     PENDING
in_process       →     PENDING
in_mediation     →     PENDING
approved         →     APPROVED
authorized       →     APPROVED
rejected         →     DECLINED
cancelled        →     VOIDED
refunded         →     VOIDED
charged_back     →     VOIDED
(cualquier otro) →     ERROR
```

---

## 18. Preguntas frecuentes

**¿Por qué se llama `proxy.ts` en lugar de `middleware.ts`?**
> En Next.js 16 el archivo fue renombrado de `middleware.ts` a `proxy.ts` y el export
> cambió de `export default function middleware` a `export const proxy = auth(...)`.
> Además, corre en Node.js (no Edge Runtime), lo que permite usar Prisma y NextAuth
> directamente sin restricciones de compatibilidad.

**¿Por qué los precios están en centavos si en Colombia no hay centavos?**
> Es una práctica estándar para evitar errores de punto flotante en JavaScript.
> Los procesadores de pago (Wompi, Stripe, etc.) también usan la unidad mínima de la
> moneda (`amount_in_cents`). Así 8500000 entero es más seguro que 85000.00 flotante.

**¿Por qué JWT en vez de database sessions con NextAuth?**
> El proveedor `Credentials` de NextAuth **requiere** JWT cuando se usa junto con
> `PrismaAdapter`. Si se usa database sessions, NextAuth intenta insertar registros
> en la tabla Session cada vez que se hace signIn con Credentials, lo cual falla.
> Con JWT, la sesión vive en una cookie firmada y no necesita la tabla Session.

**¿Por qué `suppressHydrationWarning` en el `<body>`?**
> Extensiones del navegador (gestores de contraseñas, traductores, etc.) inyectan
> atributos en el `<body>` después de que el servidor renderiza el HTML pero antes
> de que React hidrata el DOM. Esto produce el aviso:
> `"Prop did not match. Server: '' Client: 'bis_register=...' "`
> La prop `suppressHydrationWarning` le dice a React que ignore esas diferencias en `<body>`.

**¿Por qué `PrismaAdapter(prisma as any)`?**
> Prisma 7 cambió la firma interna de algunos tipos TypeScript. `@auth/prisma-adapter`
> aún no fue actualizado para Prisma 7, por lo que TypeScript marca un error de tipos.
> El cast `as any` es un workaround temporal. La funcionalidad en tiempo de ejecución
> es correcta; solo es un problema de tipos en tiempo de compilación.

**¿Cómo probar webhooks localmente?**
> Usa [ngrok](https://ngrok.com) para exponer tu servidor local a internet:
> ```bash
> ngrok http 3000
> # Copia la URL pública, ej: https://abc123.ngrok.io
> ```
> Luego configura en tu panel de Wompi sandbox:
> ```
> Webhook URL: https://abc123.ngrok.io/api/payments/wompi/webhook
> ```
> Cada pago en sandbox disparará el webhook a tu máquina local.

**¿Cómo habilitar Mercado Pago?**
> 1. Ir a `/admin/configuracion`
> 2. Activar el toggle "Mercado Pago"
> 3. Esto guarda `MERCADOPAGO_ENABLED = 'true'` en la tabla `Settings` de la BD
> 4. Los usuarios verán la opción de pagar con MP en el checkout

**¿Qué es `IInventorySyncRepository`?**
> Es una interfaz reservada para la **Fase 2** del proyecto: sincronización con
> el software contable **Optimun**. No tiene implementación aún. Cuando llegue el
> momento, se creará `OptimunSyncRepository` que implementará esta interfaz.

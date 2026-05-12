# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md
@AUDITORIA.md

## Architecture: Clean Architecture + DDD

The project follows Clean Architecture strictly. Dependency direction: `apps/* → packages/domain ← packages/database`.

```
packages/domain        Pure TS — entities, repository interfaces, use cases, Result<T,E>
packages/database      Prisma 7 — implements domain repository interfaces
apps/api               NestJS — HTTP layer, wires domain use cases via DI
apps/web               Next.js 16 — SSR reads Prisma directly; mutations go through NestJS
```

**Never** import `@h2r/database` (Prisma) inside `packages/domain`. Domain is infrastructure-free by design.

## Data Flow Patterns

**SSR reads (catalog, product pages):** Server Component → `{ prisma }` from `@h2r/database` → direct DB query. No HTTP round-trip to NestJS.

**Authenticated mutations (checkout, orders):** Client Component → `fetch('/api/...')` with Bearer JWT → NestJS → domain use case → Prisma repository.

**Admin operations:** `apps/web/src/app/admin/` Server Components → NestJS REST (with `x-internal-secret` or ADMIN JWT) → `@Roles('ADMIN')` guards.

## Key File Map

| Concern | File |
|---------|------|
| Auth config (NextAuth v5) | `apps/web/src/lib/auth.ts` |
| Route protection (proxy) | `apps/web/src/proxy.ts` |
| API HTTP client factory | `apps/web/src/lib/api-client.ts` |
| Cart state (Zustand) | `apps/web/src/lib/cart.ts` |
| NestJS DI symbols | `apps/api/src/infrastructure/injection-tokens.ts` |
| Domain entities | `packages/domain/src/entities/` |
| Domain use cases | `packages/domain/src/use-cases/` |
| Result<T,E> + AppError | `packages/domain/src/shared/Result.ts` |
| Prisma schema | `packages/database/prisma/schema.prisma` |

## Domain Layer Patterns

**Result type** — use cases never throw; they return `Result<T, AppError>`:
```ts
import { ok, err, Result } from '@h2r/domain'
// AppError codes: NOT_FOUND | VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN
//                 PAYMENT_ERROR | STOCK_UNAVAILABLE | INTERNAL_ERROR
```
The NestJS `HttpExceptionFilter` maps these codes to HTTP status codes.

**Repository injection** — always inject via Symbol, never class token:
```ts
constructor(@Inject(PRODUCT_REPOSITORY) private repo: IProductRepository) {}
```

## Stock & Payment Patterns

- Stock is **not** decremented on order creation — only when a payment webhook fires `APPROVED`.
- `decrementStock(id, quantity)` is atomic; safe for concurrent webhooks.
- Both Wompi and Mercado Pago webhooks are idempotent — `ConfirmPayment` checks `order.status` before acting.
- Wompi: SHA-256 signature. Mercado Pago: HMAC-SHA256 + extra API call to fetch transaction status.

## Price Convention

All prices are integers (centavos COP). **Never** use floats for money.

```ts
// Display
(price / 100).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })
// Store
Math.round(parseFloat(input) * 100)
```

## Authentication Flow

1. **Credentials:** NextAuth `authorize()` → `POST /auth/login` (NestJS) → returns NestJS JWT stored in session as `accessToken`.
2. **Google OAuth:** PrismaAdapter creates user → NextAuth `jwt` callback → `POST /auth/session-token` with `x-internal-secret` header → fetches NestJS JWT.

Session shape: `{ user: { id, role, accessToken } }`. The `accessToken` is sent as `Authorization: Bearer` to NestJS.

## Admin Protection (triple-layer)

1. `proxy.ts` — redirects non-ADMIN users before the route renders.
2. `apps/web/src/app/admin/layout.tsx` — server-side session check, renders 403 if role missing.
3. NestJS `@Roles('ADMIN')` guard — rejects requests even if the first two are bypassed.

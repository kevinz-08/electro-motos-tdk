<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# H2R Online Store — Agent Guide

pnpm + Turborepo monorepo with two apps and three shared packages.

```
apps/web      Next.js 16 (App Router, :3000)  → SSR + client
apps/api      NestJS 10 (REST, :3001)          → JWT-guarded API
packages/domain    Pure TS — zero external deps
packages/database  Prisma 7 singleton (PrismaPg adapter)
packages/types     Shared DTOs (mostly empty, being populated)
```

## Commands (run from root)

| Task | Command |
|------|---------|
| Dev both | `pnpm dev` |
| Build all | `pnpm build` |
| Lint all | `pnpm lint` |
| Type-check all | `pnpm type-check` |
| Generate Prisma client | `pnpm db:generate` |
| Run migrations | `pnpm db:migrate` |
| Apply migrations (prod) | `pnpm --filter @h2r/database exec prisma migrate deploy` |
| Seed DB | `pnpm db:seed` |
| Prisma Studio | `pnpm db:studio` |
| Dev just API | `pnpm --filter @h2r/api dev` |
| Dev just Web | `pnpm --filter @h2r/web dev` |
| Test domain | `pnpm --filter @h2r/domain test` |
| Test API | `pnpm --filter @h2r/api test` |
| Test E2E (web) | `pnpm --filter @h2r/web exec playwright test` |
| Single unit file | `pnpm --filter @h2r/domain exec vitest run src/__tests__/<file>.test.ts` |
| Domain coverage | `pnpm --filter @h2r/domain exec vitest run --coverage` |

**Order matters:** `pnpm db:generate` must run before any dev/build command (Prisma client is in `.gitignore`). After pulling, always `pnpm install && pnpm db:generate`.

## Architecture: Clean Architecture + DDD

Dependency direction: `apps/* → packages/domain ← packages/database`.

```
packages/domain       Pure TS — entities, repository interfaces, use cases, Result<T,E>
packages/database     Prisma 7 — implements domain repository interfaces
apps/api              NestJS — HTTP layer, wires domain use cases via DI
apps/web              Next.js 16 — SSR reads Prisma directly; mutations go through NestJS
```

**Never** import `@h2r/database` inside `packages/domain`. Domain is infrastructure-free by design.

### Data Flow

- **SSR reads:** Server Component → `{ prisma }` from `@h2r/database` → direct DB (no HTTP to NestJS).
- **Mutations:** Client Component → `fetch('/api/...')` with Bearer JWT → NestJS → domain use case → Prisma.
- **Admin:** Server Components → NestJS REST (ADMIN JWT) → `@Roles('ADMIN')` guards.

## Monorepo quirks

- **Turbo `^build`:** `dev`, `lint`, `type-check` depend on `^build`, so dependent packages build first. First `pnpm dev` builds `packages/domain` and `packages/database` before starting apps.
- **3 env files needed:** `apps/web/.env.local`, `apps/api/.env`, `packages/database/.env`. All need `DATABASE_URL`. `packages/database/prisma.config.ts` tries multiple paths to find it.
- **`INTERNAL_API_SECRET`** must match between `apps/web/.env.local` and `apps/api/.env` (NextAuth ↔ NestJS session-token handshake).
- **No CI/CD workflows** in `.github/workflows/`.
- **No ESLint in API** — `@h2r/api` lint is a no-op. `@h2r/web` uses eslint-config-next.
- **Domain coverage thresholds:** 80% lines/functions/statements, 70% branches (enforced in `packages/domain/vitest.config.ts`).
- **E2E:** `checkout.spec.ts` depends on a `setup` project that writes auth state to `playwright/.auth/user.json`. Run `pnpm dev` before running Playwright locally.

## Prisma 7 specifics

- `@h2r/database` is the **single Prisma client** for the monorepo. Both apps import `{ prisma }` from `@h2r/database`.
- Uses `PrismaPg` adapter. Generated client lives in `packages/database/src/generated/prisma/` (gitignored).
- **Singleton via `globalThis.__h2rPrisma`** to avoid connection pool exhaustion in dev (Neon free tier limit).
- Schema at `packages/database/prisma/schema.prisma`. Enums: `Role`, `OrderStatus`, `PaymentProvider`, `PaymentStatus`.
- **All prices in centavos** (int, not float).

## Next.js 16 quirks

- **Route protection uses `proxy.ts`** (not `middleware.ts`). Export is `export const proxy` (not `default`). Runs on Node.js runtime, not Edge.
- **`next.config.ts`** sets `typescript: { ignoreBuildErrors: true }`, `reactCompiler: true`, and `turbopack.root` pointing to monorepo root (so Turbopack compiles `packages/*`).
- **Auth:** NextAuth v5 beta with JWT strategy (required for Credentials + PrismaAdapter). `apps/web/src/lib/auth.ts` is the single config. Tokens carry `accessToken` (NestJS JWT) for API calls.
- **Zustand cart** persists to `localStorage["electro-motos-cart:{userId}"]`.

## NestJS 10 specifics

- **Custom webpack** (`apps/api/webpack.config.js`) — critical: `@h2r/*` packages are allowlisted so webpack bundles them (otherwise `require('@h2r/database')` hits raw `.ts` and crashes).
- **Global guards** (all in `app.module.ts`): `ThrottlerGuard` (100 req/min), `JwtAuthGuard` (opt out with `@Public()`), `RolesGuard` (`@Roles('ADMIN')`).
- **Global `ValidationPipe`** with `whitelist: true, forbidNonWhitelisted: true` — rejects unknown fields.
- **Swagger** at `/api/docs` in dev only.
- **DI symbols** in `infrastructure/injection-tokens.ts` (`PRODUCT_REPOSITORY`, `ORDER_REPOSITORY`, etc.) — use `@Inject()` with these Symbols, not class tokens.
- **Build output:** `apps/api/dist/main.js` (containerized, deployed on Cloud Run).
- **Startup validation:** `apps/api/src/main.ts` calls `assertEnvVars()` — exits with code 1 if critical vars missing.

## Domain Patterns

- **Result type** — use cases never throw; they return `Result<T, AppError>` (codes: `NOT_FOUND | VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | PAYMENT_ERROR | STOCK_UNAVAILABLE | INTERNAL_ERROR`). `HttpExceptionFilter` maps codes to HTTP statuses.
- **Repository injection** — always via Symbol token (`@Inject(PRODUCT_REPOSITORY) private repo: IProductRepository`), never class token.

## Critical Patterns

- **Emails never inline** — after payment webhook succeeds, `EmailQueueService.enqueue(to, orderId)` writes to `EmailQueue` table. A `setInterval` polls every 2 min, max 3 retries (5s→30s→120s backoff). Never revert to fire-and-forget `.catch()`.
- **Stock decremented only on APPROVED webhook** — not on order creation. `decrementStock(id, quantity)` is atomic. Both Wompi and Mercado Pago webhooks are idempotent (checks `order.status` before acting). Wompi: SHA-256 signature. Mercado Pago: HMAC-SHA256 + extra API call.
- **Cache invalidation:** Admin mutations call `POST /api/admin/revalidate` with `{ tags: string[] }` (requires ADMIN session). Use `CACHE_TAGS` constants from `apps/web/src/lib/cache-tags.ts`.
- **Auth flow:** Credentials → NextAuth `authorize()` → `POST /auth/login` (NestJS) → NestJS JWT in session as `accessToken`. Google OAuth → PrismaAdapter → `jwt` callback → `POST /auth/session-token` with `x-internal-secret` → NestJS JWT.
- **Admin triple-layer protection:** (1) `proxy.ts` redirects non-ADMIN, (2) `admin/layout.tsx` server-side check, (3) NestJS `@Roles('ADMIN')` guard.

## Deployment

- **API → Cloud Run (GCP).** Docker build at `apps/api/Dockerfile` (4-stage: base → deps → builder → runner). Build: `pnpm db:generate` then `pnpm --filter @h2r/api build`. Cloud Run injects `PORT` env var automatically.
- **Web → Vercel.** Build: `pnpm install --frozen-lockfile && pnpm --filter @h2r/database generate && pnpm --filter @h2r/web build`. Framework: `nextjs`.
- Both build commands manually run `generate` because `@h2r/database` must produce the Prisma client first.
- **`railway.toml` is stale** — API migrated to Cloud Run; ignore Railway config.

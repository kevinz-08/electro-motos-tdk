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

**Order matters:** `pnpm db:generate` must run before any dev/build command (Prisma client is in `.gitignore`). After pulling, always `pnpm install && pnpm db:generate`.

## Monorepo quirks

- **Turbo `^build`:** `dev`, `lint`, and `type-check` depend on `^build`, so dependent packages build first. The first `pnpm dev` will build `packages/domain` and `packages/database` before starting apps.
- **3 env files needed:** `apps/web/.env.local`, `apps/api/.env`, `packages/database/.env`. All have `DATABASE_URL`. The `packages/database/prisma.config.ts` tries multiple paths to find it.
- **No tests.** No test framework configured anywhere. Skip testing commands.
- **No CI/CD workflows** in `.github/workflows/`.
- **`INTERNAL_API_SECRET`** must match between `apps/web/.env.local` and `apps/api/.env` (used for NextAuth ↔ NestJS session-token handshake).

## Prisma 7 specifics

- `@h2r/database` is the **single Prisma client** for the monorepo. Both apps import `{ prisma }` from `@h2r/database`.
- Uses `PrismaPg` adapter. Generated client lives in `packages/database/src/generated/prisma/` (gitignored).
- **Singleton via globalThis** (`__h2rPrisma`) to avoid connection pool exhaustion in dev (Neon free tier limit).
- Schema at `packages/database/prisma/schema.prisma`. Enums: `Role`, `OrderStatus`, `PaymentProvider`, `PaymentStatus`.
- **All prices in centavos** (int, not float). Display: `(cents / 100).toLocaleString('es-CO')`.

## Next.js 16 quirks

- **Route protection uses `proxy.ts`** (not `middleware.ts`). Export is `export const proxy` (not `default`). Runs on Node.js runtime, not Edge.
- **`next.config.ts`** sets `typescript: { ignoreBuildErrors: true }`, `reactCompiler: true`, and `turbopack.root` pointing to monorepo root (so Turbopack compiles `packages/*`).
- **Server Components** access Prisma directly (no HTTP to NestJS for read-only catalog queries).
- **Auth:** NextAuth v5 beta with JWT strategy (required for Credentials + PrismaAdapter). `apps/web/src/lib/auth.ts` is the single config. Tokens carry `accessToken` (NestJS JWT) for API calls.
- **Zustand cart** persists to `localStorage["electro-motos-cart:{userId}"]`.

## NestJS 10 specifics

- **Custom webpack** (`apps/api/webpack.config.js`) — critical: `@h2r/*` packages are allowlisted so webpack bundles them (otherwise `require('@h2r/database')` hits raw `.ts` at runtime and crashes).
- **Global guards** (all in `app.module.ts`):
  - `ThrottlerGuard` — 100 req/min global
  - `JwtAuthGuard` — all routes require JWT **by default** (opt out with `@Public()` decorator)
  - `RolesGuard` — `@Roles('ADMIN')` restricts endpoints
- **Global `ValidationPipe`** with `whitelist: true, forbidNonWhitelisted: true` — rejects unknown fields.
- **Swagger** at `/api/docs` in dev only.
- **DI symbols** in `infrastructure/injection-tokens.ts` (`PRODUCT_REPOSITORY`, `ORDER_REPOSITORY`, etc.) — use `@Inject()` with these Symbols, not class tokens.
- **Build output:** `apps/api/dist/main.js` (deployed on Railway).

## Deployment

- **API → Railway.** Build: `pnpm install --frozen-lockfile && pnpm --filter @h2r/database generate && pnpm --filter @h2r/api build`. Start: `node apps/api/dist/main.js`.
- **Web → Vercel.** Build: `pnpm install --frozen-lockfile && pnpm --filter @h2r/database generate && pnpm --filter @h2r/web build`. Framework: `nextjs`.
- Both build commands manually run `generate` because `@h2r/database` must produce the Prisma client first.

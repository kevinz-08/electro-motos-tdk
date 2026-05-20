# TODO Final — H2R Online Store

Notas generales y detalles de configuración que deben completarse antes o después del deploy.

---

## Variables de entorno pendientes

### `apps/web/.env.local`

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio en Vercel. La usan el sitemap y las OG images para construir URLs absolutas. | `https://h2r-store.vercel.app` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número de WhatsApp sin `+` ni espacios. Aparece en home y catálogo. | `573001234567` |
| `TEST_USER_EMAIL` | Email de un usuario real en la BD de desarrollo. Solo lo usan los tests E2E de checkout (Playwright). No va a producción. | `dev@tudominio.com` |
| `TEST_USER_PASSWORD` | Contraseña del usuario anterior. Solo para tests E2E locales. | — |

> **Nota sobre los tests E2E:** si `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` no están definidos, el `global-setup` de Playwright imprime un warning y los 4 tests de checkout se saltan automáticamente. Los otros 17 tests (catálogo, auth, carrito) corren igual sin esas variables.

---

## Configuración de variables de entorno para producción

### Orden de configuración recomendado

#### Grupo 1 — Infraestructura base (sin esto el app no arranca)

Configura primero en **Vercel** (Settings → Environment Variables → Production):

```
DATABASE_URL              → el de Neon (igual al local)
DATABASE_POOL_MAX         → 3
NEXTAUTH_SECRET           → generar nuevo con PowerShell: [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
NEXTAUTH_URL              → https://tu-frontend.vercel.app
INTERNAL_API_SECRET       → generar nuevo (distinto al NEXTAUTH_SECRET)
API_URL                   → https://tu-api.up.railway.app
NEXT_PUBLIC_API_URL       → https://tu-api.up.railway.app
NEXT_PUBLIC_APP_URL       → https://tu-frontend.vercel.app
```

Y en **Railway** en paralelo:

```
DATABASE_URL              → el de Neon
JWT_SECRET                → mismo valor que NEXTAUTH_SECRET de Vercel (o uno propio)
NODE_ENV                  → production
FRONTEND_URL              → https://tu-frontend.vercel.app
INTERNAL_API_SECRET       → el mismo que pusiste en Vercel (obligatorio que coincidan)
PORT                      → 3001
```

> Verifica que el login con email/contraseña funciona antes de continuar al grupo 2.

---

#### Grupo 2 — Pagos (el core del negocio)

En **Vercel y Railway** (ambos necesitan estas claves):

```
WOMPI_PUBLIC_KEY          → pub_prod_7C3X9ChH9z8y1MlVpaOVToGdaROiZMUO
WOMPI_PRIVATE_KEY         → prv_prod_fqGb5aWv2Tv2SrL9OKtZgIa39jl6n9fr
WOMPI_INTEGRITY_SECRET    → prod_integrity_0COBdVjACLHntimlw4MAQvViZDOEYqAB
WOMPI_EVENTS_SECRET       → prod_events_dlhltMbMNvjhHzZ1yvXjIbPw8Oh7b37Y
WOMPI_ENV                 → production
```

> El frontend usa `WOMPI_PUBLIC_KEY` para el widget. El API usa el resto para verificar webhooks.

---

#### Grupo 3 — Emails y Google OAuth

En **Railway** (el API es quien envía emails):

```
RESEND_API_KEY            → de resend.com
RESEND_FROM_EMAIL         → no-reply@electromotos-tony.co
```

En **Vercel y Railway**:

```
GOOGLE_CLIENT_ID          → de Google Cloud Console
GOOGLE_CLIENT_SECRET      → de Google Cloud Console
```

> Recuerda agregar `https://tu-frontend.vercel.app/api/auth/callback/google` como URI de redirección autorizada en Google Cloud Console.

---

#### Grupo 4 — Imágenes y WhatsApp (verificar que estén igual a local)

En **Vercel y Railway**:

```
CLOUDINARY_CLOUD_NAME               → dip8uoaue
CLOUDINARY_API_KEY                  → 455326996562219
CLOUDINARY_API_SECRET               → (el valor del .env.local)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   → dip8uoaue
NEXT_PUBLIC_WHATSAPP_NUMBER         → 573152926609
```

---

### Problemas conocidos en el .env.local actual

| Problema | Detalle |
|---|---|
| `API_URL` y `NEXT_PUBLIC_API_URL` apuntan a `localhost:3001` | Cambiar a URL de Railway en producción |
| `NEXT_PUBLIC_APP_URL` y `NEXTAUTH_URL` apuntan a `localhost:3000` | Cambiar a URL de Vercel en producción |
| Wompi en modo `sandbox` con claves de test | Descomentar claves prod y cambiar `WOMPI_ENV=production` |
| `NEXTAUTH_SECRET` e `INTERNAL_API_SECRET` tienen el mismo valor | Deben ser secretos distintos en producción |
| `RESEND_API_KEY` vacío | Emails de confirmación no se envían sin esta clave |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` vacíos | Login con Google no funciona |

---

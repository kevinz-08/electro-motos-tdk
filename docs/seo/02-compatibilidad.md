# Fase 2 — Sistema de compatibilidad por modelo de moto

**Fecha:** 2026-09-22
**Rama:** `feat/seo-and-geo-improvement`
**Estado:** implementado y verificado end-to-end contra la base de datos real.
**Migración:** aplicada (`20260922000000_motorcycle_fitment_system`).

Es el núcleo del proyecto: en repuestos de moto, la búsqueda y la compra giran
alrededor de la compatibilidad por modelo. Todo lo que viene después —datos
estructurados, conversión, contenido, GEO— se apoya en esto.

---

## 1. Qué había antes y qué hay ahora

| | Antes | Ahora |
|---|---|---|
| Compatibilidad | Texto libre en `ProductCompatibilityItem`, escrito a mano por el admin ("Honda CB160F 2020-2023"). No consultable, no filtrable, no indexable | `Fitment`: producto ↔ modelo, con posición, rango de años, notas, **fuente** y **verificación** |
| `MotorcycleCompatibility` | Tabla muerta, sin escritura en ningún flujo | Sigue ahí, intacta. La sustituye `Fitment` |
| Modelos de moto | No existían como entidad | `MotorcycleBrand` + `MotorcycleModel` con slug, cc, años y alias de búsqueda |
| Referencias OEM | No existían | `OemReference`, con búsqueda normalizada |
| URLs por modelo | Ninguna | `/repuestos/[marca]/[modelo]` y `/repuestos/[marca]/[modelo]/[categoria]` |
| Búsqueda "pastillas nkd" | Solo encontraba si el nombre del producto decía "NKD" | Encuentra por modelo compatible y por sus alias |
| Selector de moto | No existía | "¿Qué moto tienes?" en el header, persistido en cookie |

---

## 2. La regla que atraviesa todo el sistema

> **Solo se publica un `Fitment` con `verified = true`.**

Una compatibilidad equivocada genera una devolución y destruye la confianza del
comprador: es el peor error posible en este negocio. Por eso el dato sin
verificar puede existir en la base de datos (cargado de un CSV, pendiente de
revisión) pero **no se muestra, no se cuenta, no se indexa y no genera página**.

La regla vive en un solo sitio del dominio (`isPublishable()` en
`entities/Motorcycle.ts`) y se aplica en cada consulta pública del repositorio,
no repartida por la interfaz.

Consecuencias visibles, todas verificadas:

- Un modelo **sin compatibilidades verificadas responde 404**, no una página
  vacía. Publicar una página por modelo que solo cambia el nombre es exactamente
  la definición de *doorway page* que el proyecto tiene prohibida.
- Una categoría sin productos para ese modelo responde 404.
- Una referencia OEM sin productos asociados responde 404.
- El sitemap de modelos solo incluye lo que sí se publica.

---

## 3. Modelo de datos

Migración **aditiva y reversible**: crea 2 enums, 4 tablas y 4 columnas
opcionales. No borra ni modifica nada existente. El propio archivo
`migration.sql` lleva escritos los `DROP` que la revierten.

```
MotorcycleBrand   name, slug, order, isActive
MotorcycleModel   brand, name, slug, cc?, yearFrom?, yearTo?, aliases[], intro?
Fitment           product ↔ model, position, yearFrom?, yearTo?, notes?,
                  source (obligatorio), verified, verifiedAt?, verifiedBy?
OemReference      product, reference, normalized, manufacturer?
Product (nuevas)  mpn?, partBrand?, partType?, warrantyMonths?
```

Decisiones que conviene conocer:

- **`source` es obligatorio.** Sin saber de dónde sale el dato no se puede
  verificar, así que el importador rechaza cualquier fila que no lo traiga.
- **`position` no es opcional** (por defecto `AMBAS`): eso permite que la clave
  única `(producto, modelo, posición)` funcione de verdad en Postgres, donde dos
  `NULL` se consideran distintos.
- **`cc`, `yearFrom`, `yearTo` e `intro` son opcionales** y la web no muestra lo
  que esté en `null`. Un dato que no está confirmado no se estima.
- **`aliases`** es lo que hace que "NKD", "nkd 125" y "AK125NKD" lleguen al mismo
  modelo, tanto en el buscador como en la importación de CSV.
- Las 4 columnas nuevas de `Product` **no están en ningún DTO del admin**: nada
  de lo que hoy hace el panel cambia por tenerlas.

---

## 4. Capas

### Dominio (`packages/domain`) — TypeScript puro

- `entities/Motorcycle.ts` — entidades y reglas: `isPublishable`, `fitsYear`,
  `formatYearRange`, `normalizeOemReference`, `modelSearchTerms`.
- `repositories/IFitmentRepository.ts` — contratos de `IMotorcycleRepository`,
  `IFitmentRepository` e `IOemReferenceRepository`.
- `use-cases/fitment/` — `GetModelHub`, `FindByOemReference`, `ImportFitments`,
  `parseFitmentCsv`.

**40 tests nuevos** (253 en total en el dominio), cobertura del módulo al 96 %.

### Infraestructura

Dos implementaciones del mismo contrato, como manda la arquitectura del repo:
`apps/web` para las lecturas SSR (van directas a Prisma) y `apps/api` para las
escrituras.

### API (NestJS)

| Endpoint | Para qué |
|---|---|
| `GET /motorcycles/brands` | Marcas activas |
| `GET /motorcycles/brands/:brandSlug/models` | Modelos de una marca |
| `GET /motorcycles/models` | Todos los modelos con su marca |
| `GET /motorcycles/:brandSlug/:modelSlug` | Hub: categorías con conteo |
| `GET /motorcycles/:brandSlug/:modelSlug/products` | IDs de productos compatibles |
| `GET /products/:id/fitments` | Compatibilidades verificadas + OEM |
| `GET /oem/:reference` | Productos de una referencia original |
| `POST /admin/fitments/models` | Alta de modelo (crea la marca si hace falta) |
| `POST /admin/fitments/import` | **Importación masiva desde CSV** |
| `POST /admin/fitments/oem` | Alta de referencia OEM |
| `GET /admin/fitments/product/:id` | Compatibilidades de un producto, verificadas y no |
| `DELETE /admin/fitments/:id` | Eliminar una compatibilidad |

### Frontend (Next.js)

| Ruta | Render |
|---|---|
| `/repuestos/[marca]/[modelo]` | SSG + ISR 10 min, `generateStaticParams` sobre modelos publicables |
| `/repuestos/[marca]/[modelo]/[categoria]` | SSG + ISR 10 min |
| `/referencia/[oem]` | Dinámica, `noindex, follow` |
| `/producto/[slug]` | **Sigue siendo SSG + ISR 5 min** |

---

## 5. La importación de CSV

Es la puerta por la que entran los datos reales (tarea H-02). Plantilla en
[`plantilla-compatibilidades.csv`](./plantilla-compatibilidades.csv):

```csv
sku,marca_moto,modelo_moto,posicion,anio_desde,anio_hasta,fuente,notas,verificado
3-MAG7L,AKT,NKD 125,ambas,2018,,Manual AKT 2023 pag. 48,,si
```

Validación deliberadamente estricta — todo lo que entre acabará diciéndole a un
comprador "esto le sirve a tu moto":

- Obligatorios: `sku`, `marca_moto`, `modelo_moto` y `fuente`.
- Años coherentes y dentro de rango; `anio_desde` no puede ser posterior a `anio_hasta`.
- Posición y verificado con valores reconocidos.
- Duplicados dentro del propio archivo, detectados.
- Comas dentro de comillas y BOM de Excel, soportados.
- **No crea modelos que no existan.** Si el CSV trae "Boxer CT 100" y el catálogo
  tiene "Boxer CT100", la fila se rechaza con un mensaje claro en vez de crear un
  modelo duplicado que competiría con el bueno.
- Una fila que falla **no aborta la importación**: se aplica lo bueno y se
  informa del resto con su número de línea y motivo.

---

## 6. Selector "¿Qué moto tienes?"

Marca → modelo → año (opcional, porque exigirlo pierde compradores). Se guarda en
la cookie `h2r-moto`.

**Decisión técnica que importa:** el badge de compatibilidad **no** lee la cookie
en el servidor. La ficha de producto es estática (`generateStaticParams` + ISR) y
llamar a `cookies()` la habría vuelto dinámica, perdiendo el prerender y
empeorando el TTFB de la página más importante de la tienda. El badge es un
Client Component que lee la cookie al hidratar.

No se pierde nada en SEO: un crawler nunca tiene moto seleccionada. Lo que sí
necesita ver —la tabla "Compatible con"— se renderiza en el servidor y entra en
el HTML estático. Verificado: `/producto/[slug]` sigue marcada como `●` (SSG) en
el build.

El badge tiene dos estados y la diferencia es deliberada:

- **"✓ Compatible con tu NKD 125"** — hay fitment verificado.
- **"No confirmado para tu NKD 125"** — no lo hay. **No dice "no sirve"**, porque
  no es lo mismo: el catálogo de compatibilidades está en construcción. Ofrece
  confirmarlo por WhatsApp con el producto y el SKU prellenados.

---

## 7. Archivos tocados

**Nuevos (dominio):** `entities/Motorcycle.ts` · `repositories/IFitmentRepository.ts` ·
`use-cases/fitment/{GetModelHub,FindByOemReference,ImportFitments,ParseFitmentCsv}.ts` ·
`__tests__/Fitment.test.ts`

**Nuevos (web):** `infrastructure/repositories/PrismaMotorcycleRepository.ts` ·
`lib/queries/fitment.ts` · `lib/my-motorcycle.ts` ·
`app/(store)/repuestos/[marca]/[modelo]/page.tsx` ·
`app/(store)/repuestos/[marca]/[modelo]/[categoria]/page.tsx` ·
`app/(store)/referencia/[oem]/page.tsx` · `app/sitemap-modelos.xml/route.ts` ·
`components/store/{FitmentTable,CompatibilityBadge,MotorcycleSelector,MotorcycleSelectorBar,ModelCategoryGrid,Breadcrumbs}.tsx`

**Nuevos (API):** `infrastructure/repositories/PrismaMotorcycleRepository.ts` ·
`motorcycles/{motorcycles.controller,motorcycles.module}.ts` ·
`admin/admin-fitments.controller.ts` · `admin/dto/{create-motorcycle-model,create-oem-reference}.dto.ts`

**Nuevos (datos y docs):** `prisma/migrations/20260922000000_motorcycle_fitment_system/migration.sql` ·
`prisma/motorcycles.ts` · `docs/seo/plantilla-compatibilidades.csv`

**Modificados:** `schema.prisma` · `domain/index.ts` · web: `lib/cache.ts`,
`lib/cache-tags.ts`, `lib/sitemap.ts`, `lib/search-index.ts`, `app/robots.ts`,
`app/sitemap.xml/route.ts`, `app/(store)/layout.tsx`,
`app/(store)/producto/[slug]/page.tsx` · api: `injection-tokens.ts`,
`infrastructure.module.ts`, `admin.module.ts`, `app.module.ts` · `package.json` (×2)

---

## 8. Cómo verificarlo

```bash
# 1. Migración (ya aplicada)
pnpm --filter @h2r/database exec prisma migrate deploy

# 2. Catálogo de marcas y modelos (idempotente)
pnpm db:motos

# 3. Tests y tipos
pnpm --filter @h2r/domain test          # 253 pasan
pnpm --filter @h2r/domain exec vitest run --coverage
pnpm type-check && pnpm lint

# 4. Build y rutas
pnpm --filter @h2r/web build            # /repuestos/... debe salir como ● (SSG)
pnpm seo:check http://localhost:3000    # 42/42
```

### Verificación end-to-end hecha el 2026-09-22

Se creó **un** fitment verificado de prueba (MODULO LED 6P MORADO ↔ AKT NKD 125)
y una referencia OEM, se comprobó el sistema completo y **se borraron ambos**. La
base quedó con 0 fitments, comprobado.

| Comprobación | Resultado |
|---|---|
| `/repuestos/akt/nkd-125` con datos | 200, prerenderizada como SSG |
| El hub muestra "1 repuesto compatible", "125 cc" y su categoría | Sí, conteos reales |
| `BreadcrumbList` en el hub | Presente |
| `/repuestos/akt/nkd-125/accesorios-generales` | 200, con `ItemList` y `numberOfItems: 1` |
| `/referencia/PRUEBA-E2E-00` | 200 |
| Ficha: tabla "Compatible con" enlazando a `/repuestos/akt/nkd-125` | Sí, más "Referencias originales" |
| Buscar "nkd" encuentra el MODULO LED (que no dice NKD en su nombre) | Sí — búsqueda por moto compatible |
| Selector en el header | Presente |
| `sitemap-modelos.xml` | 2 URLs (hub + categoría) |
| Modelo existente **sin** fitments (`/repuestos/bajaj/pulsar-ns-200`) | 404 |
| **Tras borrar los datos de prueba** | Las 3 rutas vuelven a 404, sitemap a 0 URLs |
| `/producto/[slug]` sigue siendo SSG | Sí (`●` en el build) |
| `pnpm seo:check` | 42/42 |
| Datos existentes tras la migración | 133 productos, 34 categorías, 36 pedidos — intactos |

---

## 9. Estado real: el sistema está, los datos no

**Hay 8 marcas y 32 modelos cargados. Hay 0 compatibilidades.**

Mientras siga así:

- Ningún hub se publica (todos 404).
- `sitemap-modelos.xml` va vacío.
- El badge de compatibilidad dirá siempre "no confirmado".
- La tabla "Compatible con" no aparece en ninguna ficha.

Y eso es lo correcto, no un fallo: **el sistema no inventa compatibilidades**. El
criterio de salida de la Fase 2 que pide el brief —5 modelos prioritarios
completamente navegables— **no se puede cumplir sin los datos de H-02**, que solo
puede aportar el negocio.

### Sobre el catálogo de modelos cargado

Los **10 modelos prioritarios** salen de la lista del propio brief (§2). Los
otros 22 son modelos reales del mercado colombiano añadidos para que el selector
no se vea vacío, **sin confirmar contra las ventas de H2R ni contra Search
Console** (tarea H-04). Un modelo de más no hace daño —sin compatibilidades no
genera página— pero uno mal escrito sí molesta, porque el importador de CSV lo
buscará por ese nombre exacto. Conviene revisar la lista antes de cargar datos.

El cilindraje solo se declaró donde aparece **en el propio nombre del modelo**
(NKD *125*, NMAX *155*, DR*150*). En Navi, Crypton, FZ 2.0, FZ 25 y Eco Deluxe va
`null` aunque el dato "se sepa": sin fuente confirmada no se declara, y la web
simplemente no lo muestra.

---

## 10. Riesgos y deuda

1. **Sin datos de compatibilidad, la Fase 2 no produce ningún resultado visible.**
   Es la dependencia crítica del proyecto entero (H-02).
2. **No hay pantalla de administración** para cargar compatibilidades: se hace
   por API (`POST /admin/fitments/import` con el CSV). Construirla es trabajo de
   la Fase 4, cuando se sepa cómo la va a usar el equipo (H-37).
3. **Las categorías siguen siendo query params** (`/catalogo?category=`). Pasarlas
   a rutas propias con 301 sigue pendiente de aprobación (H-26). Los hubs de
   modelo no dependen de ello.
4. **`generateStaticParams` de modelo × categoría hace una consulta por modelo.**
   Con decenas de modelos es irrelevante; con cientos habría que agrupar.
5. **`MotorcycleCompatibility` y `ProductCompatibilityItem` siguen existiendo.**
   La primera está muerta; la segunda se usa en el acordeón de la ficha. Migrar
   ese texto libre a fitments estructurados es trabajo manual: hay que leer cada
   texto y decidir a qué modelo corresponde. No se puede automatizar sin riesgo
   de inventar compatibilidades (H-38).
6. **El JSON-LD del producto todavía no declara `isAccessoryOrSparePartFor`**
   con las motos compatibles. Es Fase 3, y ahora ya hay datos para hacerlo bien.

---

## 11. Tareas nuevas para el humano

- **H-37** — Decidir si hace falta una pantalla en el panel para gestionar
  compatibilidades, o si basta con subir el CSV.
- **H-38** — Revisar los textos libres de `ProductCompatibilityItem` y decidir
  cuáles se convierten en fitments verificados.
- **H-39** — Revisar la lista de 32 modelos de `prisma/motorcycles.ts` y
  confirmar nombres y alias antes de cargar compatibilidades.

Sigue siendo bloqueante **H-02** (datos de compatibilidad verificados) y **H-04**
(confirmar los modelos prioritarios con ventas reales y Search Console).

*Última actualización: 2026-09-22*

# Fase 3 — Datos estructurados

**Fecha:** 2026-09-22
**Rama:** `feat/seo-and-geo-improvement`
**Estado:** implementada y verificada. Sin migraciones de base de datos.

Es la fase que hace legible el negocio para Google y para los motores
generativos: quién es H2R, qué vende, **para qué motos sirve cada repuesto** y en
qué condiciones lo entrega.

---

## 1. Antes y después

| Tipo | Antes | Ahora |
|---|---|---|
| `Organization` | ❌ | ✅ con NIT, dirección real, teléfono, `contactPoint` y perfiles verificados |
| `WebSite` + `SearchAction` | ❌ | ✅ apuntando al buscador real del catálogo |
| `Product` | Parcial: `name`, `sku`, `image`, `description`, `offers` mínimo | ✅ completo: `url`, `itemCondition`, `seller`, envío, devoluciones, `brand`, `mpn` y **`isAccessoryOrSparePartFor`** |
| `BreadcrumbList` | Solo en las rutas de modelo (Fase 2) | ✅ también en ficha de producto y categoría |
| `ItemList` | Solo en modelo × categoría | ✅ también en la categoría del catálogo |
| `FAQPage` | ❌ (el FAQ era visible pero sin marcar) | ✅ generado del mismo array que pinta el acordeón |
| Validación | Ninguna | ✅ `pnpm seo:schema`, 47 comprobaciones, en CI |

---

## 2. Las dos reglas que gobiernan el marcado

### 2.1 Nada que no se pueda sostener

Un `OfferShippingDetails` con tiempos inventados es **peor** que no tenerlo:
Google lo contrasta con la realidad del envío y penaliza la diferencia. Por eso
cada campo opcional sale de la base de datos, de `Settings` o de una página legal
publicada — y **si el dato no existe, el campo se omite**.

Lo que se marca y de dónde sale exactamente:

| Campo | Fuente real |
|---|---|
| NIT, razón social, dirección, teléfono | Brief del negocio (§2) |
| `sameAs` | Los tres perfiles que **ya publica el pie de página**, verificados uno a uno (responden 200) |
| `offers.price` / `availability` | Base de datos, en vivo |
| `shippingDetails.deliveryTime` | `Settings` — el mismo dato que ve el comprador en la ficha |
| `hasMerchantReturnPolicy.merchantReturnDays` | La página legal `/legal/politica-de-cambios` (5 días) |
| `brand` y `mpn` | Campos `partBrand` y `mpn` del producto; se omiten si están vacíos |
| `isAccessoryOrSparePartFor` | Fitments **verificados** de la Fase 2 |
| `aggregateRating` | Reseñas reales aprobadas por encima del umbral |

Lo que **deliberadamente no se marca**, y por qué:

| Campo | Por qué no | Tarea |
|---|---|---|
| `shippingRate` | El flete se cotiza por ciudad con la transportadora; no hay tarifa plana que afirmar | **H-13** |
| `returnFees` | Quién paga el flete de devolución no está definido en la política publicada. Declarar `FreeReturn` sin serlo es una promesa falsa | **H-15** |
| `LocalBusiness` | Prometería una tienda visitable sin confirmar que la hay | **H-10** |
| `sameAs` de Mercado Libre | La URL del brief (`/pagina/h2ronlinestore/`) **devuelve 404** | **H-12** |

### 2.2 El marcado refleja lo visible

Las migas, el FAQ y las listas se generan de **los mismos datos que pinta la
página**, no de una copia paralela que pueda quedar desfasada:

- `Breadcrumbs` emite el `<nav>` visible y el `BreadcrumbList` del mismo array.
- El FAQ de la home se movió a `lib/faq.ts`, y lo consumen el acordeón y el
  `FAQPage`. Antes vivía dentro del componente cliente y no había forma de
  marcarlo sin duplicarlo.
- El `ItemList` lleva los productos de esa página y en su orden, no el total del
  catálogo.

---

## 3. Lo que esto desbloquea para GEO

El campo que más importa de toda la fase:

```json
"isAccessoryOrSparePartFor": [{
  "@type": "Motorcycle",
  "name": "AKT NKD 125",
  "brand": { "@type": "Brand", "name": "AKT" },
  "model": "NKD 125",
  "vehicleModelDate": "2018-2024",
  "vehicleEngine": {
    "@type": "EngineSpecification",
    "engineDisplacement": { "@type": "QuantitativeValue", "value": 125, "unitCode": "CMQ" }
  },
  "url": "https://www.tiendah2r.com/repuestos/akt/nkd-125"
}]
```

Sin esto, la compatibilidad solo existe como texto dentro de una tabla. Con esto,
un motor generativo puede responder **"¿qué pastillas le sirven a una XR190L?"**
citando a H2R. `vehicleModelDate` y `vehicleEngine` solo aparecen cuando los años
y el cilindraje están confirmados.

---

## 4. Archivos tocados

**Nuevos**

| Archivo | Qué es |
|---|---|
| `apps/web/src/lib/structured-data.ts` | Todos los constructores JSON-LD, tipados |
| `apps/web/src/components/seo/JsonLd.tsx` | Inserta el marcado con el escape de `<` |
| `apps/web/src/lib/faq.ts` | Preguntas frecuentes compartidas por el acordeón y el `FAQPage` |
| `scripts/seo-schema.mjs` | Validador de datos estructurados |
| `docs/seo/03-datos-estructurados.md` | Este documento |

**Modificados:** `app/layout.tsx` (Organization + WebSite) · `(store)/home.tsx`
(FAQPage) · `(store)/producto/[slug]/page.tsx` (Product completo + migas) ·
`(store)/catalogo/page.tsx` (ItemList + migas) ·
`(store)/repuestos/[marca]/[modelo]/[categoria]/page.tsx` y
`components/store/Breadcrumbs.tsx` (pasan a usar la utilidad central) ·
`components/store/FAQ.tsx` · `package.json` · `.github/workflows/seo.yml`

---

## 5. Cómo verificarlo

```bash
pnpm --filter @h2r/web build && pnpm --filter @h2r/web start
pnpm seo:schema http://localhost:3000   # datos estructurados
pnpm seo:check  http://localhost:3000   # robots, sitemaps, canonical
```

### Verificación hecha el 2026-09-22

Sobre un build de producción local, contra la base de datos real:

| Comprobación | Resultado |
|---|---|
| `pnpm seo:schema` sin compatibilidades cargadas | **43/43** |
| `pnpm seo:schema` con un fitment de prueba (hub publicado) | **47/47** |
| `pnpm seo:check` | 42/42 |
| `Organization` con NIT, dirección y 3 perfiles | Verificado en el HTML |
| `Product.offers` con envío 2-5 días (de `Settings`) y devolución de 5 días | Verificado |
| `brand` y `mpn` presentes al cargarlos, ausentes al vaciarlos | Verificado en ambos sentidos |
| `isAccessoryOrSparePartFor` con `Motorcycle`, años y cilindrada | Verificado |
| `type-check`, `lint` (0 errores), 253 tests de dominio, 191 de API | Todo en verde |

Los datos de prueba (un fitment y los campos `mpn`/`partBrand`) **se borraron al
terminar**: la base quedó con 0 fitments y los campos en `null`, comprobado.

---

## 6. Riesgos y deuda

1. **El marcado es tan bueno como los datos.** Hoy `brand`, `mpn` e
   `isAccessoryOrSparePartFor` **no aparecen en ninguna ficha real**, porque no
   hay ni marcas de repuesto (H-18) ni compatibilidades cargadas (H-02). El
   código está probado en ambos sentidos, pero en producción esos campos saldrán
   vacíos hasta que lleguen los datos.
2. **`priceValidUntil` no se declara.** Google lo pide para ofertas con fecha de
   fin; aquí los precios no tienen vigencia definida y poner una fecha arbitraria
   sería inventar.
3. **Las reseñas individuales (`Review`) no se marcan**, solo el
   `aggregateRating`. Añadirlas es trivial cuando haya volumen suficiente.
4. **El validador comprueba presencia y forma, no semántica.** Que
   `merchantReturnDays: 5` esté presente no significa que la política siga siendo
   de 5 días: eso lo confirma un humano (H-15).
5. **La home marca `FAQPage` con respuestas que contienen datos del negocio**
   (envío gratis desde $500.000, garantía de 6 meses, cambios en 5 días). Si
   alguno deja de ser cierto, el marcado lo propaga a Google. Está anotado en
   `lib/faq.ts`.

---

## 7. Tareas para el humano

Ninguna nueva. Esta fase **aprieta** cuatro que ya existían, porque ahora se nota
exactamente qué falta:

- **H-02** compatibilidades verificadas → sin ellas no hay `isAccessoryOrSparePartFor`, que es lo que hace citable el catálogo.
- **H-18** marca, MPN y tipo de repuesto → sin ellos no hay `brand` ni `mpn`.
- **H-13** costos reales de envío por ciudad → para completar `shippingRate`.
- **H-15** política de devoluciones → para completar `returnFees`.
- **H-12** queda reducida a una sola cosa: la **URL correcta de Mercado Libre**
  (la del brief da 404). Instagram, Facebook y TikTok ya están verificados y
  marcados.

*Última actualización: 2026-09-22*

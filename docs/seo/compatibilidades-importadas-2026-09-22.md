# Primera carga real de compatibilidades

**Fecha:** 2026-09-22 · **Confirmado por:** Santiago (kevingadev@gmail.com) tras revisar
`borrador-compatibilidades-candidatas.csv` y `borrador-compatibilidades-notas-existentes.csv`.

Es la primera vez que la Fase 2 publica algo. Hasta ahora el sistema estaba completo pero con 0
compatibilidades verificadas; esto cierra parcialmente la tarea **H-02**.

## Cómo se cargó

Con el mismo algoritmo de parseo y coincidencia marca+modelo que usa
`POST /admin/fitments/import` (`packages/domain/src/use-cases/fitment/{ParseFitmentCsv,ImportFitments}.ts`),
ejecutado por script directo contra la base de datos porque no hay credenciales de admin de
producción disponibles en esta sesión — no se inventó ninguna lógica nueva, se reprodujo la existente.

Las 56 filas de los dos CSV de borrador se cargaron con `verified=true`, `verifiedBy` con el email de
quien confirmó y `verifiedAt` con la fecha de hoy. **Los dos CSV en el repositorio se quedan tal cual
están, con `verificado=no`**: son el registro histórico de que en su momento eran una propuesta a
revisar, no la carga en sí.

## Resultado

| | |
|---|---|
| Filas procesadas | 56 (20 + 36) |
| Creadas | 55 |
| Actualizadas | 1 (la misma combinación producto+modelo+posición aparecía en ambos CSV) |
| Fallidas | 0 |
| Fitments verificados en la base | **55** |
| Modelos con hub publicado | **20** de 41 |

## Modelos que ya publican página, con su conteo

| Modelo | Fitments | Hub |
|---|---|---|
| Yamaha FZ 2.0 | 11 | `/repuestos/yamaha/fz-2-0` |
| Suzuki Gixxer 150 | 11 | `/repuestos/suzuki/gixxer-150` |
| Suzuki Gixxer 250 | 5 | `/repuestos/suzuki/gixxer-250` |
| KTM Duke 200 | 4 | `/repuestos/ktm/duke-200` |
| Bajaj Pulsar NS 200 | 3 | `/repuestos/bajaj/pulsar-ns-200` |
| Yamaha XTZ 125 | 3 | `/repuestos/yamaha/xtz-125` |
| Yamaha MT-15 | 2 | `/repuestos/yamaha/mt-15` |
| TVS Apache RTR 160 | 2 | `/repuestos/tvs/apache-rtr-160` |
| Honda CB160F | 2 | `/repuestos/honda/cb160f` |
| Yamaha BWS 125 | 2 | `/repuestos/yamaha/bws-125` |
| Suzuki DR150, Honda Navi, Bajaj Pulsar 400, Yamaha XTZ 250, Yamaha R15, Yamaha FZ 25, Honda CB190R, Bajaj Discover 125, Kawasaki Z250, Yamaha NMAX 155 | 1 cada uno | — |

Los otros 21 modelos del catálogo siguen sin ningún fitment verificado y responden 404, como debe ser.

## Verificado en producción (no solo en local)

```
GET /repuestos/yamaha/fz-2-0      → 200
GET /repuestos/suzuki/gixxer-150  → 200
GET /repuestos/ktm/duke-200       → 200
```

## Hallazgo: falta invalidar caché tras importar

El selector "¿Qué moto tienes?" y `sitemap-modelos.xml` **todavía no reflejan esta carga en
producción** al momento de escribir esto. No es un error de los datos: esas dos consultas
(`getCachedMotorcycleCatalog`, `getCachedVerifiedFitmentCount`, y el propio sitemap) están cacheadas
por **1 hora** con el tag `fitments`, y **ni el endpoint real `POST /admin/fitments/import` ni este
script llaman a `revalidateTag('fitments')`** — esa invalidación hoy solo la disparan las pantallas de
admin que sí existen (productos, categorías…), y no hay ninguna para compatibilidades todavía (H-37).

Los hubs de modelo individuales sí aparecieron al instante porque nunca habían sido pedidos antes
(cache miss → consulta en vivo), pero el selector y el sitemap de modelos ya tenían una entrada en
caché de cuando el conteo era 0, así que van a mostrar el estado viejo hasta que esa entrada expire
por su cuenta.

**Se autocorrige solo, en máximo 1 hora, sin hacer nada.** Si se quiere ver ahora mismo, con sesión de
ADMIN iniciada en el sitio, desde la consola del navegador:

```js
fetch('/api/admin/revalidate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tags: ['fitments', 'products'] }),
})
```

**Tarea nueva para más adelante** (no urgente, no bloquea nada): cuando se construya la pantalla de
admin para compatibilidades (H-37), hay que hacer que llame a `revalidateAdminCache(['fitments'])`
después de un import exitoso, igual que ya hacen las demás pantallas del panel.

*Última actualización: 2026-09-22*

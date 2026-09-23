# Guía paso a paso — tareas pendientes de las Fases 1, 2 y 3

Escrito para: Santiago, para trabajar solo sin tener que volver a preguntar cada paso.

Verifiqué antes de escribir esto qué pantallas de admin existen realmente y cuáles no. Para cada
tarea digo **si hay una pantalla lista** o **si hay que hacerlo distinto** — no te mando a buscar un
botón que no existe.

---

## FASE 1 — quedan 2 tareas chicas

### H-22: corregir el texto alternativo de los banners (5 minutos)

**Hoy el `altText` de los banners del hero es una cadena de espacios.** Es lo único que le falta a la
home para SEO 100 en Lighthouse, y afecta accesibilidad real (lectores de pantalla).

1. Entrá a `/admin/banners` con tu sesión de ADMIN.
2. Por cada banner del carrusel vas a ver un campo **"Texto alternativo"** (es obligatorio, máximo 120
   caracteres — la pantalla ya existe y valida esto).
3. Escribí una descripción real de la imagen. No es una frase de marketing, es literalmente qué se ve:

   - Mal: `""` (vacío o espacios, como está ahora)
   - Mal: `"¡Ofertas increíbles!"` (no describe la imagen)
   - Bien: `"Moto AKT NKD 125 roja con repuestos H2R en primer plano"`

4. Guardar. Se aplica al instante (la pantalla ya invalida la caché sola).

**Repetilo para cada banner activo.** Con 3-5 banners son 15-20 minutos en total.

---

### H-34: reenviar los sitemaps (5 minutos)

Ya está todo desplegado; solo falta avisarle a los buscadores que la estructura cambió.

**En Google Search Console** (ya verificada — [search.google.com/search-console](https://search.google.com/search-console)):

1. Menú izquierdo → **Sitemaps**.
2. Si ves un `sitemap.xml` viejo enviado, dejalo — el nuevo tiene el mismo nombre y URL, solo cambió
   el contenido (antes era una lista, ahora es un índice).
3. En el campo "Añadir un sitemap nuevo", escribí uno por uno y dale **Enviar** después de cada uno:
   ```
   sitemap.xml
   sitemap-paginas.xml
   sitemap-categorias.xml
   sitemap-productos.xml
   sitemap-modelos.xml
   ```
4. Van a tardar unas horas en pasar de "Pendiente" a "Correcto". `sitemap-modelos.xml` ya tiene 68
   URLs (los 20 modelos con compatibilidad cargada), así que no debería salir vacío.

**En Bing Webmaster Tools** ([bing.com/webmasters](https://www.bing.com/webmasters)):

1. Si nunca lo configuraste: botón **"Importar desde Google Search Console"** en la pantalla inicial
   — trae la propiedad y la verificación en un paso.
2. Menú **Sitemaps** → pegá `https://www.tiendah2r.com/sitemap.xml` → Enviar. Con ese solo alcanza
   (es el índice, Bing sigue los enlaces a los demás).

---

### Opcional, no bloquea nada: H-36 (medir Lighthouse "después")

Esto lo puedo correr yo cuando quieras — avisame y ejecuto `pnpm seo:lighthouse` contra producción y
completo `01-resultados.md` con el resultado real (comparado contra las cifras "antes" de la Fase 0).

---

## FASE 2 — seguir cargando compatibilidades

### H-02: cargar más compatibilidades (continuo, sin fecha límite)

Van 55 fitments en 20 de 41 modelos. Cuantas más cargues, más páginas indexables tenés. Dos formas de
hacerlo, según cuánto tiempo quieras invertir vos mismo:

**Opción A — más rápida: mandame los datos y yo armo el CSV**

Si tenés en la cabeza (o en una hoja de cálculo, factura de proveedor, etc.) qué producto sirve a qué
moto, pasámelo en cualquier formato — aunque sea una lista suelta tipo:

```
Pastillas de freno delanteras Brembo (SKU X) -> Pulsar NS 200 y Pulsar N250, 2019 en adelante
Kit de arrastre AKT (SKU Y) -> NKD 125, todos los años
```

Yo lo estructuro, lo cruzo contra el catálogo de modelos, y te muestro el CSV final antes de cargarlo
— igual que hicimos con las 57 filas de hoy.

**Opción B — vos mismo, directo a la API**

Requiere herramienta tipo Postman/Insomnia (no hay pantalla de admin para esto todavía — es la tarea
H-37). Pasos:

1. **Conseguí la URL de tu API en producción.** Andá a la consola de Google Cloud Run
   ([console.cloud.google.com/run](https://console.cloud.google.com/run)), elegí el servicio
   `electro-motos-api`, copiá la URL que aparece arriba (algo como
   `https://electro-motos-api-xxxxx-uc.a.run.app`).

2. **Iniciá sesión como admin** para conseguir el token:
   ```
   POST https://<tu-api>/auth/login
   Content-Type: application/json

   { "email": "admin@electromotos-tony.co", "password": "<tu contraseña de admin>" }
   ```
   La respuesta trae un campo `accessToken`. Copialo.

3. **Llená el CSV** siguiendo `docs/seo/plantilla-compatibilidades.csv`
   (`sku,marca_moto,modelo_moto,posicion,anio_desde,anio_hasta,fuente,notas,verificado`). La columna
   **fuente es obligatoria** — sin ella el importador rechaza la fila.

4. **Subilo:**
   ```
   POST https://<tu-api>/admin/fitments/import
   Authorization: Bearer <el accessToken del paso 2>
   Content-Type: multipart/form-data

   file: <tu-archivo.csv>
   ```
   La respuesta te dice cuántas filas se crearon, actualizaron o fallaron, con el número de línea y
   el motivo de cada error.

5. **Importante:** hoy esto no refresca la caché del sitio al instante (tarea H-40, ya documentada).
   Los hubs nuevos aparecen enseguida, pero el selector de moto y el sitemap de modelos tardan hasta
   1 hora en reflejar la carga. No es un error, se autocorrige solo.

**Si preferís que te construya la pantalla de admin** para subir el CSV con un botón (en vez de
Postman), decímelo — no es mucho trabajo porque toda la lógica ya existe en el backend, solo falta la
interfaz. Es la tarea H-37.

---

### H-04: confirmar los modelos prioritarios (30 minutos)

Ya tenés dos fuentes reales para esto, ninguna inventada:

1. **Búsquedas reales del sitio**: `docs/seo/baseline/gsc-consultas-2026-09.csv` — mirá qué modelos
   aparecen mencionados en las 65 consultas (ya vimos "tacómetro bws x", "fender para gixxer 150",
   "ecu fz 2.0"…).
2. **Tus ventas reales**: si tenés un reporte de qué se vende más (Excel, el propio panel admin, o tu
   cabeza si conocés el negocio), compará contra la lista de 10 modelos "prioritarios" del brief
   (AKT NKD 125, Boxer CT100, NMAX 155, XR190L, DR150, Pulsar NS/N, FZ, Hunk 125R, Apache, Raider).

Decime si la lista sigue siendo correcta o si hay que reordenarla / cambiar alguno. No hace falta que
sea perfecto — es una guía de prioridad para las guías de contenido de la Fase 5, no algo que bloquee
nada hoy.

---

## FASE 3 — todo son datos de negocio, sin pantalla propia

Estas cinco no tienen una pantalla de admin dedicada porque son textos legales/comerciales que hoy
viven escritos directo en el código. Para cada una, decime el dato real y yo hago el cambio de código
(es rápido, un archivo cada vez) — o si querés editarlo vos mismo te digo exactamente qué archivo.

### H-18: marca y tipo de cada repuesto — **esta requiere que yo construya algo primero**

Los campos `mpn`, `partBrand`, `partType` y `warrantyMonths` **ya existen en la base de datos**
(los agregamos en la Fase 2), pero **no hay ningún campo en el formulario de editar producto todavía**
— ni siquiera la API los acepta hoy en `PUT /admin/products/:id`. No es algo que puedas llenar vos
solo sin que yo agregue esos 4 campos al formulario primero.

**Decime si querés que lo agregue ahora.** Es chico: 4 campos de texto/selector en el formulario que
ya existe, más la validación en la API. Una vez esté, vas producto por producto llenando marca real
del repuesto (ej. "Brembo", "NGK") y MPN si lo tenés.

Mientras tanto, si tenés esos datos en una hoja de cálculo, pasámela y yo armo el script de carga
masiva directo (como hicimos con las compatibilidades) sin esperar al formulario.

### H-13: tiempos de envío reales por ciudad

**Hoy solo hay un tiempo global** (2 a 5 días hábiles, configurable en `/admin/configuracion` →
"Prueba social y entrega"), no por ciudad. Lo que pide el brief (Bogotá, Medellín, Cali, Barranquilla,
Bucaramanga, Eje Cafetero con tiempos distintos) **es una funcionalidad nueva**, no un dato que se
pueda llenar en una pantalla que ya existe — es trabajo de la Fase 5 (páginas de envío por ciudad).

Lo que sí podés hacer ahora, sin código nuevo: si tenés esos tiempos reales por ciudad de tu acuerdo
con Coordinadora, pasámelos en cualquier formato y los dejo documentados en `HUMAN_TASKS.md` listos
para cuando se construya esa parte.

### H-15 / H-16: política de devoluciones y "si no le sirve, te lo cambiamos"

Hoy la ficha de producto dice "5 días calendario" (`/legal/politica-de-cambios`). Necesito que
confirmes:
1. ¿Sigue siendo 5 días calendario, o cambió?
2. ¿Quién paga el flete de devolución — el cliente o H2R?
3. ¿Existe de verdad la política "si no le sirve a tu moto, te lo cambiamos"? (Hoy no se menciona en
   ningún lado del código — si es real, se agrega; si no, se deja como está).

Con esas tres respuestas actualizo el JSON-LD de la Fase 3 (`MerchantReturnPolicy`) y, si hace falta,
el texto de la página legal.

### H-17: garantía por tipo de producto

¿Cuántos meses de garantía tiene cada categoría (baterías, llantas, repuestos eléctricos)? Hoy la
home dice "hasta 6 meses" de forma genérica. Si es distinto por categoría, dame la lista; si el
genérico de 6 meses es correcto para todo, confirmalo y lo dejamos así.

### H-12: la URL de Mercado Libre está mal en el brief

Verificado con `curl`: `https://www.mercadolibre.com.co/pagina/h2ronlinestore/` (la que trae el
brief) **da 404**. Instagram, Facebook y TikTok sí están bien y ya marcados en el JSON-LD.

1. Entrá a tu perfil de vendedor en Mercado Libre (logueado).
2. Copiá la URL exacta que ves en la barra de direcciones.
3. Pasámela y la agrego al `sameAs` de `Organization` en `lib/structured-data.ts`.

### H-10: ¿hay punto físico?

Es una sola pregunta: ¿alguien puede ir a Carrera 21 #21-58, Bucaramanga, y comprar o recoger un
pedido en persona? Si sí, creamos Google Business Profile y Bing Places, y cambiamos el JSON-LD de
`Organization` a `LocalBusiness`. Si no, se queda como está.

---

## Resumen: qué podés hacer ya mismo sin esperarme

| Tarea | Dónde | Tiempo |
|---|---|---|
| H-22 altText de banners | `/admin/banners` | 15-20 min |
| H-34 reenviar sitemaps | Search Console + Bing | 5 min |
| H-04 revisar modelos prioritarios | `docs/seo/baseline/gsc-consultas-2026-09.csv` | 30 min |
| H-12 URL real de Mercado Libre | Tu perfil de vendedor | 2 min |
| H-10 confirmar si hay punto físico | Solo pensarlo | 1 min |

## Lo que necesita una respuesta tuya antes de que yo pueda avanzar

H-15, H-16, H-17 (política de devoluciones y garantía), H-13 (tiempos de envío reales), H-18 (si
querés que construya el formulario ahora).

*Última actualización: 2026-09-22*

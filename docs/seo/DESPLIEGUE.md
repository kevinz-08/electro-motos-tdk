Escrito para: quien despliega y administra las cuentas de H2R (no hace falta saber el código).

# Guía de despliegue — Fases 1 a 3 del proyecto SEO

**Qué se despliega:** las fases 1 (base técnica), 2 (sistema de compatibilidad) y 3 (datos
estructurados) del proyecto `docs/seo/`.

**Migración de base de datos: ya está aplicada** (`20260922000000_motorcycle_fitment_system`, el
2026-09-22). No hay que correr nada antes de desplegar.

---

## 1. Antes de desplegar

### 1.1 Variables de entorno

| Dónde | Variable | Valor | ¿Obligatoria? |
|---|---|---|---|
| Vercel (web) | `NEXT_PUBLIC_SITE_URL` | `https://www.tiendah2r.com` | Recomendada. Si falta, el código cae a ese mismo valor, así que no rompe nada — pero mejor explícita |
| Cloud Run (API) | `INDEXNOW_KEY` | `57f804052944e876eedbd2eb22475f65` | Sí, para que IndexNow funcione |
| Cloud Run (API) | `SITE_URL` | `https://www.tiendah2r.com` | Sí, para las URLs que se notifican |

Las dos de Cloud Run **ya están en el workflow de despliegue** (`.github/workflows/ci.yml`, en
`--update-env-vars`), así que se aplican solas al desplegar la API. No hay que tocarlas a mano.

### 1.2 Qué va a cambiar de cara al público

Conviene saberlo antes de que alguien lo note y pregunte:

- **La home, el catálogo y las fichas se ven igual.** Los cambios de la Fase 1 son de metadatos y
  rendimiento; los de la Fase 3, marcado invisible para el usuario.
- **El hero del catálogo cambia en móvil**: ahora se ve una imagen fija en vez del vídeo. En
  escritorio con buena conexión el vídeo sigue apareciendo, un instante después de cargar. Es
  deliberado: el vídeo pesaba 30 MB y era lo que hacía lenta la página.
- **El selector "¿Qué moto tienes?" NO aparece todavía**, porque no hay compatibilidades cargadas.
  Aparecerá solo, sin desplegar nada, en cuanto se cargue la primera (tarea H-02).
- **Las rutas `/repuestos/...` responden 404** por el mismo motivo. Es lo correcto.
- La home deja de caerse de forma intermitente (había un error 500 aleatorio, ya corregido).

### 1.3 Un repaso que no es técnico, pero importa

Desde ahora, estas tres afirmaciones **viajan en el código como datos legibles por Google**, no solo
como texto de la página. Si alguna dejó de ser cierta, hay que corregirla antes de desplegar:

| Afirmación | Dónde está | Tarea |
|---|---|---|
| Envío gratis desde **$500.000** | FAQ de la home y ficha de producto | H-14 |
| Garantía de **hasta 6 meses** | FAQ de la home | H-17 |
| Cambios hasta **5 días** después de recibir | FAQ, ficha y el JSON-LD de devoluciones | H-15 |
| Despacho de **2 a 5 días hábiles** | Viene de la configuración del panel; se marca en el JSON-LD | H-13 |

### 1.4 Si Vercel genera una vista previa del PR

Es la forma más barata de comprobar que todo está bien antes de tocar producción:

```bash
pnpm seo:check  https://<url-de-la-preview>.vercel.app
pnpm seo:schema https://<url-de-la-preview>.vercel.app
```

Deben dar **42/42** y **43/43**. (Los canonical apuntarán a `www.tiendah2r.com` aunque se pruebe en
la preview: es correcto y los scripts lo tienen en cuenta.)

---

## 2. El despliegue

1. **Mergear el PR a `main`.** El CI corre lint, type-check, tests y build de la API.
2. **La API se despliega sola** a Cloud Run al hacer push a `main` (job `deploy` del workflow).
3. **La web se despliega sola** en Vercel al hacer push a `main`.

No hay orden obligatorio entre las dos: la migración ya está aplicada y las columnas nuevas son
opcionales, así que ninguna versión rompe a la otra.

**Si algo sale mal:** en Vercel, *Deployments → la versión anterior → Promote to Production* revierte
la web en segundos. La base de datos **no** hay que revertirla: lo que se añadió son tablas y
columnas nuevas que el código anterior ni mira.

---

## 3. Después de desplegar

### 3.1 Comprobación automática (5 minutos)

```bash
pnpm seo:check        # robots, sitemaps, canonical, indexación, crawlers de IA → 42/42
pnpm seo:schema       # datos estructurados → 43/43
pnpm seo:lighthouse   # Core Web Vitals contra producción
```

Los resultados de `seo:lighthouse` hay que pegarlos en `docs/seo/01-resultados.md` §4, que es lo
único que falta para cerrar la Fase 1 (**tarea H-36**). Ahí están las cifras "antes" para comparar.

### 3.2 Comprobación a mano (2 minutos)

```bash
curl -s https://www.tiendah2r.com/robots.txt | head -20
curl -s https://www.tiendah2r.com/sitemap.xml
curl -s https://www.tiendah2r.com/57f804052944e876eedbd2eb22475f65.txt
```

El tercero debe devolver exactamente `57f804052944e876eedbd2eb22475f65`. Si devuelve 404, IndexNow no
va a funcionar (**tarea H-33**).

### 3.3 Comprobar que IndexNow avisa de verdad

1. Entrar al panel y **cambiar el stock de cualquier producto**.
2. Esperar unos 30 segundos (el aviso se agrupa a propósito para no saturar).
3. Mirar los logs de Cloud Run y buscar `[IndexNow]`. Debe aparecer
   `[IndexNow] 1 URL(s) notificadas (HTTP 200)`.
   - `HTTP 403` = la clave no coincide con el archivo publicado.
   - Nada en los logs = falta `INDEXNOW_KEY` en la revisión de Cloud Run.

---

## 4. Google Search Console (tarea H-06)

Es lo más importante de la lista: sin esto no hay forma de saber qué URLs indexa Google, qué
búsquedas traen tráfico ni si algo se rompió.

### 4.1 Crear la propiedad

1. Entrar a **[search.google.com/search-console](https://search.google.com/search-console)** con la
   cuenta de Google del negocio (la misma que se use después para Merchant Center, para no repartir
   accesos).
2. **Añadir propiedad** → elegir **"Dominio"**, no "Prefijo de la URL".
   *Por qué Dominio:* cubre `tiendah2r.com`, `www.tiendah2r.com`, http y https de una vez. Con
   "Prefijo de la URL" habría que crear una propiedad por cada variante, y el sitio redirige del
   apex al `www`.
3. Escribir `tiendah2r.com` (sin `https://` ni `www`).
4. Google pide **verificar por DNS**: da un registro **TXT** del tipo
   `google-site-verification=xxxxxxxxxxxx`.
5. Añadir ese TXT en el panel del proveedor donde esté el dominio (el registrador o quien gestione
   los DNS), como registro del dominio raíz (`@`), sin tocar los demás registros.
6. Esperar de 5 minutos a 1 hora y pulsar **Verificar** en Search Console.

> Si no hay acceso a los DNS, la alternativa es "Prefijo de la URL" con
> `https://www.tiendah2r.com` y verificación por **etiqueta HTML**. Esa etiqueta hay que ponerla en
> el código — avisá y la añado en dos minutos; es una línea.

### 4.2 Enviar los sitemaps

En **Sitemaps** (menú izquierdo), añadir estas cinco URLs, una a una:

```
sitemap.xml
sitemap-paginas.xml
sitemap-categorias.xml
sitemap-productos.xml
sitemap-modelos.xml
```

Con enviar `sitemap.xml` bastaría —es un índice que apunta a los otros— pero enviándolos todos se ve
el estado de cada uno por separado, que es más útil para detectar problemas.

`sitemap-modelos.xml` va a aparecer **vacío o con 0 URLs**. Es lo esperado hasta que se carguen las
compatibilidades.

### 4.3 Pedir indexación de las páginas clave

En **Inspección de URLs**, pegar cada una y pulsar *Solicitar indexación*:

- `https://www.tiendah2r.com/`
- `https://www.tiendah2r.com/catalogo`
- Dos o tres fichas de producto importantes

Es una cola manual y limitada por día; sirve para acelerar el arranque, no para todo el catálogo.

### 4.4 Qué mirar las primeras semanas

- **Páginas → No indexadas**: normal que aparezcan las de `noindex` (carrito, checkout, cuenta,
  búsquedas). Si aparece una ficha de producto ahí, avisá.
- **Experiencia → Core Web Vitals**: tarda unas 4 semanas en poblarse con datos reales de usuarios.
  Es la medición que de verdad cuenta; lo de `seo:lighthouse` es de laboratorio.
- **Mejoras → Productos / Fragmentos de reseña**: ahí se ve si Google está leyendo bien el JSON-LD de
  la Fase 3.

---

## 5. Bing Webmaster Tools (tarea H-07)

Menos tráfico que Google, pero es **quien procesa IndexNow** y alimenta a Copilot.

1. Entrar a **[bing.com/webmasters](https://www.bing.com/webmasters)**.
2. **Importar desde Google Search Console** (botón en la pantalla inicial). Es lo más rápido: trae la
   propiedad y la verificación ya hechas. Si no, verificar por DNS con el mismo método de arriba.
3. En **Sitemaps**, enviar `https://www.tiendah2r.com/sitemap.xml`.
4. En **IndexNow**, comprobar que detecta la clave. Cuando empiecen a llegar avisos del panel, se ven
   ahí las URLs notificadas.

---

## 6. Lo que NO hace falta todavía

Para que no se pierda tiempo en cosas que corresponden a fases posteriores:

- **Google Merchant Center** — es la Fase 7, y además necesita la marca y el MPN de cada repuesto
  (H-18).
- **Google Analytics 4** — es una decisión pendiente (H-11) y forma parte de la Fase 4.
- **Google Business Profile** — solo si hay un punto físico atendiendo al público (H-10).

---

## 7. Resumen de tareas, en orden

| # | Tarea | Quién | Cuándo |
|---|---|---|---|
| 1 | Revisar las cuatro afirmaciones del §1.3 | Negocio | Antes |
| 2 | Mergear el PR | Dev | — |
| 3 | `seo:check`, `seo:schema`, `seo:lighthouse` contra producción | Dev | Después (H-36) |
| 4 | Comprobar la clave de IndexNow y los logs | Dev | Después (H-33) |
| 5 | Crear y verificar Search Console | Negocio/Dev | Después (H-06) |
| 6 | Enviar los 5 sitemaps | Dev | Después (H-34) |
| 7 | Bing Webmaster Tools + IndexNow | Dev | Después (H-07) |
| 8 | Corregir el texto alternativo de los banners del hero desde `/admin/banners` | Negocio | Cuando se pueda (H-22) |
| 9 | Revisar el vídeo recomprimido en un escritorio real | Negocio | Cuando se pueda (H-35) |

*Última actualización: 2026-09-22*

# Checklist de perfiles de marca (Fase 6, ítem 8)

**Ejecuta:** el equipo de H2R. Objetivo: que en todas partes H2R aparezca con **exactamente los mismos datos**. Los
motores de búsqueda y los generativos cruzan fuentes; si el nombre, la dirección o el teléfono cambian de un sitio a
otro, confían menos en todos.

## Datos canónicos (copiarlos tal cual en cada perfil)

| Dato | Valor |
|---|---|
| Nombre | **H2R Online Store** (también buscada como "Tienda H2R") |
| Razón social / NIT | H2R Online Store · 1007784964-5 |
| Dirección | Carrera 21 #21-58, Bucaramanga, Santander, Colombia |
| Teléfono / WhatsApp | +57 315 292 6609 |
| Correo | h2ronlinestore@gmail.com |
| Web | https://www.tiendah2r.com |
| Categoría principal | Tienda de repuestos para motocicletas |
| Descripción corta | Tienda de repuestos y accesorios para moto en Bucaramanga con envíos a toda Colombia. Compatibilidad verificada por modelo de moto. |
| Horario | **Pendiente de confirmar** — no publicarlo hasta tenerlo (se omitió a propósito en el JSON-LD) |

Estos son los mismos datos del JSON-LD `Organization` / `LocalBusiness` del sitio (`apps/web/src/lib/structured-data.ts`).
Si alguno cambia, se cambia ahí y en todos los perfiles el mismo día.

## Perfiles

| Perfil | Por qué | Estado | Tarea |
|---|---|---|---|
| **Google Business Profile** | El mapa de Google (local pack) domina "repuestos para moto en Bucaramanga" | ⬜ | H-41 |
| **Bing Places** | Alimenta Bing, Copilot y ChatGPT con búsqueda | ⬜ | H-42 (se importa desde GBP) |
| **Apple Business Connect** | Apple Maps y Siri | ⬜ | nueva, opcional |
| **Google Merchant Center** | Fichas gratuitas de Shopping (Fase 7) | ⬜ | H-09 |
| Instagram / Facebook / TikTok | Ya existen y están en el `sameAs` del JSON-LD | ✅ | revisar que la bio tenga los datos canónicos |
| Mercado Libre | Decidido no incluir por ahora (H-12) | — | — |
| **Wikidata** | Solo si cumple los criterios de notabilidad de Wikidata (fuentes independientes que hablen de la empresa). **Hoy no los cumple**: crear la ficha sin fuentes lleva a que la borren | ⛔ | revisar cuando haya notas de prensa (H-30) |
| Directorios colombianos | enColombia (almacenes de repuestos para motos en Bucaramanga), Páginas Amarillas | ⬜ | inscribirse con los datos canónicos |
| Marcas proveedoras | Listados de distribuidores de las marcas que se venden | ⬜ | plantilla 4 de `correos.md` |

## Al crear cada perfil

1. Usar los datos canónicos sin variaciones ("Cra." vs "Carrera", "H2R" vs "H2R Online Store").
2. Enlazar la web con UTM para medir: `https://www.tiendah2r.com/?utm_source=<perfil>&utm_medium=perfil`.
3. Subir fotos reales de la tienda física (fachada, mostrador) — no imágenes de stock.
4. Anotar aquí la fecha y la URL del perfil.

| Perfil | Fecha | URL |
|---|---|---|
| | | |

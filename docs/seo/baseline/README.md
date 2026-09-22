# Línea base de Search Console

Foto del estado del sitio **antes** de desplegar las fases 1 a 3, capturada el 2026-09-22 (rango: 16 meses, 17/6/26 – 21/9/26).

Sirve para dos cosas:

1. **Comparar.** Al desplegar cambian títulos, descripciones, canonicals y el sitemap. Sin esta foto
   no hay forma de demostrar que mejoró ni de detectar a tiempo si algo empeoró.
2. **Decidir con datos.** Es la tarea H-05: saber qué URLs tienen tráfico real antes de cambiar
   rutas, que es la regla 7 del brief. Hasta ahora todas las decisiones del proyecto se tomaron con
   datos de laboratorio y de mercado, no con el tráfico del sitio.

## Archivos

| Archivo | De dónde sale |
|---------|---------------|
| `gsc-consultas-2026-09.csv` | Search Console → Rendimiento → 16 meses → pestaña Consultas → Exportar (64 filas) |
| `gsc-paginas-2026-09.csv` | Search Console → Rendimiento → 16 meses → pestaña Páginas → Exportar (34 filas) |

Pendiente: `gsc-indexacion-2026-09.md` (Indexación → Páginas — cuántas indexadas, cuántas no y por qué).

## Totales del periodo

- Clics: **133**
- Impresiones: **1.470**
- CTR medio: **9 %**
- Posición media: **9**

## Lectura de los datos

**El tráfico casi no existe todavía** (133 clics en 3+ meses): el margen de mejora es total y el
riesgo de que la Fase 1 tumbe tráfico existente es prácticamente nulo.

**La home concentra el tráfico**: 113 de los 133 clics (85 %) van a `/`. El resto está repartido
entre ~28 fichas de producto individuales, con 1-4 clics cada una — nada domina.

**Las consultas ya confirman la tesis central del proyecto**: la gente busca por modelo de moto, no
de forma genérica — *"tacómetro digital bws 125"*, *"fender para gixxer 150"*, *"ramal eléctrico xtz
125 original"*, *"ecu fz 2.0"*. Es la señal más fuerte de que los hubs de la Fase 2
(`/repuestos/[marca]/[modelo]`) van a capturar tráfico real en cuanto tengan compatibilidades
cargadas (H-02).

**Aparece una consulta de confianza de marca**: *"es confiable esa página?"* — con 1 clic y 1
impresión, alguien buscó el nombre del sitio para verificar si es de fiar antes de comprar. Relevante
para el bloque de confianza de la Fase 4 y para GEO (Fase 6): es exactamente el tipo de pregunta que
alguien le haría a ChatGPT o Perplexity en vez de a Google.

**Varios productos con impresiones pero cero clics** — posición 8-13, visibles pero sin clic:
`regulador-rectificador-bws-125-` (140 impresiones, 0 clics), `6-04700` (106, 0),
`bombillo-h4-led-8000-lumens` (52, 0). Son candidatos directos a revisar título y descripción una vez
desplegada la Fase 1, y buenos indicadores para comparar el antes/después.

**Confirma que valía la pena fijar `www` como canónico** (Fase 1): apareció indexada
`https://tiendah2r.com/producto/6-04700` — sin `www` — con 1 impresión. El apex y el `www` estaban
compitiendo por la misma URL antes de declarar el canonical.

**Dos filtros del catálogo ya tenían impresiones antes del despliegue**:
`?category=repuestos` (123 impresiones, 2 clics) y `?showAll=true` (18 impresiones, 0 clics). Tras la
Fase 1 estas URLs pasan a `noindex, follow` — es la decisión correcta (son filtros, no páginas de
contenido, y `?category=repuestos` ya tiene su propia URL canónica limpia), pero **cuando
desaparezcan de "Páginas indexadas" en Search Console no es una regresión**: es el resultado esperado
de la Fase 1 y hay que poder explicarlo así si se pregunta.

*Nota: Google solo guarda 16 meses de histórico. Lo que no se exportó ahora se perdió.*

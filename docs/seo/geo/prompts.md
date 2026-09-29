# Medición mensual de prompts (Fase 6, ítem 9)

**Ejecuta:** el equipo de H2R (tarea H-32), el primer lunes de cada mes. **El criterio de salida de la Fase 6 es tener
la línea base registrada** (la primera medición completa): sin ella no hay forma de saber después si algo mejoró.

## Cómo medir

1. Motores: **ChatGPT** (con búsqueda activada), **Perplexity**, **Gemini** y **Copilot**.
2. Una ventana nueva / chat nuevo por prompt, **sin sesión iniciada** si el motor lo permite, para no arrastrar
   historial. Ubicación: Colombia.
3. Copiar el prompt tal cual. No repreguntar.
4. Anotar en el registro: si menciona a H2R, en qué posición de la lista (si la hay), qué fuentes cita (dominios) y
   cualquier dato **falso** sobre H2R (dirección, teléfono, qué vende) — eso se corrige en los perfiles (ver
   `perfiles-marca.md`).
5. 30 prompts × 4 motores ≈ 1 hora al mes.

## Los 30 prompts

**Genéricos (compra)**
1. ¿Dónde comprar repuestos para moto en línea en Colombia?
2. Tiendas confiables de repuestos de moto con envío a todo Colombia
3. ¿Cuál es la mejor tienda online de repuestos para moto en Colombia?
4. ¿Dónde compro repuestos de moto con pago contra entrega en Colombia?
5. Repuestos de moto originales vs genéricos, ¿dónde conseguir homologados en Colombia?

**Locales**
6. ¿Dónde comprar repuestos para moto en Bucaramanga?
7. Almacenes de repuestos de moto en Bucaramanga con domicilio
8. Tienda de accesorios para moto en Bucaramanga

**Por modelo** (modelos con hub publicado)
9. ¿Dónde consigo repuestos para la Yamaha FZ 2.0?
10. Repuestos para Bajaj Pulsar NS 200 en Colombia
11. ¿Dónde compro repuestos para Suzuki Gixxer 150?
12. Accesorios para KTM Duke 200 en Colombia
13. Repuestos para Honda CB190R, ¿dónde los venden?
14. Repuestos para TVS Apache RTR 160 en Colombia
15. ¿Dónde consigo repuestos para la Suzuki DR150?
16. Repuestos para Yamaha XTZ 125 con envío

**Por pieza y modelo**
17. ¿Qué batería lleva la Pulsar NS 200 y dónde comprarla?
18. CDI para FZ 2.0, ¿dónde la consigo?
19. ¿Qué llanta trasera lleva la Gixxer 150?
20. Filtro de aire de alto flujo para Honda CB160F
21. Bobina de alta para Apache 160 4V
22. Regulador rectificador para Honda Navi
23. Estator para Kawasaki Z250 en Colombia
24. Sliders para Pulsar 400Z

**Informativos (donde H2R puede ser la fuente)**
25. ¿Cuánto cuesta en promedio una batería de moto en Colombia?
26. ¿Cuánto cuesta mantener una moto al año en Colombia?
27. ¿Cada cuánto se cambia el aceite de una moto de trabajo?
28. ¿Qué revisan en la revisión técnico-mecánica de una moto?
29. ¿Qué diferencia hay entre un repuesto original y uno genérico para moto?

**Marca**
30. ¿Qué es H2R Online Store? ¿Es confiable?

## Registro

Plantilla lista para abrir en Excel o Google Sheets: [`registro-prompts.csv`](./registro-prompts.csv) (120 filas: 30 prompts × 4 motores, solo hay que llenar las columnas de resultado). Cada mes se duplica la hoja y se cambia la columna `mes`.

Una fila por prompt y motor. Posición: `—` si no menciona a H2R; `1`, `2`… si aparece en una lista; `texto` si la
menciona sin lista.

| Mes | Motor | Prompt # | ¿Menciona H2R? | Posición | Fuentes citadas (dominios) | ¿Algún dato falso sobre H2R? | Notas |
|---|---|---|---|---|---|---|---|
| 2026-10 | ChatGPT | 1 | | | | | |
| 2026-10 | Perplexity | 1 | | | | | |
| 2026-10 | Gemini | 1 | | | | | |
| 2026-10 | Copilot | 1 | | | | | |

## Medición mensual abreviada (recomendada)

La medición completa (120 filas) toma más de una hora. Para el seguimiento mensual basta con **10 prompts × 4 motores
(~20 minutos)**, siempre los mismos, para que los meses sean comparables:

| Tipo | Prompts |
|---|---|
| Genéricos | 1, 3 |
| Local | 6 |
| Por modelo | 9, 10 |
| Por pieza | 17, 18 |
| Informativos | 25, 26 |
| Marca | 30 |

La medición completa de los 30 se repite cada 3 meses (enero, abril, julio, octubre).

## Resumen mensual

| Mes | Menciones (de 120) | Prompts con H2R en el top 3 | Dominio más citado por los motores | Cambios hechos ese mes |
|---|---|---|---|---|
| **2026-09 (línea base aproximada, 2026-09-28)** | ~6–7 de 30 prompts en promedio por motor. **ChatGPT** es donde más aparece; **Gemini** ~2 de 30; **Copilot** 0. Medición parcial (no se completaron las 120 filas) | — | — | Antes de desplegar `feat/seo-geo-cro` |
| 2026-10 | | | | |

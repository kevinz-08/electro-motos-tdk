# Borradores de contenido — Fase 5 (ítems 5 y 6)

Borradores escritos por el agente para cargar en **`/admin/guias`** una vez aplicada la migración de H-54.
**Ninguno está listo para publicar**: todos requieren la revisión del revisor técnico (H-21 / H-52).

| Archivo | Tipo | Título | Estado |
|---|---|---|---|
| [`guia-revision-tecnico-mecanica-moto.md`](./guia-revision-tecnico-mecanica-moto.md) | Guía | Revisión técnico-mecánica de la moto en Colombia: qué revisan y qué repuestos la hacen fallar | borrador · revisor: pendiente |
| [`repuesto-original-vs-generico-moto.md`](./repuesto-original-vs-generico-moto.md) | Comparativa | Repuesto original, homologado o genérico para moto: cuál conviene | borrador · revisor: pendiente |
| [`como-elegir-aceite-moto-trabajo.md`](./como-elegir-aceite-moto-trabajo.md) | Guía | Cómo elegir el aceite para una moto de trabajo | borrador · revisor: pendiente |

## Cómo usarlos

1. En `/admin/guias` → **Nuevo artículo**: copiar el título, el slug, la respuesta directa, el cuerpo (todo lo que está
   bajo `## Cuerpo`) y las fuentes. Guardar como **Borrador**.
2. El revisor lee el texto. **Todo lo marcado `[VERIFICAR]` se confirma o se corrige y la marca se borra**; nada con esa
   marca puede publicarse.
3. Con la revisión hecha: asignar el revisor, poner la fecha de revisión y cambiar el estado a **Publicado**. El panel no
   deja publicar sin revisor ni sin fecha.

## Qué falta y por qué no se escribió

- **"{Marca A} vs {Marca B} de pastillas para {modelo}"** (ROADMAP ítem 5): necesita saber qué marcas de pastillas vende
  H2R y para qué modelos, con su `partBrand`, que hoy está vacío en los 133 productos (H-18). Escribirla ahora sería
  inventar la comparación.
- **Datos numéricos de durabilidad o rendimiento** de productos concretos: no se incluyen en ningún borrador. Si el
  revisor tiene datos de taller, se agregan con su fuente.

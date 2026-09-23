# Modelos que aparecían en tus datos pero no estaban en el catálogo de motos

Escrito para: Santiago (dueño/dev). Escaneo del 2026-09-22.

## Estado: resuelto (salvo un caso)

Las 37 notas de compatibilidad que ya tenías escritas en las fichas de producto se cruzaron contra el
catálogo de motos. De las que mencionaban un modelo inexistente, **todas se resolvieron dando de alta
el modelo que faltaba, salvo una** (ver abajo). El catálogo pasó de 8 marcas / 32 modelos a
**10 marcas / 41 modelos**.

Dar de alta un modelo **no afirma ninguna compatibilidad**: es solo la entidad "existe esta moto". Las
37 notas ya están volcadas, estructuradas y con `verificado=no`, en
`docs/seo/borrador-compatibilidades-notas-existentes.csv` (37 filas) — nada se marcó verificado
automáticamente; eso lo decidís vos al revisarlas.

## Modelos y marcas dados de alta el 2026-09-22

| Marca | Modelo | cc | Evidencia | Nota |
|---|---|---|---|---|
| KTM *(marca nueva)* | Duke 200 | 200 | 3 productos: "KTM 200", "KTM 200 NG", "KTM 200 WO" | Las siglas NG/WO se guardaron como alias tal cual — no sé qué significan, no las interpreté |
| Kawasaki *(marca nueva)* | Z250 | 250 | `8-Z250` — "KAWASAKI Z250" | |
| Suzuki | Gixxer 250 | 250 | 5 menciones ("Gixxer 250", "Gixxer 150-250"...) | Era la más repetida de las faltantes |
| Yamaha | XTZ 250 | 250 | `3-68030` — "XTZ 250" | Modelo aparte de la XTZ 125 ya cargada (cilindrada distinta) |
| Yamaha | BWS 125 | 125 | 2 productos — "BWS 125" | |
| Yamaha | MT-15 | *(sin cc)* | 2 productos — "YAMAHA MT 15" / "MT15" | El "15" del nombre no es la cilindrada real (~155 cc); se deja en `null`, igual que con FZ 2.0 |
| Yamaha | R15 | *(sin cc)* | `9-E482` — "R 15" | Misma razón que MT-15 |
| Honda | CB190R | 190 | `3-68030` — "CB 190R" | |
| Bajaj | Pulsar 400 | 400 | `9-SLIP400` — "PULSAR 400 Z / NS" | **Cargado como una sola moto**: la nota no distingue con certeza si Z y NS son la misma variante o dos distintas. Si son motos diferentes, hay que separarlas después |

## Sin resolver, a propósito

- **"DINAMIC"** (`15-S535`, `15-S5352`, llantas de 12"). Preguntado directamente y la respuesta fue
  "no lo sé con certeza": no se agregó ningún alias ni se creó ningún modelo. Sigue como nota suelta,
  sin mapear, hasta que se pueda confirmar con el catálogo del proveedor o revisando la pieza física.

## Qué sigue

Las 37 filas de `borrador-compatibilidades-notas-existentes.csv` (más las 20 de
`borrador-compatibilidades-candidatas.csv`, sacadas del nombre del producto) están listas para que
las revises. Ninguna está verificada — eso es una decisión de negocio, no algo que se pueda
automatizar. Cuando confirmes cuáles son ciertas, se suben con `POST /admin/fitments/import` y esos
modelos empiezan a publicar su hub.

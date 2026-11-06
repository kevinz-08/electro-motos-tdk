"""Manuales 1–6: Productos, Cupones, Compatibilidades, Kits, Guías, Índice de precios."""

PRODUCTOS = dict(
    slug="productos",
    title="Productos",
    route="/admin/productos",
    menu="Productos",
    lead="Aquí se crea, edita, activa o retira cada repuesto del catálogo: nombre, precio, stock, fotos, medidas de envío, compatibilidades y datos para Google. Es la sección que más se usa.",
    body="""
<h2>1. La lista de productos</h2>
<ul>
  <li><b>Buscar:</b> el cuadro "Buscar por nombre, SKU…" filtra la lista.</li>
  <li><b>Filtrar por categoría:</b> el desplegable muestra cada categoría con sus subcategorías.</li>
  <li>La lista muestra <b>20 productos por página</b> (navegación al pie) e incluye también los productos <b>inactivos</b>.</li>
  <li>Columnas: Producto, SKU, Categoría, Precio, Stock y Estado. Haz clic en el nombre para editarlo.</li>
  <li>El botón <b>Nuevo producto</b> (arriba a la derecha) abre el formulario vacío.</li>
</ul>

<h2>2. Crear o editar un producto (paso a paso)</h2>
<ol>
  <li>Abre <b>Nuevo producto</b> o entra a uno existente.</li>
  <li>Completa <b>Información general</b> (tabla de abajo). Los campos con <b>*</b> son obligatorios.</li>
  <li>Completa <b>Envío</b> y sube las <b>Imágenes</b>.</li>
  <li>Pulsa <b>Guardar</b> al final del formulario.</li>
  <li><b>Solo después de guardar la primera vez</b> aparecen activos los bloques de Venta cruzada, Identificación del repuesto y Compatibilidades (necesitan que el producto ya exista).</li>
</ol>

<table>
  <tr><th style="width:24%">Campo</th><th>Qué escribir / regla</th></tr>
  <tr><td>Nombre *</td><td>Nombre comercial. El slug (URL) se genera solo mientras escribes.</td></tr>
  <tr><td>Slug (URL)</td><td>Opcional personalizarlo, pero <b>después</b> de terminar el nombre: si vuelves a editar el nombre, el slug se sobrescribe. Cambiarlo cambia la URL pública.</td></tr>
  <tr><td>Descripción *</td><td>Texto principal de la ficha.</td></tr>
  <tr><td>Beneficios</td><td>Hasta 10 puntos cortos (ej. "Alta durabilidad y resistencia"). Pueden quedar vacíos.</td></tr>
  <tr><td>Compatibilidad (texto libre)</td><td>Motos compatibles escritas a mano (ej. "Honda CB160F 2020-2023"). <b>No</b> reemplaza al bloque verificado de Compatibilidades (sección 3).</td></tr>
  <tr><td>Precio (COP) *</td><td>En pesos normales, <b>sin centavos ni puntos</b>: <code>85000</code>. El sistema lo convierte solo.</td></tr>
  <tr><td>Precio anterior (tachado)</td><td>Debe ser <b>mayor</b> al precio y haberse cobrado realmente (Ley 1480). Vacío = sin descuento.</td></tr>
  <tr><td>Stock</td><td>Unidades disponibles. El stock baja automáticamente cuando un pago se aprueba, no al crear el pedido.</td></tr>
  <tr><td>Personas que recomiendan</td><td>Clientes de la tienda física que lo compraron o recomiendan; se suma a las ventas online en la ficha ("+X personas han comprado…").</td></tr>
  <tr><td>SKU *</td><td>Código único del producto (ej. <code>FRE-BRE-FZ25-001</code>).</td></tr>
  <tr><td>Categoría *</td><td>Elige de la lista.</td></tr>
  <tr><td>Producto activo</td><td>Si lo desmarcas, el producto se <b>oculta del catálogo sin borrarse</b>. Es la forma reversible de dejar de venderlo.</td></tr>
  <tr><td>Envío: peso, alto, ancho, largo</td><td>Medidas reales ya embaladas. Vacías, la cotización de envío usa valores genéricos que pueden no coincidir con el flete real.</td></tr>
  <tr><td>Imágenes</td><td>PNG, JPG o WEBP, máx. 10 MB c/u. Se recomiendan hasta 4 para que la galería se vea bien (no es límite estricto). Se guardan en Cloudinary.</td></tr>
</table>

<h2>3. Bloques que se guardan aparte</h2>
<h3>Venta cruzada ("normalmente se cambia junto con…")</h3>
<p>Hasta <b>4</b> productos sugeridos, en el orden en que aparecen. Busca por nombre o SKU. Cada uno admite un <i>motivo</i> opcional (máx. 120 caracteres). La casilla "también sugerir en sentido inverso" agrega este producto a la lista del otro (si tiene cupo) sin quitarle nada. Un producto agotado o inactivo se puede vincular, pero la ficha lo oculta mientras no tenga stock. <b>Se guarda junto con el producto</b>.</p>
<h3>Identificación del repuesto</h3>
<p>Marca (ej. NGK, Bosch), MPN (referencia del fabricante, <b>no</b> el SKU de H2R), tipo (Original / Homologado / Genérico) y garantía en meses. Google Merchant Center exige marca y MPN. <b>Tiene su propio botón de guardar</b>.</p>
<h3>Compatibilidades y referencias OEM</h3>
<p>Qué moto exacta usa este repuesto: modelo, posición (delantera/trasera/ambas), años, <b>fuente obligatoria</b> (manual, catálogo del proveedor, "verificado en taller…"), notas y la casilla <b>verificada</b>. <b>Solo las verificadas se publican.</b> Cada alta o borrado se guarda al instante, sin pulsar "Guardar". Si falta un modelo de moto, créalo primero en <code>/admin/compatibilidades</code>. También aquí se cargan las referencias OEM (referencia + fabricante).</p>

<h2>4. Retirar un producto</h2>
<ul>
  <li><b>Ocultar temporalmente:</b> desmarca "Producto activo" y guarda.</li>
  <li><b>Eliminar:</b> "Zona de peligro" al final del formulario → <b>Eliminar producto</b> → confirmar. El producto sale del catálogo y pasa a la <b>Papelera</b> (<code>/admin/productos/papelera</code>), desde donde puede restaurarse.</li>
</ul>

<div class="box"><b>Ojo:</b> mover el precio o el stock hacia valores incorrectos se ve de inmediato en la tienda. Revisa dos veces el precio (sin centavos) antes de guardar. Si cambiaste datos por fuera del panel (scripts, base de datos), usa "Refrescar tienda" en Configuración.</div>
""",
)

CUPONES = dict(
    slug="cupones",
    title="Cupones",
    route="/admin/cupones",
    menu="Cupones",
    lead="Crea códigos de descuento que los clientes escriben en el carrito: por porcentaje o por monto fijo, con vencimiento, y limitados a toda la tienda, a categorías o a un producto.",
    body="""
<h2>1. La lista de cupones</h2>
<ul>
  <li>Arriba verás el total de cupones y cuántos están activos.</li>
  <li><b>Filtros de estado:</b> Activos, Inactivos o Todos (cada pestaña muestra su cantidad).</li>
  <li><b>Filtro de fecha:</b> Cualquier fecha, Último mes o Últimos 2 meses.</li>
  <li>Columnas: Código, Descuento, Alcance, Restricción, Vence y Estado.</li>
  <li><b>Estado:</b> <i>Activo</i> (verde), <i>Vencido</i> (naranja: pasó la fecha) o <i>Inactivo</i> (apagado a mano).</li>
</ul>

<h2>2. Crear un cupón (paso a paso)</h2>
<ol>
  <li>Pulsa <b>Nuevo cupón</b>.</li>
  <li>Completa el formulario (tabla de abajo).</li>
  <li>Pulsa <b>Crear cupón</b>. Para modificar uno existente usa el ícono de editar y luego <b>Guardar cambios</b>.</li>
</ol>

<table>
  <tr><th style="width:24%">Campo</th><th>Qué elegir / regla</th></tr>
  <tr><td>Código *</td><td>Lo que escribirá el cliente (ej. <code>HALLOWEEN20</code>).</td></tr>
  <tr><td>Tipo *</td><td><b>Porcentaje (%)</b> o <b>Monto fijo (COP)</b>.</td></tr>
  <tr><td>Valor *</td><td>Debe ser mayor a 0. Si es porcentaje escribe <code>20</code> (= 20 %). Si es monto fijo escribe pesos, ej. <code>50000</code>.</td></tr>
  <tr><td>Restricción</td><td><b>Sin límite por cliente</b> · <b>Una vez por cliente</b> · <b>Solo primera compra</b>.</td></tr>
  <tr><td>Permitir sin cuenta (invitados)</td><td>Si se marca, también lo pueden usar clientes que compran sin registrarse (aparece "+ invitados" en la lista).</td></tr>
  <tr><td>Fecha de vencimiento *</td><td>Calendario, o los atajos <b>30, 60 o 90 días</b> desde hoy. No admite fechas pasadas.</td></tr>
  <tr><td>Alcance *</td><td><b>Toda la tienda</b>; <b>Categoría(s)</b> (debes elegir al menos una); o <b>Producto específico</b> (debes elegir uno).</td></tr>
</table>

<h2>3. Apagar un cupón</h2>
<p>En los cupones activos aparece el ícono de papelera: <b>no borra</b> el cupón, lo deja <b>Inactivo</b> (el cliente ya no puede usarlo). El historial se conserva.</p>

<div class="box info"><b>Consejos:</b> usa "Primera compra" para captar clientes nuevos y "Una vez por cliente" en promociones de temporada. Un cupón de monto fijo con alcance "Toda la tienda" y valor alto puede dejar pedidos con margen negativo: define el valor pensando en tu margen.</div>
<div class="box"><b>Ojo:</b> un cupón <i>Vencido</i> no se puede usar aunque siga marcado como activo. Para reutilizarlo, edítalo y pon una fecha futura.</div>
""",
)

COMPATIBILIDADES = dict(
    slug="compatibilidades",
    title="Compatibilidades",
    route="/admin/compatibilidades",
    menu="Compatibilidades",
    lead="Define <b>qué repuesto le sirve a qué moto</b>. Aquí se dan de alta los modelos de moto, se importan compatibilidades en bloque desde un CSV y se ve cuántas compatibilidades verificadas tiene cada modelo. Solo lo verificado se publica; ante la duda, déjalo sin verificar: una compatibilidad equivocada genera una devolución.",
    body="""
<h2>1. Cómo está organizada la pantalla</h2>
<table>
  <tr><th style="width:26%">Bloque</th><th>Para qué sirve</th></tr>
  <tr><td>Importar desde CSV</td><td>Carga muchas compatibilidades de una vez desde un archivo.</td></tr>
  <tr><td>Nuevo modelo de moto / Editar modelo</td><td>Único lugar donde se crean modelos (marca + modelo).</td></tr>
  <tr><td>Tabla de modelos</td><td>Verificadas, pendientes y si el modelo ya tiene página ("hub") pública.</td></tr>
</table>

<h2>2. Dar de alta un modelo de moto</h2>
<ol>
  <li>En <b>Nuevo modelo de moto</b> escribe la <b>Marca</b> (se crea si no existe) y el <b>Modelo</b> <i>sin</i> la marca. Ej.: marca <code>AKT</code>, modelo <code>NKD 125</code>.</li>
  <li><b>cc, año desde y año hasta:</b> llénalos solo si están confirmados. Vacíos, la web no los muestra.</li>
  <li><b>Alias:</b> cómo lo escribe la gente al buscar ("NKD", "AK125NKD"), separados por comas. También sirven para que el CSV reconozca el modelo.</li>
  <li><b>Introducción del hub (opcional):</b> texto escrito por una persona (máx. 2000 caracteres) que aparece en la página del modelo.</li>
  <li>Pulsa <b>Crear modelo</b>.</li>
</ol>
<p><b>Editar:</b> en la tabla pulsa <b>Editar</b> junto al modelo; el formulario sube con los datos. La marca no se puede cambiar y el slug se conserva (cambiarlo rompería la URL del hub ya indexada). <b>Cancelar edición</b> descarta los cambios.</p>

<h2>3. Importar compatibilidades por CSV</h2>
<ol>
  <li>Pulsa <b>Plantilla</b> y descarga el CSV de ejemplo. Ábrelo en Excel.</li>
  <li>Llena <b>una fila por compatibilidad</b>. Columnas: <code>sku, marca_moto, modelo_moto, posicion, anio_desde, anio_hasta, fuente, notas, verificado</code>.</li>
  <li>Reglas: <b>fuente obligatoria</b>; <code>posicion</code> = delantera, trasera o ambas; <code>verificado</code> = <code>si</code> o <code>no</code>. <b>Solo las filas con <code>verificado = si</code> se publican.</b></li>
  <li>Pulsa <b>Subir CSV</b> y elige el archivo.</li>
  <li>Revisa el reporte: <i>nuevas · actualizadas · publicables · con error</i>. Cada error indica la <b>línea</b> y el motivo. Corrige esas filas y vuelve a subir.</li>
</ol>
<div class="box"><b>El importador no crea modelos.</b> Si el modelo de una fila no existe, esa fila se rechaza: primero créalo (sección 2) o agrega ese nombre como alias de un modelo existente.</div>

<h2>4. Leer la tabla de modelos</h2>
<ul>
  <li><b>Filtro:</b> escribe marca, modelo o alias para encontrarlo.</li>
  <li><b>Verificadas</b> (verde) = publicadas. <b>Pendientes</b> (ámbar) = cargadas pero sin verificar.</li>
  <li><b>Hub:</b> "Ver" abre la página pública del modelo. "Sin publicar" = el modelo no tiene ninguna verificada (o está inactivo) y <b>no tiene página propia</b>.</li>
</ul>

<p><b>Un solo producto:</b> ábrelo en <code>/admin/productos</code> → "Compatibilidades" (se guarda al instante). Cada cambio aquí actualiza solo la tienda; no hace falta "Refrescar tienda".</p>
""",
)

KITS = dict(
    slug="kits",
    title="Kits",
    route="/admin/kits",
    menu="Kits",
    lead="Un kit agrupa varios productos que se compran juntos (por ejemplo, el cambio de aceite completo) con un descuento opcional. El kit <b>no tiene stock propio</b>: su precio y su disponibilidad se calculan siempre a partir de los productos que lo componen.",
    body="""
<h2>1. La lista de kits</h2>
<p>Columnas: Kit, Moto, Productos (cantidad), Precio (con el precio sin descuento tachado), <b>Disponibilidad</b> (cuántos kits se pueden armar hoy con el stock actual) y Estado (punto verde = activo). El botón <b>Nuevo kit</b> crea uno; "Editar" abre el existente.</p>

<h2>2. Crear un kit (paso a paso)</h2>
<ol>
  <li>Pulsa <b>Nuevo kit</b>.</li>
  <li>Completa los datos generales (tabla).</li>
  <li>En <b>Productos del kit</b> busca por nombre o SKU y agrégalos. Define la <b>cantidad</b> (<i>Cant.</i>) de cada uno.</li>
  <li>Escribe el <b>descuento</b> si lo hay y revisa el resumen de precio a la derecha/abajo.</li>
  <li>Pulsa <b>Crear kit</b> (o <b>Guardar cambios</b> si editas).</li>
</ol>
<table>
  <tr><th style="width:26%">Campo</th><th>Qué escribir / regla</th></tr>
  <tr><td>Nombre del kit *</td><td>Ej. "Kit de mantenimiento NKD 125".</td></tr>
  <tr><td>Slug (URL) *</td><td>Ej. <code>kit-mantenimiento-nkd-125</code>.</td></tr>
  <tr><td>Descripción</td><td>Opcional. Ej. "Para el cambio de aceite completo, incluye filtro y bujía."</td></tr>
  <tr><td>Modelo de moto</td><td>Opcional: agrupa el kit en la página de esa moto. "Kit genérico" = sin moto asociada.</td></tr>
  <tr><td>Kit activo</td><td>Visible en la tienda <b>solo si además tiene disponibilidad</b>.</td></tr>
  <tr><td>Productos del kit</td><td><b>Mínimo 2, máximo 8</b> productos distintos.</td></tr>
  <tr><td>Descuento del kit (COP)</td><td>En pesos. <code>0</code> = sin descuento: el precio es la suma de los productos. <b>Debe ser menor que la suma.</b></td></tr>
</table>

<h2>3. El resumen de precio</h2>
<p>Muestra <b>Suma de productos</b>, <b>Descuento</b>, <b>Precio final del kit</b> y <b>Disponibilidad hoy</b>. Si dice "sin stock (no se mostrará)", algún producto está agotado o inactivo y el kit no aparece en la tienda hasta que se reponga. Los productos con problema se marcan en ámbar como <i>Inactivo</i> o <i>Agotado</i>.</p>

<h2>4. Cómo compra el cliente</h2>
<p>Al agregar el kit al carrito se convierte en líneas normales de cada producto. El pago, el stock y los envíos funcionan igual que con productos sueltos.</p>

<h2>5. Eliminar un kit</h2>
<p>"Zona de peligro" → <b>Eliminar</b> → confirmar. El kit se retira de la tienda y se desactiva; los productos que lo componían no se tocan.</p>

<div class="box"><b>Ojo:</b> si cambias el precio de un producto, el kit cambia solo (nunca se guarda un precio fijo). Si el nuevo precio hace que el descuento iguale o supere la suma, el servidor rechaza el guardado: baja el descuento.</div>
""",
)

GUIAS = dict(
    slug="guias",
    title="Guías y comparativas",
    route="/admin/guias",
    menu="Guías",
    lead="Artículos de contenido de la tienda (guías y comparativas) que se publican en <code>/guias/…</code>. Cada artículo pasa por <b>Borrador → En revisión → Publicado</b> y no se publica sin revisor técnico, fuentes y una respuesta directa bien escrita.",
        body="""
<h2>1. La lista</h2>
<p>Columnas: Artículo, Tipo (Guía o Comparativa), Revisor, Estado y acceso a la página pública ("Ver", solo si está publicado y su revisor está activo). El botón <b>Nuevo artículo</b> abre el editor.</p>

<h2>2. Escribir un artículo (paso a paso)</h2>
<ol>
  <li><b>Título</b> y <b>URL</b> (slug). La palabra <code>mantenimiento</code> está reservada: no se puede usar como URL.</li>
  <li><b>Respuesta directa:</b> responde la pregunta del título en <b>40 a 60 palabras</b> (máx. 600 caracteres), con datos concretos. Es lo primero que se lee y lo que citan buscadores e IAs. El editor cuenta las palabras mientras escribes.</li>
  <li><b>Cuerpo:</b> escribe en formato simple (ver abajo). Hay una <b>vista previa</b> idéntica a la página pública.</li>
  <li><b>Fuentes:</b> una por línea, <b>máx. 10</b>, cada una de hasta 300 caracteres (ej. "Manual de servicio Bajaj Boxer CT100 (2023), pág. 42").</li>
  <li><b>Meta descripción</b> (opcional): si la dejas vacía se usa la respuesta directa.</li>
  <li>Elige <b>Tipo</b>, <b>Autor</b>, <b>Revisor técnico</b>, <b>Fecha de revisión</b> y, si aplica, <b>Modelo de moto</b>.</li>
  <li>Elige el <b>Estado</b> y guarda.</li>
</ol>

<h3>Formato del cuerpo (no admite HTML)</h3>
<table>
  <tr><td><code>## Pregunta como encabezado</code></td><td>Título de sección</td></tr>
  <tr><td><code>### Subtítulo</code></td><td>Subsección</td></tr>
  <tr><td><code>**negrita**, *cursiva*, [texto](/producto/slug)</code></td><td>Énfasis y enlaces (https o rutas internas)</td></tr>
  <tr><td><code>- lista</code> &nbsp; <code>1. lista numerada</code></td><td>Listas</td></tr>
  <tr><td><code>| Col 1 | Col 2 |</code> + <code>|---|---|</code> + filas</td><td>Tablas (útiles en comparativas)</td></tr>
</table>

<h2>3. Los tres estados y qué exige cada uno</h2>
<table>
  <tr><th style="width:20%">Estado</th><th>Requisitos</th></tr>
  <tr><td>Borrador</td><td>Ninguno. Guarda cuando quieras, aunque esté incompleto. No es público.</td></tr>
  <tr><td>En revisión</td><td>Respuesta directa de 40–60 palabras, cuerpo no vacío y al menos una fuente.</td></tr>
  <tr><td>Publicado</td><td>Lo anterior <b>más</b>: revisor técnico asignado y <b>activo</b>, y la <b>fecha en que el revisor aprobó el texto</b>.</td></tr>
</table>
<p>El recuadro <b>"Para publicar"</b> del editor lista exactamente lo que falta; cuando todo está bien dice <i>"Listo: cumple todo lo necesario"</i>. La API vuelve a comprobarlo al guardar.</p>

<h2>4. Eliminar un artículo</h2>
<p>Al final del editor → eliminar → confirmar. Si estaba publicado, <b>su URL deja de existir</b>. Si solo quieres retirarlo temporalmente, devuélvelo a Borrador.</p>

<div class="box"><b>Ojo:</b> si desactivas al revisor asignado (en <code>/admin/revisores</code>), sus artículos publicados dejan de mostrarse hasta que lo reactives o los reasignes a otro revisor. Si no hay revisores, el editor te lo avisa: créalos primero.</div>
""",
)

INDICE_PRECIOS = dict(
    slug="indice-precios",
    title="Índice de precios",
    route="/admin/indice-precios",
    menu="Índice precios",
    lead="Genera una \"foto\" de los precios del catálogo por categoría (mediana, rango y mínimos/máximos) para prensa y citas. Se publica en <code>/indice-precios-repuestos-moto</code>. Se recomienda <b>un corte por semestre</b>, y nada se publica sin que alguien revise las cifras.",
    body="""
<h2>1. El flujo en tres pasos</h2>
<ol>
  <li><b>Generar corte de hoy:</b> calcula las cifras con los precios actuales y lo guarda como <b>Borrador</b>.</li>
  <li><b>Revisar:</b> mira la tabla en pantalla y comprueba que ninguna cifra sea absurda.</li>
  <li><b>Revisé las cifras: publicar:</b> lo hace visible en la página pública.</li>
</ol>

<h2>2. Leer la pantalla</h2>
<ul>
  <li><b>Columna izquierda:</b> los cortes por fecha, con su estado (Borrador o Publicado). Pulsa uno para verlo.</li>
  <li><b>Encabezado del corte:</b> fecha, número de referencias, versión de la metodología y categorías publicables.</li>
  <li><b>Tabla:</b> para cada categoría —<i>n</i> (productos), <b>Mediana</b>, rango <b>P25–P75</b> (la mitad central de los precios) y <b>Mín.–Máx.</b></li>
  <li><b>"Sin muestra suficiente":</b> categorías con menos de <b>5</b> productos; no se publican porque una cifra con tan pocos datos engaña.</li>
  <li><b>Ver página pública:</b> abre la página del índice.</li>
</ul>

<h2>3. Corregir un error antes de publicar</h2>
<p>Un precio mal cargado (por ejemplo, con un cero de más) mueve el máximo o la mediana. Si lo ves: corrige el producto en <code>/admin/productos</code>, vuelve aquí y pulsa <b>Generar corte de hoy</b> otra vez; luego revisa y publica.</p>

<h2>4. Retirar un corte publicado</h2>
<p>Un corte <b>publicado no se regenera</b>: primero pulsa <b>Retirar publicación</b> (vuelve a Borrador) y después genera uno nuevo si hace falta.</p>

<div class="box"><b>Ojo:</b> lo que se publica lo pueden citar medios y buscadores. No publiques sin revisar la tabla completa. El índice usa los precios del catálogo del día en que se genera; si cambias muchos precios después, el corte publicado <b>no se actualiza solo</b>.</div>
<div class="box info">Si la pantalla muestra un aviso de error al cargar los cortes, es probable que falte aplicar una migración de la base de datos; avisa al desarrollador.</div>
""",
)

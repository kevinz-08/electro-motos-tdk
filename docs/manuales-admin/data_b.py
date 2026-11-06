"""Manuales 7–12: Revisores, Mantenimiento, Merchant Center, Reseñas, Stock bajo, Configuración."""

REVISORES = dict(
    slug="revisores",
    title="Revisores técnicos",
    route="/admin/revisores",
    menu="Revisores",
    lead="Los revisores son las personas (mecánicos, técnicos) que <b>revisan y firman</b> las guías y los artículos. Cada guía publicada muestra su foto, su trayectoria y un enlace a su página propia en <code>/autores/…</code>. Todo lo que escribas aquí se publica tal cual: no se completa nada por defecto.",
    body="""
<h2>1. La lista</h2>
<p>Muestra Revisor (foto, nombre y título), Experiencia, cantidad de Guías que firma y Estado (punto verde = activo). El botón <b>Nuevo revisor</b> crea uno; <b>Editar</b> abre el existente.</p>

<h2>2. Registrar un revisor (paso a paso)</h2>
<ol>
  <li>Pulsa <b>Nuevo revisor</b>.</li>
  <li>Sube la <b>fotografía</b> (JPEG, PNG o WebP, hasta 5 MB). Se sube a Cloudinary en cuanto la eliges.</li>
  <li>Completa los datos (tabla).</li>
  <li>Pulsa guardar. La página <code>/autores/&lt;slug&gt;</code> queda disponible si el revisor está activo.</li>
</ol>
<table>
  <tr><th style="width:26%">Campo</th><th>Qué escribir / regla</th></tr>
  <tr><td>Nombre completo *</td><td>Como quieres que aparezca públicamente.</td></tr>
  <tr><td>Slug (URL) *</td><td>Ej. <code>carlos-perez</code>; se ve debajo como <code>/autores/carlos-perez</code>.</td></tr>
  <tr><td>Título o rol</td><td>Opcional. Ej. "Mecánico de motos".</td></tr>
  <tr><td>Años de experiencia</td><td>Opcional. Escribe solo lo verdadero.</td></tr>
  <tr><td>Resumen de trayectoria *</td><td>Dónde ha trabajado, qué marcas y modelos domina, qué trabajos hace. Máx. <b>2000</b> caracteres (hay contador).</td></tr>
  <tr><td>Certificaciones o formación</td><td>Una por línea, <b>máx. 10</b>, hasta 120 caracteres cada una. Ej. "Técnico en mecánica de motocicletas — SENA". <b>Escribe solo lo que puedas demostrar.</b></td></tr>
  <tr><td>Revisor activo</td><td>Si está activo su página es pública y sus guías se publican.</td></tr>
</table>

<h2>3. Desactivar o eliminar</h2>
<ul>
  <li><b>Desactivar</b> (desmarcar "Revisor activo"): oculta su página y <b>oculta sus guías publicadas</b> hasta que lo reactives o las reasignes. El formulario te avisa cuántas guías se afectan.</li>
  <li><b>Eliminar</b> (Zona de peligro → <i>Sí, eliminar</i>): solo se puede si <b>no firma ninguna guía</b>. Si firma guías, primero reasígnalas a otro revisor.</li>
</ul>

<div class="box"><b>Ojo:</b> como estos datos son públicos y respaldan la credibilidad del contenido técnico, cuenta con el permiso de la persona para publicar su foto y su trayectoria.</div>
<div class="box info"><b>Relación con otras secciones:</b> los revisores se eligen en <code>/admin/guias</code> (artículos) y en <code>/admin/mantenimiento</code> (guías por modelo). Sin un revisor activo no se puede publicar ninguna de las dos.</div>
""",
)

MANTENIMIENTO = dict(
    slug="mantenimiento",
    title="Mantenimiento por modelo",
    route="/admin/mantenimiento",
    menu="Mantenimiento",
    lead="Aquí se escribe, modelo por modelo, la <b>guía de mantenimiento</b> (qué revisar y cada cuántos km o meses). Al guardarla se publica sola en <code>/guias/mantenimiento/[marca]/[modelo]</code>. Mientras un modelo no tenga guía, esa página no existe (responde 404) y su hub no muestra ningún enlace.",
    body="""
<h2>1. La lista de modelos</h2>
<p>Muestra todos los modelos de moto con el estado de su guía y el revisor que la firma:</p>
<table>
  <tr><th style="width:24%">Estado</th><th>Significado</th></tr>
  <tr><td>Sin guía</td><td>No hay guía; la página pública no existe.</td></tr>
  <tr><td>Publicada</td><td>Guardada, con al menos un punto de control y revisor activo.</td></tr>
  <tr><td>Oculta (revisor desactivado)</td><td>Está guardada, pero su revisor fue desactivado, por eso no se publica. Reactiva al revisor o cambia el revisor de la guía.</td></tr>
</table>
<p>Pulsa el enlace del modelo para abrir su formulario. Los modelos se crean en <code>/admin/compatibilidades</code>.</p>

<h2>2. Escribir una guía (paso a paso)</h2>
<ol>
  <li><b>Revisor técnico que firma *:</b> elige de la lista (si no hay revisores activos, el formulario te lleva a registrar uno).</li>
  <li><b>Fecha de la revisión *:</b> se muestra en la página como «revisado el…».</li>
  <li><b>Fuente de los intervalos *:</b> de dónde salen los números. Ej. "Manual del propietario AKT NKD 125 (2023), pág. 34" o "Verificado en taller". <b>Sin fuente no se puede guardar: los intervalos no se inventan.</b></li>
  <li><b>Puntos de control</b> (hasta <b>12</b>): agrégalos con los botones de abajo. Para cada uno:
    <ul>
      <li><b>Nombre</b> (ej. "Aceite de motor"; hay nombres sugeridos que solo insertan el nombre).</li>
      <li><b>Cada km</b> y/o <b>Cada meses</b>: usa uno o ambos. <b>Los números los escribes tú: no hay valores por defecto.</b></li>
      <li><b>Detalle opcional</b> (ej. "usar 10W-40 JASO MA2").</li>
      <li><b>Enlazar repuesto de H2R</b> (opcional): busca el producto exacto y queda enlazado en la guía para que el lector lo compre.</li>
    </ul>
  </li>
  <li><b>Nota general</b> (opcional, máx. 1000 caracteres): condiciones a las que aplican los intervalos (uso normal, ciudad, carretera…).</li>
  <li>Pulsa <b>Guardar y publicar</b> (o <b>Guardar cambios</b> al editar). La guía queda publicada de inmediato.</li>
</ol>

<h2>3. Eliminar una guía</h2>
<p>"Zona de peligro" → eliminar → confirmar. La página pública <b>vuelve a responder 404</b> y el modelo queda "Sin guía".</p>

<div class="box"><b>Ojo:</b> un intervalo equivocado (por ejemplo, aceite cada 10.000 km en una moto que pide 3.000) puede dañar motores y la reputación de la tienda. Copia los valores del manual del propietario o de una fuente confiable, y registra esa fuente.</div>
""",
)

MERCHANT = dict(
    slug="merchant",
    title="Google Merchant Center",
    route="/admin/merchant",
    menu="Merchant Center",
    lead="Muestra qué productos recibe <b>Google Shopping</b> a través del feed de la tienda y cuáles quedan fuera (y por qué). Solo entran productos <b>activos, con stock, con foto y con marca del repuesto</b>. La pantalla calcula el feed en el momento: lo que ves es exactamente lo que recibirá Google.",
    body="""
<h2>1. Las tres tarjetas del inicio</h2>
<ul>
  <li><b>En el feed:</b> productos que Google recibirá.</li>
  <li><b>Excluidos:</b> productos que no cumplen algún requisito.</li>
  <li><b>URL del feed:</b> el enlace que se pega en Merchant Center (se abre en una pestaña nueva).</li>
</ul>

<h2>2. Cargar marca, MPN, tipo y garantía en bloque (lo que más productos desbloquea)</h2>
<ol>
  <li>Pulsa <b>Plantilla (N productos)</b>: descarga un CSV con <b>todos</b> los productos y los datos que ya tengan.</li>
  <li>Ábrelo en Excel y completa las columnas: <code>sku, nombre, marca, mpn, tipo, garantia_meses</code>. La columna <code>nombre</code> es solo de referencia: se ignora al importar.</li>
  <li>Reglas de las celdas:
    <ul>
      <li><b>Celda vacía = no se toca</b> el dato actual.</li>
      <li><b>Un guion (<code>-</code>) = borrar</b> el dato.</li>
      <li><code>tipo</code>: <code>original</code>, <code>homologado</code> o <code>generico</code>.</li>
      <li><b>No escribas "genérico" como marca</b>: Google lo rechaza.</li>
      <li><code>mpn</code> es la referencia del <b>fabricante</b> del repuesto, no el SKU de H2R.</li>
    </ul>
  </li>
  <li>Guarda como CSV y pulsa <b>Subir CSV</b>.</li>
  <li>Revisa el resultado: <i>N actualizados · N con error</i>. Los errores indican la línea y el motivo; corrige y vuelve a subir.</li>
</ol>

<h2>3. Entender los productos excluidos</h2>
<p>Debajo aparecen "chips" con cada motivo y cuántos productos afecta, y una tabla con SKU, nombre y motivos de cada producto excluido. Los motivos posibles son: <i>Producto inactivo o en la papelera</i>, <i>Sin precio</i>, <i>Agotado</i>, <i>Sin imagen</i> y <i>Falta la marca del repuesto</i>. Arréglalos en <code>/admin/productos</code> (o con el CSV de arriba) y recarga esta página.</p>
<h2>4. "En el feed, pero con avisos"</h2>
<p>Productos que sí entran pero con algo mejorable: <i>Sin MPN</i> (Google puede limitar su visibilidad) o <i>Sin compatibilidades verificadas</i> (el título del anuncio no dice para qué moto es). Conviene completarlos con el tiempo.</p>

<div class="box info"><b>Conectar con Google:</b> en Merchant Center se crea un feed programado con la URL de la primera tarjeta. Envíos y devoluciones se configuran en la cuenta de Merchant Center, no en el feed.</div>
<div class="box"><b>Ojo:</b> el importador cambia datos reales de los productos. Descarga siempre la plantilla nueva antes de editar (así no sobrescribes con datos viejos) y no borres filas con un guion sin estar seguro.</div>
""",
)

RESENAS = dict(
    slug="resenas",
    title="Reseñas",
    route="/admin/resenas",
    menu="Reseñas",
    lead="Modera las opiniones de los clientes sobre los productos. Solo pueden reseñar compradores con un pedido <b>entregado</b>, y <b>nada se publica hasta que tú lo apruebes</b>.",
    body="""
<h2>1. Las tres pestañas</h2>
<table>
  <tr><th style="width:24%">Pestaña</th><th>Qué contiene</th></tr>
  <tr><td>Pendientes</td><td>Reseñas nuevas que esperan decisión (es la pestaña que se abre por defecto).</td></tr>
  <tr><td>Aprobadas</td><td>Las que ya se ven en la tienda.</td></tr>
  <tr><td>Rechazadas</td><td>Las que se descartaron; no se ven en la tienda.</td></tr>
</table>
<p>Cada pestaña muestra entre paréntesis cuántas reseñas tiene. Se muestran las 100 más recientes de la pestaña.</p>

<h2>2. Moderar una reseña (paso a paso)</h2>
<ol>
  <li>Entra a <b>Pendientes</b>.</li>
  <li>Lee la tarjeta: producto (el nombre abre su ficha en otra pestaña), estrellas (1 a 5), si <i>lo recomienda</i>, el comentario, el autor y la fecha.</li>
  <li>Pulsa <b>Aprobar</b> (se publica) o <b>Rechazar</b> (no se publica).</li>
  <li>El cambio actualiza la tienda de inmediato.</li>
</ol>
<p>Puedes cambiar de decisión después: en Aprobadas aparece <b>Rechazar</b>; en Rechazadas aparece <b>Aprobar</b>.</p>

<h2>3. Criterios sugeridos</h2>
<ul>
  <li><b>Aprobar:</b> opiniones reales sobre el producto, buenas o malas. Las reseñas críticas y honestas dan credibilidad.</li>
  <li><b>Rechazar:</b> insultos, datos personales (teléfonos, direcciones), publicidad o enlaces de terceros, texto sin relación con el producto o spam.</li>
  <li>Una reseña sin comentario (solo estrellas) es válida: aparece como "Sin comentario".</li>
</ul>

<div class="box info"><b>Relación con otras secciones:</b> la ficha del producto solo muestra el promedio de estrellas cuando hay un mínimo de reseñas aprobadas (se define en <code>/admin/configuracion</code> → "Mínimo de reseñas para mostrar estrellas").</div>
<div class="box"><b>Ojo:</b> no rechaces reseñas solo porque son negativas: puede verse como manipulación y quita credibilidad a las demás. Si una reseña negativa señala un problema real, atiéndelo con el cliente.</div>
""",
)

STOCK = dict(
    slug="stock",
    title="Stock bajo",
    route="/admin/stock",
    menu="Stock bajo",
    lead="Lista los productos con <b>5 unidades o menos</b> para que los reabastezcas a tiempo y permite corregir la cantidad al instante. El umbral de 5 está fijo y no se puede cambiar desde el panel.",
    body="""
<h2>1. Qué muestra</h2>
<ul>
  <li>Cada fila trae el <b>producto</b>, su <b>SKU</b> y el <b>stock actual</b>: en <span style="color:#d97706"><b>ámbar</b></span> si quedan 1 a 5 unidades y en <span style="color:#dc2626"><b>rojo</b></span> si está en 0.</li>
  <li>Si no hay ninguno, verás el mensaje verde "Todo el inventario está en niveles normales".</li>
</ul>

<h2>2. Actualizar el stock (paso a paso)</h2>
<ol>
  <li>En la fila del producto, escribe la <b>nueva cantidad total</b> en el campo "Actualizar stock" (no la cantidad que llegó, sino cuántas unidades hay ahora).</li>
  <li>Pulsa <b>Guardar</b>. El botón solo se activa cuando cambias el valor.</li>
  <li>El cambio se aplica <b>de inmediato</b>, sin pedir confirmación. La marca ✓ de "guardado" desaparece a los pocos segundos: es normal.</li>
  <li>Al subir el stock por encima de 5, el producto sale de esta lista.</li>
</ol>

<h2>3. Cuándo usar esta pantalla y cuándo otra</h2>
<table>
  <tr><th style="width:36%">Situación</th><th>Dónde hacerlo</th></tr>
  <tr><td>Corregir unos pocos productos con stock bajo</td><td>Aquí, <code>/admin/stock</code>.</td></tr>
  <tr><td>Actualizar <b>todo</b> el inventario con el export de Optimun</td><td><code>/admin/sync</code> (más rápido que uno por uno).</td></tr>
  <tr><td>Editar un producto que no está en la lista (stock &gt; 5)</td><td><code>/admin/productos</code> → editar → campo Stock.</td></tr>
</table>

<div class="box info"><b>Recordatorio:</b> el stock baja solo cuando un pago se aprueba (no al crear el pedido). Si ves un producto en 0 que físicamente tienes, cuéntalo y corrige aquí.</div>
<div class="box"><b>Ojo:</b> un producto con stock 0 aparece como "Agotado" en la tienda y sale de Google Merchant Center y de los kits. Repón y actualiza apenas llegue la mercancía.</div>
""",
)

CONFIGURACION = dict(
    slug="configuracion",
    title="Configuración",
    route="/admin/configuracion",
    menu="Configuración",
    lead="Ajustes generales de la tienda: cuándo mostrar la prueba social, los plazos de entrega, el envío gratis, las pasarelas de pago, el pago contra entrega y el botón para refrescar la tienda. <b>Lo que cambies aquí afecta a todos los clientes de inmediato</b>.",
    body="""
<h2>1. Prueba social y entrega en la ficha de producto</h2>
<p>Todos los indicadores usan datos reales (ventas confirmadas, reseñas verificadas, stock). Estos números solo controlan <b>cuándo se muestran</b>. Todos son enteros. Pulsa <b>Guardar</b> al terminar.</p>
<table>
  <tr><th style="width:36%">Campo</th><th>Qué hace</th></tr>
  <tr><td>Mínimo de ventas para "🔥 X personas han comprado"</td><td>Por debajo de este número el contador no se muestra.</td></tr>
  <tr><td>Mínimo de reseñas para mostrar estrellas</td><td>Evita mostrar un promedio con muy pocas opiniones (mínimo 1).</td></tr>
  <tr><td>Urgencia de stock ("¡Solo quedan X!")</td><td>Se muestra cuando el stock es mayor que 0 y menor que este valor.</td></tr>
  <tr><td>Entrega: días hábiles mínimos / máximos</td><td>Rango prometido desde el despacho hasta la entrega. El máximo debe ser mayor o igual al mínimo.</td></tr>
  <tr><td>Hora de corte para despachar el mismo día</td><td>Hora de Colombia (0–24). Después de esa hora se cuenta desde el siguiente día hábil.</td></tr>
  <tr><td>Envío gratis desde (COP)</td><td>Compra mínima <b>en pesos</b>. Alimenta la ficha, el carrito y la barra de progreso. <code>0</code> = no se promete envío gratis.</td></tr>
</table>

<h2>2. Pasarelas de pago</h2>
<ul>
  <li><b>Wompi:</b> pasarela principal (tarjeta, Nequi, PSE, Bancolombia). Siempre está activa y no se puede apagar.</li>
  <li><b>Mercado Pago:</b> pasarela de respaldo, con interruptor. <b>Actívala solo si Wompi tiene incidentes.</b></li>
</ul>

<h2>3. Pago contra entrega (COD)</h2>
<ul>
  <li><b>Interruptor "Pago contra entrega":</b> si lo desactivas, los clientes dejan de ver esa opción en el checkout (no se borra nada; vuelve al reactivarlo). Por defecto está activo. El cliente paga en efectivo al repartidor de Vendelo.</li>
  <li><b>Anticipo pre-envío:</b> valor que el cliente paga por Wompi <b>antes</b> de despachar y que se descuenta de lo que paga al recibir. Ayuda a reducir devoluciones. <code>0</code> = desactivado. El retiro en tienda no paga anticipo.</li>
</ul>

<h2>4. Flete de pedidos pagados en línea</h2>
<p>Aplica solo a pedidos pagados por Wompi o Mercado Pago (no al contra entrega). <b>Desactivado por defecto.</b></p>
<ul>
  <li><b>Activo:</b> el flete cotizado se suma al cobro y el cliente paga producto + envío en un solo cargo.</li>
  <li><b>Desactivado:</b> el negocio absorbe el flete desde su billetera de Vendelo.</li>
</ul>

<h2>5. Caché de la tienda — "Refrescar tienda"</h2>
<p>Los cambios hechos desde el panel se ven de inmediato. Usa este botón <b>solo</b> si cambiaste datos <b>por fuera del panel</b> (carga de catálogo, scripts o la base de datos directamente) y la tienda no los muestra. No daña nada, pero fuerza a la tienda a reconstruir sus páginas.</p>

<h2>6. Sincronización con Optimun</h2>
<p>Esta tarjeta es informativa: la sincronización automática está planificada. Por ahora el inventario se actualiza con el importador de <code>/admin/sync</code>.</p>

<div class="box"><b>Ojo:</b> el envío gratis, el anticipo y el flete en línea cambian lo que paga el cliente y lo que absorbe el negocio. Confirma los números con el dueño antes de modificarlos y anota el valor anterior por si necesitas volver atrás.</div>
""",
)

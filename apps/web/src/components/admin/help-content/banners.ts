import type { AdminHelpContent } from '../AdminHelpButton'

export const bannersHelpContent: AdminHelpContent = {
  title: 'Banners del Hero',
  summary:
    'Controla las imágenes del carrusel principal de la home (el "Hero"). Cada banner tiene su ' +
    'propia imagen, título, descripción y botón de llamada a la acción (CTA) opcional. El orden ' +
    'en que aparecen en el carrusel es el mismo orden de esta tabla.',
  steps: [
    'Solo los banners marcados como "Activo" se muestran en la home — puedes crear banners de promociones futuras y activarlos cuando llegue la fecha, sin borrarlos.',
    'Hay un máximo de 8 banners activos a la vez, para no sobrecargar el carrusel. Si lo alcanzas, desactiva uno antes de activar otro.',
    'Las flechas ▲▼ cambian el orden de aparición en el carrusel — el primero de la tabla es el primero que se ve al cargar la home.',
    'El CTA (botón de acción) es opcional: si no le pones texto y URL, el banner solo muestra título y descripción sin botón propio.',
    'La URL del CTA puede ser una ruta interna del sitio (ej. "/catalogo?category=llantas") o una URL externa completa (ej. "https://wa.me/...").',
    'Si borras todos los banners, el Hero de la home simplemente no se muestra — el resto de la página sigue funcionando normal.',
  ],
}

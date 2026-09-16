import type { AdminHelpContent } from '../AdminHelpButton'

export const bannersHelpContent: AdminHelpContent = {
  title: 'Banners del Hero',
  summary:
    'Controla las imágenes del carrusel principal de la home (el "Hero"). El Hero es puramente ' +
    'visual: no muestra título ni descripción sobre la imagen, solo un botón de acción (CTA). Cada ' +
    'banner lleva dos imágenes — una horizontal para computador y una vertical para celular. El ' +
    'orden en que aparecen en el carrusel es el mismo orden de esta tabla.',
  steps: [
    'Imagen para computador: horizontal, idealmente 1920 × 820 px (proporción ~21:9). Se muestra en pantallas de 768 px de ancho o más.',
    'Imagen para celular: vertical, idealmente 1080 × 1350 px (proporción 4:5). Se muestra en pantallas de menos de 768 px. Deja espacio libre abajo para el botón.',
    'Como el Hero no tiene texto superpuesto, cualquier mensaje (promoción, marca, precio) debe venir diseñado dentro de la imagen.',
    'El "texto alternativo" no se ve en pantalla: describe la imagen para lectores de pantalla y Google (ej. "Promoción de llantas Michelin 20% off").',
    'El botón es obligatorio. Elige a dónde lleva (catálogo, una categoría, WhatsApp u otro enlace) y su texto (ej. "Comprar ahora"). Toda la imagen también es clicable.',
    'Solo los banners marcados como "Activo" se muestran en la home, con un máximo de 8 activos a la vez. Las flechas ▲▼ cambian el orden de aparición.',
    'Los banners creados antes de este cambio usan la misma imagen en ambas versiones — edítalos y sube una imagen vertical para celular.',
  ],
}

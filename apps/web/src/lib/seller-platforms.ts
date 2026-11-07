/**
 * Plataformas donde la tienda vende o es aliada (README §31).
 *
 * Única fuente de datos de `VerifiedSellerBadges`: para cambiar un enlace, un
 * texto o una cifra se edita aquí y se actualiza en todas las páginas.
 *
 * ⚠️ `stat` es una CIFRA DE PRUEBA para ver el diseño. Antes de publicar hay que
 * reemplazarla por el dato real o ponerla en `null` (el sello se muestra sin cifra).
 * `href` apunta por ahora a la página principal de cada plataforma, hasta que el
 * cliente entregue el enlace de su tienda en Mercado Libre y de su perfil en Addi.
 */
export interface SellerPlatform {
  id: 'mercadolibre' | 'addi'
  name: string
  /** Etiqueta corta del rol: "Vendedor en…" / "Aliado…". */
  role: string
  /** Frase del banner de la home. */
  description: string
  logo: string
  href: string
  /** Cifra opcional del banner. `null` la oculta. */
  stat: { value: string; label: string } | null
  /** Ajuste del recorte del logo dentro del recuadro (cada archivo trae su propio fondo). */
  logoClass: string
  /** Fondo del recuadro, igual al del logo para que no se noten bordes. */
  tileClass: string
}

export const SELLER_PLATFORMS: SellerPlatform[] = [
  {
    id: 'mercadolibre',
    name: 'Mercado Libre',
    role: 'Vendedor en Mercado Libre',
    description: 'Compra también en nuestra tienda de Mercado Libre, con la protección de la plataforma.',
    logo: '/assets/plataformas/mercado-libre-logo.jpg',
    href: 'https://www.mercadolibre.com.co',
    stat: { value: '+1.200', label: 'ventas realizadas' }, // PRUEBA
    logoClass: 'scale-110',
    tileClass: 'bg-[#ffe600]',
  },
  {
    id: 'addi',
    name: 'Addi',
    role: 'Aliado Addi',
    description: 'Paga tus repuestos a cuotas con Addi, sin necesidad de tarjeta de crédito.',
    logo: '/assets/plataformas/addi-logo.png',
    href: 'https://co.addi.com',
    stat: { value: '+800', label: 'compras a cuotas' }, // PRUEBA
    logoClass: 'scale-[1.35]',
    tileClass: 'bg-[#f8f8f8]',
  },
]

import { Package } from 'lucide-react'

/**
 * Relleno para miniaturas de producto sin foto (o cuya imagen falló al cargar).
 * Ocupa todo el contenedor padre; el tamaño del icono se ajusta con `iconClassName`.
 */
export function ImagePlaceholder({ iconClassName = 'w-6 h-6' }: { iconClassName?: string }) {
  return (
    <span className="flex h-full w-full items-center justify-center text-gray-300">
      <Package className={iconClassName} aria-hidden="true" />
    </span>
  )
}

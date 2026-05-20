import Link from 'next/link'

interface Props {
  slug: string
  name: string
  description: string
  imageSrc: string
}

export function CategoryHeroBanner({ slug, name, description, imageSrc }: Props) {
  return (
    <div className="relative w-full bg-black">
      {/* Imagen a tamaño natural, sin recorte */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={name}
        className="w-full h-auto object-contain"
      />

      {/* Overlay gradiente encima de la imagen */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />

      {/* Contenido */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end px-8 pb-12 md:px-16 md:pb-14">
        <span className="text-[10px] font-bold tracking-[0.3em] text-white/50 uppercase mb-2">
          Categoría
        </span>
        <h2 className="text-4xl md:text-5xl font-black text-white uppercase leading-none mb-3">
          {name}
        </h2>
        <p className="text-white/65 text-sm mb-7 max-w-md leading-relaxed">
          {description}
        </p>
        <Link
          href={`/catalogo?category=${slug}`}
          className="inline-flex items-center gap-2 bg-sky-400 text-black px-7 py-3 rounded-full font-bold text-sm hover:bg-sky-500 hover:text-white active:scale-95 transition-all w-fit"
        >
          Ver más
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

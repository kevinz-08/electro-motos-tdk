import Link from 'next/link'

export function CtaMidSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-[#082032] via-sky-800 to-sky-500 text-white">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          ¿No encuentras lo que buscas?
        </h2>
        <p className="text-white/70 text-base md:text-lg mb-3 max-w-lg mx-auto leading-relaxed">
          Cuéntanos el modelo de tu moto y te ayudamos a encontrar la pieza exacta.
        </p>
        <p className="text-white/50 text-sm mb-8 max-w-md mx-auto">
          Conseguimos cualquier repuesto. Cotiza directamente con nosotros.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 bg-white text-sky-800 font-bold px-8 py-3.5 rounded-xl text-base hover:bg-sky-50 hover:scale-[1.03] active:scale-95 transition-all duration-200 shadow-xl"
          >
            Ver catálogo completo
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <a
            href={`https://wa.me/573152926690?text=${encodeURIComponent('Hola, necesito ayuda para encontrar un repuesto para mi moto')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-white/10 hover:border-white/60 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
            Escribir a WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}

const ABOUT_US = [
  {
    title: '¿Quiénes somos?',
    text: 'En H2R Online Store queremos ser la mejor opción para tu motocicleta. Nos especializamos en la comercialización online de repuestos y accesorios multimarca para motocicletas en Colombia, ofreciendo un catálogo completo, seguro y al alcance de un clic.',
  },
  {
    title: 'Calidad que confías',
    text: 'Entendemos que tu tiempo y la seguridad de tu moto son lo primero. Por eso seleccionamos piezas de alta calidad y accesorios que elevan tu experiencia de conducción, con envíos rápidos y un proceso de compra fácil y confiable.',
  },
  {
    title: 'Donde estés, contigo',
    text: 'No importa en qué rincón del país estés, nuestro compromiso es mantenerte en movimiento con la tranquilidad de que llevas lo mejor en cada camino que recorres con tu moto.',
  },
]

export function AboutUsBlock() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
          Quiénes somos
        </span>
        <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          Hablemos, estamos para ayudarte
        </h1>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
          {ABOUT_US.map(({ title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 hover:border-sky-200 hover:bg-sky-50/40 transition-colors duration-200"
            >
              <h2 className="text-sm font-semibold text-gray-900 mb-1.5">{title}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

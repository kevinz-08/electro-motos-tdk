'use client'

import { useState } from 'react'

const ITEMS = [
  {
    q: '¿Cuánto tiempo tarda el envío?',
    a: 'El tiempo de entrega depende de tu ubicación. Para Bucaramanga y área metropolitana, el envío es de 1 a 2 días hábiles. Para el resto de Colombia, el tiempo estimado es de 3 a 7 días hábiles.',
  },
  {
    q: '¿Hacen envíos a todo Colombia?',
    a: 'Sí, hacemos envíos a todos los departamentos de Colombia. El envío es gratis para pedidos superiores a $500.000 COP.',
  },
  {
    q: '¿Cómo puedo pagar?',
    a: 'Aceptamos pagos con Wompi (tarjeta de crédito o débito, Nequi, PSE o Bancolombia) y Addi (crédito en cuotas sin tarjeta).',
  },
  {
    q: '¿Tienen garantía los repuestos?',
    a: 'Todos nuestros productos tienen garantía de hasta 6 meses contra defectos de fábrica. Si tienes algún problema, escríbenos y te damos solución rápida.',
  },
  {
    q: '¿Puedo devolver un producto?',
    a: 'Sí, aceptamos cambios hasta un máximo de 5 días posteriores a la compra. El producto debe estar en su empaque original y sin usar. Escríbenos y coordinamos el cambio.',
  },
  {
    q: '¿Cómo sé qué repuesto necesita mi moto?',
    a: 'Puedes consultar nuestro catálogo por categoría o escribirnos a WhatsApp con el modelo y año de tu moto. Te asesoramos para encontrar la pieza correcta.',
  },
]

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: { q: string; a: string }
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left hover:text-sky-700 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm md:text-base pr-4">
          {item.q}
        </span>
        <svg
          className={`w-5 h-5 shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`faq-content ${isOpen ? 'open' : ''}`}>
        <div>
          <p className="text-sm md:text-base text-gray-600 pb-5 leading-relaxed max-w-2xl">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  )
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Preguntas frecuentes
          </h2>
          <p className="text-gray-500 mt-3 max-w-md mx-auto">
            Todo lo que necesitas saber antes de comprar
          </p>
        </div>

        <div className="border-t border-gray-200">
          {ITEMS.map((item, index) => (
            <AccordionItem
              key={index}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

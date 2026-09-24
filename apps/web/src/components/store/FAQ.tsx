'use client'

import { useState } from 'react'
import type { FaqItem } from '@/lib/faq'


function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem
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

export function FAQ({ items }: { items: FaqItem[] }) {
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
          {items.map((item, index) => (
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

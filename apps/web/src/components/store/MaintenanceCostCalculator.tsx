'use client'

/**
 * Calculadora del costo anual de mantenimiento (docs/seo/, Fase 5 — ítem 3).
 *
 * El visitante escribe cuántos km recorre al año; la cuenta la hace
 * `computeAnnualMaintenanceCost` del dominio con los intervalos de la guía y el
 * precio de hoy de cada repuesto enlazado. No hay kilometraje por defecto:
 * mientras el campo esté vacío solo cuentan los puntos que van por tiempo.
 */
import { useId, useState } from 'react'
import { computeAnnualMaintenanceCost, MAX_KM_PER_YEAR, type MaintenanceCostItem } from '@h2r/domain'
import { formatCOP } from '@/components/store/PriceTag'

const formatTimes = (n: number) =>
  n.toLocaleString('es-CO', { maximumFractionDigits: 1, minimumFractionDigits: n % 1 === 0 ? 0 : 1 })

export function MaintenanceCostCalculator({ items, modelName }: { items: MaintenanceCostItem[]; modelName: string }) {
  const inputId = useId()
  const [km, setKm] = useState('')
  const kmValue = km.trim() ? Number(km.replace(/\./g, '')) : null
  const result = computeAnnualMaintenanceCost(items, kmValue)

  return (
    <div className="mt-5 rounded-2xl border border-gray-200 p-5">
      <label htmlFor={inputId} className="block text-sm font-semibold text-gray-900">
        ¿Cuántos kilómetros recorres al año con tu {modelName}?
      </label>
      <div className="mt-2 flex max-w-xs items-center gap-2">
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_KM_PER_YEAR}
          step={500}
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder="Ej: 12000"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
        />
        <span className="text-sm text-gray-500">km/año</span>
      </div>

      {result.lines.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="py-2 pr-4 font-semibold">Punto de control</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Veces al año</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Precio hoy</th>
                <th scope="col" className="py-2 text-right font-semibold">Al año</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.lines.map((line) => (
                <tr key={line.label}>
                  <th scope="row" className="py-2 pr-4 font-medium text-gray-900">{line.label}</th>
                  <td className="py-2 pr-4 text-gray-700">{formatTimes(line.timesPerYear)}</td>
                  <td className="py-2 pr-4 text-gray-700">{formatCOP(line.unitPrice)}</td>
                  <td className="py-2 text-right text-gray-900">{formatCOP(line.annualCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <th scope="row" colSpan={3} className="py-3 pr-4 text-gray-900">Total en repuestos al año</th>
                <td className="py-3 text-right text-lg font-black text-gray-900" aria-live="polite">{formatCOP(result.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500">Escribe tu kilometraje anual para ver el cálculo.</p>
      )}

      <div className="mt-3 space-y-1 text-xs text-gray-500">
        {result.needsKm.length > 0 && <p>Con tu kilometraje se suman también: {result.needsKm.join(', ')}.</p>}
        {result.withoutPrice.length > 0 && <p>Sin precio en H2R (no suman): {result.withoutPrice.join(', ')}.</p>}
        <p>Precios de hoy en H2R. No incluye mano de obra ni revisiones del taller.</p>
      </div>
    </div>
  )
}

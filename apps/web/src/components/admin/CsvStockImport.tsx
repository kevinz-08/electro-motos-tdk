'use client'

/**
 * Componente para importación masiva de stock desde un archivo CSV.
 *
 * Formato esperado del archivo CSV:
 *   - Separador: coma (,)
 *   - Primera columna: SKU del producto
 *   - Segunda columna: nuevo stock (número entero >= 0)
 *   - La fila de encabezado "sku,stock" es opcional y se ignora automáticamente
 *
 * Ejemplo de archivo válido:
 *   sku,stock          ← encabezado (ignorado)
 *   FRE-BRE-FZ25-001,50
 *   MOT-PIS-YBR125-001,10
 *   LLA-PIR-100-90-18-001,0
 *
 * Procesamiento:
 *   1. El usuario selecciona el archivo
 *   2. Se lee el contenido con FileReader API
 *   3. Se parsean las líneas: formato válido (SKU, stock entero >= 0)
 *   4. Las líneas inválidas se reportan como errores pero no detienen el proceso
 *   5. Se envía PATCH /api/admin/stock/bulk con el array de actualizaciones
 *   6. Se muestra cuántos productos fueron actualizados
 *
 * Los SKUs que no existan en la BD son ignorados silenciosamente por el endpoint
 * (usa updateMany que no lanza error si no encuentra el registro).
 */
import { useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache'

export function CsvStockImport() {

  const { data: session } = useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ updated: number; errors: string[] } | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setResult(null)

    const text = await file.text()
    const lines = text.split('\n').filter(Boolean)
    const updates: Array<{ sku: string; stock: number }> = []
    const errors: string[] = []

    for (const line of lines) {
      const parts = line.trim().split(',')
      const sku = parts[0]?.trim()
      const stock = Number(parts[1]?.trim())

      if (!sku || sku.toLowerCase() === 'sku') continue // Saltar encabezado
      if (isNaN(stock) || stock < 0) {
        errors.push(`Línea inválida: "${line.trim()}"`)
        continue
      }
      updates.push({ sku, stock })
    }

    if (updates.length > 0) {
      const res = await apiClient(session?.user?.accessToken).patch<{ updated: number }>('/admin/stock/bulk', { updates })
      setResult({ updated: res.ok ? res.data.updated : 0, errors })
      await revalidateAdminCache([CACHE_TAGS.products])
    } else {
      setResult({ updated: 0, errors: errors.length > 0 ? errors : ['El archivo está vacío o tiene formato incorrecto'] })
    }

    setLoading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
        id="csv-import"
      />
      <label
        htmlFor="csv-import"
        className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:border-amber-400 transition-colors"
      >
        {loading ? 'Importando...' : '📁 Importar CSV'}
      </label>

      {result && (
        <div className={`text-sm ${result.updated > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {result.updated > 0 && <span>✓ {result.updated} productos actualizados</span>}
          {result.errors.length > 0 && <span> · {result.errors.length} errores</span>}
        </div>
      )}
    </div>
  )
}

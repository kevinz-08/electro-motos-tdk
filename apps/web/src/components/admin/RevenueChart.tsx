'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface DataPoint {
  label: string
  total: number
}

interface RevenueChartProps {
  data: DataPoint[]
}

function formatCOP(cents: number): string {
  if (cents === 0) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    notation: 'compact',
  }).format(cents / 100)
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111] border border-white/10 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-[11px] text-white/40 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-base font-bold text-white">{formatCOP(payload[0].value)}</p>
    </div>
  )
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)', fontFamily: 'inherit' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCOP(v)}
          tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)', fontFamily: 'inherit' }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1.5}
          fill="url(#revenueGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#fff', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

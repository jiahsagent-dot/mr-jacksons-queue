'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { OwnerNav } from '@/components/OwnerNav'

type Analytics = {
  costs: { labourPct: number; cogsPct: number; rentPct: number; primeCost: number; grossMargin: number; netMarginPct: number; weeklyLabour: number; monthlyRent: number }
  week: { revenue: number }
  metrics: Record<string, { value: number; status: 'green' | 'amber' | 'red'; label: string; target: string }>
  settings: { cogsPercent: number; weeklyLabour: number; monthlyRent: number }
}

const STATUS_COLOR = {
  green: 'text-green-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
}

function Bar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="w-full bg-stone-800 rounded-full h-2 mt-1.5">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  )
}

export default function CostsPage() {
  const router = useRouter()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = sessionStorage.getItem('owner_token')
    if (!t) router.push('/owner/login')
  }, [router])

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/owner/analytics?_t=${Date.now()}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <main className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-stone-700 border-t-amber-500 rounded-full animate-spin" />
    </main>
  )

  if (!data) return null
  const { costs, metrics } = data

  const rows = [
    { label: 'Prime Cost %', value: costs.primeCost, target: '55–65%', ideal: 65, key: 'primeCost', desc: 'COGS + Labour ÷ Revenue' },
    { label: 'Labour Cost %', value: costs.labourPct, target: '30–35%', ideal: 35, key: 'labourPct', desc: `$${costs.weeklyLabour.toFixed(0)}/week` },
    { label: 'COGS %', value: costs.cogsPct, target: '25–35%', ideal: 35, key: 'cogsPct', desc: 'Food & beverage cost estimate' },
    { label: 'Rent %', value: costs.rentPct, target: '8–12%', ideal: 12, key: 'rentPct', desc: `$${costs.monthlyRent.toFixed(0)}/month` },
    { label: 'Gross Margin %', value: costs.grossMargin, target: '~70%', ideal: 70, key: 'grossMargin', desc: '100% − COGS %' },
    { label: 'Net Margin %', value: costs.netMarginPct, target: '10–15%', ideal: 15, key: 'netMargin', desc: 'After all costs' },
  ]

  return (
    <main className="min-h-screen bg-stone-950 pb-28">
      <div className="sticky top-0 z-10 bg-stone-950/95 backdrop-blur-sm border-b border-stone-800 px-4 py-3">
        <h1 className="text-white text-lg font-bold max-w-lg mx-auto" style={{ fontFamily: "'Playfair Display', serif" }}>Costs</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {(costs.weeklyLabour === 0 && costs.monthlyRent === 0) && (
          <div className="bg-amber-950/50 border border-amber-800 rounded-2xl p-4">
            <p className="text-amber-400 text-sm font-bold font-sans">⚙️ Set your costs</p>
            <p className="text-amber-600 text-xs font-sans mt-1">Go to Dashboard → tap "Costs" to enter labour & rent for accurate metrics</p>
          </div>
        )}

        {rows.map(row => {
          const status = metrics[row.key]?.status || 'green'
          return (
            <div key={row.key} className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-stone-300 text-sm font-bold font-sans">{row.label}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold font-sans tabular-nums ${STATUS_COLOR[status]}`}>{row.value}%</span>
                </div>
              </div>
              <p className="text-stone-600 text-xs font-sans">{row.desc}</p>
              <Bar value={row.value} max={row.ideal * 1.5} color={status === 'green' ? 'bg-green-500' : status === 'amber' ? 'bg-amber-500' : 'bg-red-500'} />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-stone-600 font-sans">0%</span>
                <span className="text-[10px] text-stone-500 font-sans">Target: {row.target}</span>
              </div>
            </div>
          )
        })}

        {/* Prime cost breakdown visual */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <p className="text-stone-300 text-sm font-bold font-sans mb-3">Cost Breakdown (% of revenue)</p>
          <div className="space-y-2">
            {[
              { label: 'Labour', value: costs.labourPct, color: 'bg-blue-500' },
              { label: 'COGS', value: costs.cogsPct, color: 'bg-amber-500' },
              { label: 'Rent', value: costs.rentPct, color: 'bg-purple-500' },
              { label: 'Net Profit', value: Math.max(0, costs.netMarginPct), color: 'bg-green-500' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-stone-400 text-xs font-sans w-14">{item.label}</span>
                <div className="flex-1 bg-stone-800 rounded-full h-4 overflow-hidden">
                  <div className={`h-4 rounded-full ${item.color}`} style={{ width: `${Math.min(100, item.value)}%` }} />
                </div>
                <span className="text-stone-300 text-xs font-bold font-sans w-10 text-right">{item.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <OwnerNav />
    </main>
  )
}

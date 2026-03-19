'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { OwnerNav } from '@/components/OwnerNav'

type Period = 'today' | 'week' | 'month'

type PopularItem = { name: string; units: number; revenue: number; pct: number }
type DayStats = { day: string; shortDay: string; revenue: number; orders: number; aov: number; avgRevenue: number }
type HourStats = { hour: number; label: string; revenue: number; orders: number }
type DailyRev = { date: string; label: string; revenue: number; orders: number }

type Analytics = {
  period: Period
  dateRange: { start: string; end: string }
  summary: {
    revenue: number; orders: number; covers: number; aov: number
    revenueChange: number | null; ordersChange: number | null; aovChange: number | null
    prevRevenue: number; prevOrders: number
  }
  popularItems: PopularItem[]
  bestDays: DayStats[]
  peakHours: HourStats[]
  dailyRevenue: DailyRev[]
  maxHourRevenue: number
  maxDowRevenue: number
}

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function Change({ val }: { val: number | null }) {
  if (val === null) return null
  const up = val >= 0
  return (
    <span className={`text-xs font-bold font-sans px-2 py-0.5 rounded-full ${up ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
      {up ? '▲' : '▼'} {Math.abs(val)}%
    </span>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-stone-400 text-xs font-sans mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-white text-sm font-bold font-sans">{fmt(p.value)}</p>
      ))}
    </div>
  )
}

const PERIOD_LABELS: Record<Period, string> = { today: 'Today', week: 'This Week', month: 'This Month' }
const PREV_LABELS: Record<Period, string> = { today: 'yesterday', week: 'last week', month: 'last month' }

export default function SalesPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('week')
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = sessionStorage.getItem('owner_token')
    if (!t) router.push('/owner/login')
  }, [router])

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true)
    const res = await fetch(`/api/owner/sales-analytics?period=${p}&_t=${Date.now()}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData(period) }, [period, fetchData])

  const maxItemRevenue = data ? Math.max(...data.popularItems.map(i => i.revenue), 1) : 1
  const bestDow = data ? [...data.bestDays].sort((a, b) => b.revenue - a.revenue)[0] : null
  const peakHour = data ? [...data.peakHours].sort((a, b) => b.orders - a.orders)[0] : null

  return (
    <main className="min-h-screen bg-stone-950 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-950/95 backdrop-blur-sm border-b border-stone-800 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-white text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Sales</h1>
            {data && !loading && (
              <span className="text-stone-500 text-xs font-sans">{data.dateRange?.start === data.dateRange?.end ? data.dateRange?.start : `${data.dateRange?.start} → ${data.dateRange?.end}`}</span>
            )}
          </div>
          {/* Period toggle */}
          <div className="flex gap-1 bg-stone-900 rounded-xl p-0.5 border border-stone-800">
            {(['today', 'week', 'month'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-sans transition-all ${period === p ? 'bg-amber-500 text-stone-900' : 'text-stone-400 hover:text-stone-200'}`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-stone-700 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : !data ? null : (
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

          {/* Period Summary */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-stone-400 text-xs font-bold uppercase tracking-wider font-sans">{PERIOD_LABELS[period]}</p>
              <Change val={data.summary.revenueChange} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-3xl font-bold text-amber-400 font-sans tabular-nums">{fmt(data.summary.revenue)}</p>
                <p className="text-stone-500 text-xs font-sans">Revenue</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white font-sans tabular-nums">{data.summary.orders}</p>
                <p className="text-stone-500 text-xs font-sans">Orders <Change val={data.summary.ordersChange} /></p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-stone-800">
              <div className="text-center">
                <p className="text-lg font-bold text-white font-sans">${data.summary.aov.toFixed(2)}</p>
                <p className="text-stone-500 text-[11px] font-sans">Avg order <Change val={data.summary.aovChange} /></p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white font-sans">{data.summary.covers}</p>
                <p className="text-stone-500 text-[11px] font-sans">Covers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-stone-400 font-sans">{fmt(data.summary.prevRevenue)}</p>
                <p className="text-stone-500 text-[11px] font-sans">vs {PREV_LABELS[period]}</p>
              </div>
            </div>
          </div>

          {/* Revenue chart */}
          {data.dailyRevenue.length > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <p className="text-stone-300 text-sm font-bold font-sans mb-4">
                {period === 'today' ? 'Revenue by Hour' : 'Revenue by Day'}
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data.dailyRevenue} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  barSize={period === 'today' ? 12 : period === 'week' ? 28 : 8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#78716c', fontSize: 9, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false}
                    interval={period === 'month' ? 4 : 0} />
                  <YAxis tick={{ fill: '#78716c', fontSize: 10, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                    {data.dailyRevenue.map((entry, i) => {
                      const isMax = entry.revenue === Math.max(...data.dailyRevenue.map(d => d.revenue))
                      return <Cell key={i} fill={isMax ? '#f59e0b' : '#44403c'} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Popular Items */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <p className="text-stone-300 text-sm font-bold font-sans">🏆 Top Selling Items</p>
              <p className="text-stone-600 text-xs font-sans mt-0.5">{PERIOD_LABELS[period]}</p>
            </div>
            {data.popularItems.length === 0 ? (
              <div className="px-4 pb-4 text-center">
                <p className="text-stone-600 text-sm font-sans">No orders yet this period</p>
              </div>
            ) : (
              <div>
                {data.popularItems.map((item, idx) => {
                  const barW = Math.round((item.revenue / maxItemRevenue) * 100)
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                  const isTop3 = idx < 3
                  return (
                    <div key={item.name} className={`px-4 py-3 border-t border-stone-800 ${isTop3 ? '' : ''}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-stone-500 text-[11px] font-bold font-sans w-5 text-center">
                          {medal || `${idx + 1}`}
                        </span>
                        <p className={`flex-1 text-sm font-semibold font-sans truncate ${isTop3 ? 'text-stone-100' : 'text-stone-400'}`}>
                          {item.name}
                        </p>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold font-sans tabular-nums ${isTop3 ? 'text-amber-400' : 'text-stone-400'}`}>
                            {fmt(item.revenue)}
                          </p>
                          <p className="text-[10px] text-stone-600 font-sans">{item.units} sold · {item.pct}%</p>
                        </div>
                      </div>
                      {/* Revenue bar */}
                      <div className="ml-7 w-full bg-stone-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${isTop3 ? 'bg-amber-500' : 'bg-stone-600'}`}
                          style={{ width: `${barW}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Best Days of Week */}
          {period !== 'today' && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-stone-300 text-sm font-bold font-sans">📅 Best Days</p>
                {bestDow && (
                  <span className="text-amber-400 text-xs font-bold font-sans bg-amber-900/30 px-2 py-0.5 rounded-full">
                    🏆 {bestDow.day}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {data.bestDays
                  .filter(d => d.revenue > 0 || d.orders > 0)
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((d, idx) => {
                    const barW = data.maxDowRevenue > 0 ? Math.round((d.revenue / data.maxDowRevenue) * 100) : 0
                    const isBest = idx === 0
                    return (
                      <div key={d.day} className="flex items-center gap-3">
                        <span className={`text-xs font-bold font-sans w-10 flex-shrink-0 ${isBest ? 'text-amber-400' : 'text-stone-500'}`}>
                          {d.shortDay}
                        </span>
                        <div className="flex-1 bg-stone-800 rounded-full h-6 overflow-hidden relative">
                          <div
                            className={`h-6 rounded-full flex items-center px-2 transition-all ${isBest ? 'bg-amber-500/40' : 'bg-stone-700/50'}`}
                            style={{ width: `${Math.max(barW, 8)}%` }}
                          />
                          <span className={`absolute left-2 top-0 bottom-0 flex items-center text-[11px] font-bold font-sans ${isBest ? 'text-amber-300' : 'text-stone-400'}`}>
                            {fmt(d.revenue)}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0 w-16">
                          <p className="text-[11px] text-stone-500 font-sans">{d.orders} orders</p>
                          {d.aov > 0 && <p className="text-[10px] text-stone-600 font-sans">${d.aov.toFixed(0)} AOV</p>}
                        </div>
                      </div>
                    )
                  })}
              </div>
              {data.bestDays.every(d => d.revenue === 0) && (
                <p className="text-stone-600 text-sm font-sans text-center py-2">No data for this period</p>
              )}
            </div>
          )}

          {/* Peak Hours */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-stone-300 text-sm font-bold font-sans">⏰ Peak Hours</p>
              {peakHour && peakHour.orders > 0 && (
                <span className="text-amber-400 text-xs font-bold font-sans bg-amber-900/30 px-2 py-0.5 rounded-full">
                  🔥 {peakHour.label}
                </span>
              )}
            </div>

            {/* Heatmap-style grid */}
            <div className="flex gap-1 flex-wrap mb-3">
              {data.peakHours.map(h => {
                const intensity = data.maxHourRevenue > 0 ? h.revenue / data.maxHourRevenue : 0
                const bg = intensity === 0 ? 'bg-stone-800' :
                           intensity < 0.25 ? 'bg-amber-900/40' :
                           intensity < 0.5 ? 'bg-amber-700/60' :
                           intensity < 0.75 ? 'bg-amber-500/80' : 'bg-amber-500'
                return (
                  <div key={h.hour} className="flex flex-col items-center gap-0.5" style={{ width: 'calc(100% / 15 - 3px)' }}>
                    <div className={`w-full aspect-square rounded-md ${bg} flex items-center justify-center`}>
                      {h.orders > 0 && (
                        <span className="text-[8px] font-bold text-stone-900 font-sans leading-none">{h.orders}</span>
                      )}
                    </div>
                    <span className="text-[8px] text-stone-600 font-sans leading-none">{h.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Top 3 hours list */}
            <div className="space-y-2 pt-3 border-t border-stone-800">
              {[...data.peakHours]
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 3)
                .filter(h => h.orders > 0)
                .map((h, i) => (
                  <div key={h.hour} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{i === 0 ? '🔥' : i === 1 ? '🌡️' : '📊'}</span>
                      <span className="text-stone-300 text-sm font-bold font-sans">{h.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-amber-400 text-sm font-bold font-sans">{fmt(h.revenue)}</span>
                      <span className="text-stone-600 text-xs font-sans ml-2">{h.orders} orders</span>
                    </div>
                  </div>
                ))}
              {data.peakHours.every(h => h.orders === 0) && (
                <p className="text-stone-600 text-sm font-sans text-center">No orders yet this period</p>
              )}
            </div>
          </div>

        </div>
      )}

      <OwnerNav />
    </main>
  )
}

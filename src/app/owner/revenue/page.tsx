'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { OwnerNav } from '@/components/OwnerNav'

type DayData = { date: string; revenue: number; orders?: number }
type Analytics = {
  today: { date: string; revenue: number; orders: number; vsYesterday: number | null; breakEvenDaily: number; breakEvenMet: boolean }
  week: { revenue: number; orders: number; aov: number; wowChange: number }
  month: { revenue: number; orders: number; aov: number }
  charts: { daily: DayData[]; weekly: DayData[] }
  settings: { seats: number; hoursOpen: number; cogsPercent: number; weeklyLabour: number; monthlyRent: number }
}

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function shortDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function dayLabel(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-AU', { weekday: 'short' })
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

type Period = '7d' | '30d'

export default function RevenuePage() {
  const router = useRouter()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('7d')

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

  const chartData = period === '7d'
    ? data.charts.weekly.map(d => ({ ...d, label: dayLabel(d.date) }))
    : data.charts.daily.map(d => ({ ...d, label: shortDate(d.date) }))

  const totalRevenue = period === '7d' ? data.week.revenue : data.month.revenue
  const totalOrders = period === '7d' ? data.week.orders : data.month.orders
  const aov = period === '7d' ? data.week.aov : data.month.aov

  // Peak day
  const peakDay = [...chartData].sort((a, b) => b.revenue - a.revenue)[0]

  // Revenue distribution: rough peak (11am-2pm, 5pm-8pm) vs off-peak
  // We can't split by hour without that data, so we'll show a simple note
  const avgDaily = totalRevenue / (period === '7d' ? 7 : 30)
  const daysAboveAvg = chartData.filter(d => d.revenue > avgDaily).length

  return (
    <main className="min-h-screen bg-stone-950 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-950/95 backdrop-blur-sm border-b border-stone-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-white text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Revenue</h1>
          <div className="flex gap-1 bg-stone-900 rounded-xl p-0.5 border border-stone-800">
            {(['7d', '30d'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all ${period === p ? 'bg-amber-500 text-stone-900' : 'text-stone-400'}`}>
                {p === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3">
            <p className="text-amber-400 text-xl font-bold font-sans tabular-nums">{fmt(totalRevenue)}</p>
            <p className="text-stone-500 text-[11px] font-sans">Revenue</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3">
            <p className="text-white text-xl font-bold font-sans tabular-nums">{totalOrders}</p>
            <p className="text-stone-500 text-[11px] font-sans">Orders</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3">
            <p className="text-white text-xl font-bold font-sans tabular-nums">${aov.toFixed(0)}</p>
            <p className="text-stone-500 text-[11px] font-sans">Avg Order</p>
          </div>
        </div>

        {/* Revenue trend chart */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-stone-300 text-sm font-bold font-sans">Revenue Trend</p>
            {period === '7d' && (
              <span className={`text-xs font-bold font-sans px-2 py-0.5 rounded-full ${data.week.wowChange >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {data.week.wowChange >= 0 ? '▲' : '▼'} {Math.abs(data.week.wowChange)}% vs prev week
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#78716c', fontSize: 10, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#78716c', fontSize: 10, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#revGrad)" dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Daily bar chart */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <p className="text-stone-300 text-sm font-bold font-sans mb-4">Daily Breakdown</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={period === '7d' ? 28 : 8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#78716c', fontSize: 10, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#78716c', fontSize: 10, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
          <p className="text-stone-300 text-sm font-bold font-sans">Insights</p>

          <div className="flex items-start gap-3">
            <span className="text-lg">🏆</span>
            <div>
              <p className="text-white text-sm font-bold font-sans">Best day: {shortDate(peakDay?.date || '')}</p>
              <p className="text-stone-500 text-xs font-sans">{fmt(peakDay?.revenue || 0)} revenue</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-lg">📈</span>
            <div>
              <p className="text-white text-sm font-bold font-sans">{daysAboveAvg} of {chartData.length} days above average</p>
              <p className="text-stone-500 text-xs font-sans">Average: {fmt(avgDaily)} / day</p>
            </div>
          </div>

          {data.today.vsYesterday !== null && (
            <div className="flex items-start gap-3">
              <span className="text-lg">{data.today.vsYesterday >= 0 ? '⬆️' : '⬇️'}</span>
              <div>
                <p className="text-white text-sm font-bold font-sans">Today: {fmt(data.today.revenue)}</p>
                <p className="text-stone-500 text-xs font-sans">{data.today.vsYesterday >= 0 ? '+' : ''}{data.today.vsYesterday}% vs yesterday</p>
              </div>
            </div>
          )}

          {data.settings.weeklyLabour > 0 && data.settings.monthlyRent > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-lg">🎯</span>
              <div>
                <p className="text-white text-sm font-bold font-sans">Break-even: {fmt(data.today.breakEvenDaily)} / day</p>
                <p className="text-stone-500 text-xs font-sans">
                  {data.today.breakEvenMet ? '✓ Met today' : `${fmt(data.today.breakEvenDaily - data.today.revenue)} still needed today`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* AOV Trend (simplified) */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <p className="text-stone-300 text-sm font-bold font-sans mb-3">Average Order Value</p>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-4xl font-bold text-amber-400 font-sans">${aov.toFixed(2)}</p>
              <p className="text-stone-500 text-xs font-sans mt-1">{period === '7d' ? 'This week' : 'Last 30 days'}</p>
            </div>
            <div className="flex-1">
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] text-stone-500 font-sans mb-1">
                    <span>AOV</span>
                    <span>${aov.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, (aov / 50) * 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-stone-500 font-sans mb-1">
                    <span>Target</span>
                    <span>$35–50</span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-2">
                    <div className="bg-stone-600 h-2 rounded-full" style={{ width: '80%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      <OwnerNav />
    </main>
  )
}

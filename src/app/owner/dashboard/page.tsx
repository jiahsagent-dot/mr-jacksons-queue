'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { OwnerNav } from '@/components/OwnerNav'

type Insight = { name: string; qty: number; revenue: number; profit?: number; margin?: number }
type TimeSlot = { hour: number; label: string; orders: number; pct: number }

type Analytics = {
  today: {
    date: string; revenue: number; orders: number; revPASH: number
    vsYesterday: number | null; breakEvenDaily: number; breakEvenMet: boolean
  }
  week: {
    revenue: number; orders: number; aov: number; wowChange: number
    covers: number; coversPerDay: number; tableTurnover: number
  }
  month: { revenue: number; orders: number; aov: number }
  costs: {
    labourPct: number; cogsPct: number; rentPct: number; primeCost: number
    grossMargin: number; netMarginPct: number; weeklyLabour: number; monthlyRent: number
  }
  bookings: { cancellationRate: number; coversPerDay: number; totalCancelled30d: number; totalConfirmed30d: number }
  insights: {
    popularTimes: TimeSlot[]
    popularMeals: Insight[]
    profitableMeals: Insight[]
  }
  metrics: Record<string, { value: number; status: 'green' | 'amber' | 'red'; label: string; target: string }>
  alerts: { key: string; value: number; status: string; label: string; target: string }[]
  settings: { seats: number; hoursOpen: number; cogsPercent: number; weeklyLabour: number; monthlyRent: number; cogsSource?: string; itemsWithCosts?: number; totalMenuItems?: number }
}

function fmt(n: number, prefix = '$') {
  if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}k`
  return `${prefix}${n.toFixed(0)}`
}

// ── Theme helpers ─────────────────────────────────────────────────────────────
function useTheme() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('owner_theme')
    if (saved === 'light') setIsDark(false)
  }, [])

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev
      localStorage.setItem('owner_theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  return { isDark, toggle }
}

// Builds a theme object so we never repeat ternaries inline
function makeTheme(isDark: boolean) {
  return {
    page:    isDark ? 'bg-stone-950'                                      : 'bg-gray-50',
    header:  isDark ? 'bg-stone-950/95 border-stone-800'                  : 'bg-white/95 border-gray-200',
    title:   isDark ? 'text-white'                                        : 'text-gray-900',
    sub:     isDark ? 'text-stone-500'                                    : 'text-gray-400',
    label:   isDark ? 'text-stone-400'                                    : 'text-gray-500',
    card:    isDark ? 'bg-stone-900 border-stone-800'                     : 'bg-white border-gray-200',
    cardAlt: isDark ? 'bg-stone-800'                                      : 'bg-gray-100',
    bigNum:  isDark ? 'text-white'                                        : 'text-gray-900',
    btn:     isDark ? 'text-stone-400 bg-stone-900 border-stone-700 hover:border-stone-500' : 'text-gray-500 bg-gray-100 border-gray-300 hover:border-gray-400',
    divider: isDark ? 'border-stone-800'                                  : 'border-gray-100',
    bar:     isDark ? 'bg-stone-800'                                      : 'bg-gray-200',
    input:   isDark ? 'bg-stone-800 text-white border-stone-700 focus:border-amber-500'     : 'bg-gray-100 text-gray-900 border-gray-300 focus:border-amber-500',
    modal:   isDark ? 'bg-stone-900'                                      : 'bg-white',
    modalOverlay: isDark ? 'bg-black/70'                                  : 'bg-black/40',
    handle:  isDark ? 'bg-stone-700'                                      : 'bg-gray-300',
    mLabel:  isDark ? 'text-stone-400'                                    : 'text-gray-500',
    alertBg: isDark ? 'bg-red-950/50 border-red-800'                     : 'bg-red-50 border-red-200',
    alertTitle: isDark ? 'text-red-400'                                   : 'text-red-600',
    alertRow: isDark ? 'text-red-300'                                     : 'text-red-700',
    alertVal: isDark ? 'text-red-400'                                     : 'text-red-600',
    alertSub: isDark ? 'text-red-600'                                     : 'text-red-400',
    rank1:   isDark ? 'text-amber-400'                                    : 'text-amber-600',
    rankDot: isDark ? 'bg-amber-500'                                      : 'bg-amber-500',
    profit:  isDark ? 'text-green-400'                                    : 'text-green-600',
    profitSub: isDark ? 'text-green-600'                                  : 'text-green-400',
    navLink: isDark
      ? 'bg-stone-900 border-stone-700 hover:border-amber-500'
      : 'bg-white border-gray-200 hover:border-amber-500',
    navText: isDark ? 'text-white'                                        : 'text-gray-900',
    navSub:  isDark ? 'text-stone-500'                                    : 'text-gray-400',
  }
}

const STATUS_COLOR_DARK = {
  green: 'text-green-400 bg-green-900/30 border-green-800',
  amber: 'text-amber-400 bg-amber-900/30 border-amber-800',
  red:   'text-red-400 bg-red-900/30 border-red-800',
}
const STATUS_COLOR_LIGHT = {
  green: 'text-green-700 bg-green-50 border-green-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-200',
  red:   'text-red-700 bg-red-50 border-red-200',
}
const STATUS_DOT = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500 animate-pulse' }
const STATUS_EMOJI = { green: '🟢', amber: '🟡', red: '🔴' }

function MetricCard({ label, value, unit = '%', status, target, sub, isDark }:
  { label: string; value: number; unit?: string; status: 'green' | 'amber' | 'red'; target: string; sub?: string; isDark: boolean }) {
  const col = isDark ? STATUS_COLOR_DARK[status] : STATUS_COLOR_LIGHT[status]
  return (
    <div className={`rounded-2xl border p-4 ${col}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-bold uppercase tracking-wider font-sans opacity-70">{label}</p>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
      </div>
      <p className="text-2xl font-bold font-sans tabular-nums">{value}{unit}</p>
      <p className="text-[10px] font-sans opacity-60 mt-0.5">Target: {target}</p>
      {sub && <p className="text-[10px] font-sans opacity-60">{sub}</p>}
    </div>
  )
}

export default function OwnerDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    weekly_labour_cost: '', monthly_rent: '', seats: '', hours_open_per_day: '', cogs_percent: ''
  })

  const { isDark, toggle } = useTheme()
  const t = makeTheme(isDark)

  useEffect(() => {
    const tk = sessionStorage.getItem('owner_token')
    if (!tk) router.push('/owner/login')
  }, [router])

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/owner/analytics?_t=${Date.now()}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
      setSettingsForm({
        weekly_labour_cost: String(d.settings.weeklyLabour || ''),
        monthly_rent: String(d.settings.monthlyRent || ''),
        seats: String(d.settings.seats || ''),
        hours_open_per_day: String(d.settings.hoursOpen || ''),
        cogs_percent: String(d.settings.cogsPercent || ''),
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const saveSettings = async () => {
    setSaving(true)
    await fetch('/api/owner/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekly_labour_cost: parseFloat(settingsForm.weekly_labour_cost) || 0,
        monthly_rent: parseFloat(settingsForm.monthly_rent) || 0,
        seats: parseInt(settingsForm.seats) || 40,
        hours_open_per_day: parseFloat(settingsForm.hours_open_per_day) || 10,
        cogs_percent: parseFloat(settingsForm.cogs_percent) || 30,
      }),
    })
    await fetchData()
    setSaving(false)
    setShowSettings(false)
  }

  if (loading) return (
    <main className={`min-h-screen ${t.page} flex items-center justify-center`}>
      <div className="w-8 h-8 border-2 border-stone-700 border-t-amber-500 rounded-full animate-spin" />
    </main>
  )

  if (!data) return null

  const { today, week, month, costs, bookings, metrics, alerts, insights } = data
  const { popularTimes, popularMeals, profitableMeals } = insights || { popularTimes: [], popularMeals: [], profitableMeals: [] }

  // Sort popular times by order count for display, take top 6
  const topTimes = [...popularTimes].sort((a, b) => b.orders - a.orders).slice(0, 6)
  const maxOrders = Math.max(...topTimes.map(t => t.orders), 1)

  return (
    <main className={`min-h-screen ${t.page} pb-28 transition-colors duration-200`}>

      {/* Header */}
      <div className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 py-3 ${t.header}`}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className={`${t.title} text-lg font-bold`} style={{ fontFamily: "'Playfair Display', serif" }}>Dashboard</h1>
            <p className={`${t.sub} text-xs font-sans`}>{today.date}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className={`text-sm px-3 py-1.5 rounded-xl border transition-colors ${t.btn}`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => setShowSettings(true)} className={`text-sm font-sans px-3 py-1.5 rounded-xl border transition-colors ${t.btn}`}>
              ⚙️ Costs
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className={`rounded-2xl border p-4 ${t.alertBg}`}>
            <p className={`${t.alertTitle} text-xs font-bold uppercase tracking-wider font-sans mb-2`}>🚨 Needs Attention</p>
            <div className="space-y-1.5">
              {alerts.map(a => (
                <div key={a.key} className="flex items-center justify-between">
                  <span className={`${t.alertRow} text-sm font-sans`}>{a.label}</span>
                  <span className={`${t.alertVal} text-sm font-bold font-sans`}>
                    {a.value}% <span className={`${t.alertSub} text-xs`}>(target {a.target})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today snapshot */}
        <div className={`rounded-2xl border p-4 ${t.card}`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`${t.label} text-xs font-bold uppercase tracking-wider font-sans`}>Today</p>
            {today.vsYesterday !== null && (
              <span className={`text-xs font-bold font-sans px-2 py-0.5 rounded-full ${today.vsYesterday >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {today.vsYesterday >= 0 ? '▲' : '▼'} {Math.abs(today.vsYesterday)}% vs yesterday
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className={`text-3xl font-bold font-sans ${t.bigNum}`}>{fmt(today.revenue)}</p>
              <p className={`${t.sub} text-xs font-sans`}>Revenue</p>
            </div>
            <div>
              <p className={`text-3xl font-bold font-sans ${t.bigNum}`}>{today.orders}</p>
              <p className={`${t.sub} text-xs font-sans`}>Orders</p>
            </div>
            <div>
              <p className={`text-3xl font-bold font-sans ${t.bigNum}`}>${today.revPASH.toFixed(2)}</p>
              <p className={`${t.sub} text-xs font-sans`}>RevPASH</p>
            </div>
          </div>
          {today.breakEvenDaily > 0 && (
            <div className={`mt-3 pt-3 border-t ${t.divider}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`${t.label} text-xs font-sans`}>Break-even</span>
                <span className={`text-xs font-bold font-sans ${today.breakEvenMet ? 'text-green-400' : 'text-amber-400'}`}>
                  {today.breakEvenMet ? '✓ Met' : `${fmt(today.revenue)} / ${fmt(today.breakEvenDaily)}`}
                </span>
              </div>
              <div className={`w-full ${t.bar} rounded-full h-1.5`}>
                <div
                  className={`h-1.5 rounded-full transition-all ${today.breakEvenMet ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, today.breakEvenDaily > 0 ? (today.revenue / today.breakEvenDaily) * 100 : 0)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* This week */}
        <div className={`rounded-2xl border p-4 ${t.card}`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`${t.label} text-xs font-bold uppercase tracking-wider font-sans`}>This Week</p>
            <span className={`text-xs font-bold font-sans px-2 py-0.5 rounded-full ${week.wowChange >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {week.wowChange >= 0 ? '▲' : '▼'} {Math.abs(week.wowChange)}% WoW
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className={`text-2xl font-bold font-sans ${t.bigNum}`}>{fmt(week.revenue)}</p>
              <p className={`${t.sub} text-xs font-sans`}>Revenue</p>
            </div>
            <div>
              <p className={`text-2xl font-bold font-sans ${t.bigNum}`}>${week.aov.toFixed(0)}</p>
              <p className={`${t.sub} text-xs font-sans`}>Avg Order</p>
            </div>
            <div>
              <p className={`text-2xl font-bold font-sans ${t.bigNum}`}>{week.coversPerDay.toFixed(0)}</p>
              <p className={`${t.sub} text-xs font-sans`}>Covers/day</p>
            </div>
          </div>
        </div>

        {/* This month */}
        <div className={`rounded-2xl border p-4 ${t.card}`}>
          <p className={`${t.label} text-xs font-bold uppercase tracking-wider font-sans mb-3`}>Last 30 Days</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className={`text-2xl font-bold font-sans ${t.bigNum}`}>{fmt(month.revenue)}</p>
              <p className={`${t.sub} text-xs font-sans`}>Revenue</p>
            </div>
            <div>
              <p className={`text-2xl font-bold font-sans ${t.bigNum}`}>{month.orders}</p>
              <p className={`${t.sub} text-xs font-sans`}>Orders</p>
            </div>
            <div>
              <p className={`text-2xl font-bold font-sans ${t.bigNum}`}>${month.aov.toFixed(0)}</p>
              <p className={`${t.sub} text-xs font-sans`}>Avg Order</p>
            </div>
          </div>
        </div>

        {/* ── Popular Times ─────────────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-4 ${t.card}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`${t.label} text-xs font-bold uppercase tracking-wider font-sans`}>🕐 Popular Times</p>
            <span className={`${t.sub} text-[10px] font-sans`}>Last 30 days</span>
          </div>
          {topTimes.length === 0 ? (
            <p className={`${t.sub} text-sm font-sans text-center py-2`}>Not enough data yet</p>
          ) : (
            <div className="space-y-2.5">
              {topTimes.map((slot, i) => (
                <div key={slot.hour} className="flex items-center gap-3">
                  <span className={`text-[11px] font-bold font-sans w-10 shrink-0 ${i === 0 ? t.rank1 : t.label}`}>
                    {slot.label}
                  </span>
                  <div className="flex-1 relative">
                    <div className={`w-full h-5 ${t.bar} rounded-full overflow-hidden`}>
                      <div
                        className={`h-full rounded-full transition-all ${i === 0 ? 'bg-amber-500' : isDark ? 'bg-stone-600' : 'bg-gray-400'}`}
                        style={{ width: `${(slot.orders / maxOrders) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold font-sans w-12 text-right shrink-0 ${i === 0 ? t.rank1 : t.label}`}>
                    {slot.orders} {slot.orders === 1 ? 'order' : 'orders'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Popular Meals ─────────────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-4 ${t.card}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`${t.label} text-xs font-bold uppercase tracking-wider font-sans`}>🍽️ Popular Meals</p>
            <span className={`${t.sub} text-[10px] font-sans`}>Last 30 days</span>
          </div>
          {popularMeals.length === 0 ? (
            <p className={`${t.sub} text-sm font-sans text-center py-2`}>Not enough data yet</p>
          ) : (
            <div className="space-y-3">
              {popularMeals.map((meal, i) => (
                <div key={meal.name} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold font-sans ${
                    i === 0 ? 'bg-amber-500 text-stone-900' : `${t.cardAlt} ${t.label}`
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`${t.bigNum} text-sm font-semibold font-sans truncate`}>{meal.name}</p>
                    <p className={`${t.sub} text-[10px] font-sans`}>{fmt(meal.revenue)} revenue</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`${i === 0 ? t.rank1 : t.bigNum} text-sm font-bold font-sans`}>{meal.qty}</p>
                    <p className={`${t.sub} text-[10px] font-sans`}>sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Most Profitable Meals ─────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-4 ${t.card}`}>
          <div className="flex items-center justify-between mb-4">
            <p className={`${t.label} text-xs font-bold uppercase tracking-wider font-sans`}>💰 Most Profitable Meals</p>
            <span className={`${t.sub} text-[10px] font-sans`}>Last 30 days</span>
          </div>
          {profitableMeals.length === 0 ? (
            <p className={`${t.sub} text-sm font-sans text-center py-2`}>
              {data.settings.itemsWithCosts && data.settings.itemsWithCosts < 3
                ? '⚠️ Set item costs in Menu to enable profit tracking'
                : 'Not enough data yet'}
            </p>
          ) : (
            <div className="space-y-3">
              {profitableMeals.map((meal, i) => (
                <div key={meal.name} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold font-sans ${
                    i === 0 ? 'bg-green-500 text-white' : `${t.cardAlt} ${t.label}`
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`${t.bigNum} text-sm font-semibold font-sans truncate`}>{meal.name}</p>
                    <p className={`${t.sub} text-[10px] font-sans`}>{meal.margin}% margin · {meal.qty} sold</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`${i === 0 ? t.profit : t.profit} text-sm font-bold font-sans`}>{fmt(meal.profit!)}</p>
                    <p className={`${t.sub} text-[10px] font-sans`}>profit</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.settings.cogsSource === 'manual' && profitableMeals.length > 0 && (
            <div className={`mt-3 pt-3 border-t ${t.divider}`}>
              <Link href="/owner/menu" className="text-amber-500 text-[11px] font-sans">
                ⚙️ Set individual item costs for accurate profit data →
              </Link>
            </div>
          )}
        </div>

        {/* Health Scorecard */}
        <div>
          <p className={`${t.label} text-xs font-bold uppercase tracking-wider font-sans mb-2`}>Health Scorecard</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(metrics).map(([key, m]) => (
              <MetricCard key={key} label={m.label} value={m.value} status={m.status} target={m.target} isDark={isDark} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {(costs.weeklyLabour === 0 && costs.monthlyRent === 0) && (
              <p className="text-amber-500 text-xs font-sans text-center w-full">
                ⚠️ Tap ⚙️ Costs above to enter your labour & rent
              </p>
            )}
            {data.settings.cogsSource === 'live' ? (
              <span className="text-green-400 text-[11px] font-sans bg-green-900/30 px-2 py-0.5 rounded-full">
                ✓ COGS from {data.settings.itemsWithCosts} live item costs
              </span>
            ) : (
              <Link href="/owner/menu" className="text-amber-500 text-[11px] font-sans bg-amber-900/30 px-2 py-0.5 rounded-full">
                ⚙️ Set item costs for live COGS →
              </Link>
            )}
          </div>
        </div>

        {/* Bookings health */}
        <div className={`rounded-2xl border p-4 ${t.card}`}>
          <p className={`${t.label} text-xs font-bold uppercase tracking-wider font-sans mb-3`}>Bookings (30 days)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={`text-2xl font-bold font-sans ${t.bigNum}`}>{bookings.cancellationRate}%</p>
              <p className={`${t.sub} text-xs font-sans`}>Cancellation Rate</p>
              <span className={`text-[10px] font-bold font-sans mt-1 inline-block ${metrics.cancellationRate?.status === 'green' ? 'text-green-400' : metrics.cancellationRate?.status === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>
                {STATUS_EMOJI[metrics.cancellationRate?.status || 'green']} {metrics.cancellationRate?.status === 'green' ? 'Healthy' : metrics.cancellationRate?.status === 'amber' ? 'Watch' : 'High'}
              </span>
            </div>
            <div>
              <p className={`text-2xl font-bold font-sans ${t.bigNum}`}>{bookings.coversPerDay.toFixed(1)}</p>
              <p className={`${t.sub} text-xs font-sans`}>Covers / Day</p>
            </div>
          </div>
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/owner/revenue" className={`rounded-2xl border p-4 transition-all ${t.navLink}`}>
            <p className="text-xl mb-1">💰</p>
            <p className={`${t.navText} text-sm font-bold font-sans`}>Revenue</p>
            <p className={`${t.navSub} text-xs font-sans`}>Charts & trends</p>
          </Link>
          <Link href="/owner/costs" className={`rounded-2xl border p-4 transition-all ${t.navLink}`}>
            <p className="text-xl mb-1">📉</p>
            <p className={`${t.navText} text-sm font-bold font-sans`}>Costs</p>
            <p className={`${t.navSub} text-xs font-sans`}>Prime cost, margins</p>
          </Link>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className={`fixed inset-0 z-50 ${t.modalOverlay} flex items-end`} onClick={() => setShowSettings(false)}>
          <div className={`${t.modal} rounded-t-3xl p-5 w-full max-w-lg mx-auto`} onClick={e => e.stopPropagation()}>
            <div className={`w-10 h-1 rounded-full ${t.handle} mx-auto mb-4`} />
            <h3 className={`${t.title} font-bold text-lg mb-4 font-sans`}>Business Costs</h3>
            <div className="space-y-3">
              {[
                { key: 'weekly_labour_cost', label: 'Weekly Labour Cost ($)', placeholder: 'e.g. 4000' },
                { key: 'monthly_rent', label: 'Monthly Rent ($)', placeholder: 'e.g. 6000' },
                { key: 'cogs_percent', label: 'COGS % (food + bev cost estimate)', placeholder: 'e.g. 30' },
                { key: 'seats', label: 'Total Seats', placeholder: 'e.g. 40' },
                { key: 'hours_open_per_day', label: 'Hours Open per Day', placeholder: 'e.g. 10' },
              ].map(f => (
                <div key={f.key}>
                  <label className={`block ${t.mLabel} text-[11px] font-bold uppercase tracking-wider font-sans mb-1`}>{f.label}</label>
                  <input
                    type="number"
                    value={settingsForm[f.key as keyof typeof settingsForm]}
                    onChange={e => setSettingsForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-sans border focus:outline-none transition-colors ${t.input}`}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="mt-4 w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-bold py-3.5 rounded-xl text-sm font-sans transition-colors"
            >
              {saving ? 'Saving…' : 'Save & Recalculate'}
            </button>
          </div>
        </div>
      )}

      <OwnerNav />
    </main>
  )
}

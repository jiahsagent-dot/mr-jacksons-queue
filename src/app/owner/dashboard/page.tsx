'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { OwnerNav } from '@/components/OwnerNav'

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
  metrics: Record<string, { value: number; status: 'green' | 'amber' | 'red'; label: string; target: string }>
  alerts: { key: string; value: number; status: string; label: string; target: string }[]
  settings: { seats: number; hoursOpen: number; cogsPercent: number; weeklyLabour: number; monthlyRent: number; cogsSource?: string; itemsWithCosts?: number; totalMenuItems?: number }
}

const STATUS_COLOR = {
  green: 'text-green-600 bg-green-50 border-green-200',
  amber: 'text-amber-600 bg-amber-50 border-amber-200',
  red: 'text-red-600 bg-red-50 border-red-200',
}
const STATUS_DOT = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500 animate-pulse' }
const STATUS_EMOJI = { green: '🟢', amber: '🟡', red: '🔴' }

function fmt(n: number, prefix = '$') {
  if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}k`
  return `${prefix}${n.toFixed(0)}`
}

function MetricCard({ label, value, unit = '%', status, target, sub }:
  { label: string; value: number; unit?: string; status: 'green' | 'amber' | 'red'; target: string; sub?: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${STATUS_COLOR[status]}`}>
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

  useEffect(() => {
    const t = sessionStorage.getItem('owner_token')
    if (!t) router.push('/owner/login')
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
    <main className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-stone-700 border-t-amber-500 rounded-full animate-spin" />
    </main>
  )

  if (!data) return null

  const { today, week, month, costs, bookings, metrics, alerts } = data

  return (
    <main className="min-h-screen bg-stone-950 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-950/95 backdrop-blur-sm border-b border-stone-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Dashboard</h1>
            <p className="text-stone-500 text-xs font-sans">{today.date}</p>
          </div>
          <button onClick={() => setShowSettings(true)} className="text-stone-400 text-sm font-sans px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 hover:border-stone-500">
            ⚙️ Costs
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-red-950/50 border border-red-800 rounded-2xl p-4">
            <p className="text-red-400 text-xs font-bold uppercase tracking-wider font-sans mb-2">🚨 Needs Attention</p>
            <div className="space-y-1.5">
              {alerts.map(a => (
                <div key={a.key} className="flex items-center justify-between">
                  <span className="text-red-300 text-sm font-sans">{a.label}</span>
                  <span className="text-red-400 text-sm font-bold font-sans">{a.value}% <span className="text-red-600 text-xs">(target {a.target})</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today snapshot */}
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-stone-400 text-xs font-bold uppercase tracking-wider font-sans">Today</p>
            {today.vsYesterday !== null && (
              <span className={`text-xs font-bold font-sans px-2 py-0.5 rounded-full ${today.vsYesterday >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {today.vsYesterday >= 0 ? '▲' : '▼'} {Math.abs(today.vsYesterday)}% vs yesterday
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-3xl font-bold text-white font-sans">{fmt(today.revenue)}</p>
              <p className="text-stone-500 text-xs font-sans">Revenue</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white font-sans">{today.orders}</p>
              <p className="text-stone-500 text-xs font-sans">Orders</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white font-sans">${today.revPASH.toFixed(2)}</p>
              <p className="text-stone-500 text-xs font-sans">RevPASH</p>
            </div>
          </div>
          {today.breakEvenDaily > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-stone-400 text-xs font-sans">Break-even</span>
                <span className={`text-xs font-bold font-sans ${today.breakEvenMet ? 'text-green-400' : 'text-amber-400'}`}>
                  {today.breakEvenMet ? '✓ Met' : `${fmt(today.revenue)} / ${fmt(today.breakEvenDaily)}`}
                </span>
              </div>
              <div className="w-full bg-stone-800 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${today.breakEvenMet ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, today.breakEvenDaily > 0 ? (today.revenue / today.breakEvenDaily) * 100 : 0)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* This week */}
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-stone-400 text-xs font-bold uppercase tracking-wider font-sans">This Week</p>
            <span className={`text-xs font-bold font-sans px-2 py-0.5 rounded-full ${week.wowChange >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {week.wowChange >= 0 ? '▲' : '▼'} {Math.abs(week.wowChange)}% WoW
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xl font-bold text-white font-sans">{fmt(week.revenue)}</p>
              <p className="text-stone-500 text-xs font-sans">Revenue</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-sans">${week.aov.toFixed(0)}</p>
              <p className="text-stone-500 text-xs font-sans">Avg Order</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-sans">{week.coversPerDay.toFixed(0)}</p>
              <p className="text-stone-500 text-xs font-sans">Covers/day</p>
            </div>
          </div>
        </div>

        {/* This month */}
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4">
          <p className="text-stone-400 text-xs font-bold uppercase tracking-wider font-sans mb-3">Last 30 Days</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xl font-bold text-white font-sans">{fmt(month.revenue)}</p>
              <p className="text-stone-500 text-xs font-sans">Revenue</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-sans">{month.orders}</p>
              <p className="text-stone-500 text-xs font-sans">Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-sans">${month.aov.toFixed(0)}</p>
              <p className="text-stone-500 text-xs font-sans">Avg Order</p>
            </div>
          </div>
        </div>

        {/* Health Scorecard */}
        <div>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-wider font-sans mb-2">Health Scorecard</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(metrics).map(([key, m]) => (
              <MetricCard key={key} label={m.label} value={m.value} status={m.status} target={m.target} />
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
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4">
          <p className="text-stone-400 text-xs font-bold uppercase tracking-wider font-sans mb-3">Bookings (30 days)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xl font-bold text-white font-sans">{bookings.cancellationRate}%</p>
              <p className="text-stone-500 text-xs font-sans">Cancellation Rate</p>
              <span className={`text-[10px] font-bold font-sans mt-1 inline-block ${metrics.cancellationRate?.status === 'green' ? 'text-green-400' : metrics.cancellationRate?.status === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>
                {STATUS_EMOJI[metrics.cancellationRate?.status || 'green']} {metrics.cancellationRate?.status === 'green' ? 'Healthy' : metrics.cancellationRate?.status === 'amber' ? 'Watch' : 'High'}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-sans">{bookings.coversPerDay.toFixed(1)}</p>
              <p className="text-stone-500 text-xs font-sans">Covers / Day</p>
            </div>
          </div>
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/owner/revenue" className="bg-stone-900 border border-stone-700 rounded-2xl p-4 hover:border-amber-500 transition-all">
            <p className="text-xl mb-1">💰</p>
            <p className="text-white text-sm font-bold font-sans">Revenue</p>
            <p className="text-stone-500 text-xs font-sans">Charts & trends</p>
          </Link>
          <Link href="/owner/costs" className="bg-stone-900 border border-stone-700 rounded-2xl p-4 hover:border-amber-500 transition-all">
            <p className="text-xl mb-1">📉</p>
            <p className="text-white text-sm font-bold font-sans">Costs</p>
            <p className="text-stone-500 text-xs font-sans">Prime cost, margins</p>
          </Link>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setShowSettings(false)}>
          <div className="bg-stone-900 rounded-t-3xl p-5 w-full max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-stone-700 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-4 font-sans">Business Costs</h3>
            <div className="space-y-3">
              {[
                { key: 'weekly_labour_cost', label: 'Weekly Labour Cost ($)', placeholder: 'e.g. 4000' },
                { key: 'monthly_rent', label: 'Monthly Rent ($)', placeholder: 'e.g. 6000' },
                { key: 'cogs_percent', label: 'COGS % (food + bev cost estimate)', placeholder: 'e.g. 30' },
                { key: 'seats', label: 'Total Seats', placeholder: 'e.g. 40' },
                { key: 'hours_open_per_day', label: 'Hours Open per Day', placeholder: 'e.g. 10' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-stone-400 text-[11px] font-bold uppercase tracking-wider font-sans mb-1">{f.label}</label>
                  <input
                    type="number"
                    value={settingsForm[f.key as keyof typeof settingsForm]}
                    onChange={e => setSettingsForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-stone-800 text-white border border-stone-700 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none focus:border-amber-500"
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

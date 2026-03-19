'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { OwnerNav } from '@/components/OwnerNav'

type Analytics = {
  bookings: { cancellationRate: number; coversPerDay: number; totalCancelled30d: number; totalConfirmed30d: number }
  week: { covers: number; coversPerDay: number; tableTurnover: number }
  metrics: Record<string, { value: number; status: 'green' | 'amber' | 'red'; label: string; target: string }>
  settings: { seats: number }
}

const STATUS_COLOR = { green: 'text-green-400', amber: 'text-amber-400', red: 'text-red-400' }
const STATUS_BG = { green: 'bg-green-900/40 border-green-800', amber: 'bg-amber-900/40 border-amber-800', red: 'bg-red-900/40 border-red-800' }

export default function BookingsPage() {
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
  const { bookings, week, metrics, settings } = data
  const cancStatus = metrics.cancellationRate?.status || 'green'

  return (
    <main className="min-h-screen bg-stone-950 pb-28">
      <div className="sticky top-0 z-10 bg-stone-950/95 backdrop-blur-sm border-b border-stone-800 px-4 py-3">
        <h1 className="text-white text-lg font-bold max-w-lg mx-auto" style={{ fontFamily: "'Playfair Display', serif" }}>Bookings</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* Cancellation rate */}
        <div className={`rounded-2xl border p-4 ${STATUS_BG[cancStatus]}`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-stone-300 text-sm font-bold font-sans">Cancellation Rate</p>
            <span className={`text-3xl font-bold font-sans tabular-nums ${STATUS_COLOR[cancStatus]}`}>{bookings.cancellationRate}%</span>
          </div>
          <p className="text-stone-500 text-xs font-sans">Last 30 days · Target: &lt;10%</p>
          <div className="w-full bg-stone-800 rounded-full h-2 mt-2">
            <div className={`h-2 rounded-full ${cancStatus === 'green' ? 'bg-green-500' : cancStatus === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, bookings.cancellationRate * 5)}%` }} />
          </div>
        </div>

        {/* Booking counts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <p className="text-3xl font-bold text-white font-sans">{bookings.totalConfirmed30d}</p>
            <p className="text-stone-500 text-xs font-sans mt-1">Confirmed (30d)</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <p className="text-3xl font-bold text-white font-sans">{bookings.totalCancelled30d}</p>
            <p className="text-stone-500 text-xs font-sans mt-1">Cancelled (30d)</p>
          </div>
        </div>

        {/* Covers & turnover */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <p className="text-stone-300 text-sm font-bold font-sans mb-3">This Week</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xl font-bold text-white font-sans">{week.covers}</p>
              <p className="text-stone-500 text-xs font-sans">Total covers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-sans">{week.coversPerDay.toFixed(1)}</p>
              <p className="text-stone-500 text-xs font-sans">Covers / day</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-sans">{week.tableTurnover.toFixed(2)}x</p>
              <p className="text-stone-500 text-xs font-sans">Table turnover</p>
            </div>
          </div>
          <p className="text-stone-600 text-[11px] font-sans mt-3">Table turnover = covers ÷ {settings.seats} seats per day</p>
        </div>

        {/* Info note on no-shows */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <p className="text-stone-300 text-sm font-bold font-sans mb-2">No-Show Tracking</p>
          <p className="text-stone-500 text-sm font-sans leading-relaxed">
            No-shows are automatically handled — bookings without a paid order after the cancellation window are <strong className="text-stone-300">deleted and the table is freed</strong> automatically. Historical no-show logs are not currently stored.
          </p>
        </div>

      </div>
      <OwnerNav />
    </main>
  )
}

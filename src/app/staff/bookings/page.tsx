'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { StaffNav } from '@/components/StaffNav'

type Booking = {
  id: string
  customer_name: string
  phone: string
  party_size: number
  date: string
  time_slot: string
  table_number?: number
  status: string
  code?: string
  created_at: string
  notes?: string
  confirmed_at?: string | null
}

function formatTime(slot: string): string {
  const [h, m] = slot.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatDateLong(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-amber-50 border-amber-200 text-amber-700',
  seated: 'bg-green-50 border-green-200 text-green-700',
  cancelled: 'bg-red-50 border-red-200 text-red-400',
  no_show: 'bg-stone-50 border-stone-200 text-stone-400',
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: '✓ Confirmed',
  seated: '🪑 Seated',
  cancelled: '✗ Cancelled',
  no_show: '⚠️ No Show',
}

function isToday(d: string): boolean {
  return d === new Date().toISOString().split('T')[0]
}

function isFuture(d: string): boolean {
  return d > new Date().toISOString().split('T')[0]
}

function isPast(d: string): boolean {
  return d < new Date().toISOString().split('T')[0]
}

export default function StaffBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'today' | 'upcoming' | 'past'>('today')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [checkingInId, setCheckingInId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = sessionStorage.getItem('staff_token')
    if (!t) router.push('/staff/login')
  }, [router])

  const fetchBookings = async () => {
    try {
      const res = await fetch(`/api/bookings?_t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      setBookings(data.bookings || [])
    } catch {
      toast.error('Could not load bookings')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBookings()
    const interval = setInterval(fetchBookings, 30000)
    return () => clearInterval(interval)
  }, [])

  const manualCheckIn = async (booking: Booking) => {
    setCheckingInId(booking.id)
    try {
      const res = await fetch('/api/bookings/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      })
      if (res.ok) {
        toast.success(`${booking.customer_name} checked in ✓`)
        fetchBookings()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Check-in failed')
      }
    } catch {
      toast.error('Network error')
    }
    setCheckingInId(null)
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        toast.success(`Booking ${STATUS_LABEL[status] || status}`)
        fetchBookings()
      } else {
        const text = await res.text()
        let msg = 'Failed to update'
        try { msg = JSON.parse(text).error || msg } catch { msg = text || msg }
        console.error('updateStatus error', res.status, msg)
        toast.error(msg)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error — try again')
    }
    setUpdatingId(null)
  }

  const filtered = bookings.filter(b => {
    const matchSearch = !search ||
      b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search) ||
      (b.code || '').toLowerCase().includes(search.toLowerCase())

    if (!matchSearch) return false

    if (view === 'today') return isToday(b.date)
    if (view === 'upcoming') return isFuture(b.date)
    if (view === 'past') return isPast(b.date)
    return true
  }).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.time_slot.localeCompare(b.time_slot)
  })

  const todayCount = bookings.filter(b => isToday(b.date) && b.status !== 'cancelled').length
  const upcomingCount = bookings.filter(b => isFuture(b.date) && b.status !== 'cancelled').length
  const todaySeated = bookings.filter(b => isToday(b.date) && b.status === 'seated').length
  const todayRevenue = 0 // could be computed from linked orders

  // Group by date for past/upcoming views
  const grouped = filtered.reduce((acc, b) => {
    if (!acc[b.date]) acc[b.date] = []
    acc[b.date].push(b)
    return acc
  }, {} as Record<string, Booking[]>)

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen bg-[#faf8f5] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#faf8f5]/95 backdrop-blur-sm border-b border-stone-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>Bookings</h1>
            <p className="text-xs text-stone-400 font-sans">{todayCount} today · {upcomingCount} upcoming</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-stone-300 font-sans">Live</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">

        {/* Today stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-amber-700 font-sans">{todayCount}</p>
            <p className="text-[9px] text-amber-600 font-semibold uppercase tracking-wide font-sans">Today</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-700 font-sans">{todaySeated}</p>
            <p className="text-[9px] text-green-600 font-semibold uppercase tracking-wide font-sans">Seated</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-stone-700 font-sans">{upcomingCount}</p>
            <p className="text-[9px] text-stone-400 font-semibold uppercase tracking-wide font-sans">Upcoming</p>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search name, phone or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm font-sans focus:outline-none focus:border-stone-400"
        />

        {/* View tabs */}
        <div className="flex gap-2">
          {(['today', 'upcoming', 'past'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all font-sans capitalize ${view === v ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200'}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Bookings list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="font-medium text-stone-500 font-sans">No {view} bookings</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dayBookings]) => (
              <div key={date}>
                {/* Date header — only show for upcoming/past */}
                {view !== 'today' && (
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 font-sans">
                    {formatDateLong(date)}
                  </p>
                )}
                <div className="space-y-3">
                  {dayBookings.map(booking => (
                    <div key={booking.id} className={`bg-white rounded-2xl border-2 p-4 transition-all ${booking.status === 'cancelled' ? 'opacity-50' : ''}`}>
                      {/* Top row */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-stone-900">{booking.customer_name}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border font-sans ${STATUS_STYLE[booking.status] || 'bg-stone-50 border-stone-200 text-stone-400'}`}>
                              {STATUS_LABEL[booking.status] || booking.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-sm font-semibold text-stone-700 font-sans">
                              {formatTime(booking.time_slot)}
                            </span>
                            <span className="text-stone-300">·</span>
                            <span className="text-sm text-stone-500 font-sans">
                              {booking.party_size} {booking.party_size === 1 ? 'person' : 'people'}
                            </span>
                            {booking.table_number && (
                              <>
                                <span className="text-stone-300">·</span>
                                <span className="text-xs font-bold bg-stone-800 text-white px-2 py-0.5 rounded-lg font-sans">
                                  Table {booking.table_number}
                                </span>
                              </>
                            )}
                          </div>
                          <a href={`tel:${booking.phone}`} className="text-xs text-stone-400 font-sans hover:text-stone-600 mt-0.5 block">
                            📞 {booking.phone}
                          </a>
                          {booking.code && (
                            <p className="text-[10px] text-stone-300 font-sans mt-0.5">Code: {booking.code}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-stone-400 font-sans flex-shrink-0 ml-2">
                          {formatDate(booking.date)}
                        </div>
                      </div>

                      {booking.notes && (
                        <div className="mb-3 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide font-sans mb-0.5">Notes</p>
                          <p className="text-xs text-stone-600 font-sans">{booking.notes}</p>
                        </div>
                      )}

                      {/* Confirmed badge + actions */}
                      {booking.status !== 'cancelled' && (
                        <div className="space-y-2">
                          {/* Check-in status */}
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold font-sans ${
                            booking.confirmed_at
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-stone-50 border-stone-200 text-stone-400'
                          }`}>
                            <span>{booking.confirmed_at ? '✓' : '⏳'}</span>
                            <span>
                              {booking.confirmed_at
                                ? `Customer checked in`
                                : 'Not checked in yet'}
                            </span>
                          </div>

                          {/* Manual check-in button — only if not yet confirmed */}
                          {!booking.confirmed_at && booking.status === 'confirmed' && (
                            <button
                              onClick={() => manualCheckIn(booking)}
                              disabled={checkingInId === booking.id}
                              className="w-full py-2.5 text-xs rounded-xl bg-green-600 text-white font-semibold font-sans hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {checkingInId === booking.id ? '...' : '✓ Check In Customer'}
                            </button>
                          )}

                          {/* Cancel / No-show */}
                          <div className="flex gap-2">
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={() => { if (confirm(`Mark ${booking.customer_name} as no-show?`)) updateStatus(booking.id, 'no_show') }}
                                disabled={updatingId === booking.id}
                                className="py-2 px-4 text-xs flex-1 rounded-xl bg-stone-100 text-stone-500 font-medium font-sans hover:bg-stone-200 disabled:opacity-50"
                              >
                                ⚠️ No Show
                              </button>
                            )}
                            <button
                              onClick={() => { if (confirm(`Cancel ${booking.customer_name}'s booking?`)) updateStatus(booking.id, 'cancelled') }}
                              disabled={updatingId === booking.id}
                              className="py-2 px-3 text-xs rounded-xl bg-white border border-red-200 text-red-500 font-medium font-sans hover:bg-red-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StaffNav />
    </main>
  )
}

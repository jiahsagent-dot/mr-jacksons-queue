'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'

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
}

// ─── Check-in countdown popup ──────────────────────────────────────────────
// Shows 15 min before → 15 min after booking time (30-min window)
function CheckInPopup({ booking, onCheckedIn }: { booking: Booking; onCheckedIn: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [phase, setPhase] = useState<'before' | 'overdue' | null>(null) // 'before' = before booking, 'overdue' = after
  const [checking, setChecking] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const tick = () => {
      // Parse booking time as local (customer's browser = AU local time)
      const [h, m] = booking.time_slot.split(':').map(Number)
      const bookingMs = new Date(`${booking.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime()
      const nowMs = Date.now()
      const diffSec = (bookingMs - nowMs) / 1000 // positive = booking is in the future

      if (diffSec > 30 * 60) {
        // More than 30 min away — hide
        setPhase(null)
        setSecondsLeft(null)
      } else if (diffSec > 0) {
        // 0–30 min before booking
        setPhase('before')
        setSecondsLeft(Math.ceil(diffSec))
      } else if (diffSec > -15 * 60) {
        // 0–15 min after booking (overdue window)
        setPhase('overdue')
        setSecondsLeft(Math.ceil(15 * 60 + diffSec)) // counts down to release
      } else {
        // More than 15 min past — window closed
        setPhase(null)
        setSecondsLeft(null)
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [booking])

  const handleCheckIn = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/bookings/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      })
      if (res.ok) {
        onCheckedIn()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Check-in failed')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setChecking(false)
  }

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Already checked in or window closed
  if (booking.status === 'seated' || phase === null || dismissed) return null

  return (
    <>
      {/* Backdrop — visible but doesn't block scrolling */}
      <div className="fixed inset-0 z-40 pointer-events-none bg-black/20" />

      {/* Popup card — fixed bottom, not full screen */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 animate-slide-up">
        <div className={`max-w-sm mx-auto rounded-2xl shadow-2xl border-2 overflow-hidden ${
          phase === 'overdue'
            ? 'bg-red-50 border-red-300'
            : 'bg-amber-50 border-amber-300'
        }`}>
          {/* Colour bar at top */}
          <div className={`h-1.5 w-full ${phase === 'overdue' ? 'bg-red-400' : 'bg-amber-400'}`} />

          <div className="p-4">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{phase === 'overdue' ? '⚠️' : '🔔'}</span>
                <div>
                  <p className={`text-sm font-bold font-sans ${phase === 'overdue' ? 'text-red-800' : 'text-amber-900'}`}>
                    {phase === 'overdue' ? 'Check in now!' : 'Almost time!'}
                  </p>
                  <p className={`text-[11px] font-sans ${phase === 'overdue' ? 'text-red-600' : 'text-amber-700'}`}>
                    {phase === 'overdue'
                      ? `Table released in ${formatCountdown(secondsLeft ?? 0)}`
                      : `Your booking starts in ${formatCountdown(secondsLeft ?? 0)}`}
                  </p>
                </div>
              </div>

              {/* Countdown circle */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                phase === 'overdue' ? 'border-red-300 bg-red-100' : 'border-amber-300 bg-amber-100'
              }`}>
                <span className={`text-sm font-bold font-mono tabular-nums ${
                  phase === 'overdue' ? 'text-red-700' : 'text-amber-800'
                }`}>
                  {formatCountdown(secondsLeft ?? 0)}
                </span>
              </div>
            </div>

            {/* Context message */}
            <p className={`text-[12px] font-sans mb-3 leading-relaxed ${
              phase === 'overdue' ? 'text-red-700' : 'text-amber-800'
            }`}>
              {phase === 'overdue'
                ? `Table will be released if no order is placed. Order now to secure your spot!`
                : `When you're seated, place your order within 15 minutes of your booking time to confirm you're here.`}
            </p>

            {/* Buttons */}
            <div className="flex gap-2">
              <a
                href={`/order/new?context=booking&name=${encodeURIComponent((booking as any).customer_name)}&phone=${encodeURIComponent((booking as any).phone)}&date=${(booking as any).date}&time=${(booking as any).time_slot}`}
                className={`flex-1 py-3 rounded-xl text-sm font-bold font-sans text-center transition-all active:scale-[0.97] ${
                  phase === 'overdue'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                🍽️ Order Now
              </a>
              <button
                onClick={() => setDismissed(true)}
                className="py-3 px-3 rounded-xl text-xs font-medium text-stone-400 bg-white border border-stone-200 hover:border-stone-300 transition-all"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

type ActiveOrder = {
  id: string
  status: string
  items_count: number
} | null

// Returns true if it's still more than 1 hour before the booking
function canEditOrder(date: string, timeSlot: string): boolean {
  const [h, m] = timeSlot.split(':').map(Number)
  const bookingTime = new Date(date)
  bookingTime.setHours(h, m, 0, 0)
  const cutoff = new Date(bookingTime.getTime() - 60 * 60 * 1000)
  return new Date() < cutoff
}

function buildICSUrl(booking: Booking): string {
  const params = new URLSearchParams({
    name: booking.customer_name,
    date: booking.date,
    time: booking.time_slot,
    party: String(booking.party_size),
    ...(booking.id ? { id: booking.id } : {}),
  })
  return `/api/calendar/booking?${params.toString()}`
}

function addToCalendar(booking: Booking) {
  const a = document.createElement('a')
  a.href = buildICSUrl(booking)
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function formatTimeSlot(slot: string) {
  if (!slot) return ''
  const [h, m] = slot.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

function ManageContent() {
  const params = useSearchParams()
  const router = useRouter()
  const code = params.get('code')?.toUpperCase()
  const phone = params.get('phone')

  const [booking, setBooking] = useState<Booking | null>(null)
  const [activeOrder, setActiveOrder] = useState<ActiveOrder>(null)
  const [allBookings, setAllBookings] = useState<any[] | null>(null)
  const [allOrders, setAllOrders] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    const lookup = async () => {
      const query = code ? `code=${encodeURIComponent(code)}` : phone ? `phone=${encodeURIComponent(phone)}` : null
      if (!query) { setLoading(false); return }

      try {
        const res = await fetch(`/api/bookings/lookup?${query}`)
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Booking not found')
          router.push('/join')
          return
        }
        if (data.booking) {
          setBooking(data.booking)
          setActiveOrder(data.active_order)
        } else {
          // Multiple results — show selection
          setAllBookings(data.bookings || [])
          setAllOrders(data.orders || [])
        }
      } catch {
        toast.error('Could not load booking')
        router.push('/join')
      }
      setLoading(false)
    }
    lookup()
  }, [code, phone])

  const handleCancel = async () => {
    if (!booking) return
    setCancelling(true)
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not cancel booking')
      } else {
        setCancelled(true)
        setShowCancelConfirm(false)
        toast.success('Booking cancelled')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setCancelling(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
      </main>
    )
  }

  // ── Selection dashboard ──────────────────────────────────────────────────
  if (!booking && (allBookings !== null || allOrders !== null)) {
    const fmt = (slot: string) => { if (!slot) return ''; const [h, m] = slot.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')} ${ap}` }
    const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

    const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
      confirmed:  { label: 'Confirmed',  dot: 'bg-green-500',  text: 'text-green-700' },
      preparing:  { label: 'Preparing',  dot: 'bg-blue-500',   text: 'text-blue-700' },
      ready:      { label: 'Ready',      dot: 'bg-green-500',  text: 'text-green-700' },
      received:   { label: 'Received',   dot: 'bg-amber-500',  text: 'text-amber-700' },
      served:     { label: 'Served',     dot: 'bg-stone-400',  text: 'text-stone-500' },
      pending:    { label: 'Pending',    dot: 'bg-amber-400',  text: 'text-amber-700' },
      no_show:    { label: 'No Show',    dot: 'bg-red-400',    text: 'text-red-600' },
      cancelled:  { label: 'Cancelled',  dot: 'bg-stone-300',  text: 'text-stone-400' },
    }

    const contextLabel: Record<string, string> = {
      dine_in: '🍽️ Dine In', booking: '📅 Booking', queue_preorder: '⏳ Queue', standard: '🛍️ Order', booking_preorder: '📅 Pre-order',
    }

    const cancelBooking = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (!confirm('Cancel this booking?')) return
      setCancellingId(id)
      const res = await fetch('/api/bookings/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_id: id }) })
      if (res.ok) {
        setAllBookings(prev => prev ? prev.filter(b => b.id !== id) : prev)
        toast.success('Booking cancelled')
      } else {
        toast.error('Could not cancel')
      }
      setCancellingId(null)
    }

    return (
      <main className="min-h-screen bg-[#faf8f5] flex flex-col">
        {/* Hero */}
        <div className="relative h-[180px] overflow-hidden">
          <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/10 via-stone-900/50 to-[#faf8f5]" />
          <div className="absolute inset-x-0 top-0 flex flex-col items-center justify-center h-full text-white text-center px-4 pb-6">
            <h1 className="text-2xl font-bold drop-shadow-lg" style={{ fontFamily: "'Playfair Display', serif" }}>My Account</h1>
            <p className="text-sm text-white/80 mt-1 font-sans">Bookings & Orders</p>
          </div>
        </div>

        <div className="flex-1 max-w-sm mx-auto w-full px-4 pb-8 -mt-2 space-y-6">

          {/* Bookings */}
          {allBookings && allBookings.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📅</span>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-500 font-sans">Your Bookings</p>
              </div>
              <div className="space-y-3">
                {allBookings.map((b: any) => {
                  const sc = statusConfig[b.status] || statusConfig.confirmed
                  return (
                    <div key={b.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                      <button onClick={() => { setBooking(b); setAllBookings(null); setAllOrders(null) }}
                        className="w-full text-left p-4 hover:bg-stone-50 transition-all active:scale-[0.99]">
                        <div className="flex items-start justify-between gap-3">
                          {/* Date badge */}
                          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-bold text-amber-600 uppercase font-sans leading-none">
                              {new Date(b.date + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short' })}
                            </span>
                            <span className="text-lg font-bold text-amber-800 leading-none font-sans">
                              {new Date(b.date + 'T00:00:00').getDate()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-stone-900 font-sans text-sm">{fmtDate(b.date)}</p>
                            <p className="text-xs text-stone-500 font-sans mt-0.5">{fmt(b.time_slot)} · {b.party_size} {b.party_size === 1 ? 'person' : 'people'}{b.table_number ? ` · Table ${b.table_number}` : ''}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                              <span className={`text-[11px] font-semibold font-sans ${sc.text}`}>{sc.label}</span>
                            </div>
                          </div>
                          <span className="text-stone-300 text-xl flex-shrink-0 mt-1">›</span>
                        </div>
                      </button>
                      {/* Cancel row */}
                      <div className="border-t border-stone-50 px-4 py-2 flex justify-end">
                        <button
                          onClick={(e) => cancelBooking(b.id, e)}
                          disabled={cancellingId === b.id}
                          className="text-xs text-red-400 font-medium font-sans hover:text-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {cancellingId === b.id ? 'Cancelling...' : '✕ Cancel booking'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Orders */}
          {allOrders && allOrders.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🍽️</span>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-500 font-sans">Recent Orders</p>
              </div>
              <div className="space-y-3">
                {allOrders.map((o: any) => {
                  const sc = statusConfig[o.status] || statusConfig.served
                  const dateLabel = o.date ? fmtDate(o.date) : new Date(o.created_at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                  const dayNum = o.date ? new Date(o.date + 'T00:00:00').getDate() : new Date(o.created_at).getDate()
                  const monLabel = o.date ? new Date(o.date + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short' }) : new Date(o.created_at).toLocaleDateString('en-AU', { month: 'short' })
                  return (
                    <a key={o.id} href={`/order/confirmation?order_id=${o.id}`}
                      className="block bg-white rounded-2xl border border-stone-100 shadow-sm p-4 hover:bg-stone-50 transition-all active:scale-[0.99]">
                      <div className="flex items-start gap-3">
                        {/* Date badge */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-stone-400 uppercase font-sans leading-none">{monLabel}</span>
                          <span className="text-lg font-bold text-stone-700 leading-none font-sans">{dayNum}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-stone-900 font-sans text-sm">{dateLabel}</p>
                            <span className="text-stone-300 text-xl flex-shrink-0">›</span>
                          </div>
                          <p className="text-xs text-stone-500 font-sans mt-0.5">
                            {o.items_count} item{o.items_count !== 1 ? 's' : ''} · <span className="font-semibold text-stone-700">${o.total.toFixed(2)}</span>
                            {o.table_number ? ` · Table ${o.table_number}` : ''}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                              <span className={`text-[11px] font-semibold font-sans ${sc.text}`}>{sc.label}</span>
                            </div>
                            {o.context && o.context !== 'standard' && (
                              <span className="text-[10px] text-stone-400 font-sans">{contextLabel[o.context] || o.context}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </section>
          )}

          {(!allBookings?.length && !allOrders?.length) && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🍳</p>
              <p className="text-stone-500 font-sans">No bookings or orders found.</p>
            </div>
          )}

          <Link href="/join" className="block text-center text-xs text-stone-400 font-sans underline underline-offset-2 pt-2">Back to Home</Link>
        </div>
      </main>
    )
  }

  if (!booking) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-stone-400 font-sans mb-4">Booking not found</p>
        <Link href="/join" className="btn-primary">Back Home</Link>
      </main>
    )
  }

  if (cancelled) {
    return (
      <main className="min-h-screen flex flex-col">
        <div className="relative h-[180px] overflow-hidden">
          <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
            <h1 className="text-2xl font-bold drop-shadow-lg">Booking Cancelled</h1>
          </div>
        </div>
        <div className="flex-1 max-w-sm mx-auto w-full px-4 py-8 text-center space-y-4">
          <div className="text-4xl">👋</div>
          <h2 className="text-xl font-bold text-stone-900">Sorry to see you go</h2>
          <p className="text-stone-400 text-sm font-sans">Your booking for {formatDate(booking.date)} at {formatTimeSlot(booking.time_slot)} has been cancelled.</p>
          <p className="text-stone-400 text-sm font-sans">We hope to see you another time!</p>
          <Link href="/book" className="btn-primary inline-block mt-4">Book Again</Link>
          <Link href="/join" className="block text-stone-400 text-sm font-sans underline mt-2">Back to Home</Link>
        </div>
      </main>
    )
  }

  const isCancelled = booking.status === 'cancelled'
  const isPast = new Date(booking.date + 'T23:59:59') < new Date()
  const isSeated = !!(booking as any).confirmed_at || checkedIn

  if (checkedIn) {
    return (
      <main className="min-h-screen flex flex-col">
        <div className="relative h-[180px] overflow-hidden">
          <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-green-900/30 via-green-900/50 to-green-900/80" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
            <div className="w-16 h-16 rounded-full bg-green-500/90 flex items-center justify-center mb-3 shadow-lg">
              <span className="text-3xl">✓</span>
            </div>
            <h1 className="text-2xl font-bold drop-shadow-lg">You&apos;re Checked In!</h1>
          </div>
        </div>
        <div className="flex-1 max-w-sm mx-auto w-full px-4 py-8 text-center space-y-4">
          <p className="text-stone-600 font-sans">Welcome, {booking.customer_name}! Your table is confirmed. 🎉</p>
          <p className="text-stone-400 text-sm font-sans">Head to your table and a staff member will be with you shortly.</p>
          <Link
            href={`/order/new?context=booking&name=${encodeURIComponent(booking.customer_name)}&phone=${encodeURIComponent(booking.phone)}&date=${booking.date}&time=${booking.time_slot}`}
            className="btn-primary inline-block mt-4"
          >
            🍽️ Order Food Now
          </Link>
          <Link href="/join" className="block text-stone-400 text-sm font-sans underline mt-2">Back to Home</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="relative h-[180px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover animate-hero-zoom" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link href="/join" className="absolute top-4 left-4 text-white/70 text-sm hover:text-white font-sans">← Home</Link>
          <Image src="/images/logo.png" alt="Mr Jackson" width={44} height={44} className="rounded-full shadow-lg mb-2" />
          <h1 className="text-2xl font-bold drop-shadow-lg">My Booking</h1>
          <div className="w-6 h-0.5 bg-amber-500 mx-auto mt-1.5" />
        </div>
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 -mt-4 relative z-10 pb-10 space-y-4">

        {/* Booking Code */}
        {booking.code && (
          <div className="card text-center border-2 border-amber-200 bg-amber-50/60 animate-slide-up">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest font-sans mb-1">Booking Code</p>
            <p className="text-3xl font-bold text-stone-900 tracking-widest">{booking.code}</p>
            <p className="text-xs text-stone-400 font-sans mt-1">Use this code to access your booking anytime</p>
          </div>
        )}

        {/* Booking Details */}
        <div className="card animate-slide-up">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest font-sans mb-3">Booking Details</p>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400">👤 Name</span>
              <span className="font-semibold text-stone-800">{booking.customer_name}</span>
            </div>
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400">📅 Date</span>
              <span className="font-semibold text-stone-800">{formatDate(booking.date)}</span>
            </div>
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400">🕐 Time</span>
              <span className="font-semibold text-stone-800">{formatTimeSlot(booking.time_slot)}</span>
            </div>
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400">👥 Party</span>
              <span className="font-semibold text-stone-800">{booking.party_size} {booking.party_size === 1 ? 'person' : 'people'}</span>
            </div>
            {booking.table_number && (
              <div className="flex justify-between text-sm font-sans">
                <span className="text-stone-400">🪑 Table</span>
                <span className="font-semibold text-stone-800">Table {booking.table_number}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400">📋 Status</span>
              <span className={`font-semibold capitalize ${
                isCancelled ? 'text-red-500' : 'text-green-600'
              }`}>
                {isCancelled ? 'Cancelled' : 'Confirmed ✓'}
              </span>
            </div>
          </div>
        </div>

        {/* Add to Calendar */}
        {!isCancelled && !isPast && (
          <button
            onClick={() => addToCalendar(booking)}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-stone-200 hover:border-stone-400 text-stone-600 text-sm font-medium font-sans transition-all active:scale-[0.98]"
          >
            <span>📅</span>
            <span>Add to Calendar</span>
          </button>
        )}

        {!isCancelled && !isPast && (
          <>
            {(() => {
              const editable = canEditOrder(booking.date, booking.time_slot)
              return activeOrder ? (
                <div className="card border-2 border-green-200 bg-green-50/40 animate-slide-up">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <div className="flex-1">
                      <p className="font-bold text-stone-800 text-sm">Pre-Order Placed!</p>
                      <p className="text-stone-500 text-xs font-sans mt-0.5">
                        {activeOrder.items_count} item{activeOrder.items_count !== 1 ? 's' : ''} ordered — your food will be ready when you arrive.
                      </p>
                      {!editable && (
                        <p className="text-amber-600 text-xs font-sans mt-1 font-medium">
                          ⏰ Order editing closed — less than 1 hour until your booking.
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/order/confirmation?order_id=${activeOrder.id}`}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-3 text-sm"
                  >
                    View My Order
                  </Link>
                  <Link
                    href={editable ? `/order/edit?order_id=${activeOrder!.id}` : `/order/new?context=booking&name=${encodeURIComponent(booking.customer_name)}&phone=${encodeURIComponent(booking.phone)}&date=${booking.date}&time=${booking.time_slot}`}
                    className="btn-secondary w-full flex items-center justify-center gap-2 py-3 mt-2 text-sm"
                  >
                    {editable ? '✏️ Edit Order' : '➕ Add More Items'}
                  </Link>
                </div>
              ) : editable ? (
                /* No order yet and still time — offer to pre-order */
                <Link
                  href={`/order/new?context=booking&name=${encodeURIComponent(booking.customer_name)}&phone=${encodeURIComponent(booking.phone)}&date=${booking.date}&time=${booking.time_slot}`}
                  className="block animate-slide-up"
                >
                  <div className="card border-2 border-amber-300 bg-amber-50/30 hover:border-amber-400 transition-all active:scale-[0.98]">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">🍽️</span>
                      <div>
                        <h3 className="font-bold text-stone-900 text-[15px]">Pre-Order Your Food</h3>
                        <p className="text-stone-500 text-xs mt-1 font-sans leading-relaxed">
                          Order & pay now — food freshly prepared and ready at {formatTimeSlot(booking.time_slot)}. No waiting!
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                /* No order and within 1 hour — can still add, just not edit */
                <div className="card border-2 border-stone-200 bg-stone-50 animate-slide-up space-y-3">
                  <div className="text-center">
                    <p className="text-2xl mb-2">⏰</p>
                    <p className="font-semibold text-stone-800 text-sm font-sans">Almost time!</p>
                    <p className="text-stone-400 text-xs font-sans mt-1">Pre-order editing is closed, but you can still add items to your order!</p>
                  </div>
                  <Link
                    href={`/order/new?context=booking&name=${encodeURIComponent(booking.customer_name)}&phone=${encodeURIComponent(booking.phone)}&date=${booking.date}&time=${booking.time_slot}`}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-900 text-white text-sm font-medium font-sans transition-all active:scale-[0.98]"
                  >
                    <span>➕</span>
                    <span>Add to Your Order</span>
                  </Link>
                </div>
              )
            })()}

            {/* Cancel Booking */}
            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full text-center text-sm text-stone-400 font-sans hover:text-red-500 transition-colors py-2"
              >
                Need to cancel your booking?
              </button>
            ) : (
              <div className="card border-2 border-red-200 bg-red-50/50 animate-slide-up">
                <div className="text-center mb-4">
                  <p className="text-2xl mb-1.5">⚠️</p>
                  <p className="font-semibold text-stone-800 text-sm font-sans">Cancel your booking?</p>
                  <p className="text-xs text-stone-400 font-sans mt-1.5 leading-relaxed">
                    Your table on {formatDate(booking.date)} at {formatTimeSlot(booking.time_slot)} will be released.
                  </p>
                  {activeOrder && (
                    <p className="text-xs text-red-500 font-sans mt-1.5 font-medium">
                      Note: if you have an active pre-order, please also cancel that order separately.
                    </p>
                  )}
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="btn-secondary flex-1 py-3 text-sm"
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {isCancelled && (
          <div className="card border-2 border-red-200 bg-red-50/40 text-center">
            <p className="text-stone-500 text-sm font-sans">This booking has been cancelled.</p>
            <Link href="/book" className="btn-primary inline-block mt-4 px-8 text-sm">Book Again</Link>
          </div>
        )}

        <Link href="/join" className="block text-center text-xs text-stone-400 font-sans underline underline-offset-2 pb-4">
          Back to Home
        </Link>
      </div>

      {/* Check-in popup — only for unpaid, during the 30-min window */}
      {!isCancelled && !isPast && !isSeated && (
        <CheckInPopup
          booking={booking}
          onCheckedIn={() => setCheckedIn(true)}
        />
      )}
    </main>
  )
}

export default function ManagePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
      </main>
    }>
      <ManageContent />
    </Suspense>
  )
}

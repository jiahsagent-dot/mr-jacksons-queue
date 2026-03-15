'use client'

import { useEffect, useState, Suspense } from 'react'
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

type ActiveOrder = {
  id: string
  status: string
  items_count: number
} | null

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
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelled, setCancelled] = useState(false)

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
        setBooking(data.booking)
        setActiveOrder(data.active_order)
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
            {/* Active Order — if already paid */}
            {activeOrder ? (
              <div className="card border-2 border-green-200 bg-green-50/40 animate-slide-up">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <div className="flex-1">
                    <p className="font-bold text-stone-800 text-sm">Pre-Order Placed!</p>
                    <p className="text-stone-500 text-xs font-sans mt-0.5">
                      {activeOrder.items_count} item{activeOrder.items_count !== 1 ? 's' : ''} ordered — your food will be ready when you arrive.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/order/confirmation?order_id=${activeOrder.id}`}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-3 text-sm"
                >
                  View My Order
                </Link>
              </div>
            ) : (
              /* No order yet — offer to pre-order */
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
            )}

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

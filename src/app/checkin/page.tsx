'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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

function CheckInContent() {
  const params = useSearchParams()
  const [phone, setPhone] = useState(params.get('phone') || '')
  const [step, setStep] = useState<'phone' | 'select' | 'success'>('phone')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [checkedInBooking, setCheckedInBooking] = useState<Booking | null>(null)
  const [searching, setSearching] = useState(false)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

  const handleSearch = async () => {
    const cleaned = phone.trim().replace(/\D/g, '')
    if (cleaned.length < 10) return toast.error('Please enter a valid phone number')

    setSearching(true)
    try {
      const res = await fetch(`/api/bookings/search?phone=${encodeURIComponent(cleaned)}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not find booking')
        return
      }

      const found = (data.bookings || []).filter((b: Booking) =>
        ['confirmed', 'seated'].includes(b.status)
      )

      if (found.length === 0) {
        toast.error("No active booking found for that number. If you're in the queue, no check-in needed!")
        return
      }

      setBookings(found)
      setStep('select')
    } catch {
      toast.error('Something went wrong — please try again')
    } finally {
      setSearching(false)
    }
  }

  const handleCheckIn = async (booking: Booking) => {
    setCheckingIn(booking.id)
    try {
      const res = await fetch('/api/bookings/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Check-in failed — please see a staff member')
        return
      }
      setCheckedInBooking(booking)
      setStep('success')
    } catch {
      toast.error('Something went wrong — please see a staff member')
    } finally {
      setCheckingIn(null)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="relative h-[200px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover animate-hero-zoom" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/85" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link href="/join" className="absolute top-4 left-4 text-white/70 text-sm hover:text-white font-sans">← Back</Link>
          <Image src="/images/logo.png" alt="Mr Jackson" width={48} height={48} className="rounded-full shadow-lg mb-2" />
          <h1 className="text-2xl font-bold drop-shadow-lg">Check In</h1>
          <div className="w-6 h-0.5 bg-amber-500 mx-auto mt-1.5" />
        </div>
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-6 space-y-4">

        {/* ── Phone step ─────────────────────────────────────── */}
        {step === 'phone' && (
          <div className="space-y-4 animate-slide-up">
            <div className="card text-center">
              <p className="text-2xl mb-2">👋</p>
              <h2 className="text-lg font-bold text-stone-900 mb-1">Welcome to Mr Jackson's!</h2>
              <p className="text-stone-500 text-sm font-sans">Enter the mobile number you used to make your booking and we'll check you in.</p>
            </div>

            <div className="card">
              <label htmlFor="checkin-phone" className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">
                Your Mobile Number
              </label>
              <input
                id="checkin-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                className="input-field text-center text-lg tracking-wide"
                placeholder="04XX XXX XXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="btn-primary w-full py-4 mt-3 text-base disabled:opacity-50"
              >
                {searching ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Finding your booking...
                  </span>
                ) : 'Find My Booking'}
              </button>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-stone-400 font-sans">Don't have a booking?</p>
              <Link href="/join" className="text-xs text-stone-600 font-semibold underline underline-offset-2 font-sans">
                Join the queue or dine in →
              </Link>
            </div>
          </div>
        )}

        {/* ── Select booking step ─────────────────────────────── */}
        {step === 'select' && (
          <div className="space-y-4 animate-slide-up">
            <div className="card">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 font-sans">
                {bookings.length === 1 ? 'Your Booking' : 'Your Bookings — tap to check in'}
              </p>
              <div className="space-y-3">
                {bookings.map(booking => (
                  <div key={booking.id} className="rounded-2xl border-2 border-stone-200 bg-white p-4">
                    {/* Booking details */}
                    <div className="mb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-stone-900">{booking.customer_name}</p>
                          <p className="text-sm text-stone-600 font-sans mt-0.5">
                            📅 {formatDate(booking.date)}
                          </p>
                          <p className="text-sm text-stone-600 font-sans">
                            🕐 {formatTimeSlot(booking.time_slot)}
                          </p>
                          <p className="text-sm text-stone-600 font-sans">
                            👥 {booking.party_size} {booking.party_size === 1 ? 'person' : 'people'}
                            {booking.table_number ? ` · Table ${booking.table_number}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-100 text-green-700 border border-green-200 font-sans">
                          ✓ Confirmed
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCheckIn(booking)}
                      disabled={checkingIn === booking.id}
                      className="btn-primary w-full py-3.5 text-base disabled:opacity-50"
                    >
                      {checkingIn === booking.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Checking in...
                        </span>
                      ) : '✓ Check In Now'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep('phone')}
              className="w-full text-center text-sm text-stone-400 font-sans hover:text-stone-600 py-2"
            >
              ← Try a different number
            </button>
          </div>
        )}

        {/* ── Success step ─────────────────────────────────────── */}
        {step === 'success' && checkedInBooking && (
          <div className="space-y-4 animate-slide-up">
            <div className="card border-2 border-green-200 bg-green-50/50 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-1">
                You're checked in, {checkedInBooking.customer_name}! 🎉
              </h2>
              <p className="text-stone-500 text-sm font-sans mt-1">
                {checkedInBooking.table_number
                  ? `Head to Table ${checkedInBooking.table_number} — a staff member will be with you shortly.`
                  : 'Welcome! Our team will seat you shortly.'}
              </p>
            </div>

            {checkedInBooking.table_number && (
              <div className="card border-2 border-stone-200 text-center">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest font-sans mb-1">Your Table</p>
                <p className="text-5xl font-bold text-stone-900">Table {checkedInBooking.table_number}</p>
              </div>
            )}

            <Link
              href={`/order/new?context=booking&name=${encodeURIComponent(checkedInBooking.customer_name)}&phone=${encodeURIComponent(checkedInBooking.phone)}&date=${checkedInBooking.date}&time=${checkedInBooking.time_slot}`}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base shadow-md"
            >
              🍽️ View Menu & Order Now
            </Link>

            <Link href="/join" className="block text-center text-sm text-stone-400 font-sans underline underline-offset-2">
              Back to Home
            </Link>
          </div>
        )}

      </div>
    </main>
  )
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
      </main>
    }>
      <CheckInContent />
    </Suspense>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatTimeSlot, formatDate } from '@/lib/timeslots'

type BookingDetails = {
  id: string
  name: string
  phone: string
  party_size: number
  date: string
  time_slot: string
  table_number?: number
  table_label?: string
  code?: string
}

export default function BookingConfirmedPage() {
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetails | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('mr_jackson_booking')
    if (stored) {
      setBooking(JSON.parse(stored))
    }
  }, [])

  if (!booking) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <p className="text-3xl mb-4">✅</p>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Booking Confirmed</h1>
          <p className="text-stone-400 text-sm font-sans mb-6">We&apos;ll see you soon!</p>
          <Link href="/join" className="btn-primary inline-block">Back Home</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="relative h-[160px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <h1 className="text-2xl font-bold drop-shadow-lg">Booking Confirmed!</h1>
          <div className="w-6 h-0.5 bg-amber-500 mx-auto mt-2" />
        </div>
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 -mt-4 relative z-10 pb-10">
        {/* Confirmation Card */}
        <div className="card text-center shadow-xl animate-slide-up mb-4">
          <div className="text-4xl mb-3 animate-bounce">✅</div>
          <h2 className="text-xl font-bold text-stone-900 mb-1">You&apos;re all set, {booking.name}!</h2>
          <p className="text-stone-400 text-sm font-sans">We&apos;ll have a table ready for you</p>

          {/* Booking Code */}
          {booking.code && (
            <div className="mt-4 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-sans mb-1">Your Booking Code</p>
              <p className="text-3xl font-bold text-stone-900 tracking-widest">{booking.code}</p>
            </div>
          )}

          {/* When you arrive instructions */}
          <div className="mt-4 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left">
            <p className="text-xs font-bold text-stone-700 mb-2 font-sans">📍 When you arrive:</p>
            <ol className="text-xs text-stone-500 font-sans space-y-1.5 list-decimal list-inside">
              <li>Find your table and look for the <strong className="text-stone-700">4-digit code</strong> on it</li>
              <li>Go to <strong className="text-stone-700">mr-jacksons.vercel.app</strong></li>
              <li>Tap <strong className="text-stone-700">&quot;Have a booking code?&quot;</strong></li>
              <li>Enter your booking code + the table code</li>
              <li>Start ordering from your phone!</li>
            </ol>
          </div>

          {/* Cancellation warning */}
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs text-red-700 font-sans text-center">
              ⚠️ If you don&apos;t check in within 15 minutes after your booking time, your table will be released to the next guest.
            </p>
          </div>

          {/* Booking Details */}
          <div className="mt-5 text-left bg-stone-50 rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400">Date</span>
              <span className="font-semibold text-stone-800">{formatDate(booking.date)}</span>
            </div>
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400">Time</span>
              <span className="font-semibold text-stone-800">{formatTimeSlot(booking.time_slot)}</span>
            </div>
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400">Party</span>
              <span className="font-semibold text-stone-800">{booking.party_size} {booking.party_size === 1 ? 'person' : 'people'}</span>
            </div>
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400">Name</span>
              <span className="font-semibold text-stone-800">{booking.name}</span>
            </div>
            {booking.table_label && (
              <div className="flex justify-between text-sm font-sans">
                <span className="text-stone-400">Table</span>
                <span className="font-semibold text-stone-800">🪑 {booking.table_label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pre-Order Option */}
        <div className="space-y-3 animate-fade-in">
          <p className="text-center text-stone-400 text-sm font-sans">Would you like to get a head start?</p>

          <Link
            href={`/order/new?context=booking&name=${encodeURIComponent(booking.name)}&phone=${encodeURIComponent(booking.phone)}&date=${booking.date}&time=${booking.time_slot}`}
            className="block"
          >
            <div className="card border-2 border-amber-300 bg-amber-50/30 hover:border-amber-400 transition-all active:scale-[0.98]">
              <div className="flex items-start gap-4">
                <span className="text-3xl">🍽️</span>
                <div>
                  <h3 className="font-bold text-stone-900 text-[16px]">Pre-Order Your Food</h3>
                  <p className="text-stone-500 text-sm mt-1 font-sans leading-relaxed">
                    Order and pay now — your food will be freshly prepared and ready when you arrive at {formatTimeSlot(booking.time_slot)}. No waiting!
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/join" className="block">
            <div className="card border-2 border-transparent hover:border-stone-200 transition-all active:scale-[0.98]">
              <div className="flex items-start gap-4">
                <span className="text-3xl">👋</span>
                <div>
                  <h3 className="font-bold text-stone-900 text-[16px]">Order When I Arrive</h3>
                  <p className="text-stone-400 text-sm mt-1 font-sans leading-relaxed">
                    No rush — browse the menu and order once you&apos;re seated. We&apos;ll see you at {formatTimeSlot(booking.time_slot)}!
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}

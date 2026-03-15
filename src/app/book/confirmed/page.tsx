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

function buildGoogleCalendarUrl(booking: BookingDetails): string {
  const startDate = new Date(`${booking.date}T${booking.time_slot}:00`)
  const endDate = new Date(startDate.getTime() + 90 * 60 * 1000)
  const formatCal = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const details = [
    `Booking for ${booking.party_size} ${booking.party_size === 1 ? 'person' : 'people'}`,
    booking.table_label ? `Table: ${booking.table_label}` : '',
    ``,
    `⚠️ Haven't pre-ordered your food? You'll receive an SMS before your booking asking you to confirm you're coming. Tap the link in that SMS or your table may be released.`,
    ``,
    `When you arrive:`,
    `1. Go to mr-jacksons.vercel.app`,
    `2. Tap "I have a booking"`,
    `3. Enter your phone number to check in`,
    `4. Start ordering!`,
  ].filter(l => l !== null).join('\\n')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Mr Jackson — Table Booking`,
    details,
    location: 'Mr Jackson, 1/45 Main St, Mornington VIC 3931',
    dates: `${formatCal(startDate)}/${formatCal(endDate)}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function buildICSContent(booking: BookingDetails): string {
  const startDate = new Date(`${booking.date}T${booking.time_slot}:00`)
  const endDate = new Date(startDate.getTime() + 90 * 60 * 1000)
  const formatICS = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const uid = `${booking.id || Date.now()}@mr-jacksons.vercel.app`

  const description = [
    `Booking for ${booking.party_size} ${booking.party_size === 1 ? 'person' : 'people'}`,
    booking.table_label ? `Table: ${booking.table_label}` : '',
    ``,
    `⚠️ Haven't pre-ordered your food? You'll receive an SMS before your booking asking you to confirm you're coming. Tap the link in that SMS or your table may be released.`,
    ``,
    `When you arrive:`,
    `1. Go to mr-jacksons.vercel.app`,
    `2. Tap "I have a booking"`,
    `3. Enter your phone number to check in`,
    `4. Start ordering!`,
  ].join('\\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mr Jackson//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICS(new Date())}`,
    `DTSTART:${formatICS(startDate)}`,
    `DTEND:${formatICS(endDate)}`,
    `SUMMARY:Mr Jackson — Table Booking`,
    `DESCRIPTION:${description}`,
    `LOCATION:Mr Jackson\\, 1/45 Main St\\, Mornington VIC 3931`,
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your Mr Jackson booking is tomorrow — confirm if you haven\'t pre-ordered!',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your Mr Jackson booking is in 1 hour — see you soon!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function isAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)
}

function addToCalendar(booking: BookingDetails) {
  if (isAppleDevice()) {
    // Apple Calendar — download .ics
    const ics = buildICSContent(booking)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mr-jackson-booking.ics'
    a.click()
    URL.revokeObjectURL(url)
  } else {
    // Google Calendar for Android / other
    window.open(buildGoogleCalendarUrl(booking), '_blank')
  }
}

export default function BookingConfirmedPage() {
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('mr_jackson_booking')
    if (stored) {
      setBooking(JSON.parse(stored))
    }
  }, [])

  const handleCopyCode = async () => {
    if (!booking?.code) return
    try {
      await navigator.clipboard.writeText(booking.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for mobile
      const input = document.createElement('input')
      input.value = booking.code
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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
      <div className="relative h-[180px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/30 via-green-900/50 to-green-900/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <div className="w-16 h-16 rounded-full bg-green-500/90 flex items-center justify-center mb-3 shadow-lg animate-confetti">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold drop-shadow-lg">Booking Confirmed!</h1>
          <div className="w-6 h-0.5 bg-green-300 mx-auto mt-2" />
        </div>
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 -mt-4 relative z-10 pb-10">
        {/* Confirmation Card */}
        <div className="card text-center shadow-xl animate-slide-up mb-4">
          <h2 className="text-xl font-bold text-stone-900 mb-1">You&apos;re all set, {booking.name}!</h2>
          <p className="text-stone-400 text-sm font-sans">We&apos;ll have a table ready for you</p>

          {/* Booking Code */}
          {booking.code && (
            <button
              onClick={handleCopyCode}
              className="mt-4 w-full bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 hover:border-amber-400 transition-all active:scale-[0.98]"
            >
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-sans mb-1">Your Booking Code</p>
              <p className="text-3xl font-bold text-stone-900 tracking-widest animate-count-in">{booking.code}</p>
              <p className="text-[11px] text-amber-600 font-sans mt-1.5">
                {copied ? '✓ Copied!' : 'Tap to copy'}
              </p>
            </button>
          )}

          {/* Booking Details — clean summary */}
          <div className="mt-5 text-left bg-stone-50 rounded-2xl p-4 space-y-2.5">
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
            {booking.table_label && (
              <div className="flex justify-between text-sm font-sans">
                <span className="text-stone-400">🪑 Table</span>
                <span className="font-semibold text-stone-800">{booking.table_label}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => addToCalendar(booking)}
              className="inline-flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-white border border-stone-200 hover:border-stone-400 text-stone-600 text-sm font-medium font-sans transition-all active:scale-[0.98]"
            >
              <span>📅</span>
              <span>Calendar</span>
            </button>
            <button
              onClick={async () => {
                const text = `Mr Jackson Booking\n${formatDate(booking.date)} at ${formatTimeSlot(booking.time_slot)}\n${booking.party_size} people\nCode: ${booking.code || 'N/A'}\n\n📍 1/45 Main St, Mornington`
                if (navigator.share) {
                  try { await navigator.share({ title: 'Mr Jackson Booking', text }) } catch {}
                } else {
                  try { await navigator.clipboard.writeText(text) } catch {}
                }
              }}
              className="inline-flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-white border border-stone-200 hover:border-stone-400 text-stone-600 text-sm font-medium font-sans transition-all active:scale-[0.98]"
            >
              <span>📤</span>
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* When you arrive */}
        <div className="card animate-slide-up-1 mb-4">
          <p className="text-xs font-bold text-stone-700 mb-3 font-sans">📍 When you arrive:</p>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Go to mr-jacksons.vercel.app on your phone' },
              { step: '2', text: 'Tap "I have a booking"' },
              { step: '3', text: 'Enter your phone number to check in' },
              { step: '4', text: 'Start ordering from your phone!' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
                <p className="text-sm text-stone-600 font-sans">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cancellation warning */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 animate-slide-up-2">
          <p className="text-xs text-red-700 font-sans text-center">
            ⚠️ If you don&apos;t check in within 15 minutes after your booking time, your table will be released.
          </p>
        </div>

        {/* Pre-Order Options */}
        <div className="space-y-3 animate-slide-up-3">
          <p className="text-center text-stone-400 text-sm font-sans">Would you like to get a head start?</p>

          <Link
            href={`/order/new?context=booking&name=${encodeURIComponent(booking.name)}&phone=${encodeURIComponent(booking.phone)}&date=${booking.date}&time=${booking.time_slot}`}
            className="block"
          >
            <div className="card border-2 border-amber-300 bg-amber-50/30 hover:border-amber-400 transition-all active:scale-[0.98] card-hover">
              <div className="flex items-start gap-4">
                <span className="text-3xl">🍽️</span>
                <div>
                  <h3 className="font-bold text-stone-900 text-[16px]">Pre-Order Your Food</h3>
                  <p className="text-stone-500 text-sm mt-1 font-sans leading-relaxed">
                    Order and pay now — food freshly prepared and ready at {formatTimeSlot(booking.time_slot)}. No waiting!
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
                    No rush — we&apos;ll see you at {formatTimeSlot(booking.time_slot)}!
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

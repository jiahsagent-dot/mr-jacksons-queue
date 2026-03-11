'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'

const GALLERY = [
  '/images/food1.jpg',
  '/images/food9.jpg',
  '/images/food3.jpg',
  '/images/food10.jpg',
  '/images/food5.jpg',
  '/images/food11.jpg',
  '/images/food12.jpg',
  '/images/food13.jpg',
]

type TableInfo = {
  has_availability: boolean
  available_count: number
  total_count: number
}

type SeatedInfo = {
  table_number: number
  customer_name: string
}

export default function JoinPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<{ is_closed: boolean; estimated_wait: number } | null>(null)
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [seated, setSeated] = useState<SeatedInfo | null>(null)
  const [showCodeEntry, setShowCodeEntry] = useState(false)
  const [bookingCode, setBookingCode] = useState('')
  const [tableCode, setTableCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)

  useEffect(() => {
    // Check if customer is already seated at a table
    const storedTable = sessionStorage.getItem('mr_jackson_table')
    if (storedTable) {
      try { setSeated(JSON.parse(storedTable)) } catch {}
    }

    Promise.all([
      fetch(`/api/queue/settings?_t=${Date.now()}`).then(r => r.json()).catch(() => null),
      fetch(`/api/tables?_t=${Date.now()}`).then(r => r.json()).catch(() => null),
    ]).then(([settingsData, tablesData]) => {
      setSettings(settingsData)
      setTableInfo(tablesData)
      setLoading(false)
    })
  }, [])

  const lookupBooking = async () => {
    if (!bookingCode.trim()) return toast.error('Enter your booking code')
    if (!tableCode.trim()) return toast.error('Enter the code on your table')
    setCodeLoading(true)
    try {
      const res = await fetch(`/api/bookings/lookup?code=${encodeURIComponent(bookingCode.trim())}&table_code=${encodeURIComponent(tableCode.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Booking not found')
        return
      }
      const b = data.booking
      // Store booking info and go to order page
      sessionStorage.setItem('mr_jackson_booking', JSON.stringify(b))
      if (b.table_number) {
        sessionStorage.setItem('mr_jackson_table', JSON.stringify({
          table_number: b.table_number,
          customer_name: b.customer_name,
        }))
      }
      router.push(
        `/order/new?context=booking&name=${encodeURIComponent(b.customer_name)}&phone=${encodeURIComponent(b.phone)}&table=${b.table_number || ''}&date=${b.date}&time=${b.time_slot}`
      )
    } catch {
      toast.error('Something went wrong')
    } finally {
      setCodeLoading(false)
    }
  }

  const handleDineIn = () => {
    if (tableInfo?.has_availability) {
      router.push('/tables')
    } else {
      router.push('/full')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-stone-400 text-sm font-sans">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden">

      {/* ── Hero ── */}
      <div className="relative h-[320px] sm:h-[380px] w-full flex-shrink-0">
        <Image
          src="/images/hero.jpg"
          alt="Mr Jackson Mornington"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/45 to-black/85" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Image
            src="/images/logo.png"
            alt="Mr Jackson"
            width={68}
            height={68}
            className="rounded-full shadow-xl mb-3 ring-2 ring-white/20"
          />
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight drop-shadow-lg">Mr Jackson</h1>
          <div className="w-8 h-[2px] bg-amber-400 mx-auto mt-3 mb-2 rounded-full" />
          <p className="text-white/65 text-[11px] tracking-[0.3em] uppercase">Modern Brunch · Mornington</p>

          {/* Live availability badge */}
          {tableInfo && (
            <div className={`mt-5 inline-flex items-center gap-2 backdrop-blur-md text-sm px-5 py-2.5 rounded-full ${
              tableInfo.has_availability
                ? 'bg-green-500/20 text-green-200'
                : 'bg-amber-500/20 text-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                tableInfo.has_availability ? 'bg-green-400' : 'bg-amber-400'
              }`} />
              {tableInfo.has_availability
                ? `${tableInfo.available_count} table${tableInfo.available_count === 1 ? '' : 's'} available`
                : `Full · ~${settings?.estimated_wait || 15} min wait`
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Main Actions ── */}
      <div className="flex flex-col items-center px-4 -mt-8 relative z-10 w-full">
        {/* Already seated banner */}
        {seated && (
          <div className="card w-full max-w-sm shadow-xl mb-3 border-2 border-green-300 bg-green-50/50 animate-slide-up">
            <div className="text-center">
              <p className="text-green-800 font-semibold text-[15px]">🪑 You&apos;re at Table {seated.table_number}</p>
              <p className="text-green-600 text-xs font-sans mt-1">Ready to order, {seated.customer_name}?</p>
            </div>
            <Link
              href={`/order/new?context=dine_in&table=${seated.table_number}&name=${encodeURIComponent(seated.customer_name)}`}
              className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-base mt-3"
            >
              <span className="text-xl">🍽️</span>
              <span>Order & Pay</span>
            </Link>
            <button
              onClick={() => { sessionStorage.removeItem('mr_jackson_table'); setSeated(null) }}
              className="w-full text-center text-xs text-stone-400 mt-2 py-1 hover:text-stone-600 font-sans"
            >
              Not at this table? Clear
            </button>
          </div>
        )}

        {/* Booking code entry */}
        {!seated && (
          <div className="w-full max-w-sm mb-3 animate-slide-up">
            {!showCodeEntry ? (
              <button
                onClick={() => setShowCodeEntry(true)}
                className="w-full py-3 text-sm text-amber-700 font-semibold font-sans hover:text-amber-900 transition-colors"
              >
                Have a booking code? Tap here
              </button>
            ) : (
              <div className="card border-2 border-amber-300 bg-amber-50/30">
                <p className="text-sm font-semibold text-stone-900 text-center mb-1">Confirm You&apos;re Here</p>
                <p className="text-xs text-stone-400 text-center mb-3 font-sans">Enter your booking code and the 4-digit code on your table</p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-sans">Booking Code (from your SMS)</label>
                    <input
                      type="text"
                      className="input-field text-center text-lg font-bold tracking-wider uppercase"
                      placeholder="MJ-0000"
                      value={bookingCode}
                      onChange={e => setBookingCode(e.target.value.toUpperCase())}
                      maxLength={7}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-sans">Table Code (on your table)</label>
                    <input
                      type="text"
                      className="input-field text-center text-lg font-bold tracking-wider"
                      placeholder="0000"
                      value={tableCode}
                      onChange={e => setTableCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
                      inputMode="numeric"
                    />
                  </div>
                  <button
                    onClick={lookupBooking}
                    disabled={codeLoading}
                    className="btn-primary w-full py-3 disabled:opacity-50"
                  >
                    {codeLoading ? 'Checking...' : 'Confirm & Order'}
                  </button>
                </div>
                <button
                  onClick={() => { setShowCodeEntry(false); setBookingCode(''); setTableCode('') }}
                  className="w-full text-center text-xs text-stone-400 mt-2 py-1 hover:text-stone-600 font-sans"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        <div className="card w-full max-w-sm shadow-xl animate-slide-up">
          <h2 className="text-[18px] font-semibold text-stone-900 mb-1 text-center">
            {seated ? 'Or start fresh' : 'Welcome'}
          </h2>
          <p className="text-stone-400 text-sm mb-5 text-center font-sans">How would you like to dine today?</p>

          <div className="space-y-3">
            {/* Dine In — checks table availability */}
            <button
              onClick={handleDineIn}
              className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-base"
            >
              <span className="text-xl">🍽️</span>
              <span>Dine In Now</span>
            </button>

            {/* Book a Table */}
            <Link
              href="/book"
              className="btn-secondary w-full flex items-center justify-center gap-3 py-4 text-base"
            >
              <span className="text-xl">📅</span>
              <span>Book a Table</span>
            </Link>


          </div>
        </div>
      </div>

      {/* ── Gallery strip ── */}
      <div className="mt-8 w-full">
        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-4 mb-3">From the kitchen</p>
        <div
          className="flex gap-2.5 overflow-x-auto px-4 pb-2 scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {GALLERY.map((src, i) => (
            <div key={i} className="relative w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-md">
              <Image src={src} alt="Mr Jackson dish" fill className="object-cover" />
            </div>
          ))}
          <div className="w-2 flex-shrink-0" />
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 mt-6 border-t border-stone-100" />

      {/* ── Footer info ── */}
      <div className="px-4 pt-5 pb-10 flex flex-col items-center gap-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3">Hours</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-stone-700">
              <span className="text-stone-500 font-sans">Mon – Fri</span>
              <span className="font-medium font-sans">7:30 AM – 2:30 PM</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span className="text-stone-500 font-sans">Sat – Sun</span>
              <span className="font-medium font-sans">7:30 AM – 3:00 PM</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-2">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3">Find Us</p>
          <a href="https://maps.google.com/?q=1/45+Main+St+Mornington+VIC" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors font-sans">
            <span className="text-base">📍</span>
            <span>1/45 Main St, Mornington VIC 3931</span>
          </a>
          <a href="tel:0359098815" className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors font-sans">
            <span className="text-base">📞</span>
            <span>03 5909 8815</span>
          </a>
        </div>
      </div>
    </main>
  )
}

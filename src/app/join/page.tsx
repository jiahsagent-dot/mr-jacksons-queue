'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import { ScrollReveal } from '@/components/ScrollReveal'
import { formatAusPhone, stripPhone } from '@/lib/format'

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
  const [showBookingEntry, setShowBookingEntry] = useState(false)
  const [bookingPhone, setBookingPhone] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [showQueueForm, setShowQueueForm] = useState(false)
  const [queueName, setQueueName] = useState('')
  const [queuePhone, setQueuePhone] = useState('')
  const [queuePartySize, setQueuePartySize] = useState(2)
  const [queueJoining, setQueueJoining] = useState(false)

  useEffect(() => {
    // Check if customer is already seated at a table
    const storedTable = sessionStorage.getItem('mr_jackson_table')
    if (storedTable) {
      try { setSeated(JSON.parse(storedTable)) } catch {}
    }

    const fetchLiveData = () => {
      Promise.all([
        fetch(`/api/queue/settings?_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch(`/api/tables?_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      ]).then(([settingsData, tablesData]) => {
        setSettings(settingsData)
        setTableInfo(tablesData)
        setLoading(false)
      })
    }
    fetchLiveData()
    const interval = setInterval(fetchLiveData, 10000)
    return () => clearInterval(interval)
  }, [])

  const lookupBooking = async () => {
    const cleaned = bookingPhone.replace(/\D/g, '')
    if (!cleaned) return toast.error('Enter your phone number')
    if (cleaned.length < 10) return toast.error('Please enter a valid phone number')
    setBookingLoading(true)
    try {
      const res = await fetch(`/api/bookings/lookup?phone=${encodeURIComponent(cleaned)}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No booking found for this number')
        return
      }
      const b = data.booking
      sessionStorage.setItem('mr_jackson_booking', JSON.stringify(b))
      if (b.table_number) {
        sessionStorage.setItem('mr_jackson_table', JSON.stringify({
          table_number: b.table_number,
          customer_name: b.customer_name,
        }))
      }

      // If they already have an active order, go to tracking page
      if (data.active_order) {
        router.push(`/order/confirmation?order_id=${data.active_order.id}`)
      } else {
        // No order yet, go to ordering page
        router.push(
          `/order/new?context=booking&name=${encodeURIComponent(b.customer_name)}&phone=${encodeURIComponent(b.phone)}&table=${b.table_number || ''}&date=${b.date}&time=${b.time_slot}`
        )
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!queueName.trim()) return toast.error('Please enter your name')
    if (!queuePhone.trim()) return toast.error('Please enter your phone number')
    setQueueJoining(true)
    try {
      const res = await fetch('/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: queueName.trim(), party_size: queuePartySize, phone: stripPhone(queuePhone) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      router.push(`/queue/${data.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setQueueJoining(false)
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
          className="object-cover animate-hero-zoom"
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

        <div className="card w-full max-w-sm shadow-xl animate-slide-up-2">
          <h2 className="text-[18px] font-semibold text-stone-900 mb-1 text-center">
            {seated ? 'Or start fresh' : 'Welcome'}
          </h2>
          <p className="text-stone-400 text-sm mb-5 text-center font-sans">How would you like to dine today?</p>

          <div className="space-y-3">
            {/* Dine In — shows inline queue form when full */}
            {tableInfo?.has_availability === false ? (
              <div className="space-y-2">
                {!showQueueForm ? (
                  <button
                    onClick={() => setShowQueueForm(true)}
                    className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-base"
                  >
                    <span className="text-xl">⏳</span>
                    <span>Join the Waitlist</span>
                  </button>
                ) : (
                  <div className="card border-2 border-amber-300 shadow-lg animate-slide-up">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">⏳</span>
                      <h3 className="font-bold text-stone-900">Join the Waitlist</h3>
                    </div>
                    <form onSubmit={handleJoinQueue} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Name</label>
                        <input type="text" className="input-field" placeholder="e.g. Sarah"
                          value={queueName} onChange={e => setQueueName(e.target.value)}
                          autoComplete="given-name" required autoFocus />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Party Size</label>
                        <div className="flex items-center gap-4 py-2">
                          <button type="button" onClick={() => setQueuePartySize(Math.max(1, queuePartySize - 1))}
                            className="w-11 h-11 rounded-full border border-stone-200 bg-white text-stone-600 font-bold text-lg flex items-center justify-center hover:border-stone-400 transition-all active:scale-95">−</button>
                          <span className="text-2xl font-bold text-stone-900 w-8 text-center font-sans">{queuePartySize}</span>
                          <button type="button" onClick={() => setQueuePartySize(Math.min(12, queuePartySize + 1))}
                            className="w-11 h-11 rounded-full border border-stone-200 bg-white text-stone-600 font-bold text-lg flex items-center justify-center hover:border-stone-400 transition-all active:scale-95">+</button>
                          <span className="text-sm text-stone-400 font-sans">{queuePartySize === 1 ? 'person' : 'people'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Mobile Number</label>
                        <input type="tel" className="input-field" placeholder="04XX XXX XXX"
                          value={queuePhone} onChange={e => setQueuePhone(formatAusPhone(e.target.value))}
                          autoComplete="tel" inputMode="tel" required />
                      </div>
                      <button type="submit" disabled={queueJoining} className="btn-primary w-full py-4 text-base disabled:opacity-50">
                        {queueJoining ? 'Joining...' : 'Join Waitlist'}
                      </button>
                    </form>
                    <button onClick={() => setShowQueueForm(false)}
                      className="w-full text-center text-xs text-stone-400 mt-2 py-1 hover:text-stone-600 font-sans">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleDineIn}
                className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-base"
              >
                <span className="text-xl">🍽️</span>
                <span>Dine In Now</span>
              </button>
            )}

            {/* Book a Table */}
            <Link
              href="/book"
              className="btn-secondary w-full flex items-center justify-center gap-3 py-4 text-base"
            >
              <span className="text-xl">📅</span>
              <span>Book a Table</span>
            </Link>

            {/* Browse menu */}
            <Link
              href="/menu"
              className="btn-secondary w-full flex items-center justify-center gap-3 py-4 text-base card-hover"
            >
              <span className="text-xl">📋</span>
              <span>View Our Menu</span>
            </Link>

            {/* I have a booking — check in by phone */}
            {!seated && !showBookingEntry && (
              <button
                onClick={() => setShowBookingEntry(true)}
                className="w-full text-center text-sm text-stone-400 font-sans hover:text-stone-600 transition-colors pt-1"
              >
                Already have a booking? <span className="font-semibold text-stone-600 underline underline-offset-2">Check in here</span>
              </button>
            )}

            {!seated && showBookingEntry && (
              <div className="bg-stone-50 rounded-2xl p-4 space-y-3 border border-stone-100 animate-slide-up">
                <div className="text-center">
                  <p className="font-semibold text-stone-800 text-sm font-sans">Check in with your phone number</p>
                </div>
                <input
                  type="tel"
                  className="input-field text-center text-lg tracking-wide"
                  placeholder="04XX XXX XXX"
                  value={bookingPhone}
                  onChange={e => setBookingPhone(e.target.value)}
                  inputMode="tel"
                  autoFocus
                />
                <button
                  onClick={lookupBooking}
                  disabled={bookingLoading}
                  className="btn-primary w-full py-3.5 text-base disabled:opacity-50"
                >
                  {bookingLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                      Finding your booking...
                    </span>
                  ) : 'Find My Booking'}
                </button>
                <button
                  onClick={() => { setShowBookingEntry(false); setBookingPhone('') }}
                  className="w-full text-center text-xs text-stone-400 py-0.5 hover:text-stone-600 font-sans transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Gallery strip ── */}
      <ScrollReveal delay={100} direction="up" className="mt-8 w-full">
        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-4 mb-3">From the kitchen</p>
        <div
          className="flex gap-2.5 overflow-x-auto px-4 pb-2 scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {GALLERY.map((src, i) => (
            <div key={i} className="relative w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-md hover:scale-[1.03] transition-transform duration-300">
              <Image src={src} alt="Mr Jackson dish" fill className="object-cover" />
            </div>
          ))}
          <div className="w-2 flex-shrink-0" />
        </div>
      </ScrollReveal>

      {/* ── How It Works ── */}
      <ScrollReveal delay={0} direction="up" className="mt-8 px-4">
        <div className="max-w-sm mx-auto">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-4 text-center">How it works</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '🪑', title: 'Choose', desc: 'Pick your table or join the queue' },
              { icon: '📱', title: 'Order', desc: 'Browse the menu & order from your phone' },
              { icon: '🍽️', title: 'Enjoy', desc: 'Food served right to your table' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl">{step.icon}</span>
                </div>
                <p className="font-semibold text-stone-800 text-xs font-sans">{step.title}</p>
                <p className="text-[10px] text-stone-400 font-sans mt-0.5 leading-tight">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* ── Divider ── */}
      <div className="mx-4 mt-6 border-t border-stone-100" />

      {/* ── Footer info ── */}
      <div className="px-4 pt-5 pb-10 flex flex-col items-center gap-4">
        <ScrollReveal delay={0} direction="up" className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
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
        </ScrollReveal>

        <ScrollReveal delay={120} direction="up" className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-2">
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
        </ScrollReveal>
      </div>
    </main>
  )
}

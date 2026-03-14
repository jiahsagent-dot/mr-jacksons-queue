'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import { ScrollReveal } from '@/components/ScrollReveal'


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

const MENU_HIGHLIGHTS = [
  { name: 'Ricotta Pancakes', desc: 'Housemade granola, seasonal fruit & ice cream', tag: 'Famous' },
  { name: 'Chilli Scrambled Eggs', desc: 'With sourdough & fresh herbs', tag: 'Popular' },
  { name: 'Poke Bowl', desc: 'Fresh, vibrant & packed with flavour', tag: 'Healthy' },
  { name: 'Bao Buns', desc: 'Asian-inspired, handmade daily', tag: 'Signature' },
  { name: 'Waffles & Berries', desc: 'Crispy Belgian waffles with fresh seasonal berries', tag: 'Sweet' },
  { name: 'Corn Fritters', desc: 'Golden, crispy & served with avocado', tag: 'Classic' },
]

const FEATURES = [
  { label: 'Toby Estate Coffee', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg> },
  { label: 'Vegan & GF Options', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2C6.5 2 2 6.5 2 12"/><path d="M2 12c0 3.5 1.5 6.5 4 8.5"/><path d="M12 12c0-5 3-8 8-10"/></svg> },
  { label: 'Fully Licensed', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 2H4l2 7a6 6 0 0 0 12 0l2-7z"/></svg> },
  { label: 'Free WiFi', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg> },
  { label: 'Child Friendly', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg> },
  { label: 'Indoor Fireplace', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M12 2c0 6-4 8-4 12a4 4 0 0 0 8 0c0-4-4-6-4-12z"/><path d="M12 12c0 3-2 4-2 6a2 2 0 0 0 4 0c0-2-2-3-2-6z"/></svg> },
  { label: 'Alfresco Dining', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg> },
  { label: 'Disabled Access', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/></svg> },
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


  useEffect(() => {
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

      if (data.active_order) {
        router.push(`/order/confirmation?order_id=${data.active_order.id}`)
      } else {
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

  const handleDineIn = () => {
    if (tableInfo?.has_availability) {
      router.push('/tables')
    } else {
      router.push('/full')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50 to-stone-100/50">
        <div className="text-center animate-fade-in">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-stone-400 text-sm font-sans">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden bg-gradient-to-b from-stone-50 via-stone-50 to-stone-100/50 texture-overlay">

      {/* ── Hero ── */}
      <div className="relative h-[400px] sm:h-[480px] w-full flex-shrink-0">
        <Image
          src="/images/hero.jpg"
          alt="Mr Jackson Mornington"
          fill
          className="object-cover animate-hero-zoom"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-stone-950/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.3)_100%)]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <div className="animate-header-reveal">
            <Image
              src="/images/logo.png"
              alt="Mr Jackson"
              width={80}
              height={80}
              className="rounded-full shadow-2xl mb-3 ring-2 ring-white/10 mx-auto"
            />
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight drop-shadow-lg">Mr Jackson</h1>
            <div className="h-0.5 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent mx-auto mt-3 mb-2 animate-expand-line" />
            <p className="text-white/60 text-[12px] tracking-[0.2em] uppercase font-sans font-medium">Asian Inspired Café · Mornington</p>
            <p className="text-white/40 text-[11px] font-sans mt-1.5 max-w-[280px] mx-auto leading-relaxed">Beneath the plane tree on Main Street</p>

            {/* Live availability badge */}
            {tableInfo && (
              <div className={`mt-5 inline-flex items-center gap-2.5 backdrop-blur-md text-sm px-5 py-2.5 rounded-full border transition-all duration-500 ${
                tableInfo.has_availability
                  ? 'bg-green-500/15 text-green-200 border-green-400/20'
                  : 'bg-[#1B4332]/20 text-[#F0E0A8] border-[#C9A84C]/20'
              }`}>
                <span className={`w-2 h-2 rounded-full animate-breathe ${
                  tableInfo.has_availability ? 'bg-green-400' : 'bg-[#C9A84C]'
                }`} />
                {tableInfo.has_availability
                  ? `${tableInfo.available_count} table${tableInfo.available_count === 1 ? '' : 's'} available`
                  : `Full · ~${settings?.estimated_wait || 15} min wait`
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Actions ── */}
      <div className="flex flex-col items-center px-4 -mt-10 relative z-10 w-full">
        {/* Already seated banner */}
        {seated && (
          <div className="glass-card rounded-2xl w-full max-w-md p-5 mb-3 border-2 border-green-300/60 bg-gradient-to-br from-green-50/80 to-white/90 shadow-2xl animate-reveal">
            <div className="text-center">
              <p className="text-green-800 font-semibold text-[15px]">You&apos;re at Table {seated.table_number}</p>
              <p className="text-green-600 text-xs font-sans mt-1">Ready to order, {seated.customer_name}?</p>
            </div>
            <Link
              href={`/order/new?context=dine_in&table=${seated.table_number}&name=${encodeURIComponent(seated.customer_name)}`}
              className="btn-primary btn-shine w-full flex items-center justify-center gap-3 py-4 text-base mt-3 shadow-lg shadow-stone-900/10"
            >
              Order &amp; Pay
            </Link>
            <button
              onClick={() => { sessionStorage.removeItem('mr_jackson_table'); setSeated(null) }}
              className="w-full text-center text-xs text-stone-400 mt-2 py-1 hover:text-stone-600 font-sans transition-colors duration-300"
            >
              Not at this table? Clear
            </button>
          </div>
        )}

        <div className="glass-card rounded-3xl w-full max-w-md p-6 shadow-2xl border-2 border-white/60 animate-reveal-1 gold-shimmer-border">
          <h2 className="text-xl font-semibold text-stone-900 mb-1 text-center">
            {seated ? 'Or start fresh' : 'Welcome'}
          </h2>
          <p className="text-stone-400 text-sm mb-1.5 text-center font-sans">How would you like to dine today?</p>
          <div className="ornament mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]/60" />
          </div>

          <div className="space-y-3">
            <button
              onClick={handleDineIn}
              className="btn-primary btn-shine w-full flex items-center justify-center gap-3 py-4 text-base shadow-lg shadow-stone-900/10"
            >
              Dine In Now
            </button>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/book"
                className="btn-secondary flex items-center justify-center gap-2 py-4 text-sm card-hover"
              >
                Book a Table
              </Link>
              <Link
                href="/menu"
                className="btn-secondary flex items-center justify-center gap-2 py-4 text-sm card-hover"
              >
                View Menu
              </Link>
            </div>

            {!seated && !showBookingEntry && (
              <button
                onClick={() => setShowBookingEntry(true)}
                className="w-full text-center text-sm text-stone-400 font-sans hover:text-stone-600 transition-colors duration-300 pt-1"
              >
                Have a booking, queue spot or active order? <span className="font-semibold text-stone-600 underline underline-offset-2">Check in here</span>
              </button>
            )}

            {!seated && showBookingEntry && (
              <div className="bg-gradient-to-br from-stone-50 to-stone-100/50 rounded-2xl p-4 space-y-3 border border-stone-200/60 animate-slide-up">
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
                  className="btn-primary btn-shine w-full py-3.5 text-base disabled:opacity-50"
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
                  className="w-full text-center text-xs text-stone-400 py-0.5 hover:text-stone-600 font-sans transition-colors duration-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── About + Interior side by side ── */}
      <ScrollReveal delay={80} direction="up" className="mt-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-200/60" />
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Our Story</p>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-200/60" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-6 border border-white/60 shadow-lg flex flex-col justify-center">
              <p className="text-stone-600 text-[14px] leading-relaxed font-sans">
                Nestled beneath a majestic plane tree on Mornington&apos;s Main Street, Mr Jackson is an
                Asian-inspired café committed to delivering an unparalleled dining experience.
              </p>
              <div className="ornament mt-4 mb-4">
                <span className="w-1 h-1 rounded-full bg-[#C9A84C]/50" />
              </div>
              <p className="text-stone-500 text-[13px] leading-relaxed font-sans italic text-center">
                &ldquo;Fresh, colourful & made with love — every single morning.&rdquo;
              </p>
            </div>
            <div className="relative h-56 sm:h-auto rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5">
              <Image src="/images/interior.webp" alt="Mr Jackson interior" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white text-sm font-semibold drop-shadow-lg">Warm, Contemporary Setting</p>
                <p className="text-white/70 text-[11px] font-sans mt-0.5">Indoor & alfresco · 90 seats</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ── Gallery strip ── */}
      <ScrollReveal delay={100} direction="up" className="mt-10 w-full">
        <div className="flex items-center gap-3 px-4 mb-4 max-w-2xl mx-auto">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-200/60" />
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">From the kitchen</p>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-200/60" />
        </div>
        <div
          className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {GALLERY.map((src, i) => (
            <div key={i} className="relative w-40 h-48 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg hover:scale-[1.03] transition-transform duration-300 ring-1 ring-black/5">
              <Image src={src} alt="Mr Jackson dish" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          ))}
          <div className="w-2 flex-shrink-0" />
        </div>
      </ScrollReveal>

      {/* ── Menu Highlights ── */}
      <ScrollReveal delay={60} direction="up" className="mt-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-200/60" />
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Menu Highlights</p>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-200/60" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {MENU_HIGHLIGHTS.map((item, i) => (
              <div key={i} className="glass-card rounded-xl px-4 py-3.5 border border-white/60 shadow-sm flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-stone-800 text-sm font-sans">{item.name}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wide">{item.tag}</span>
                  </div>
                  <p className="text-[12px] text-stone-400 font-sans mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/menu"
            className="btn-secondary flex items-center justify-center gap-2 py-3.5 text-sm mt-4 card-hover max-w-xs mx-auto w-full"
          >
            <span>View Full Menu</span>
            <span className="text-stone-400">&rarr;</span>
          </Link>
        </div>
      </ScrollReveal>

      {/* ── Features & Amenities ── */}
      <ScrollReveal delay={40} direction="up" className="mt-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-200/60" />
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">What We Offer</p>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-200/60" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass-card rounded-xl px-3 py-3 border border-white/60 shadow-sm flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#EDE5D8] flex items-center justify-center flex-shrink-0 text-[#0D0D0D]">
                  {f.icon}
                </div>
                <span className="text-[11px] font-medium text-stone-700 font-sans leading-tight">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* ── How It Works ── */}
      <ScrollReveal delay={0} direction="up" className="mt-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-200/60" />
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">How it works</p>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-200/60" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                title: 'Choose',
                desc: 'Pick your table or join the queue',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg>
              },
              {
                title: 'Order',
                desc: 'Browse & pay from your phone',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeWidth="2"/></svg>
              },
              {
                title: 'Enjoy',
                desc: 'Food served right to your table',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
              },
            ].map((step, i) => (
              <div key={i} className="text-center step-connector">
                <div className="w-11 h-11 rounded-2xl bg-[#0D0D0D] text-white flex items-center justify-center mx-auto mb-2.5 shadow-sm">
                  {step.icon}
                </div>
                <p className="font-semibold text-stone-800 text-xs font-sans">{step.title}</p>
                <p className="text-[10px] text-stone-400 font-sans mt-0.5 leading-tight">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* ── Divider ── */}
      <div className="flex items-center justify-center mt-10 px-8 max-w-lg mx-auto w-full">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-200/40" />
        <span className="mx-3 w-1.5 h-1.5 rounded-full bg-[#C9A84C]/30" />
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-200/40" />
      </div>

      {/* ── Footer info ── */}
      <div className="px-4 pt-6 pb-12 w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ScrollReveal delay={0} direction="up" className="w-full">
            <div className="glass-card rounded-2xl p-5 border border-white/60 shadow-lg h-full">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-3">Hours</p>
              <div className="text-sm">
                <div className="flex justify-between text-stone-700">
                  <span className="text-stone-500 font-sans">Every Day</span>
                  <span className="font-medium font-sans">7 AM – 3 PM</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={80} direction="up" className="w-full">
            <div className="glass-card rounded-2xl p-5 border border-white/60 shadow-lg space-y-2.5 h-full">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-3">Find Us</p>
              <a href="https://maps.google.com/?q=1/45+Main+St+Mornington+VIC" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors duration-300 font-sans">
                <span>1/45 Main St, Mornington</span>
              </a>
              <div className="h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
              <a href="tel:0359098815" className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors duration-300 font-sans">
                <span>(03) 5909 8815</span>
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={120} direction="up" className="w-full">
            <div className="glass-card rounded-2xl p-5 border border-white/60 shadow-lg h-full">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-3">Follow Us</p>
              <div className="flex items-center gap-4">
                <a href="https://www.facebook.com/mrjacksonmornington/" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-stone-500 hover:text-stone-800 transition-colors duration-300 font-sans underline underline-offset-2">
                  Facebook
                </a>
                <a href="https://www.instagram.com/mrjacksonmornington/" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-stone-500 hover:text-stone-800 transition-colors duration-300 font-sans underline underline-offset-2">
                  Instagram
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Cuisine tags */}
        <ScrollReveal delay={140} direction="up" className="mt-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['Australian Breakfast', 'Asian Inspired', 'Brunch', 'Burgers', 'Salads', 'Nourish Bowls', 'Boba'].map((tag, i) => (
              <span key={i} className="text-[10px] font-medium px-3 py-1.5 rounded-full bg-[#F0E0A8]/40 text-[#7A5C1E] border border-[#C9A84C]/30 font-sans">
                {tag}
              </span>
            ))}
          </div>
        </ScrollReveal>

        <p className="text-stone-300 text-[10px] font-sans mt-6 text-center">© Mr Jackson · Mornington</p>
      </div>
    </main>
  )
}

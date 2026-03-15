'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { menuData } from '@/lib/menu'
import { useCart } from '@/lib/cart'
import { generateTimeSlots, formatTimeSlot, getAvailableDates } from '@/lib/timeslots'
import Link from 'next/link'
import Image from 'next/image'

const TAG_COLORS: Record<string, string> = {
  V: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  LG: 'bg-amber-50 text-amber-600 border-amber-200',
  VG: 'bg-green-50 text-green-600 border-green-200',
  DF: 'bg-sky-50 text-sky-600 border-sky-200',
}

const CATEGORY_ICONS: Record<string, string> = {
  'All Day Brunch': '🍳', 'Salads & Bowls': '🥗', 'Sandwiches & Toasties': '🥪',
  'Burgers': '🍔', 'Bao Buns': '🥟', 'Something Sweet': '🍯', 'Sides': '🍟',
  'Coffee': '☕', 'Tea & Chai': '🍵', 'Milkshakes': '🥤', 'Smoothies': '🫐',
  'Fresh Juices': '🍊', 'Cold Drinks': '🧊', 'Wine & Sparkling': '🍷',
  'Cocktails': '🍹', 'Beer': '🍺',
}

// Popular/featured items (by id)
const POPULAR_IDS = ['brunch_5', 'brunch_8', 'brunch_9', 'burger_1', 'bowl_2', 'coffee_1']

// Context banner messages
const CONTEXT_BANNERS: Record<string, { emoji: string; title: string; subtitle: string }> = {
  dine_in: { emoji: '🍽️', title: 'Dine-In Order', subtitle: 'Your food will be served to your table' },
  queue: { emoji: '🚀', title: 'Queue Pre-Order', subtitle: 'Your food will be ready the moment you\'re seated' },
  booking: { emoji: '📅', title: 'Pre-Order for Your Booking', subtitle: 'Everything will be freshly prepared when you arrive' },
}

export default function NewOrderPageWrapper() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin"></div>
      </main>
    }>
      <NewOrderPage />
    </Suspense>
  )
}

function NewOrderPage() {
  const searchParams = useSearchParams()
  const context = searchParams.get('context') || ''
  const tableNum = searchParams.get('table') || ''
  const banner = CONTEXT_BANNERS[context]

  const { items, addItem, removeItem, total, count } = useCart()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [diningOption, setDiningOption] = useState<'dine_in' | 'takeaway'>('dine_in')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'menu' | 'details'>('menu')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/menu').then(r => r.json()).then(data => {
      if (data.unavailable?.length) setUnavailable(new Set(data.unavailable))
    }).catch(() => {})
  }, [])

  const orderId = searchParams.get('order_id') || ''
  const orderRef = searchParams.get('order_ref') || ''
  const tableNumber = searchParams.get('table') || ''
  const queueId = searchParams.get('queue_id') || ''

  // Pre-fill from URL params (coming from queue, booking, or table selection)
  useEffect(() => {
    const paramName = searchParams.get('name')
    const paramPhone = searchParams.get('phone')
    const paramDate = searchParams.get('date')
    const paramTime = searchParams.get('time')
    if (paramName) setName(paramName)
    if (paramPhone) setPhone(paramPhone)
    if (paramDate) setSelectedDate(paramDate)
    if (paramTime) setTimeSlot(paramTime)
    if (context === 'dine_in' || context === 'queue') {
      setDiningOption('dine_in')
    }
  }, [searchParams, context])

  const timeSlots = generateTimeSlots(selectedDate)
  const availableDates = getAvailableDates()

  const displayCategories = activeCategory
    ? menuData.categories.filter(c => c.name === activeCategory)
    : menuData.categories

  const isDineIn = context === 'dine_in'
  // Only show date/time pickers if they weren't already provided via URL (e.g. from a booking)
  const hasPrefilledDateTime = !!(searchParams.get('date') && searchParams.get('time'))
  const needsDateTime = context === 'booking' && !hasPrefilledDateTime
  const hasPrefilledName = !!searchParams.get('name')
  const hasPrefilledPhone = !!searchParams.get('phone')

  const handleCheckout = async () => {
    if (!name.trim()) return toast.error('Please enter your name')
    if (!phone.trim()) return toast.error('Please enter your phone number')
    // Validate AU phone number: strip spaces/dashes, must be 10 digits starting with 0 or 04
    const phoneDigits = phone.replace(/[\s\-\(\)\+]/g, '')
    const isValidAU = /^0[0-9]{9}$/.test(phoneDigits) || /^61[0-9]{9}$/.test(phoneDigits)
    if (!isValidAU) return toast.error('Please enter a valid Australian phone number (e.g. 0483 880 253)')
    if (needsDateTime && !selectedDate) return toast.error('Please select a date')
    if (needsDateTime && !timeSlot) return toast.error('Please select a time')
    if (items.length === 0) return toast.error('Your cart is empty')

    setLoading(true)
    try {
      const res = await fetch('/api/order/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          date: selectedDate,
          time_slot: timeSlot,
          dining_option: diningOption,
          items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          notes: notes.trim() || undefined,
          ...(orderId ? { order_id: orderId } : {}),
          ...(tableNumber ? { table_number: parseInt(tableNumber) } : {}),
          ...(queueId ? { queue_entry_id: queueId } : {}),
        }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error('Server error — please try again') }
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      if (!data.checkout_url) throw new Error('No checkout URL returned — please try again')
      window.location.href = data.checkout_url
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header with photo */}
      <div className="relative h-[180px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover animate-hero-zoom" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link href="/join" className="absolute top-4 left-4 text-white/70 text-sm hover:text-white font-sans">← Back</Link>
          <Image src="/images/logo.png" alt="Mr Jackson" width={48} height={48} className="rounded-full shadow-lg mb-2" />
          <h1 className="text-2xl font-bold drop-shadow-lg">Order & Pay</h1>
          <div className="w-6 h-0.5 bg-amber-500 mx-auto mt-1.5"></div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 -mt-4">
        {/* Context Banner */}
        {banner && (
          <div className="card border-2 border-amber-200 bg-amber-50/50 mb-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{banner.emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-stone-800 text-sm">{banner.title}{tableNum ? ` · Table ${tableNum}` : ''}</p>
                <p className="text-stone-500 text-xs font-sans">{banner.subtitle}</p>
              </div>
              {orderRef && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide font-sans">Order #</p>
                  <p className="text-lg font-bold text-stone-900 tracking-widest">{orderRef}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="flex items-center justify-center gap-0 mb-5">
          <button
            onClick={() => setStep('menu')}
            className={`text-sm px-5 py-2.5 rounded-l-full font-medium transition-all font-sans border ${
              step === 'menu' ? 'bg-stone-900 text-white border-stone-900 shadow-sm z-10' : 'bg-white text-stone-400 border-stone-200'
            }`}
          >
            🍽️ Menu
          </button>
          <button
            onClick={() => count > 0 ? setStep('details') : toast.error('Add items first')}
            className={`text-sm px-5 py-2.5 rounded-r-full font-medium transition-all font-sans border -ml-px ${
              step === 'details' ? 'bg-stone-900 text-white border-stone-900 shadow-sm z-10' : 'bg-white text-stone-400 border-stone-200'
            }`}
          >
            💳 Pay{count > 0 ? ` (${count})` : ''}
          </button>
        </div>

        {step === 'menu' && (
          <>
            {/* Popular Picks */}
            {!activeCategory && (
              <div className="mb-5 animate-slide-up">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔥</span>
                  <h2 className="text-sm font-bold text-stone-900 font-sans">Popular Picks</h2>
                </div>
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {menuData.categories.flatMap(c => c.items).filter(item => POPULAR_IDS.includes(item.id) && !unavailable.has(item.name)).map(item => {
                    const inCart = items.find(i => i.id === item.id)
                    return (
                      <div key={item.id} className="flex-shrink-0 w-[140px] bg-white rounded-2xl border border-stone-100 p-3 shadow-sm">
                        <h4 className="font-semibold text-stone-800 text-[12px] font-sans leading-tight mb-1">{item.name}</h4>
                        <p className="text-[11px] text-stone-400 font-sans mb-2 line-clamp-2">{item.description?.slice(0, 40)}...</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-600 font-sans">${item.price.toFixed(2)}</span>
                          {inCart ? (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-sans">{inCart.quantity}×</span>
                          ) : (
                            <button onClick={() => addItem(item)} className="text-[10px] font-bold text-white bg-stone-900 px-3 py-1 rounded-full font-sans active:scale-95 transition-transform">Add</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div className="w-2 flex-shrink-0" />
                </div>
              </div>
            )}

            {/* Category Grid */}
            <div className="mb-5">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`py-1.5 px-3 rounded-full text-[11px] font-medium transition-all font-sans ${
                    !activeCategory ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                  }`}
                >All</button>
                {menuData.categories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                    className={`py-1.5 px-3 rounded-full text-[11px] font-medium transition-all font-sans ${
                      activeCategory === cat.name ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                    }`}
                  >{cat.name}</button>
                ))}
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-6 pb-28">
              {displayCategories.map(cat => (
                <section key={cat.name}>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-lg font-bold text-stone-900">{cat.name}</h2>
                    <div className="flex-1 h-px bg-stone-100 ml-2"></div>
                  </div>
                  <div className="space-y-1">
                    {cat.items.map(item => {
                      const inCart = items.find(i => i.id === item.id)
                      const soldOut = unavailable.has(item.name)
                      return (
                        <div key={item.id} className={`flex items-center gap-3 py-3 px-3 rounded-2xl transition-colors -mx-1 group ${soldOut ? 'opacity-40' : 'hover:bg-white/80'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`font-semibold text-[14px] font-sans ${soldOut ? 'text-stone-400 line-through' : 'text-stone-800'}`}>{item.name}</h3>
                              {soldOut ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-200">SOLD OUT</span>
                              ) : (
                                item.tags.map(tag => (
                                  <span key={tag} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${TAG_COLORS[tag] || ''}`}>{tag}</span>
                                ))
                              )}
                            </div>
                            {item.description && !soldOut && (
                              <p className="text-[12px] text-stone-400 mt-0.5 font-sans leading-relaxed">{item.description}</p>
                            )}
                            <p className={`text-[14px] font-bold mt-0.5 font-sans ${soldOut ? 'text-stone-300' : 'text-stone-600'}`}>${item.price.toFixed(2)}</p>
                          </div>
                          {!soldOut && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {inCart ? (
                                <>
                                  <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 font-bold text-lg flex items-center justify-center transition-colors">−</button>
                                  <span className="w-7 text-center font-bold text-stone-900 text-sm font-sans">{inCart.quantity}</span>
                                  <button onClick={() => addItem(item)} className="w-8 h-8 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-lg flex items-center justify-center transition-colors">+</button>
                                </>
                              ) : (
                                <button onClick={() => addItem(item)} className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold font-sans transition-colors shadow-sm">
                                  Add
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

        {step === 'details' && (
          <div className="space-y-4 pb-10 animate-fade-in">
            {/* Order Summary */}
            <div className="card">
              <h2 className="text-lg font-bold text-stone-900 mb-3">Your Order</h2>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm font-sans">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-300 font-medium">{item.quantity}×</span>
                      <span className="text-stone-700">{item.name}</span>
                    </div>
                    <span className="font-semibold text-stone-600 tabular-nums">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-stone-100 pt-3 mt-3 flex justify-between font-bold text-stone-900">
                  <span>Total</span>
                  <span className="tabular-nums">${total.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={() => setStep('menu')} className="text-xs text-stone-400 underline mt-3 font-sans">Edit order</button>
            </div>

            {/* Dine In / Takeaway — hide when context already decided */}
            {!context && (
              <div className="card">
                <h2 className="text-lg font-bold text-stone-900 mb-3">How are you dining?</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDiningOption('dine_in')}
                    className={`py-5 rounded-2xl text-center font-medium border-2 transition-all font-sans ${
                      diningOption === 'dine_in'
                        ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                        : 'bg-white text-stone-400 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">🍽️</span>
                    <span className="text-sm">Eat In</span>
                  </button>
                  <button
                    onClick={() => setDiningOption('takeaway')}
                    className={`py-5 rounded-2xl text-center font-medium border-2 transition-all font-sans ${
                      diningOption === 'takeaway'
                        ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                        : 'bg-white text-stone-400 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">🛍️</span>
                    <span className="text-sm">Takeaway</span>
                  </button>
                </div>
              </div>
            )}

            {/* Details — show locked summary if pre-filled, otherwise show inputs */}
            {(hasPrefilledName && hasPrefilledPhone) ? (
              <div className="card bg-stone-50 border-stone-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-sans mb-2">Your Details</p>
                    <p className="font-semibold text-stone-800 text-sm font-sans">{name}</p>
                    {phone && <p className="text-stone-500 text-xs font-sans mt-0.5">{phone}</p>}
                  </div>
                  <span className="text-green-500 text-lg mt-0.5">✓</span>
                </div>
                {/* Still allow email for receipt */}
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5 font-sans">
                    Email <span className="normal-case text-stone-300 font-normal">(optional — for receipt)</span>
                  </label>
                  <input type="email" className="input-field bg-white" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="card">
                <h2 className="text-lg font-bold text-stone-900 mb-3">Your Details</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 font-sans">Name</label>
                    <input type="text" className="input-field" placeholder="e.g. Sarah" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 font-sans">Mobile Number</label>
                    <input type="tel" className="input-field" placeholder="04XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 font-sans">
                      Email <span className="normal-case text-stone-300 font-normal">(optional — for receipt)</span>
                    </label>
                    <input type="email" className="input-field" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Date & Time — only needed for bookings where not already provided */}
            {needsDateTime && (
              <>
                <div className="card">
                  <h2 className="text-lg font-bold text-stone-900 mb-3">Select Date</h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableDates.map(d => (
                      <button
                        key={d.value}
                        onClick={() => setSelectedDate(d.value)}
                        className={`py-3 px-2 rounded-xl text-sm font-medium border transition-all font-sans ${
                          selectedDate === d.value ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'
                        }`}
                      >{d.label}</button>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h2 className="text-lg font-bold text-stone-900 mb-3">Select Time</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setTimeSlot(slot)}
                        className={`py-3 px-3 rounded-xl text-sm font-medium border transition-all font-sans ${
                          timeSlot === slot ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'
                        }`}
                      >{formatTimeSlot(slot)}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Booking summary — shown when date/time already provided (no re-entry needed) */}
            {context === 'booking' && hasPrefilledDateTime && (
              <div className="card bg-stone-50 border-stone-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-sans">Your Booking</p>
                    <p className="font-semibold text-stone-800 text-sm font-sans">
                      {selectedDate} at {timeSlot ? formatTimeSlot(timeSlot) : ''}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-green-500 text-lg">✓</span>
                  </div>
                </div>
              </div>
            )}

            {/* Special Requests */}
            <div className="card">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 font-sans">
                Special Requests <span className="normal-case text-stone-300 font-normal">(optional)</span>
              </label>
              <textarea
                className="input-field resize-none"
                rows={2}
                placeholder="Allergies, dietary needs, special occasions..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={500}
              />
            </div>

            {/* Pay */}
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn-primary w-full py-4 text-lg disabled:opacity-50 shadow-md"
            >
              {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
            </button>
            <p className="text-xs text-stone-400 text-center font-sans pb-4">🔒 Secure payment via Stripe</p>
          </div>
        )}

        {/* Sticky Cart Bar */}
        {count > 0 && step === 'menu' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}>
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => setStep('details')}
                className="btn-primary w-full flex justify-between items-center py-4"
              >
                <span className="font-sans">View Order · {count} {count === 1 ? 'item' : 'items'}</span>
                <span className="font-bold font-sans tabular-nums">${total.toFixed(2)}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

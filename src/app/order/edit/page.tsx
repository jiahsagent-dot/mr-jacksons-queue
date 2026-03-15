'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { menuData } from '@/lib/menu'
import Link from 'next/link'
import Image from 'next/image'

const TAG_COLORS: Record<string, string> = {
  V: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  LG: 'bg-amber-50 text-amber-600 border-amber-200',
  VG: 'bg-green-50 text-green-600 border-green-200',
  DF: 'bg-sky-50 text-sky-600 border-sky-200',
}

type CartItem = { id: string; name: string; price: number; quantity: number }
type OrderData = {
  id: string
  customer_name: string
  items: CartItem[]
  dining_option: string
  date?: string
  time_slot?: string
  status: string
}

function canEdit(date?: string, timeSlot?: string): boolean {
  if (!date || !timeSlot) return true
  const [h, m] = timeSlot.split(':').map(Number)
  const bookingTime = new Date(date)
  bookingTime.setHours(h, m, 0, 0)
  return new Date() < new Date(bookingTime.getTime() - 60 * 60 * 1000)
}

function EditContent() {
  const params = useSearchParams()
  const router = useRouter()
  const orderId = params.get('order_id') || ''

  const [order, setOrder] = useState<OrderData | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<'menu' | 'review'>('menu')

  useEffect(() => {
    if (!orderId) { router.push('/join'); return }
    fetch(`/api/order/status?id=${orderId}`)
      .then(r => r.json())
      .then(data => {
        const o = data.order
        if (!o) { toast.error('Order not found'); router.push('/join'); return }
        if (o.dining_option !== 'booking') { toast.error('Only booking pre-orders can be edited'); router.push(`/order/confirmation?order_id=${orderId}`); return }
        if (!canEdit(o.date, o.time_slot)) { toast.error('Order editing is closed — less than 1 hour until your booking'); router.push(`/order/confirmation?order_id=${orderId}`); return }
        setOrder(o)
        setCart(o.items || [])
      })
      .catch(() => { toast.error('Could not load order'); router.push('/join') })
      .finally(() => setLoading(false))

    fetch('/api/menu').then(r => r.json()).then(data => {
      if (data.unavailable?.length) setUnavailable(new Set(data.unavailable))
    }).catch(() => {})
  }, [orderId])

  const addItem = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
  }

  const removeItem = (id: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id)
      if (!existing) return prev
      if (existing.quantity <= 1) return prev.filter(i => i.id !== id)
      return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const originalTotal = (order?.items || []).reduce((sum, i) => sum + i.price * i.quantity, 0)
  const diff = cartTotal - originalTotal

  const handleSave = async () => {
    if (cart.length === 0) return toast.error('Your order cannot be empty')
    setSaving(true)
    try {
      const res = await fetch('/api/order/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, new_items: cart }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Could not save changes'); return }

      if (data.checkout_url) {
        // Additional items to pay for
        window.location.href = data.checkout_url
      } else if (data.refund_pending) {
        toast.success('Order updated! A refund of $' + data.refund_pending + ' will be processed by our team within 24 hours.')
        setTimeout(() => router.push(`/order/confirmation?order_id=${orderId}`), 2500)
      } else {
        toast.success('Order updated!')
        setTimeout(() => router.push(`/order/confirmation?order_id=${orderId}`), 1000)
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const displayCategories = activeCategory
    ? menuData.categories.filter(c => c.name === activeCategory)
    : menuData.categories

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
      </main>
    )
  }

  if (!order) return null

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="relative h-[160px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover animate-hero-zoom" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link href={`/order/confirmation?order_id=${orderId}`} className="absolute top-4 left-4 text-white/70 text-sm hover:text-white font-sans">← Back</Link>
          <h1 className="text-2xl font-bold drop-shadow-lg">Edit Order</h1>
          <div className="w-6 h-0.5 bg-amber-500 mx-auto mt-1.5" />
          <p className="text-white/60 text-xs mt-1.5 font-sans">Booking for {order.customer_name}</p>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 -mt-4">

        {/* Step tabs */}
        <div className="flex items-center justify-center gap-0 mb-5">
          <button onClick={() => setStep('menu')} className={`text-sm px-5 py-2.5 rounded-l-full font-medium transition-all font-sans border ${step === 'menu' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-400 border-stone-200'}`}>
            🍽️ Menu
          </button>
          <button onClick={() => cartCount > 0 ? setStep('review') : toast.error('Cart is empty')} className={`text-sm px-5 py-2.5 rounded-r-full font-medium transition-all font-sans border -ml-px ${step === 'review' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-400 border-stone-200'}`}>
            ✏️ Review{cartCount > 0 ? ` (${cartCount})` : ''}
          </button>
        </div>

        {step === 'menu' && (
          <>
            {/* Category Filter */}
            <div className="mb-5">
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setActiveCategory(null)} className={`py-1.5 px-3 rounded-full text-[11px] font-medium transition-all font-sans ${!activeCategory ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400'}`}>All</button>
                {menuData.categories.map(cat => (
                  <button key={cat.name} onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)} className={`py-1.5 px-3 rounded-full text-[11px] font-medium transition-all font-sans ${activeCategory === cat.name ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400'}`}>{cat.name}</button>
                ))}
              </div>
            </div>

            {/* Menu */}
            <div className="space-y-6 pb-28">
              {displayCategories.map(cat => (
                <section key={cat.name}>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-lg font-bold text-stone-900">{cat.name}</h2>
                    <div className="flex-1 h-px bg-stone-100 ml-2" />
                  </div>
                  <div className="space-y-1">
                    {cat.items.map(item => {
                      const inCart = cart.find(i => i.id === item.id)
                      const soldOut = unavailable.has(item.name)
                      return (
                        <div key={item.id} className={`flex items-center gap-3 py-3 px-3 rounded-2xl transition-colors -mx-1 ${soldOut ? 'opacity-40' : 'hover:bg-white/80'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`font-semibold text-[14px] font-sans ${soldOut ? 'text-stone-400 line-through' : 'text-stone-800'}`}>{item.name}</h3>
                              {!soldOut && item.tags.map(tag => (
                                <span key={tag} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${TAG_COLORS[tag] || ''}`}>{tag}</span>
                              ))}
                            </div>
                            {item.description && !soldOut && <p className="text-[12px] text-stone-400 mt-0.5 font-sans">{item.description}</p>}
                            <p className={`text-[14px] font-bold mt-0.5 font-sans ${soldOut ? 'text-stone-300' : 'text-stone-600'}`}>${item.price.toFixed(2)}</p>
                          </div>
                          {!soldOut && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {inCart ? (
                                <>
                                  <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 font-bold text-lg flex items-center justify-center">−</button>
                                  <span className="w-7 text-center font-bold text-stone-900 text-sm font-sans">{inCart.quantity}</span>
                                  <button onClick={() => addItem(item)} className="w-8 h-8 rounded-full bg-stone-900 text-white font-bold text-lg flex items-center justify-center">+</button>
                                </>
                              ) : (
                                <button onClick={() => addItem(item)} className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold font-sans shadow-sm">Add</button>
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

        {step === 'review' && (
          <div className="space-y-4 pb-10 animate-fade-in">
            {/* Updated order summary */}
            <div className="card">
              <h2 className="text-base font-bold text-stone-900 mb-3">Updated Order</h2>
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm font-sans">
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeItem(item.id)} className="w-6 h-6 rounded-full bg-stone-100 text-stone-400 text-xs flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors">−</button>
                      <span className="text-stone-300 font-medium">{item.quantity}×</span>
                      <span className="text-stone-700">{item.name}</span>
                    </div>
                    <span className="font-semibold text-stone-600 tabular-nums">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-stone-100 pt-3 mt-3 flex justify-between font-bold text-stone-900">
                  <span>New Total</span>
                  <span className="tabular-nums">${cartTotal.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={() => setStep('menu')} className="text-xs text-stone-400 underline mt-3 font-sans">Continue editing</button>
            </div>

            {/* Payment / refund summary */}
            {diff > 0 && (
              <div className="card border-2 border-amber-200 bg-amber-50/40">
                <p className="text-sm font-semibold text-stone-800 font-sans">Additional payment required</p>
                <p className="text-xs text-stone-500 font-sans mt-1">You added items worth <span className="font-bold text-stone-800">${diff.toFixed(2)}</span>. You'll be taken to checkout to pay the difference.</p>
              </div>
            )}
            {diff < 0 && (
              <div className="card border-2 border-green-200 bg-green-50/40">
                <p className="text-sm font-semibold text-stone-800 font-sans">Refund of ${Math.abs(diff).toFixed(2)}</p>
                <p className="text-xs text-stone-500 font-sans mt-1">You removed items. Our team will process your refund within 24 hours.</p>
              </div>
            )}
            {diff === 0 && (
              <div className="card border-2 border-stone-100 bg-stone-50">
                <p className="text-xs text-stone-500 font-sans text-center">No change to your total — we'll update your order immediately.</p>
              </div>
            )}

            <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-4 text-base disabled:opacity-50">
              {saving ? 'Saving...' : diff > 0 ? `Pay $${diff.toFixed(2)} & Update Order` : 'Save Changes'}
            </button>
            <p className="text-xs text-stone-400 text-center font-sans">🔒 Secure payment via Stripe</p>
          </div>
        )}

        {/* Sticky cart bar */}
        {cartCount > 0 && step === 'menu' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 pt-3 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}>
            <div className="max-w-2xl mx-auto">
              <button onClick={() => setStep('review')} className="btn-primary w-full flex justify-between items-center py-4">
                <span className="font-sans">Review Changes · {cartCount} items</span>
                <span className="font-bold font-sans tabular-nums">${cartTotal.toFixed(2)}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function EditOrderPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
      </main>
    }>
      <EditContent />
    </Suspense>
  )
}

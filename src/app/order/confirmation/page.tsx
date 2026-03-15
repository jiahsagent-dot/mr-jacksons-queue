'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'

type OrderData = {
  id: string
  customer_name: string
  phone: string
  time_slot?: string
  date?: string
  dining_option?: string
  table_number?: number
  queue_entry_id?: string
  items: { name: string; quantity: number; price: number }[]
  status: string
  created_at: string
}

function ConfirmationContent() {
  const params = useSearchParams()
  const router = useRouter()
  const orderId = params.get('order_id')
  const [order, setOrder] = useState<OrderData | null>(null)
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const [queueTable, setQueueTable] = useState<number | null>(null)
  const [queueStatus, setQueueStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const fetchOrder = async () => {
    if (!orderId) { setLoading(false); return }
    try {
      const res = await fetch(`/api/order/status?id=${orderId}&_t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      const o = data.order
      setOrder(o)
      if (o?.queue_entry_id) {
        const qRes = await fetch(`/api/queue/status?id=${o.queue_entry_id}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null)
        if (qRes?.entry) {
          setQueueStatus(qRes.entry.status)
          if (qRes.entry.status === 'waiting' && qRes.position) {
            setQueuePosition(qRes.position)
          } else {
            setQueuePosition(null)
          }
          if (qRes.entry.assigned_table) {
            setQueueTable(qRes.entry.assigned_table)
          }
        }
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchOrder()
    // Poll for status updates every 5 seconds
    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-stone-400 font-sans mb-4">We couldn't find your order — but don't worry, if your payment went through it was received.</p>
        <Link href="/join" className="btn-primary">Back to Home</Link>
      </div>
    )
  }

  const total = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const orderRef = order.id.replace(/-/g, '').slice(0, 6).toUpperCase()
  const isDineIn = order.dining_option === 'dine_in'
  const isBooking = order.dining_option === 'booking'

  function formatTimeSlot(slot: string) {
    if (!slot) return ''
    const [h, m] = slot.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
  }
  function formatDate(d: string) {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Hero header */}
      <div className="relative overflow-hidden">
        <div className="relative h-[200px]">
          <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/80" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 text-white text-center px-4">
          <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center mb-3 shadow-lg animate-confetti">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold drop-shadow-lg">You're all set, {order.customer_name}!</h1>
          <p className="text-white/70 text-sm font-sans mt-1">Thank you for your order — we're on it 🙌</p>
        </div>
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-5 space-y-4">

        {/* Order number */}
        <div className="card text-center border-2 border-amber-200 bg-amber-50/60 animate-slide-up">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest font-sans mb-1">Your Order Number</p>
          <p className="text-4xl font-bold text-stone-900 tracking-widest animate-count-in">{orderRef}</p>
          <p className="text-xs text-stone-400 font-sans mt-2">Keep this handy — our team will use it to find you</p>
        </div>

        {/* Table number card — shown for dine-in orders with a table assigned (not bookings) */}
        {isDineIn && !isBooking && order.table_number && (
          <div className="card text-center border-2 border-stone-200 bg-white animate-slide-up">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest font-sans mb-1">Your Table</p>
            <p className="text-4xl font-bold text-stone-900 tracking-widest">{order.table_number}</p>
            <p className="text-xs text-stone-400 font-sans mt-2">Sit back — your food will be brought to you</p>
          </div>
        )}

        {/* Queue status — shows position while waiting, table number when seated */}
        {queueStatus === 'waiting' && queuePosition !== null && (
          <div className="card border-2 border-amber-200 bg-amber-50/60 text-center">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest font-sans mb-1">Your Queue Position</p>
            <p className="text-4xl font-bold text-stone-900 font-sans">#{queuePosition}</p>
            <p className="text-xs text-stone-400 font-sans mt-2">
              {queuePosition === 1 ? "You're next — a table won't be long!" : `${queuePosition - 1} ${queuePosition - 1 === 1 ? 'party' : 'parties'} ahead of you`}
            </p>
            <p className="text-xs text-stone-400 font-sans mt-1">We'll text you when your table is ready 📱</p>
          </div>
        )}

        {/* Table assigned — shown when queue entry is called/seated */}
        {queueTable && queueStatus !== 'waiting' && (
          <div className="card border-2 border-green-200 bg-green-50/60 text-center animate-slide-up">
            <p className="text-xs font-bold text-green-600 uppercase tracking-widest font-sans mb-1">Your Table is Ready!</p>
            <p className="text-4xl font-bold text-green-800 font-sans">Table {queueTable}</p>
            <p className="text-xs text-green-600 font-sans mt-2">🍽️ Your food is being prepared — head to your table!</p>
          </div>
        )}

        {/* Live Order Status Tracker */}
        {order.status !== 'served' && order.status !== 'cancelled' && (
          <div className="card border-2 border-stone-100 animate-slide-up-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wide font-sans">Order Status</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-stone-300 font-sans">Live</span>
              </div>
            </div>
            <div className="flex items-center gap-0">
              {['received', 'preparing', 'ready'].map((s, i) => {
                const steps = ['received', 'preparing', 'ready']
                const currentIdx = steps.indexOf(order.status)
                const isActive = i <= currentIdx
                const isCurrent = s === order.status
                const labels = { received: 'Received', preparing: 'Preparing', ready: 'Ready' }
                return (
                  <div key={s} className="flex-1 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-400'
                    } ${isCurrent ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
                      {isActive ? '✓' : i + 1}
                    </div>
                    <p className={`text-[10px] font-sans mt-1.5 font-medium ${isActive ? 'text-stone-900' : 'text-stone-400'}`}>
                      {labels[s as keyof typeof labels]}
                    </p>
                    {i < 2 && (
                      <div className={`absolute h-0.5 w-[calc(33%-16px)] ${isActive && i < currentIdx ? 'bg-stone-900' : 'bg-stone-100'}`}
                        style={{ top: '14px', left: `calc(${(i * 33.33) + 16.67}% + 16px)` }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SMS notice */}
        <div className="flex items-start gap-3 bg-white rounded-2xl border border-stone-100 px-4 py-3 shadow-sm">
          <span className="text-xl mt-0.5">📱</span>
          <div>
            <p className="text-sm font-semibold text-stone-800">Receipt sent via SMS</p>
            <p className="text-xs text-stone-400 font-sans mt-0.5">A copy of your order has been sent to your phone. We'll text you when your food is ready. Track progress live above ☝️</p>
          </div>
        </div>

        {/* Dine-in info */}
        {isDineIn && (
          <div className="flex items-start gap-3 bg-white rounded-2xl border border-stone-100 px-4 py-3 shadow-sm">
            <span className="text-xl mt-0.5">🍽️</span>
            <div>
              <p className="text-sm font-semibold text-stone-800">Dine In</p>
              <p className="text-xs text-stone-400 font-sans mt-0.5">Sit back and relax — your food will be brought to you shortly.</p>
            </div>
          </div>
        )}

        {/* Booking pre-order info */}
        {isBooking && (
          <div className="flex items-start gap-3 bg-white rounded-2xl border border-stone-100 px-4 py-3 shadow-sm">
            <span className="text-xl mt-0.5">📅</span>
            <div>
              <p className="text-sm font-semibold text-stone-800">Booking Pre-Order</p>
              {order.date && order.time_slot ? (
                <p className="text-xs text-stone-400 font-sans mt-0.5">
                  Your food will be freshly prepared and ready at {formatTimeSlot(order.time_slot)} on {formatDate(order.date)}.
                </p>
              ) : (
                <p className="text-xs text-stone-400 font-sans mt-0.5">Your food will be freshly prepared and ready when you arrive.</p>
              )}
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="card">
          <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wide mb-3 font-sans">Your Order</h2>
          <div className="space-y-2 mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm font-sans">
                <div className="flex gap-2">
                  <span className="text-stone-300 font-medium">{item.quantity}×</span>
                  <span className="text-stone-700">{item.name}</span>
                </div>
                <span className="text-stone-500 tabular-nums">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 pt-3 flex justify-between font-bold text-stone-900">
            <span>Total Paid</span>
            <span className="tabular-nums">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions — Add more / Cancel */}
        {order.status !== 'served' && order.status !== 'cancelled' && (
          <div className="space-y-3">
            {/* Add more items */}
            <Link
              href={`/order/new?context=${order.dining_option === 'dine_in' ? 'dine_in' : 'booking'}&table=${order.table_number || ''}&name=${encodeURIComponent(order.customer_name)}&phone=${encodeURIComponent(order.phone || '')}`}
              className="card flex items-center gap-4 hover:border-stone-300 transition-all active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">➕</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-stone-800 text-sm font-sans">Add More Items</p>
                <p className="text-xs text-stone-400 font-sans">Order something else from the menu</p>
              </div>
              <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>

            {/* Cancel order */}
            {order.status === 'received' && !showCancelConfirm && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full text-center text-sm text-stone-400 font-sans hover:text-red-500 transition-colors py-2"
              >
                Need to cancel your order?
              </button>
            )}

            {showCancelConfirm && (
              <div className="card border-2 border-red-200 bg-red-50/50 animate-slide-up">
                <div className="text-center mb-3">
                  <p className="text-2xl mb-1">⚠️</p>
                  <p className="font-semibold text-stone-800 text-sm font-sans">Cancel your order?</p>
                  <p className="text-xs text-stone-400 font-sans mt-1">This can't be undone. You'll receive a refund.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="btn-secondary flex-1 py-3 text-sm"
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={async () => {
                      setCancelling(true)
                      try {
                        const res = await fetch('/api/order/cancel', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ order_id: orderId }),
                        })
                        if (res.ok) {
                          toast.success('Order cancelled')
                          fetchOrder()
                          setShowCancelConfirm(false)
                        } else {
                          const data = await res.json()
                          toast.error(data.error || 'Could not cancel — contact staff')
                        }
                      } catch {
                        toast.error('Something went wrong')
                      }
                      setCancelling(false)
                    }}
                    disabled={cancelling}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                </div>
              </div>
            )}

            {order.status !== 'received' && !showCancelConfirm && (
              <div className="text-center">
                <p className="text-xs text-stone-300 font-sans">Order is being prepared — contact staff to make changes</p>
                <a href="tel:0359098815" className="text-xs text-stone-400 font-sans font-semibold hover:text-stone-600">📞 03 5909 8815</a>
              </div>
            )}
          </div>
        )}

        {/* Cancelled state */}
        {order.status === 'cancelled' && (
          <div className="card border-2 border-red-200 bg-red-50/50 text-center">
            <p className="text-2xl mb-2">❌</p>
            <p className="font-semibold text-stone-800 font-sans">Order Cancelled</p>
            <p className="text-xs text-stone-400 font-sans mt-1">Your refund will be processed shortly</p>
            <Link href="/join" className="btn-primary inline-block mt-4 px-8">
              Back to Home
            </Link>
          </div>
        )}

        {/* Footer message */}
        <div className="text-center py-2 space-y-3">
          {order.status !== 'cancelled' && (
            <p className="text-stone-500 text-sm font-sans">We hope you enjoy every bite. 😊</p>
          )}
          <p className="text-stone-400 text-xs font-sans">Questions? Call us on <span className="font-semibold">03 5909 8815</span></p>
          <Link href="/join" className="block text-stone-400 text-xs font-sans underline underline-offset-2 mt-2">
            Back to home
          </Link>
        </div>

      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin"></div>
      </main>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}

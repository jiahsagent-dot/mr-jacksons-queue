'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatTimeSlot, formatDate } from '@/lib/timeslots'

type OrderData = {
  id: string
  customer_name: string
  phone: string
  time_slot: string
  date?: string
  dining_option?: string
  items: { name: string; quantity: number; price: number }[]
  status: string
  created_at: string
}

function ConfirmationContent() {
  const params = useSearchParams()
  const orderId = params.get('order_id')
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) { setLoading(false); return }
    fetch(`/api/order/status?id=${orderId}`)
      .then(r => r.json())
      .then(data => { setOrder(data.order); setLoading(false) })
      .catch(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-stone-400 text-sm font-sans">Loading your receipt...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-stone-400 font-sans">Order not found</p>
        <Link href="/order/new" className="btn-primary mt-4">Place New Order</Link>
      </div>
    )
  }

  const total = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const orderDate = new Date(order.created_at)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-b from-green-800 to-green-900 text-white px-4 pt-12 pb-8 text-center">
        <div className="animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-3xl font-bold">Order Confirmed!</h1>
          <p className="text-green-200 mt-1 font-sans">Thanks, {order.customer_name}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 -mt-5">
        {/* Receipt Card */}
        <div className="card w-full max-w-sm border-2 border-green-200 animate-slide-up">
          {/* Restaurant Info */}
          <div className="text-center border-b border-stone-100 pb-4 mb-4">
            <h2 className="text-xl font-bold text-stone-900">Mr Jackson</h2>
            <p className="text-xs text-stone-400 font-sans">1/45 Main St, Mornington VIC 3931</p>
            <p className="text-xs text-stone-400 font-sans mt-1">
              {orderDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              {orderDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Dining + Pickup */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 mb-4 text-center">
            <p className="text-lg mb-1">{order.dining_option === 'takeaway' ? '🛍️ Takeaway' : '🍽️ Eat In'}</p>
            <p className="text-xs text-amber-600 uppercase tracking-wide font-semibold font-sans">Pickup</p>
            {order.date && <p className="text-sm font-semibold text-amber-700 font-sans">{formatDate(order.date)}</p>}
            <p className="text-2xl font-bold text-amber-800">{formatTimeSlot(order.time_slot)}</p>
          </div>

          {/* Items */}
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

          {/* Total */}
          <div className="border-t border-stone-200 pt-3 flex justify-between font-bold text-stone-900 text-lg">
            <span>Total Paid</span>
            <span className="tabular-nums">${total.toFixed(2)}</span>
          </div>

          {/* Order ID */}
          <div className="mt-4 bg-stone-50 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-stone-400 font-sans font-mono">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3 text-center animate-fade-in">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 max-w-sm">
            <p className="text-sm text-amber-800 font-sans font-medium">📱 Show this receipt when you pick up</p>
          </div>
          <Link href="/order/new" className="block text-stone-500 underline underline-offset-2 text-sm font-sans">
            Place another order
          </Link>
          <Link href="/join" className="block text-stone-400 text-xs font-sans">
            Back to queue
          </Link>
        </div>

        <div className="mt-auto py-6">
          <p className="text-stone-300 text-xs font-sans text-center">Thank you for ordering at Mr Jackson 🙂</p>
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

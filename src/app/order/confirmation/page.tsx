'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

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
  const orderId = params.get('order_id')
  const [order, setOrder] = useState<OrderData | null>(null)
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) { setLoading(false); return }
    fetch(`/api/order/status?id=${orderId}`)
      .then(r => r.json())
      .then(async data => {
        const o = data.order
        setOrder(o)
        // If this was a queue pre-order, fetch their queue position
        if (o?.queue_entry_id) {
          const qRes = await fetch(`/api/queue/status?id=${o.queue_entry_id}`).then(r => r.json()).catch(() => null)
          if (qRes?.position) setQueuePosition(qRes.position)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
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

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Hero header */}
      <div className="relative overflow-hidden">
        <div className="relative h-[200px]">
          <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/80" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 text-white text-center px-4">
          <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center mb-3 shadow-lg">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold drop-shadow-lg">You're all set, {order.customer_name}!</h1>
          <p className="text-white/70 text-sm font-sans mt-1">Thank you for your order — we're on it 🙌</p>
        </div>
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-5 space-y-4">

        {/* Order number */}
        <div className="card text-center border-2 border-amber-200 bg-amber-50/60">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest font-sans mb-1">Your Order Number</p>
          <p className="text-4xl font-bold text-stone-900 tracking-widest">{orderRef}</p>
          <p className="text-xs text-stone-400 font-sans mt-2">Keep this handy — our team will use it to find you</p>
        </div>

        {/* Queue position — shown if they ordered while in the queue */}
        {queuePosition !== null && (
          <div className="card border-2 border-amber-200 bg-amber-50/60 text-center">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest font-sans mb-1">Your Queue Position</p>
            <p className="text-4xl font-bold text-stone-900 font-sans">#{queuePosition}</p>
            <p className="text-xs text-stone-400 font-sans mt-2">
              {queuePosition === 1 ? "You're next — a table won't be long!" : `${queuePosition - 1} ${queuePosition - 1 === 1 ? 'party' : 'parties'} ahead of you`}
            </p>
            <p className="text-xs text-stone-400 font-sans mt-1">We'll text you when your table is ready 📱</p>
          </div>
        )}

        {/* SMS notice */}
        <div className="flex items-start gap-3 bg-white rounded-2xl border border-stone-100 px-4 py-3 shadow-sm">
          <span className="text-xl mt-0.5">📱</span>
          <div>
            <p className="text-sm font-semibold text-stone-800">Receipt sent via SMS</p>
            <p className="text-xs text-stone-400 font-sans mt-0.5">A copy of your order has been sent to your phone. We'll also text you when your food is being prepared.</p>
          </div>
        </div>

        {/* Dine-in / table info */}
        {isDineIn && (
          <div className="flex items-start gap-3 bg-white rounded-2xl border border-stone-100 px-4 py-3 shadow-sm">
            <span className="text-xl mt-0.5">🍽️</span>
            <div>
              <p className="text-sm font-semibold text-stone-800">Dine In{order.table_number ? ` · Table ${order.table_number}` : ''}</p>
              <p className="text-xs text-stone-400 font-sans mt-0.5">Sit back and relax — your food will be brought to you shortly.</p>
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

        {/* Footer message */}
        <div className="text-center py-2 space-y-3">
          <p className="text-stone-500 text-sm font-sans">We hope you enjoy every bite. 😊</p>
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

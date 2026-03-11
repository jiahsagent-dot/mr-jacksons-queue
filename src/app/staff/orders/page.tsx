'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

type Order = {
  id: string
  created_at: string
  customer_name: string
  phone?: string
  date?: string
  time_slot?: string
  dining_option?: string
  table_number?: number
  order_context?: string
  status: 'pending' | 'received' | 'preparing' | 'ready' | 'served' | 'cancelled'
  items: { name: string; quantity: number; price: number; done?: boolean }[]
  notes?: string
  paid_at?: string
}

function minutesAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

function formatTime(slot: string): string {
  if (!slot) return ''
  const [h, m] = slot.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

const STATUS_FLOW: Record<string, string> = {
  pending: 'received',
  received: 'preparing',
  preparing: 'ready',
  ready: 'served',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending Payment',
  received: '🟡 New Order',
  preparing: '🔵 Preparing',
  ready: '🟢 Ready',
  served: '✅ Served',
  cancelled: '❌ Cancelled',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-stone-50 border-stone-200',
  received: 'bg-yellow-50 border-yellow-300',
  preparing: 'bg-blue-50 border-blue-300',
  ready: 'bg-green-50 border-green-300 animate-pulse-subtle',
  served: 'bg-stone-50 border-stone-200 opacity-60',
  cancelled: 'bg-red-50 border-red-200 opacity-50',
}

const NEXT_BTN_LABEL: Record<string, string> = {
  pending: 'Accept Order',
  received: '👨‍🍳 Start Preparing',
  preparing: '✅ Mark Ready',
  ready: '🍽️ Mark Served',
}

const CONTEXT_LABEL: Record<string, string> = {
  dine_in: '🍽️ Dine In',
  queue_preorder: '⏳ Queue Pre-Order',
  booking_preorder: '📅 Booking Pre-Order',
  takeaway: '🛍️ Takeaway',
  standard: '🍽️ Order',
}

export default function StaffOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<string>('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = sessionStorage.getItem('staff_token')
    if (!t) router.push('/staff/login')
  }, [router])

  const fetchOrders = async () => {
    const res = await fetch(`/api/staff/orders?_t=${Date.now()}`)
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 8000)
    return () => clearInterval(interval)
  }, [])

  const advance = async (id: string, nextStatus: string, name: string) => {
    const res = await fetch('/api/staff/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: nextStatus }),
    })
    if (res.ok) {
      toast.success(`${name} → ${STATUS_LABEL[nextStatus]}`)
      fetchOrders()
    } else {
      toast.error('Failed to update')
    }
  }

  const toggleItem = async (orderId: string, itemIndex: number, currentDone: boolean) => {
    // Optimistic update
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const newItems = [...o.items]
      newItems[itemIndex] = { ...newItems[itemIndex], done: !currentDone }
      return { ...o, items: newItems }
    }))

    const res = await fetch('/api/staff/orders/item', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, item_index: itemIndex, item_done: !currentDone }),
    })
    if (!res.ok) {
      toast.error('Failed to update item')
      fetchOrders() // revert
    }
  }

  const cancelOrder = async (id: string, name: string) => {
    if (!confirm(`Cancel ${name}'s order?`)) return
    const res = await fetch('/api/staff/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    })
    if (res.ok) {
      toast.success(`${name}'s order cancelled`)
      fetchOrders()
    }
  }

  const activeOrders = orders.filter(o => !['served', 'cancelled'].includes(o.status))
  const completedOrders = orders.filter(o => ['served', 'cancelled'].includes(o.status))
  const filtered = filter === 'active' ? activeOrders : completedOrders

  // Group active orders by status for kitchen workflow
  const received = activeOrders.filter(o => o.status === 'received' || o.status === 'pending')
  const preparing = activeOrders.filter(o => o.status === 'preparing')
  const ready = activeOrders.filter(o => o.status === 'ready')

  const total = (items: Order['items']) => items.reduce((sum, i) => sum + (i.price * i.quantity), 0)

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#faf8f5]/95 backdrop-blur-sm border-b border-stone-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>Kitchen Orders</h1>
            <p className="text-xs text-stone-400 font-sans">{activeOrders.length} active · Auto-refreshes</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/staff/dashboard" className="text-xs bg-white text-stone-600 px-3 py-2 rounded-xl border border-stone-200 font-medium hover:border-stone-400 transition-all font-sans">Queue</Link>
            <Link href="/staff/tables" className="text-xs bg-white text-stone-600 px-3 py-2 rounded-xl border border-stone-200 font-medium hover:border-stone-400 transition-all font-sans">Tables</Link>
            <Link href="/staff/menu" className="text-xs bg-white text-stone-600 px-3 py-2 rounded-xl border border-stone-200 font-medium hover:border-stone-400 transition-all font-sans">Menu</Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700 font-sans">{received.length}</p>
            <p className="text-[10px] text-yellow-600 font-semibold uppercase tracking-wide font-sans">New</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700 font-sans">{preparing.length}</p>
            <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide font-sans">Preparing</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700 font-sans">{ready.length}</p>
            <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide font-sans">Ready</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {['active', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize font-sans ${
                filter === f ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200'
              }`}
            >
              {f} ({f === 'active' ? activeOrders.length : completedOrders.length})
            </button>
          ))}
        </div>

        {/* Orders */}
        {filtered.length === 0 ? (
          <div className="card text-center text-stone-400 py-12">
            <p className="text-3xl mb-3">{filter === 'active' ? '🎉' : '📋'}</p>
            <p className="font-sans">{filter === 'active' ? 'No active orders' : 'No completed orders yet'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <div key={order.id} className={`rounded-2xl border-2 p-4 transition-all ${STATUS_STYLE[order.status]}`}>
                {/* Order Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-stone-900 text-[16px]">{order.customer_name}</p>
                      {order.table_number && (
                        <span className="text-xs font-bold bg-stone-800 text-white px-2 py-0.5 rounded-lg font-sans">
                          Table {order.table_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-stone-400 font-sans">{minutesAgo(order.created_at)}m ago</span>
                      <span className="text-xs text-stone-300">·</span>
                      <span className="text-xs text-stone-500 font-sans">
                        {CONTEXT_LABEL[order.order_context || order.dining_option || 'standard']}
                      </span>
                      {order.time_slot && (
                        <>
                          <span className="text-xs text-stone-300">·</span>
                          <span className="text-xs text-stone-500 font-sans">⏰ {formatTime(order.time_slot)}</span>
                        </>
                      )}
                    </div>
                    {order.phone && (
                      <a href={`tel:${order.phone}`} className="text-xs text-stone-400 font-sans hover:text-stone-600">
                        📞 {order.phone}
                      </a>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-semibold font-sans">{STATUS_LABEL[order.status]}</span>
                    <p className="text-sm font-bold text-stone-700 mt-1 font-sans tabular-nums">${total(order.items).toFixed(2)}</p>
                  </div>
                </div>

                {/* Items with per-dish tracking */}
                <div className="bg-white/60 rounded-xl p-3 mb-3">
                  {order.items.length > 1 && !['served', 'cancelled', 'pending'].includes(order.status) && (
                    <p className="text-[10px] text-stone-400 mb-2 font-sans uppercase tracking-wide font-semibold">Tap items when done</p>
                  )}
                  <ul className="space-y-1">
                    {order.items.map((item, i) => {
                      const isDone = !!item.done
                      const canToggle = !['served', 'cancelled', 'pending'].includes(order.status)

                      return (
                        <li
                          key={i}
                          onClick={() => canToggle && toggleItem(order.id, i, isDone)}
                          className={`flex items-center justify-between text-sm font-sans rounded-lg px-2 py-2 transition-all ${
                            canToggle ? 'cursor-pointer active:scale-[0.98]' : ''
                          } ${isDone ? 'bg-green-50' : ''}`}
                        >
                          <span className={`flex items-center gap-2 ${isDone ? 'text-green-600 line-through' : 'text-stone-700'}`}>
                            {canToggle && (
                              <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                isDone ? 'bg-green-500 border-green-500 text-white' : 'border-stone-300'
                              }`}>
                                {isDone && <span className="text-xs">✓</span>}
                              </span>
                            )}
                            <span><span className="font-semibold">{item.quantity}×</span> {item.name}</span>
                          </span>
                          <span className={`tabular-nums ${isDone ? 'text-green-400' : 'text-stone-400'}`}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  {order.items.length > 0 && !['served', 'cancelled', 'pending'].includes(order.status) && (
                    <div className="mt-2 pt-2 border-t border-stone-100">
                      <p className="text-xs text-stone-400 font-sans">
                        {order.items.filter(i => i.done).length}/{order.items.length} items done
                      </p>
                    </div>
                  )}
                </div>

                {order.notes && (
                  <p className="text-xs text-stone-500 italic mb-3 font-sans bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                    📝 {order.notes}
                  </p>
                )}

                {/* Order ID */}
                <p className="text-[10px] text-stone-300 font-mono mb-3">#{order.id.slice(0, 8).toUpperCase()}</p>

                {/* Actions */}
                {STATUS_FLOW[order.status] && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => advance(order.id, STATUS_FLOW[order.status], order.customer_name)}
                      className="btn-primary flex-1 py-3 text-sm"
                    >
                      {NEXT_BTN_LABEL[order.status]}
                    </button>
                    {order.status !== 'ready' && (
                      <button
                        onClick={() => cancelOrder(order.id, order.customer_name)}
                        className="text-xs bg-white text-red-500 px-3 py-2 rounded-xl border border-red-200 font-medium hover:bg-red-50 transition-all font-sans"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { StaffNav } from '@/components/StaffNav'

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

function minutesUntilSlot(date: string | undefined, slot: string | undefined): number | null {
  if (!slot) return null
  const now = new Date()
  const base = date ? new Date(date + 'T00:00:00') : new Date()
  const [h, m] = slot.split(':').map(Number)
  const target = new Date(base)
  target.setHours(h, m, 0, 0)
  return Math.floor((target.getTime() - now.getTime()) / 60000)
}

function formatTime(slot: string): string {
  if (!slot) return ''
  const [h, m] = slot.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

// How many minutes before a booking slot to add it to the kitchen queue
const PREP_WINDOW_MINUTES = 15

function shouldShowInKitchen(order: Order): boolean {
  if (!['received', 'preparing'].includes(order.status)) return false
  const dining = order.dining_option || 'dine_in'
  // Dine-in and queue are always immediate
  if (dining === 'dine_in' || dining === 'queue') return true
  // Takeaway & bookings: only show if pickup is within the prep window
  const mins = minutesUntilSlot(order.date, order.time_slot)
  if (mins === null) return true // no time set, show it
  if (mins < 0) return true // overdue, definitely show
  return mins <= PREP_WINDOW_MINUTES
}

function kitchenPriority(order: Order): number {
  const dining = order.dining_option || 'dine_in'
  if (dining === 'dine_in') return 0
  if (dining === 'queue') return 1
  const mins = minutesUntilSlot(order.date, order.time_slot)
  if (mins === null) return 2
  return 2 + Math.max(0, mins) // sort upcoming by time
}

const STATUS_FLOW: Record<string, string> = {
  received: 'preparing',
  preparing: 'ready',
  ready: 'served',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-stone-50 border-stone-200',
  received: 'bg-yellow-50 border-yellow-300',
  preparing: 'bg-blue-50 border-blue-300',
  ready: 'bg-green-50 border-green-300',
  served: 'bg-stone-50 border-stone-200 opacity-60',
  cancelled: 'bg-red-50 border-red-200 opacity-50',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending Payment',
  received: '🟡 New',
  preparing: '🔵 Preparing',
  ready: '🟢 Ready',
  served: '✅ Served',
  cancelled: '❌ Cancelled',
}

const NEXT_BTN: Record<string, string> = {
  received: '👨‍🍳 Start Preparing',
  preparing: '✅ Mark Ready',
  ready: '🍽️ Mark Served',
}

const DINING_LABEL: Record<string, string> = {
  dine_in: '🍽️ Dine In',
  queue: '⏳ Queue',
  booking: '📅 Booking',
  takeaway: '🛍️ Takeaway',
}

export default function StaffOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [allTables, setAllTables] = useState<number[]>([])
  const [view, setView] = useState<'kitchen' | 'all'>('kitchen')
  const [loading, setLoading] = useState(true)
  const [tableFilter, setTableFilter] = useState<number | null>(null)

  useEffect(() => {
    const t = sessionStorage.getItem('staff_token')
    if (!t) router.push('/staff/login')
  }, [router])

  const fetchOrders = async () => {
    const res = await fetch(`/api/staff/orders?_t=${Date.now()}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders || [])
    }
    setLoading(false)
  }

  const fetchTables = async () => {
    const res = await fetch(`/api/tables?_t=${Date.now()}`)
    if (res.ok) {
      const data = await res.json()
      const nums = (data.tables || []).map((t: any) => t.table_number as number).sort((a: number, b: number) => a - b)
      setAllTables(nums)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchTables()
    const interval = setInterval(fetchOrders, 8000)
    return () => clearInterval(interval)
  }, [])

  const advance = async (id: string, next: string, name: string) => {
    const res = await fetch('/api/staff/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: next }),
    })
    if (res.ok) { toast.success(`${name} → ${STATUS_LABEL[next]}`); fetchOrders() }
    else toast.error('Failed to update')
  }

  const cancelOrder = async (id: string, name: string) => {
    if (!confirm(`Cancel ${name}'s order?`)) return
    const res = await fetch('/api/staff/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    })
    if (res.ok) { toast.success(`Cancelled`); fetchOrders() }
  }

  const toggleItem = async (orderId: string, itemIndex: number, currentDone: boolean) => {
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
    if (!res.ok) { toast.error('Failed'); fetchOrders() }
  }

  const total = (items: Order['items']) => items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  // Kitchen queue — only what needs to be made NOW
  const kitchenQueue = orders
    .filter(shouldShowInKitchen)
    .filter(o => !tableFilter || o.table_number === tableFilter)
    .sort((a, b) => kitchenPriority(a) - kitchenPriority(b))

  // Upcoming bookings/takeaways not yet in window (for awareness)
  const upcoming = orders.filter(o =>
    ['received'].includes(o.status) &&
    ['booking', 'takeaway'].includes(o.dining_option || '') &&
    !shouldShowInKitchen(o)
  ).sort((a, b) => {
    const ma = minutesUntilSlot(a.date, a.time_slot) ?? 999
    const mb = minutesUntilSlot(b.date, b.time_slot) ?? 999
    return ma - mb
  })

  // All active orders for the "All Orders" tab — exclude stale unpaid pending orders
  const activeOrders = orders.filter(o => {
    if (['served', 'cancelled'].includes(o.status)) return false
    if (o.status === 'pending') return minutesAgo(o.created_at) < 30
    if (tableFilter && o.table_number !== tableFilter) return false
    return true
  })
  const completedOrders = orders
    .filter(o => ['served', 'cancelled'].includes(o.status))
    .filter(o => !tableFilter || o.table_number === tableFilter)

  const newCount = orders.filter(o => o.status === 'received').length
  const preparingCount = orders.filter(o => o.status === 'preparing').length
  const readyCount = orders.filter(o => o.status === 'ready').length

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
    </main>
  )

  const renderOrderCard = (order: Order, showFutureTag = false) => {
    const dining = order.dining_option || 'dine_in'
    const mins = minutesUntilSlot(order.date, order.time_slot)
    const canAct = !!STATUS_FLOW[order.status]
    const doneCount = order.items.filter(i => i.done).length

    return (
      <div key={order.id} className={`rounded-2xl border-2 p-4 transition-all ${STATUS_STYLE[order.status]}`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-stone-900 text-base">{order.customer_name}</p>
              {order.table_number && (
                <span className="text-xs font-bold bg-stone-800 text-white px-2 py-0.5 rounded-lg font-sans">
                  Table {order.table_number}
                </span>
              )}
              <span className="text-xs font-semibold text-stone-500 font-sans">
                {DINING_LABEL[dining] || '🍽️'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-stone-400 font-sans">{minutesAgo(order.created_at)}m ago</span>
              {order.time_slot && (
                <>
                  <span className="text-stone-300 text-xs">·</span>
                  <span className={`text-xs font-semibold font-sans ${
                    mins !== null && mins <= 15 ? 'text-red-500' :
                    mins !== null && mins <= 30 ? 'text-amber-500' : 'text-stone-500'
                  }`}>
                    ⏰ {formatTime(order.time_slot)}
                    {mins !== null && mins > 0 && ` (${mins}m)`}
                    {mins !== null && mins <= 0 && ` · NOW`}
                  </span>
                </>
              )}
            </div>
            {order.phone && (
              <a href={`tel:${order.phone}`} className="text-xs text-stone-400 font-sans hover:text-stone-600 mt-0.5 block">
                📞 {order.phone}
              </a>
            )}
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <span className="text-xs font-semibold font-sans">{STATUS_LABEL[order.status]}</span>
            <p className="text-sm font-bold text-stone-700 mt-1 tabular-nums font-sans">${total(order.items).toFixed(2)}</p>
          </div>
        </div>

        {/* Action buttons — top of card for easy access */}
        {canAct && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => advance(order.id, STATUS_FLOW[order.status], order.customer_name)}
              className="btn-primary flex-1 py-3 text-sm"
            >
              {NEXT_BTN[order.status]}
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

        {/* Items */}
        <div className="bg-white/60 rounded-xl p-3 mb-3">
          {order.items.length > 1 && canAct && (
            <p className="text-[10px] text-stone-400 mb-2 font-sans uppercase tracking-wide font-semibold">Tap to check off</p>
          )}
          <ul className="space-y-1">
            {order.items.map((item, i) => {
              const isDone = !!item.done
              return (
                <li
                  key={i}
                  onClick={() => canAct && toggleItem(order.id, i, isDone)}
                  className={`flex items-center justify-between text-sm font-sans rounded-lg px-2 py-1.5 transition-all ${canAct ? 'cursor-pointer' : ''} ${isDone ? 'bg-green-50' : ''}`}
                >
                  <span className={`flex items-center gap-2 ${isDone ? 'text-green-600 line-through' : 'text-stone-700'}`}>
                    {canAct && (
                      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-stone-300'}`}>
                        {isDone && <span className="text-xs">✓</span>}
                      </span>
                    )}
                    <span><span className="font-semibold">{item.quantity}×</span> {item.name}</span>
                  </span>
                  <span className={`tabular-nums ${isDone ? 'text-green-400' : 'text-stone-400'}`}>${(item.price * item.quantity).toFixed(2)}</span>
                </li>
              )
            })}
          </ul>
          {canAct && order.items.length > 1 && (
            <p className="text-xs text-stone-400 font-sans mt-2 pt-2 border-t border-stone-100">
              {doneCount}/{order.items.length} done
            </p>
          )}
        </div>

        {order.notes && (
          <div className="mb-3 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide font-sans mb-0.5">Customer Notes</p>
            <p className="text-xs text-stone-600 font-sans">{order.notes}</p>
          </div>
        )}

        <p className="text-[10px] text-stone-300 font-mono">#{order.id.replace(/-/g,'').slice(0,6).toUpperCase()}</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#faf8f5]/95 backdrop-blur-sm border-b border-stone-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>Orders</h1>
            <p className="text-xs text-stone-400 font-sans">{kitchenQueue.length} to prepare · auto-refreshes</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-stone-300 font-sans">Live</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Stats */}
        {(() => {
          const servedOrders = orders.filter(o => o.status === 'served')
          const todayRevenue = servedOrders.reduce((sum, o) => sum + total(o.items), 0)
          // Use allTables from DB so all tables always show (not just ones with active orders)
          const tableNumbers = allTables.length > 0
            ? allTables
            : Array.from(new Set(orders.filter(o => o.table_number).map(o => o.table_number))).sort((a, b) => (a || 0) - (b || 0))

          return (
            <>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-yellow-700 font-sans">{newCount}</p>
                  <p className="text-[9px] text-yellow-600 font-semibold uppercase tracking-wide font-sans">New</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-blue-700 font-sans">{preparingCount}</p>
                  <p className="text-[9px] text-blue-600 font-semibold uppercase tracking-wide font-sans">Preparing</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-700 font-sans">{readyCount}</p>
                  <p className="text-[9px] text-green-600 font-semibold uppercase tracking-wide font-sans">Ready</p>
                </div>
                <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-700 font-sans">${todayRevenue.toFixed(0)}</p>
                  <p className="text-[9px] text-stone-400 font-semibold uppercase tracking-wide font-sans">Revenue</p>
                </div>
              </div>

              {/* Table filter — always shows all tables from DB */}
              {tableNumbers.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <button
                    onClick={() => setTableFilter(null)}
                    className={`py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all font-sans ${
                      !tableFilter ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200'
                    }`}
                  >All tables</button>
                  {tableNumbers.map(tn => (
                    <button
                      key={tn}
                      onClick={() => setTableFilter(tableFilter === tn ? null : tn!)}
                      className={`py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all font-sans ${
                        tableFilter === tn ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200'
                      }`}
                    >Table {tn}</button>
                  ))}
                </div>
              )}
            </>
          )
        })()}

        {/* View tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('kitchen')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all font-sans ${view === 'kitchen' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200'}`}
          >
            🍳 Kitchen Queue ({kitchenQueue.length})
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all font-sans ${view === 'all' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200'}`}
          >
            All Orders ({activeOrders.length})
          </button>
        </div>

        {/* KITCHEN QUEUE VIEW */}
        {view === 'kitchen' && (
          <div className="space-y-4">
            {kitchenQueue.length === 0 ? (
              <div className="card text-center text-stone-400 py-12">
                <p className="text-3xl mb-3">🎉</p>
                <p className="font-sans font-medium">Kitchen is clear!</p>
                <p className="text-sm font-sans mt-1">No orders need preparing right now</p>
              </div>
            ) : (
              <div className="space-y-3">
                {kitchenQueue.map(o => renderOrderCard(o))}
              </div>
            )}

            {/* Upcoming — bookings/takeaways not yet in window */}
            {upcoming.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 font-sans">
                  ⏳ Coming Up — not yet time to prepare
                </p>
                <div className="space-y-2">
                  {upcoming.map(o => {
                    const mins = minutesUntilSlot(o.date, o.time_slot)
                    const dining = o.dining_option || ''
                    return (
                      <div key={o.id} className="bg-white border border-stone-100 rounded-2xl px-4 py-3 flex justify-between items-center opacity-60">
                        <div>
                          <p className="font-semibold text-stone-700 text-sm">{o.customer_name}</p>
                          <p className="text-xs text-stone-400 font-sans">
                            {DINING_LABEL[dining]} · {o.time_slot && formatTime(o.time_slot)}
                            {mins !== null && ` · in ${mins}m`}
                          </p>
                        </div>
                        <p className="text-xs text-stone-300 font-sans">
                          {o.items.length} item{o.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-stone-300 font-sans mt-2 text-center">
                  Booking orders drop into kitchen queue 15 min before booking time
                </p>
              </div>
            )}
          </div>
        )}

        {/* ALL ORDERS VIEW */}
        {view === 'all' && (
          <div className="space-y-3">
            {activeOrders.length === 0 ? (
              <div className="card text-center text-stone-400 py-12">
                <p className="text-3xl mb-3">🎉</p>
                <p className="font-sans">No active orders</p>
              </div>
            ) : (
              activeOrders.map(o => renderOrderCard(o))
            )}

            {completedOrders.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 font-sans">Completed</p>
                <div className="space-y-2">
                  {completedOrders.slice(0, 10).map(o => renderOrderCard(o))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <StaffNav />
    </main>
  )
}

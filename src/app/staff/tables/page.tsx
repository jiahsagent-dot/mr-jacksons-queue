'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { StaffNav } from '@/components/StaffNav'

type Table = {
  id: number
  table_number: number
  seats: number
  label: string
  status: 'available' | 'occupied' | 'reserved'
  current_customer?: string
  occupied_at?: string
  table_code?: string
}

type Booking = {
  id: string
  customer_name: string
  phone: string
  party_size: number
  date: string
  time_slot: string
  table_number: number | null
  status: string
  has_order: boolean
  order_status: string | null
  order_items_count: number
  order_id: string | null
  code: string | null
  confirmed_at: string | null
}

type Order = {
  id: string
  customer_name: string
  table_number: number | null
  status: string
  items: { name: string; quantity: number; price: number }[]
  dining_option: string
  created_at: string
}

function minutesAgo(iso: string) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

function todayStr() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h > 12 ? h - 12 : h || 12}:${m.toString().padStart(2, '0')} ${ampm}`
}

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00',
]

export default function StaffTablesPage() {
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'now' | 'timeline'>('now')
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [selectedTime, setSelectedTime] = useState('')

  useEffect(() => {
    const t = sessionStorage.getItem('staff_token')
    if (!t) router.push('/staff/login')
  }, [router])

  const fetchAll = async () => {
    const t = Date.now()
    const [tablesRes, bookingsRes, ordersRes] = await Promise.all([
      fetch(`/api/tables?_t=${t}`),
      fetch(`/api/bookings?date=${selectedDate}&_t=${t}`),
      fetch(`/api/staff/orders?_t=${t}`),
    ])

    if (tablesRes.ok) {
      const d = await tablesRes.json()
      setTables(d.tables || [])
    }
    if (bookingsRes.ok) {
      const d = await bookingsRes.json()
      setBookings(d.bookings || [])
    }
    if (ordersRes.ok) {
      const d = await ordersRes.json()
      setOrders((d.orders || []).filter((o: Order) => o.table_number && !['served', 'cancelled'].includes(o.status)))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [selectedDate])

  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editSeats, setEditSeats] = useState('')
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null)

  const cancelBooking = async (bookingId: string, name: string) => {
    if (!confirm(`Cancel ${name}'s booking?`)) return
    setCancellingBooking(bookingId)
    try {
      const res = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId }),
      })
      if (res.ok) {
        toast.success(`${name}'s booking cancelled`)
        fetchAll()
      } else {
        toast.error('Failed to cancel')
      }
    } catch {
      toast.error('Failed to cancel')
    }
    setCancellingBooking(null)
  }

  const saveTableEdit = async () => {
    if (!editingTable) return
    const res = await fetch('/api/staff/tables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_number: editingTable.table_number,
        label: editLabel.trim() || editingTable.label,
        seats: parseInt(editSeats) || editingTable.seats,
      }),
    })
    if (res.ok) {
      toast.success('Table updated')
      setEditingTable(null)
      fetchAll()
    } else {
      toast.error('Failed to update')
    }
  }

  const toggleTable = async (table: Table) => {
    const newStatus = table.status === 'available' ? 'occupied' : 'available'

    // Optimistically update UI immediately so staff sees the change right away
    setTables(prev => prev.map(t =>
      t.table_number === table.table_number
        ? { ...t, status: newStatus as Table['status'], current_customer: newStatus === 'available' ? undefined : t.current_customer }
        : t
    ))

    const res = await fetch('/api/staff/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_number: table.table_number, status: newStatus }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.notified) {
        toast.success(`Table ${table.table_number} freed — ${data.notified} notified from queue 📱`)
      } else {
        toast.success(`Table ${table.table_number} → ${newStatus}`)
      }
      // Slight delay then re-fetch to pick up any notifyNextInQueue DB changes
      setTimeout(() => fetchAll(), 800)
    } else {
      toast.error('Failed to update')
      // Revert optimistic update on failure
      fetchAll()
    }
  }

  const freeAll = async () => {
    if (!confirm('Free up all tables?')) return
    const res = await fetch('/api/staff/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'free_all' }),
    })
    if (res.ok) {
      toast.success('All tables freed')
      fetchAll()
    }
  }

  // Get bookings for a specific table at a specific time
  const getBookingsForTableAtTime = (tableNum: number, time: string) => {
    const timeMin = timeToMinutes(time)
    return bookings.filter(b => {
      if (b.table_number !== tableNum) return false
      if (!['confirmed', 'seated'].includes(b.status)) return false
      const bMin = timeToMinutes(b.time_slot)
      return timeMin < bMin + 90 && timeMin + 90 > bMin
    })
  }

  const getOrderForTable = (tableNum: number) => {
    return orders.find(o => o.table_number === tableNum)
  }

  const getBookingsForTable = (tableNum: number) => {
    return bookings.filter(b => b.table_number === tableNum && ['confirmed', 'seated'].includes(b.status))
  }

  const available = tables.filter(t => t.status === 'available')
  const reserved = tables.filter(t => t.status === 'reserved')
  const occupied = tables.filter(t => t.status === 'occupied')

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#faf8f5]/95 backdrop-blur-sm border-b border-stone-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>Tables</h1>
            <p className="text-xs text-stone-400 font-sans">{available.length} free · {occupied.length} occupied{reserved.length > 0 ? ` · ${reserved.length} queue` : ''}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-stone-300 font-sans">Live</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
        {/* Table Edit Modal */}
        {editingTable && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => setEditingTable(null)}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-stone-900 text-lg mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Edit Table {editingTable.table_number}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-sans">Label</label>
                  <input className="input-field" value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="e.g. Window Booth" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-sans">Seats</label>
                  <input className="input-field" type="number" value={editSeats} onChange={e => setEditSeats(e.target.value)} min="1" max="20" />
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-[11px] text-stone-400 font-sans">Table Code: <span className="font-bold text-stone-700 font-mono">{editingTable.table_code || 'Not set'}</span></p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={saveTableEdit} className="btn-primary flex-1 py-3">Save</button>
                <button onClick={() => setEditingTable(null)} className="btn-secondary py-3 px-6">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('now')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all font-sans ${
              view === 'now' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border border-stone-200'
            }`}
          >Right Now</button>
          <button
            onClick={() => setView('timeline')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all font-sans ${
              view === 'timeline' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 border border-stone-200'
            }`}
          >By Time</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin"></div>
          </div>
        ) : view === 'now' ? (
          <>
            {/* Quick Stats */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-700 font-sans">{available.length}</p>
                <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide font-sans">Available</p>
              </div>
              <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-700 font-sans">{occupied.length}</p>
                <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wide font-sans">Occupied</p>
              </div>
              {reserved.length > 0 && (
                <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700 font-sans">{reserved.length}</p>
                  <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide font-sans">Queue</p>
                </div>
              )}
              <button onClick={freeAll}
                className="bg-white border border-stone-200 rounded-xl px-4 text-xs font-medium text-stone-500 hover:border-stone-400 transition-all font-sans">
                Free All
              </button>
            </div>

            {/* Table Grid — Now View */}
            <div className="grid grid-cols-2 gap-3">
              {tables.map(table => {
                const order = getOrderForTable(table.table_number)
                const tableBookings = getBookingsForTable(table.table_number)
                const nextBooking = tableBookings.sort((a, b) => a.time_slot.localeCompare(b.time_slot))[0]

                return (
                  <div
                    key={table.id}
                    className={`relative rounded-2xl p-4 border-2 ${
                      table.status === 'available'
                        ? 'bg-white border-green-200'
                        : table.status === 'reserved'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">
                        {table.status === 'available' ? '🟢' : table.status === 'reserved' ? '🟡' : '🔴'}
                      </span>
                      <span className="text-[10px] text-stone-400 font-sans">{table.seats} seats</span>
                    </div>
                    <p className="font-bold text-stone-800 text-sm font-sans">{table.label}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] text-stone-400 font-sans">Table {table.table_number}</p>
                      {table.table_code && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-mono">{table.table_code}</span>
                      )}
                    </div>

                    {(table.status === 'occupied' || table.status === 'reserved') && table.current_customer && (
                      <p className={`text-[11px] font-sans mt-1 truncate ${table.status === 'reserved' ? 'text-amber-600' : 'text-red-600'}`}>
                        {table.status === 'reserved' ? '⏳' : '👤'} {table.current_customer}
                        {table.status === 'reserved' && <span className="ml-1 text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-1 py-0.5 rounded">Queue</span>}
                      </p>
                    )}
                    {(table.status === 'occupied') && table.occupied_at && (
                      <p className="text-[10px] text-stone-400 font-sans">{minutesAgo(table.occupied_at)}m ago</p>
                    )}

                    {/* Active order info */}
                    {order && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-[10px] text-amber-700 font-bold font-sans uppercase">Active Order</p>
                        <p className="text-[11px] text-amber-800 font-sans">{order.customer_name} · {order.items.length} items</p>
                        <p className="text-[10px] text-amber-600 font-sans capitalize">{order.status}</p>
                      </div>
                    )}

                    {/* Next booking */}
                    {nextBooking && (
                      <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-[10px] text-blue-700 font-bold font-sans uppercase">Booking</p>
                        <p className="text-[11px] text-blue-800 font-sans">{nextBooking.customer_name} · {nextBooking.party_size}p</p>
                        <p className="text-[10px] text-blue-600 font-sans">{formatTime(nextBooking.time_slot)}</p>
                        <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded font-sans ${
                          nextBooking.has_order
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {nextBooking.has_order ? `✓ Pre-ordered (${nextBooking.order_status})` : '⚠ No order yet'}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => toggleTable(table)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] font-sans ${
                          table.status === 'available'
                            ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                            : 'bg-green-500 text-white border border-green-600 hover:bg-green-600'
                        }`}
                      >
                        {table.status === 'available' ? 'Mark Occupied' : '✓ Free Table'}
                      </button>
                      <button
                        onClick={() => { setEditingTable(table); setEditLabel(table.label); setEditSeats(table.seats.toString()) }}
                        className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-white text-stone-500 border border-stone-200 hover:border-stone-400 transition-all font-sans"
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            {/* Timeline View */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Time selector */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Select Time</label>
              <div className="flex flex-wrap gap-1.5">
                {TIME_SLOTS.map(slot => {
                  const hasBooking = bookings.some(b => {
                    if (!['confirmed', 'seated'].includes(b.status)) return false
                    const bMin = timeToMinutes(b.time_slot)
                    const sMin = timeToMinutes(slot)
                    return sMin < bMin + 90 && sMin + 90 > bMin
                  })

                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(selectedTime === slot ? '' : slot)}
                      className={`py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-all font-sans ${
                        selectedTime === slot
                          ? 'bg-stone-900 text-white'
                          : hasBooking
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-white text-stone-500 border border-stone-200'
                      }`}
                    >{formatTime(slot)}</button>
                  )
                })}
              </div>
            </div>

            {/* Table status at selected time */}
            {selectedTime ? (
              <div>
                <h3 className="text-sm font-bold text-stone-900 mb-3 font-sans">
                  Tables at {formatTime(selectedTime)} on {selectedDate}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {tables.map(table => {
                    const bookingsAtTime = getBookingsForTableAtTime(table.table_number, selectedTime)
                    const isBooked = bookingsAtTime.length > 0
                    const booking = bookingsAtTime[0]

                    return (
                      <div
                        key={table.id}
                        className={`rounded-2xl p-4 border-2 ${
                          isBooked ? 'bg-blue-50 border-blue-200' : 'bg-white border-green-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg">{isBooked ? '📘' : '🟢'}</span>
                          <span className="text-[10px] text-stone-400 font-sans">{table.seats} seats</span>
                        </div>
                        <p className="font-bold text-stone-800 text-sm font-sans">{table.label}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-stone-400 font-sans">Table {table.table_number}</p>
                          {table.table_code && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-mono">{table.table_code}</span>
                          )}
                        </div>

                        {booking ? (
                          <div className="mt-2 p-2 rounded-lg bg-blue-100/50 border border-blue-200">
                            <p className="text-[11px] text-blue-800 font-semibold font-sans">👤 {booking.customer_name}</p>
                            <p className="text-[10px] text-blue-600 font-sans">{booking.party_size} people · {formatTime(booking.time_slot)}</p>
                            <p className="text-[10px] text-blue-500 font-sans">{booking.phone}</p>
                            <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded font-sans ${
                              booking.has_order
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {booking.has_order ? `✓ Pre-ordered (${booking.order_status})` : '⚠ No order — take order on arrival'}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-green-600 font-semibold font-sans mt-2">✓ Available</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* All bookings for the day */
              <div>
                <h3 className="text-sm font-bold text-stone-900 mb-3 font-sans">
                  All Bookings — {selectedDate === todayStr() ? 'Today' : selectedDate}
                  <span className="ml-2 text-stone-400 font-normal">{bookings.filter(b => ['confirmed', 'seated'].includes(b.status)).length} bookings</span>
                </h3>
                {bookings.filter(b => ['confirmed', 'seated'].includes(b.status)).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="text-stone-400 text-sm font-sans">No bookings for this date</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bookings
                      .filter(b => ['confirmed', 'seated'].includes(b.status))
                      .sort((a, b) => a.time_slot.localeCompare(b.time_slot))
                      .map(booking => {
                        const table = tables.find(t => t.table_number === booking.table_number)
                        return (
                          <div key={booking.id} className="bg-white rounded-xl border border-stone-100 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-stone-900 font-sans">
                                  {formatTime(booking.time_slot)} — {booking.customer_name}
                                </p>
                                <p className="text-xs text-stone-400 font-sans">
                                  {booking.party_size} people · {table ? `🪑 ${table.label}` : 'No table assigned'}
                                </p>
                              </div>
                              <span className={`text-[10px] px-2 py-1 rounded-full font-bold font-sans ${
                                booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>{booking.status}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full font-sans ${
                                booking.has_order
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-orange-50 text-orange-700 border border-orange-200'
                              }`}>
                                {booking.has_order
                                  ? `✓ Pre-ordered · ${booking.order_items_count} items · ${booking.order_status}`
                                  : '⚠ No order yet'}
                              </span>
                              {booking.code && (
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-stone-100 text-stone-600 font-sans">
                                  🔑 {booking.code}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full font-sans ${
                                booking.confirmed_at
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-red-50 text-red-600 border border-red-200'
                              }`}>
                                {booking.confirmed_at ? '✓ Confirmed' : '⏳ Not confirmed'}
                              </span>
                            </div>
                            {/* Staff actions */}
                            <div className="mt-2 pt-2 border-t border-stone-50 flex items-center gap-2">
                              <a href={`tel:${booking.phone}`} className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-sans hover:bg-blue-100">
                                📞 {booking.phone}
                              </a>
                              <button
                                onClick={() => cancelBooking(booking.id, booking.customer_name)}
                                disabled={cancellingBooking === booking.id}
                                className="text-[10px] font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 font-sans hover:bg-red-100 disabled:opacity-50"
                              >
                                {cancellingBooking === booking.id ? '...' : '✕ Cancel'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <StaffNav />
    </main>
  )
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

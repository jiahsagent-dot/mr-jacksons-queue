'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'

type Table = {
  id: number
  table_number: number
  seats: number
  status: 'available' | 'occupied' | 'reserved'
  label?: string
}

export default function TablesPage() {
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [tableCode, setTableCode] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [orderRef, setOrderRef] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/tables?_t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        setTables(data.tables || [])
        if (!data.has_availability) {
          router.push('/full')
          return
        }
        setLoading(false)
      })
      .catch(() => { setLoading(false); toast.error('Failed to load tables') })
  }, [router])

  const handleConfirm = async () => {
    if (!selected) return toast.error('Please select a table')
    if (!name.trim()) return toast.error('Please enter your name')
    if (!phone.trim()) return toast.error('Please enter your mobile number')
    if (!tableCode.trim() || tableCode.length < 4) return toast.error('Enter the 4-digit code on your table')

    setConfirming(true)
    try {
      // Verify table code first
      const verifyRes = await fetch(`/api/tables/verify?table_number=${selected}&code=${encodeURIComponent(tableCode.trim())}`)
      const verifyData = await verifyRes.json()

      if (!verifyRes.ok) {
        toast.error(verifyData.error || 'Wrong table code')
        setConfirming(false)
        return
      }

      // Create pending order immediately so customer has their order number
      // Table will be marked occupied only after payment is confirmed
      const orderRes = await fetch('/api/order/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          table_number: selected,
          dining_option: 'dine_in',
        }),
      })
      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        toast.error('Could not create order — please try again')
        return
      }

      setOrderRef(orderData.order_ref)
      setOrderId(orderData.order_id)

      // Store for use on order page
      sessionStorage.setItem('mr_jackson_table', JSON.stringify({
        table_number: selected,
        customer_name: name.trim(),
        phone: phone.trim(),
        order_id: orderData.order_id,
        order_ref: orderData.order_ref,
      }))
    } catch {
      toast.error('Failed to reserve table')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-stone-400 text-sm font-sans">Loading tables...</p>
        </div>
      </main>
    )
  }

  const available = tables.filter(t => t.status === 'available')

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="relative h-[160px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link href="/join" className="absolute top-4 left-4 text-white/70 text-sm hover:text-white font-sans">← Back</Link>
          <h1 className="text-2xl font-bold drop-shadow-lg">Choose Your Table</h1>
          <div className="w-6 h-0.5 bg-amber-500 mx-auto mt-2" />
          <p className="text-white/60 text-xs mt-2 font-sans">{available.length} table{available.length === 1 ? '' : 's'} available</p>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 -mt-4 relative z-10 pb-48">
        {/* Order number screen — shown after table confirmed */}
        {orderRef && orderId && (
          <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6 text-center animate-fade-in">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-stone-900 mb-1">You're booked in!</h2>
            <p className="text-stone-400 text-sm font-sans mb-6">Table {selected} is yours. Here's your order number:</p>
            <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl px-10 py-6 mb-6">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1 font-sans">Order Reference</p>
              <p className="text-5xl font-bold text-stone-900 tracking-widest">{orderRef}</p>
            </div>
            <p className="text-stone-400 text-xs font-sans mb-8 max-w-xs">Screenshot this or remember it — you'll need it to collect your order.</p>
            <button
              onClick={() => router.push(`/order/new?context=dine_in&table=${selected}&name=${encodeURIComponent(name.trim())}&phone=${encodeURIComponent(phone.trim())}&order_id=${orderId}&order_ref=${orderRef}`)}
              className="btn-primary w-full max-w-xs py-4 text-lg"
            >
              Browse Menu →
            </button>
          </div>
        )}

        {/* Name + Phone inputs */}
        <div className="card mb-4 animate-slide-up space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Your Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Sarah"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Mobile Number</label>
            <input
              type="tel"
              className="input-field"
              placeholder="04XX XXX XXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
        </div>

        {/* Table Grid */}
        <div className="animate-fade-in">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3">Select your table</p>
          <div className="grid grid-cols-3 gap-3">
            {tables.map(table => {
              const isAvailable = table.status === 'available'
              const isSelected = selected === table.table_number

              return (
                <button
                  key={table.id}
                  onClick={() => {
                    if (isAvailable) {
                      setSelected(table.table_number)
                      setTableCode('')
                    }
                  }}
                  disabled={!isAvailable}
                  className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all font-sans ${
                    isSelected
                      ? 'border-green-500 bg-green-50 shadow-md scale-[1.02]'
                      : isAvailable
                        ? 'border-stone-200 bg-white hover:border-stone-400 active:scale-[0.97]'
                        : 'border-stone-100 bg-stone-50 opacity-40 cursor-not-allowed'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                  <span className="text-2xl">
                    {isAvailable ? (isSelected ? '✅' : '🟢') : table.status === 'reserved' ? '📘' : '🔴'}
                  </span>
                  <span className="font-semibold text-stone-800 text-sm">
                    {table.label || `Table ${table.table_number}`}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {table.seats} seat{table.seats === 1 ? '' : 's'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-5 mt-4 text-xs text-stone-400 font-sans">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Available</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Booked</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-300" /> Occupied</span>
        </div>

        {/* Table code input — appears when table selected */}
        {selected && (
          <div className="card mt-4 border-2 border-amber-300 bg-amber-50/30 animate-slide-up">
            <p className="text-sm font-semibold text-stone-900 text-center mb-1">Enter Table Code</p>
            <p className="text-xs text-stone-400 text-center mb-3 font-sans">Look for the 4-digit code on your table</p>
            <input
              type="text"
              className="input-field text-center text-2xl font-bold tracking-[0.3em]"
              placeholder="0000"
              value={tableCode}
              onChange={e => setTableCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              inputMode="numeric"
            />
          </div>
        )}
      </div>

      {/* Fixed bottom bar */}
      {selected && name.trim() && phone.trim() && tableCode.length === 4 && !orderRef && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-slide-up" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-lg mx-auto">
            <p className="text-xs text-stone-400 text-center mb-3 font-sans">
              ✅ {tables.find(t => t.table_number === selected)?.label || `Table ${selected}`} · {tables.find(t => t.table_number === selected)?.seats} seats
            </p>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="btn-primary w-full py-5 text-lg relative z-50 disabled:opacity-50"
            >
              {confirming ? 'Confirming...' : '🍽️ Confirm & Order'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

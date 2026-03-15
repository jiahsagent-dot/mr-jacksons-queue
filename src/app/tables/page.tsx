'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import { formatAusPhone, stripPhone } from '@/lib/format'

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
    const phoneDigits = phone.replace(/[\s\-\(\)\+]/g, '')
    const isValidAU = /^0[0-9]{9}$/.test(phoneDigits) || /^61[0-9]{9}$/.test(phoneDigits)
    if (!isValidAU) return toast.error('Please enter a valid Australian phone number (e.g. 0483 880 253)')

    setConfirming(true)
    try {
      // Create pending order immediately so customer has their order number
      // Table will be marked occupied only after payment is confirmed
      const orderRes = await fetch('/api/order/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: stripPhone(phone),
          table_number: selected,
          dining_option: 'dine_in',
        }),
      })
      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        toast.error('Could not create order — please try again')
        return
      }

      // Store for use on order page
      sessionStorage.setItem('mr_jackson_table', JSON.stringify({
        table_number: selected,
        customer_name: name.trim(),
        phone: stripPhone(phone),
        order_id: orderData.order_id,
        order_ref: orderData.order_ref,
      }))

      // Go straight to menu — order number shows in the banner
      const selectedTable = tables.find(t => t.table_number === selected)
      const tableLabel = selectedTable?.label || `Table ${selected}`
      router.push(`/order/new?context=dine_in&table=${selected}&table_label=${encodeURIComponent(tableLabel)}&name=${encodeURIComponent(name.trim())}&phone=${encodeURIComponent(phone.trim())}&order_id=${orderData.order_id}&order_ref=${orderData.order_ref}`)
    } catch {
      toast.error('Failed to reserve table')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col">
        <div className="h-[160px] skeleton" />
        <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 space-y-4">
          <div className="skeleton h-24 w-full" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton aspect-square" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  const available = tables.filter(t => t.status === 'available')

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="relative h-[160px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover animate-hero-zoom" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link href="/join" className="absolute top-4 left-4 text-white/70 text-sm hover:text-white font-sans">← Back</Link>
          <h1 className="text-2xl font-bold drop-shadow-lg">Choose Your Table</h1>
          <div className="w-6 h-0.5 bg-amber-500 mx-auto mt-2" />
          <p className="text-white/60 text-xs mt-2 font-sans">{available.length} table{available.length === 1 ? '' : 's'} available</p>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 -mt-4 relative z-10 pb-48">
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
              onChange={e => setPhone(formatAusPhone(e.target.value))}
              autoComplete="tel"
              inputMode="tel"
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


      </div>

      {/* Fixed bottom bar */}
      {selected && name.trim() && phone.trim() && (
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

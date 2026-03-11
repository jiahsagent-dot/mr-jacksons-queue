'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import { generateTimeSlots, formatTimeSlot, getAvailableDates } from '@/lib/timeslots'

type TableInfo = {
  id: number
  table_number: number
  seats: number
  label: string
  status: string
  available_at_time: boolean
  fits_party: boolean
  bookings_today: any[]
}

export default function BookPage() {
  const router = useRouter()
  const [step, setStep] = useState<'details' | 'table' | 'confirm'>('details')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [selectedDate, setSelectedDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [loading, setLoading] = useState(false)

  const timeSlots = generateTimeSlots(selectedDate)
  const availableDates = getAvailableDates()

  useEffect(() => {
    if (timeSlot && !timeSlots.includes(timeSlot)) {
      setTimeSlot('')
    }
  }, [selectedDate])

  // Reset table selection when date/time/party changes
  useEffect(() => {
    setSelectedTable(null)
    setTables([])
  }, [selectedDate, timeSlot, partySize])

  const fetchAvailableTables = async () => {
    if (!selectedDate || !timeSlot) return
    setLoadingTables(true)
    try {
      const res = await fetch(`/api/tables/availability?date=${selectedDate}&time=${timeSlot}&party_size=${partySize}`)
      if (res.ok) {
        const data = await res.json()
        setTables(data.tables || [])
      }
    } catch {
      toast.error('Failed to load tables')
    }
    setLoadingTables(false)
  }

  const goToTableStep = () => {
    if (!name.trim()) return toast.error('Please enter your name')
    if (!phone.trim()) return toast.error('Please enter your phone number')
    if (!selectedDate) return toast.error('Please select a date')
    if (!timeSlot) return toast.error('Please select a time')
    setStep('table')
    fetchAvailableTables()
  }

  const handleBook = async () => {
    if (!selectedTable) return toast.error('Please select a table')
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          party_size: partySize,
          date: selectedDate,
          time_slot: timeSlot,
          table_number: selectedTable,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      const selectedTableInfo = tables.find(t => t.table_number === selectedTable)
      sessionStorage.setItem('mr_jackson_booking', JSON.stringify({
        id: data.booking.id,
        name: name.trim(),
        phone: phone.trim(),
        party_size: partySize,
        date: selectedDate,
        time_slot: timeSlot,
        table_number: selectedTable,
        table_label: selectedTableInfo?.label || `Table ${selectedTable}`,
        code: data.booking.code,
      }))

      router.push('/book/confirmed')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const availableTables = tables.filter(t => t.available_at_time && t.fits_party)
  const tooSmallTables = tables.filter(t => t.available_at_time && !t.fits_party)
  const bookedTables = tables.filter(t => !t.available_at_time)

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="relative h-[180px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <button
            onClick={() => step === 'table' ? setStep('details') : router.push('/join')}
            className="absolute top-4 left-4 text-white/70 text-sm hover:text-white font-sans"
          >← Back</button>
          <Image src="/images/logo.png" alt="Mr Jackson" width={48} height={48} className="rounded-full shadow-lg mb-2" />
          <h1 className="text-2xl font-bold drop-shadow-lg">Book a Table</h1>
          <div className="w-6 h-0.5 bg-amber-500 mx-auto mt-1.5" />
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`w-2 h-2 rounded-full ${step === 'details' ? 'bg-amber-400' : 'bg-white/40'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 'table' ? 'bg-amber-400' : 'bg-white/40'}`} />
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 -mt-4 relative z-10 pb-10">
        {step === 'details' && (
          <div className="space-y-4 animate-slide-up">
            {/* Your Details */}
            <div className="card">
              <h2 className="text-lg font-bold text-stone-900 mb-3">Your Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Name</label>
                  <input type="text" className="input-field" placeholder="e.g. Sarah" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Mobile Number</label>
                  <input type="tel" className="input-field" placeholder="04XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Party Size</label>
                  <div className="flex items-center gap-4 py-2">
                    <button type="button" onClick={() => setPartySize(Math.max(1, partySize - 1))}
                      className="w-11 h-11 rounded-full border border-stone-200 bg-white text-stone-600 font-bold text-lg flex items-center justify-center hover:border-stone-400 transition-all active:scale-95">−</button>
                    <span className="text-2xl font-bold text-stone-900 w-8 text-center font-sans">{partySize}</span>
                    <button type="button" onClick={() => setPartySize(Math.min(12, partySize + 1))}
                      className="w-11 h-11 rounded-full border border-stone-200 bg-white text-stone-600 font-bold text-lg flex items-center justify-center hover:border-stone-400 transition-all active:scale-95">+</button>
                    <span className="text-sm text-stone-400 font-sans">{partySize === 1 ? 'person' : 'people'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="card">
              <h2 className="text-lg font-bold text-stone-900 mb-3">Select Date</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableDates.map(d => (
                  <button key={d.value} type="button" onClick={() => setSelectedDate(d.value)}
                    className={`py-3 px-2 rounded-xl text-sm font-medium border transition-all font-sans ${
                      selectedDate === d.value ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'
                    }`}>{d.label}</button>
                ))}
              </div>
            </div>

            {/* Time */}
            {selectedDate && (
              <div className="card animate-slide-up">
                <h2 className="text-lg font-bold text-stone-900 mb-3">Select Time</h2>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(slot => (
                    <button key={slot} type="button" onClick={() => setTimeSlot(slot)}
                      className={`py-3 px-3 rounded-xl text-sm font-medium border transition-all font-sans ${
                        timeSlot === slot ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'
                      }`}>{formatTimeSlot(slot)}</button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={goToTableStep} className="btn-primary w-full py-4 text-base shadow-md">
              Choose Your Table →
            </button>
          </div>
        )}

        {step === 'table' && (
          <div className="space-y-4 animate-slide-up">
            {/* Summary */}
            <div className="card bg-stone-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-stone-900 font-sans">{name} · {partySize} {partySize === 1 ? 'person' : 'people'}</p>
                  <p className="text-xs text-stone-500 font-sans">{selectedDate} at {formatTimeSlot(timeSlot)}</p>
                </div>
                <button onClick={() => setStep('details')} className="text-xs text-amber-700 font-semibold font-sans hover:underline">Change</button>
              </div>
            </div>

            {/* Available Tables */}
            <div className="card">
              <h2 className="text-lg font-bold text-stone-900 mb-1">Choose Your Table</h2>
              <p className="text-xs text-stone-400 font-sans mb-4">
                {availableTables.length} table{availableTables.length !== 1 ? 's' : ''} available for your party
              </p>

              {loadingTables ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin"></div>
                </div>
              ) : availableTables.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">😔</p>
                  <p className="text-stone-600 font-semibold font-sans">No tables available</p>
                  <p className="text-xs text-stone-400 font-sans mt-1">Try a different time or date</p>
                  <button onClick={() => setStep('details')} className="mt-4 btn-secondary py-2 px-6 text-sm">
                    Change Time
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {availableTables.map(table => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(table.table_number)}
                      className={`rounded-2xl p-4 border-2 text-left transition-all active:scale-[0.97] ${
                        selectedTable === table.table_number
                          ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">{selectedTable === table.table_number ? '✅' : '🪑'}</span>
                        <span className="text-[10px] text-stone-400 font-sans">{table.seats} seats</span>
                      </div>
                      <p className="font-bold text-stone-800 text-sm font-sans">{table.label}</p>
                      <p className="text-[11px] text-stone-400 font-sans">Table {table.table_number}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Show booked tables (greyed out) */}
              {bookedTables.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-[10px] text-stone-300 uppercase tracking-wider font-bold font-sans mb-2">Booked at this time</p>
                  <div className="grid grid-cols-2 gap-2">
                    {bookedTables.map(table => (
                      <div key={table.id} className="rounded-xl p-3 border border-stone-100 bg-stone-50 opacity-50">
                        <p className="font-semibold text-stone-400 text-xs font-sans">{table.label}</p>
                        <p className="text-[10px] text-stone-300 font-sans">{table.seats} seats · Booked</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Too small */}
              {tooSmallTables.length > 0 && availableTables.length === 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-[10px] text-stone-300 uppercase tracking-wider font-bold font-sans mb-2">Too small for your party</p>
                  <div className="grid grid-cols-2 gap-2">
                    {tooSmallTables.map(table => (
                      <div key={table.id} className="rounded-xl p-3 border border-stone-100 bg-stone-50 opacity-50">
                        <p className="font-semibold text-stone-400 text-xs font-sans">{table.label}</p>
                        <p className="text-[10px] text-stone-300 font-sans">{table.seats} seats</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedTable && (
              <button onClick={handleBook} disabled={loading} className="btn-primary w-full py-4 text-base disabled:opacity-50 shadow-md animate-slide-up">
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

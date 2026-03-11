'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { QueueEntry } from '@/lib/supabase'

function minutesAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

const WAIT_OPTIONS = [5, 10, 15, 20, 30]

export default function StaffDashboard() {
  const router = useRouter()
  const [waiting, setWaiting] = useState<QueueEntry[]>([])
  const [called, setCalled] = useState<QueueEntry[]>([])
  const [isClosed, setIsClosed] = useState(false)
  const [waitTime, setWaitTime] = useState(20)
  const [callLoading, setCallLoading] = useState(false)

  // Prevents polling from overwriting state during/after a mutation
  const mutatingUntil = useRef<number>(0)

  useEffect(() => {
    const t = sessionStorage.getItem('staff_token')
    if (!t) router.push('/staff/login')
  }, [router])

  const fetchQueue = useCallback(async () => {
    // Don't let the poll overwrite state while a mutation is in flight
    if (Date.now() < mutatingUntil.current) return

    const res = await fetch(`/api/staff/queue?_t=${Date.now()}`)
    if (res.status === 401) { router.push('/staff/login'); return }
    if (res.ok) {
      const data = await res.json()
      setWaiting(data.waiting)
      setCalled(data.called)
      setIsClosed(data.is_closed)
      setWaitTime(data.estimated_wait)
    }
  }, [router])

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 8000)
    return () => clearInterval(interval)
  }, [fetchQueue])

  // Hold off polling for 8 seconds whenever we mutate (let optimistic UI stick)
  const holdPoll = () => { mutatingUntil.current = Date.now() + 8000 }

  const callNext = async () => {
    if (waiting.length === 0) return toast.error('Queue is empty')
    setCallLoading(true)
    const res = await fetch('/api/staff/call-next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: waiting[0].id }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success(`Called ${waiting[0].name}`)
      // Refetch after save confirms
      holdPoll()
      await fetchQueue()
    } else {
      toast.error(data.error || 'Failed')
    }
    setCallLoading(false)
  }

  const updateQueueStatus = async (id: string, status: string, name: string) => {
    const res = await fetch('/api/staff/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      toast.success(`${name} → ${status}`)
      holdPoll()
      await fetchQueue()
    }
  }

  const setWait = async (mins: number) => {
    // Optimistic update immediately
    setWaitTime(mins)
    holdPoll()

    const res = await fetch('/api/staff/set-wait', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes: mins }),
    })
    if (res.ok) {
      toast.success(`Wait set to ${mins}m`)
    } else {
      toast.error('Failed to save — try again')
      fetchQueue() // revert on failure
    }
  }

  const toggleQueue = async () => {
    const newState = !isClosed
    // Optimistic update immediately
    setIsClosed(newState)
    holdPoll()

    const res = await fetch('/api/staff/set-wait', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_closed: newState }),
    })
    if (res.ok) {
      toast.success(newState ? 'Queue closed' : 'Queue opened')
    } else {
      toast.error('Failed to save — try again')
      setIsClosed(!newState) // revert on failure
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] max-w-2xl mx-auto pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#faf8f5]/95 backdrop-blur-sm px-4 pt-5 pb-4 border-b border-stone-100">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              Mr Jackson&apos;s
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">Staff Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/staff/orders" className="text-xs bg-white text-stone-600 px-3 py-2 rounded-xl border border-stone-200 font-medium hover:border-stone-400 transition-all">Orders</a>
            <a href="/staff/tables" className="text-xs bg-white text-stone-600 px-3 py-2 rounded-xl border border-stone-200 font-medium hover:border-stone-400 transition-all">Tables</a>
            <a href="/staff/menu" className="text-xs bg-white text-stone-600 px-3 py-2 rounded-xl border border-stone-200 font-medium hover:border-stone-400 transition-all">Menu</a>
            <button
              onClick={() => { sessionStorage.removeItem('staff_token'); router.push('/staff/login') }}
              className="text-stone-400 text-xs hover:text-stone-700 px-2 py-1"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Queue status banner */}
        <div className={`rounded-2xl border-2 p-4 ${isClosed ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className={`font-semibold text-sm ${isClosed ? 'text-red-700' : 'text-green-700'}`}>
                {isClosed ? '🔴 Queue Closed' : '🟢 Queue Open'}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">{waiting.length} waiting · ~{waitTime} min wait</p>
            </div>
            <button
              onClick={toggleQueue}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                isClosed
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
              }`}
            >
              {isClosed ? 'Open Queue' : 'Close Queue'}
            </button>
          </div>

          {/* Call next */}
          <button
            onClick={callNext}
            disabled={callLoading || waiting.length === 0}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed mb-4 transition-all active:scale-[0.98]"
          >
            🔔 Call Next Table
          </button>

          {/* Wait time */}
          <div>
            <p className="text-xs text-stone-500 mb-2">Estimated wait</p>
            <div className="flex gap-2 flex-wrap">
              {WAIT_OPTIONS.map(mins => (
                <button
                  key={mins}
                  onClick={() => setWait(mins)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    waitTime === mins
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Waiting list */}
        <section>
          <h2 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
            Waiting ({waiting.length})
          </h2>
          {waiting.length === 0 ? (
            <div className="text-center text-stone-400 py-10 bg-white rounded-2xl border border-stone-100">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-sm">No one in the queue</p>
            </div>
          ) : (
            <div className="space-y-2">
              {waiting.map((entry, i) => (
                <div key={entry.id} className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center gap-3">
                  <div className="text-lg font-bold text-stone-300 w-6 text-center flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900">{entry.name}</p>
                    <p className="text-xs text-stone-400">
                      {entry.party_size} {entry.party_size === 1 ? 'person' : 'people'} · {minutesAgo(entry.created_at)}m waiting · {entry.phone}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => updateQueueStatus(entry.id, 'called', entry.name)}
                      className="text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg border border-green-200 font-medium"
                    >
                      Call
                    </button>
                    <button
                      onClick={() => updateQueueStatus(entry.id, 'left', entry.name)}
                      className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg border border-red-200 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Called */}
        {called.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
              Called ({called.length})
            </h2>
            <div className="space-y-2">
              {called.map(entry => (
                <div key={entry.id} className="bg-white rounded-2xl border border-green-100 p-4 flex items-center gap-3">
                  <div className="text-green-400 text-lg flex-shrink-0">🔔</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900">{entry.name}</p>
                    <p className="text-xs text-stone-400">{entry.party_size} people · SMS sent</p>
                  </div>
                  <button
                    onClick={() => updateQueueStatus(entry.id, 'seated', entry.name)}
                    className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg border border-blue-200 font-medium flex-shrink-0"
                  >
                    ✓ Seated
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

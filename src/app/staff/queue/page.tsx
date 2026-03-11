'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import type { QueueEntry } from '@/lib/supabase'

const WAIT_OPTIONS = [5, 10, 15, 20, 30]

function minutesWaiting(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

export default function StaffQueuePage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [waiting, setWaiting] = useState<QueueEntry[]>([])
  const [called, setCalled] = useState<QueueEntry[]>([])
  const [isClosed, setIsClosed] = useState(false)
  const [waitTime, setWaitTime] = useState(20)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = sessionStorage.getItem('staff_token')
    if (!t) { router.push('/staff/login'); return }
    setToken(t)
  }, [])

  const fetchQueue = useCallback(async () => {
    const res = await fetch('/api/staff/queue')
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
    if (!token) return
    fetchQueue()
    const interval = setInterval(fetchQueue, 10000)
    return () => clearInterval(interval)
  }, [token, fetchQueue])

  const callNext = async () => {
    if (waiting.length === 0) return toast.error('Queue is empty')
    setLoading(true)
    const res = await fetch('/api/staff/call-next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: waiting[0].id }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success(`Called ${waiting[0].name} — SMS sent!`)
      fetchQueue()
    } else {
      toast.error(data.error || 'Failed')
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string, name: string) => {
    const res = await fetch('/api/staff/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) { toast.success(`${name} → ${status}`); fetchQueue() }
  }

  const setWait = async (mins: number) => {
    setWaitTime(mins)
    const res = await fetch('/api/staff/set-wait', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes: mins }),
    })
    if (res.ok) toast.success(`Wait time set to ${mins} mins`)
  }

  const toggleQueue = async () => {
    const res = await fetch('/api/staff/set-wait', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_closed: !isClosed }),
    })
    if (res.ok) {
      setIsClosed(!isClosed)
      toast.success(isClosed ? 'Queue opened' : 'Queue closed')
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Mr Jackson</h1>
          <p className="text-stone-400 text-sm">Staff Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/staff/orders" className="btn-secondary py-2 px-4 text-sm">Orders</Link>
          <button
            onClick={() => { sessionStorage.removeItem('staff_token'); router.push('/staff/login') }}
            className="text-stone-400 text-sm hover:text-stone-700"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Queue Status Banner */}
      <div className={`rounded-2xl p-4 mb-5 flex items-center justify-between ${isClosed ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
        <div>
          <p className={`font-semibold ${isClosed ? 'text-red-700' : 'text-green-700'}`}>
            {isClosed ? '🔴 Queue Closed' : '🟢 Queue Open'}
          </p>
          <p className="text-sm text-stone-500">{waiting.length} waiting · ~{waitTime} min wait</p>
        </div>
        <button
          onClick={toggleQueue}
          className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${
            isClosed
              ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
              : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
          }`}
        >
          {isClosed ? 'Open Queue' : 'Close Queue'}
        </button>
      </div>

      {/* Controls */}
      <div className="card mb-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <button
            onClick={callNext}
            disabled={loading || waiting.length === 0}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🔔 Call Next Table
          </button>
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
      </div>

      {/* Waiting Queue */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-stone-700 uppercase tracking-wide mb-3">
          Waiting ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <div className="card text-center text-stone-400 py-8">No one in the queue 🎉</div>
        ) : (
          <div className="space-y-2">
            {waiting.map((entry, i) => (
              <div key={entry.id} className="card flex items-center gap-3">
                <div className="text-xl font-bold text-stone-300 w-7 flex-shrink-0 text-center">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900">{entry.name}</p>
                  <p className="text-sm text-stone-400">
                    {entry.party_size} {entry.party_size === 1 ? 'person' : 'people'} · {minutesWaiting(entry.created_at)}m waiting · {entry.phone}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => updateStatus(entry.id, 'called', entry.name)}
                    className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg border border-green-200 font-medium"
                  >
                    Call
                  </button>
                  <button
                    onClick={() => updateStatus(entry.id, 'left', entry.name)}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg border border-red-200 font-medium"
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
          <h2 className="text-base font-bold text-stone-700 uppercase tracking-wide mb-3">
            Called ({called.length})
          </h2>
          <div className="space-y-2">
            {called.map(entry => (
              <div key={entry.id} className="card flex items-center gap-3 opacity-80">
                <div className="text-green-400 text-xl flex-shrink-0">🔔</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900">{entry.name}</p>
                  <p className="text-sm text-stone-400">{entry.party_size} people · SMS sent</p>
                </div>
                <button
                  onClick={() => updateStatus(entry.id, 'seated', entry.name)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg border border-blue-200 font-medium"
                >
                  ✓ Seated
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

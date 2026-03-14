'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { StaffNav } from '@/components/StaffNav'

const WAIT_OPTIONS = [5, 10, 15, 20, 30, 45]
const NO_SHOW_OPTIONS = [1, 5, 10, 15, 20]

export default function SettingsPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [isClosed, setIsClosed] = useState(false)
  const [waitTime, setWaitTime] = useState(20)
  const [noShowMinutes, setNoShowMinutes] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = sessionStorage.getItem('staff_token')
    if (!t) { router.push('/staff/login'); return }
    setToken(t)
  }, [])

  const fetchSettings = useCallback(async () => {
    const res = await fetch(`/api/staff/queue?_t=${Date.now()}`)
    if (res.status === 401) { router.push('/staff/login'); return }
    if (res.ok) {
      const data = await res.json()
      setIsClosed(data.is_closed)
      setWaitTime(data.estimated_wait)
      setNoShowMinutes(data.no_show_minutes ?? 1)
    }
  }, [router])

  useEffect(() => {
    if (!token) return
    fetchSettings()
  }, [token, fetchSettings])

  const saveSetting = async (payload: Record<string, unknown>, label: string) => {
    setSaving(true)
    const res = await fetch('/api/staff/set-wait', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) toast.success(label)
    else toast.error('Failed to save')
    setSaving(false)
  }

  if (!token) return null

  return (
    <main className="min-h-screen bg-stone-50 pb-28">
      <div className="max-w-lg mx-auto px-4 pt-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
          <p className="text-stone-400 text-sm font-sans mt-0.5">Queue & venue configuration</p>
        </div>

        {/* Queue Status */}
        <section className="mb-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 font-sans">Queue</p>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-100">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="font-semibold text-stone-800 text-sm">Queue Open</p>
                <p className="text-xs text-stone-400 font-sans mt-0.5">Allow new customers to join the queue</p>
              </div>
              <button
                onClick={async () => {
                  const next = !isClosed
                  setIsClosed(next)
                  await saveSetting({ is_closed: next }, next ? 'Queue closed' : 'Queue opened')
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  !isClosed ? 'bg-green-500' : 'bg-stone-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  !isClosed ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* Estimated Wait */}
        <section className="mb-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 font-sans">Estimated Wait Time</p>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-4">
            <p className="text-xs text-stone-400 font-sans mb-3">Shown to customers when they join the queue</p>
            <div className="flex gap-2 flex-wrap">
              {WAIT_OPTIONS.map(mins => (
                <button
                  key={mins}
                  disabled={saving}
                  onClick={async () => {
                    setWaitTime(mins)
                    await saveSetting({ minutes: mins }, `Wait time set to ${mins} mins`)
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    waitTime === mins
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Queue Expiry */}
        <section className="mb-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 font-sans">Queue Expiry Time</p>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-4">
            <p className="text-xs text-stone-400 font-sans mb-3">
              How long a called customer has to confirm their table before losing their spot
            </p>
            <div className="flex gap-2 flex-wrap">
              {NO_SHOW_OPTIONS.map(mins => (
                <button
                  key={mins}
                  disabled={saving}
                  onClick={async () => {
                    setNoShowMinutes(mins)
                    await saveSetting({ no_show_minutes: mins }, `Expiry set to ${mins} min${mins === 1 ? '' : 's'}`)
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    noShowMinutes === mins
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
            {noShowMinutes === 1 && (
              <p className="text-[11px] text-amber-600 font-sans mt-3 flex items-center gap-1">
                ⚠️ 1 minute is for testing only — set to 10m for normal use
              </p>
            )}
          </div>
        </section>

      </div>
      <StaffNav />
    </main>
  )
}

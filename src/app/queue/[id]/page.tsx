'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import type { QueueEntry } from '@/lib/supabase'

export default function QueueStatusPage() {
  const { id } = useParams()
  const router = useRouter()
  const [entry, setEntry] = useState<(QueueEntry & { assigned_table?: number }) | null>(null)
  const [position, setPosition] = useState(0)
  const [estimatedWait, setEstimatedWait] = useState(0)
  const [noShowMinutes, setNoShowMinutes] = useState(10)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [confirming, setConfirming] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const fetchStatus = async () => {
    const [statusRes, settingsRes] = await Promise.all([
      fetch(`/api/queue/status?id=${id}&_t=${Date.now()}`),
      fetch(`/api/queue/settings?_t=${Date.now()}`),
    ])
    if (statusRes.ok) {
      const data = await statusRes.json()
      setEntry(data.entry)
      setPosition(data.position)
      setEstimatedWait(data.estimated_wait)
    }
    if (settingsRes.ok) {
      const s = await settingsRes.json()
      if (s.no_show_minutes) setNoShowMinutes(s.no_show_minutes)
    }
    setLastRefresh(Date.now())
    setLoading(false)
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [id])

  // Countdown timer when called — uses live no_show_minutes from settings
  useEffect(() => {
    if (entry?.status !== 'called' || !entry.called_at) {
      setTimeLeft(null)
      return
    }
    const windowMs = noShowMinutes * 60 * 1000
    const updateTimer = () => {
      const calledAt = new Date(entry.called_at!).getTime()
      const remaining = Math.max(0, windowMs - (Date.now() - calledAt))
      setTimeLeft(remaining)
      if (remaining <= 0) fetchStatus()
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [entry?.status, entry?.called_at, noShowMinutes])

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const res = await fetch('/api/queue/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not confirm')
        fetchStatus()
      } else {
        toast.success('Table confirmed!')
        if (data.table_number) {
          sessionStorage.setItem('mr_jackson_table', JSON.stringify({
            table_number: data.table_number,
            customer_name: data.name,
          }))
        }
        fetchStatus()
      }
    } catch {
      toast.error('Something went wrong')
    }
    setConfirming(false)
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      const res = await fetch('/api/queue/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('You\'ve been removed from the queue')
        fetchStatus()
        setShowCancelConfirm(false)
      } else {
        toast.error(data.error || 'Could not cancel')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setCancelling(false)
  }

  const formatCountdown = (ms: number) => {
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col bg-stone-50">
        <div className="h-[220px] skeleton" />
        <div className="flex-1 flex flex-col items-center px-4 pt-8 gap-4">
          <div className="w-full max-w-sm h-56 skeleton" />
          <div className="w-full max-w-sm h-20 skeleton" />
          <div className="w-full max-w-sm h-32 skeleton" />
        </div>
      </main>
    )
  }

  if (!entry) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-stone-50">
        <div className="animate-reveal text-center">
          <p className="text-stone-400 font-sans text-lg">Queue entry not found</p>
          <Link href="/join" className="btn-primary mt-6 inline-block">Back to Home</Link>
        </div>
      </main>
    )
  }

  const isWaiting = entry.status === 'waiting'
  const isCalled = entry.status === 'called'
  const isSeated = entry.status === 'seated'
  const isLeft = entry.status === 'left'

  const progressPercent = isWaiting ? Math.min(100, Math.max(10, (1 - (position - 1) / 5) * 100)) : 100

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 via-stone-50 to-stone-100/50">
      {/* ── Hero Header ── */}
      <div className="relative h-[220px] overflow-hidden">
        <Image
          src="/images/hero.jpg"
          alt="Mr Jackson"
          fill
          className="object-cover animate-hero-zoom"
          priority
        />
        <div className={`absolute inset-0 ${
          isCalled ? 'bg-gradient-to-b from-green-900/40 via-green-900/60 to-green-950/95' :
          isSeated ? 'bg-gradient-to-b from-blue-900/40 via-blue-900/60 to-blue-950/95' :
          'bg-gradient-to-b from-black/20 via-black/40 to-stone-950/95'
        }`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.3)_100%)]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link href="/join" className="absolute top-5 left-5 text-white/50 text-sm hover:text-white transition-colors duration-300 font-sans tracking-wide">
            ← Home
          </Link>
          <div className="animate-header-reveal">
            <Image src="/images/logo.png" alt="Mr Jackson" width={52} height={52} className="rounded-full shadow-2xl mb-3 mx-auto ring-2 ring-white/10" />
            <h1 className="text-3xl font-bold drop-shadow-lg tracking-tight">Mr Jackson</h1>
            <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mt-2 animate-expand-line" />
            <p className="text-white/40 text-[11px] tracking-[0.2em] uppercase font-sans mt-2 font-medium">Queue Status</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 -mt-8 pb-12 relative z-10">
        {/* ── Status Card ── */}
        <div className={`glass-card rounded-3xl w-full max-w-sm text-center p-6 animate-reveal border-2 shadow-2xl ${
          isCalled ? 'border-green-200/60 bg-gradient-to-b from-green-50/80 to-white/90' :
          isSeated ? 'border-blue-200/60 bg-gradient-to-b from-blue-50/80 to-white/90' :
          isLeft ? 'border-stone-200/60 bg-stone-50/90' :
          'border-white/60'
        }`}>
          {isWaiting && (
            <>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5 animate-count-in animate-ambient-glow">
                <span className="text-4xl font-bold text-amber-800 font-sans">#{position}</span>
              </div>

              <h2 className="text-2xl font-bold text-stone-900 mb-1.5">You&apos;re in the Queue</h2>
              <p className="text-stone-400 text-sm font-sans mb-5">
                {position === 1 ? "You're next!" : `${position - 1} ${position - 1 === 1 ? 'party' : 'parties'} ahead of you`}
              </p>

              <div className="mb-5 px-1">
                <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 rounded-full transition-all duration-1000 ease-out animate-progress-glow"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-stone-300 font-sans font-medium tracking-wide">Joined</span>
                  <span className="text-[10px] text-stone-300 font-sans font-medium tracking-wide">Your turn</span>
                </div>
              </div>

              {estimatedWait > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/80 rounded-2xl px-5 py-4 mb-5 gold-shimmer-border">
                  <p className="text-[10px] text-amber-600 uppercase tracking-[0.15em] font-bold font-sans">Estimated Wait</p>
                  <p className="text-3xl font-bold text-amber-800 font-sans animate-count-in mt-0.5">~{estimatedWait} min</p>
                </div>
              )}

              <p className="text-stone-400 text-sm font-sans">We&apos;ll text you when your table is ready</p>

              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-breathe" />
                <span className="text-[10px] text-stone-300 font-sans font-medium tracking-wide">Live · updates every 15s</span>
              </div>
            </>
          )}

          {isCalled && (
            <>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-green-200/50 border-2 border-green-300 flex items-center justify-center mx-auto mb-5 animate-confetti">
                <span className="text-5xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Your Table is Ready!</h2>
              {entry.assigned_table && (
                <p className="text-green-700 font-sans font-semibold text-lg mb-1">Table {entry.assigned_table}</p>
              )}

              {timeLeft !== null && timeLeft > 0 && (
                <div className={`mt-4 mb-5 rounded-2xl px-5 py-4 border-2 ${
                  timeLeft < 60000 ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200' : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200'
                }`}>
                  <p className={`text-[10px] uppercase tracking-[0.15em] font-bold font-sans mb-1 ${
                    timeLeft < 60000 ? 'text-red-500' : 'text-amber-600'
                  }`}>Confirm within</p>
                  <p className={`text-4xl font-bold font-sans tabular-nums ${
                    timeLeft < 60000 ? 'text-red-700' : 'text-amber-800'
                  }`}>{formatCountdown(timeLeft)}</p>
                </div>
              )}

              {timeLeft !== null && timeLeft <= 0 && (
                <div className="mt-4 mb-5 bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200 rounded-2xl px-5 py-4">
                  <p className="text-red-600 font-semibold font-sans text-sm">Time expired</p>
                  <p className="text-red-400 text-xs font-sans mt-1 mb-3">Your spot may have been given to the next person</p>
                  <Link href="/join" className="btn-primary btn-shine block text-center py-3 text-sm">
                    Back to Home
                  </Link>
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={confirming || (timeLeft !== null && timeLeft <= 0)}
                className="btn-primary btn-shine w-full py-5 text-lg mt-3 disabled:opacity-50 shadow-lg shadow-stone-900/10"
              >
                {confirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                    Confirming...
                  </span>
                ) : 'Confirm My Table'}
              </button>
              <p className="text-stone-400 text-xs font-sans mt-4 tracking-wide">Tap to confirm and head to your table</p>
            </>
          )}

          {isSeated && (
            <>
              <div className="text-5xl mb-5 animate-confetti">🎉</div>
              <h2 className="text-2xl font-bold text-green-800 mb-3">You&apos;re Seated!</h2>
              {entry.assigned_table && (
                <div className="bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-200 rounded-2xl px-5 py-4 mb-4">
                  <p className="text-[10px] text-green-600 uppercase tracking-[0.15em] font-bold font-sans mb-0.5">Your Table</p>
                  <p className="text-3xl font-bold text-green-800 font-sans">{entry.assigned_table}</p>
                </div>
              )}
              <p className="text-green-700 font-sans">Head to your table — enjoy your meal!</p>
            </>
          )}

          {isLeft && (
            <>
              <div className="text-5xl mb-5">👋</div>
              <h2 className="text-xl font-bold text-stone-700 mb-2">See You Next Time</h2>
              <p className="text-stone-400 font-sans mb-5">You&apos;ve been removed from the queue</p>
              <Link href="/join" className="btn-primary btn-shine inline-block">Back Home</Link>
            </>
          )}
        </div>

        {/* ── Guest Info ── */}
        {!isLeft && (
          <div className="glass-card rounded-2xl w-full max-w-sm mt-4 p-5 animate-reveal-2 border border-white/60 shadow-lg">
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400 font-medium">Name</span>
              <span className="font-semibold text-stone-800">{entry.name}</span>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent my-3" />
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400 font-medium">Party</span>
              <span className="font-semibold text-stone-800">{entry.party_size} {entry.party_size === 1 ? 'person' : 'people'}</span>
            </div>
          </div>
        )}

        {/* ── Order Options (while waiting) ── */}
        {isWaiting && (
          <div className="w-full max-w-sm mt-6 space-y-3">
            <p className="text-center text-stone-400 text-sm font-sans font-medium tracking-wide animate-reveal-3">While you wait...</p>

            <Link
              href={`/order/new?context=queue&name=${encodeURIComponent(entry.name)}&phone=${encodeURIComponent(entry.phone)}&queue_id=${entry.id}`}
              className="block animate-reveal-3"
            >
              <div className="glass-card rounded-2xl p-5 border-2 border-amber-300/70 bg-gradient-to-br from-amber-50/80 to-white/90 hover:border-amber-400 transition-all duration-300 active:scale-[0.98] card-hover gold-shimmer-border">
                <div className="flex items-start gap-4">
                  <span className="text-3xl animate-gentle-float">🚀</span>
                  <div>
                    <h3 className="font-bold text-stone-900 text-[16px]">Order &amp; Pay Now</h3>
                    <p className="text-stone-500 text-sm mt-1 font-sans leading-relaxed">
                      Your food will be served the moment you&apos;re seated. No waiting!
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/menu" className="block animate-reveal-4">
              <div className="glass-card rounded-2xl p-5 border-2 border-transparent hover:border-stone-200 transition-all duration-300 active:scale-[0.98] card-hover">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">📋</span>
                  <div>
                    <h3 className="font-bold text-stone-900 text-[16px]">Browse the Menu</h3>
                    <p className="text-stone-400 text-sm mt-1 font-sans leading-relaxed">
                      Check out what&apos;s on offer and order when you&apos;re seated.
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {!showCancelConfirm && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full text-center text-sm text-stone-400 font-sans hover:text-red-500 transition-colors duration-300 py-3 mt-2 animate-reveal-4"
              >
                Want to leave the queue?
              </button>
            )}

            {showCancelConfirm && (
              <div className="glass-card rounded-2xl p-5 border-2 border-red-200/60 bg-gradient-to-br from-red-50/80 to-white/90 animate-slide-up">
                <div className="text-center mb-4">
                  <p className="text-2xl mb-1.5">👋</p>
                  <p className="font-semibold text-stone-800 text-sm font-sans">Leave the queue?</p>
                  <p className="text-xs text-stone-400 font-sans mt-1.5 leading-relaxed">Your spot will be released and given to the next person.</p>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="btn-secondary flex-1 py-3 text-sm"
                  >
                    Stay in Queue
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-red-500/20"
                  >
                    {cancelling ? 'Leaving...' : 'Yes, Leave'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* When seated, offer ordering */}
        {isSeated && (
          <div className="w-full max-w-sm mt-6 animate-reveal-2">
            <Link
              href={`/order/new?context=dine_in&table=${entry.assigned_table || ''}&name=${encodeURIComponent(entry.name)}&phone=${encodeURIComponent(entry.phone)}`}
              className="btn-primary btn-shine w-full flex items-center justify-center gap-2 py-5 text-lg shadow-lg shadow-stone-900/10"
            >
              Order &amp; Pay
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

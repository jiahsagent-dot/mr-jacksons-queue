'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { QueueEntry } from '@/lib/supabase'

export default function QueueStatusPage() {
  const { id } = useParams()
  const [entry, setEntry] = useState<QueueEntry | null>(null)
  const [position, setPosition] = useState(0)
  const [estimatedWait, setEstimatedWait] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const fetchStatus = async () => {
    // Cache-bust every request so position always reflects live DB state
    const res = await fetch(`/api/queue/status?id=${id}&_t=${Date.now()}`)
    if (res.ok) {
      const data = await res.json()
      setEntry(data.entry)
      setPosition(data.position)
      setEstimatedWait(data.estimated_wait)
    }
    setLastRefresh(Date.now())
    setLoading(false)
  }

  useEffect(() => {
    fetchStatus()
    // Poll every 8s (was 15s) for quicker position updates
    const interval = setInterval(fetchStatus, 8000)
    return () => clearInterval(interval)
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col bg-stone-50">
        {/* Skeleton header */}
        <div className="h-[160px] skeleton" />
        <div className="flex-1 flex flex-col items-center px-4 pt-8 gap-4">
          <div className="w-full max-w-sm h-48 skeleton" />
          <div className="w-full max-w-sm h-24 skeleton" />
        </div>
      </main>
    )
  }

  if (!entry) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-stone-400 font-sans">Queue entry not found</p>
        <Link href="/join" className="btn-primary mt-4">Back to Home</Link>
      </main>
    )
  }

  const isWaiting = entry.status === 'waiting'
  const isCalled = entry.status === 'called'
  const isSeated = entry.status === 'seated'
  const isLeft = entry.status === 'left'

  // Calculate progress (max 5 positions, 100% when position is 1)
  const progressPercent = isWaiting ? Math.min(100, Math.max(10, (1 - (position - 1) / 5) * 100)) : 100

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="relative h-[160px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover" priority />
        <div className={`absolute inset-0 ${
          isCalled ? 'bg-gradient-to-b from-green-900/50 via-green-900/60 to-green-900/90' :
          isSeated ? 'bg-gradient-to-b from-blue-900/50 via-blue-900/60 to-blue-900/90' :
          'bg-gradient-to-b from-black/30 via-black/50 to-black/85'
        }`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link href="/join" className="absolute top-4 left-4 text-white/70 text-sm hover:text-white font-sans">← Home</Link>
          <Image src="/images/logo.png" alt="Mr Jackson" width={48} height={48} className="rounded-full shadow-lg mb-2" />
          <h1 className="text-2xl font-bold drop-shadow-lg">Mr Jackson</h1>
          <div className="w-6 h-0.5 bg-amber-500 mx-auto mt-1.5" />
          <p className="text-white/50 text-xs tracking-widest uppercase font-sans mt-1">Queue Status</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 -mt-5 pb-10">
        {/* Status Card */}
        <div className={`card w-full max-w-sm text-center animate-slide-up border-2 shadow-xl ${
          isCalled ? 'border-green-200 bg-gradient-to-b from-green-50/50 to-white' :
          isSeated ? 'border-blue-200 bg-gradient-to-b from-blue-50/50 to-white' :
          isLeft ? 'border-stone-200 bg-stone-50' :
          'border-stone-100'
        }`}>
          {isWaiting && (
            <>
              <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-4 animate-count-in">
                <span className="text-4xl font-bold text-amber-800 font-sans">#{position}</span>
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-1">You&apos;re in the Queue</h2>
              <p className="text-stone-400 text-sm font-sans mb-4">
                {position === 1 ? "You're next! 🎉" : `${position - 1} ${position - 1 === 1 ? 'party' : 'parties'} ahead of you`}
              </p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-1000 ease-out animate-progress-pulse"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-stone-300 font-sans">Joined</span>
                  <span className="text-[10px] text-stone-300 font-sans">Your turn</span>
                </div>
              </div>

              {estimatedWait > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
                  <p className="text-xs text-amber-600 uppercase tracking-wide font-semibold font-sans">Estimated Wait</p>
                  <p className="text-2xl font-bold text-amber-800 font-sans animate-count-in">~{estimatedWait} min</p>
                </div>
              )}
              <p className="text-stone-400 text-sm font-sans">📱 We&apos;ll text you when your table is ready</p>

              {/* Live indicator */}
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-stone-300 font-sans">Live · updates every 15s</span>
              </div>
            </>
          )}

          {isCalled && (
            <>
              <div className="w-20 h-20 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center mx-auto mb-4 animate-confetti">
                <span className="text-4xl">🔔</span>
              </div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">Your Table is Ready!</h2>
              <p className="text-green-700 font-sans">Please head to the host stand now</p>
              <div className="mt-4 bg-green-100 rounded-xl px-4 py-2 inline-block">
                <p className="text-sm text-green-700 font-sans">📱 SMS sent to your phone</p>
              </div>
            </>
          )}

          {isSeated && (
            <>
              <div className="text-5xl mb-4 animate-confetti">😋</div>
              <h2 className="text-2xl font-bold text-blue-800 mb-2">Enjoy Your Meal!</h2>
              <p className="text-blue-600 font-sans">You&apos;re all settled in at Mr Jackson</p>
            </>
          )}

          {isLeft && (
            <>
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-xl font-bold text-stone-700 mb-2">See You Next Time</h2>
              <p className="text-stone-400 font-sans mb-4">You&apos;ve been removed from the queue</p>
              <Link href="/join" className="btn-primary inline-block">Back Home</Link>
            </>
          )}
        </div>

        {/* Guest Info */}
        {!isLeft && (
          <div className="card w-full max-w-sm mt-3 animate-slide-up-1">
            <div className="flex justify-between text-sm font-sans">
              <span className="text-stone-400">Name</span>
              <span className="font-semibold text-stone-800">{entry.name}</span>
            </div>
            <div className="flex justify-between text-sm font-sans mt-2">
              <span className="text-stone-400">Party</span>
              <span className="font-semibold text-stone-800">{entry.party_size} {entry.party_size === 1 ? 'person' : 'people'}</span>
            </div>
          </div>
        )}

        {/* ── Order Options (while waiting) ── */}
        {isWaiting && (
          <div className="w-full max-w-sm mt-5 space-y-3 animate-slide-up-2">
            <p className="text-center text-stone-400 text-sm font-sans font-medium">While you wait...</p>

            {/* Order Now — Highlighted */}
            <Link
              href={`/order/new?context=queue&name=${encodeURIComponent(entry.name)}&phone=${encodeURIComponent(entry.phone)}&queue_id=${entry.id}`}
              className="block"
            >
              <div className="card border-2 border-amber-300 bg-amber-50/30 hover:border-amber-400 transition-all active:scale-[0.98] card-hover">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🚀</span>
                  <div>
                    <h3 className="font-bold text-stone-900 text-[16px]">Order &amp; Pay Now</h3>
                    <p className="text-stone-500 text-sm mt-1 font-sans leading-relaxed">
                      Your food will be served the moment you&apos;re seated. No waiting!
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Order Later */}
            <div className="card border-2 border-transparent">
              <div className="flex items-start gap-4">
                <span className="text-3xl">⏰</span>
                <div>
                  <h3 className="font-bold text-stone-900 text-[16px]">Order When Seated</h3>
                  <p className="text-stone-400 text-sm mt-1 font-sans leading-relaxed">
                    Browse the menu and order at your own pace once you&apos;re comfortable.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/menu"
              className="block text-center text-stone-400 text-sm font-sans hover:text-stone-700 transition-colors py-2"
            >
              Browse our menu →
            </Link>
          </div>
        )}

        {/* When seated, offer ordering */}
        {isSeated && (
          <div className="w-full max-w-sm mt-5 animate-slide-up-1">
            <Link
              href={`/order/new?context=dine_in&name=${encodeURIComponent(entry.name)}&phone=${encodeURIComponent(entry.phone)}`}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
            >
              <span>🍽️</span> Order & Pay
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

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

  const fetchStatus = async () => {
    const res = await fetch(`/api/queue/status?id=${id}`)
    if (res.ok) {
      const data = await res.json()
      setEntry(data.entry)
      setPosition(data.position)
      setEstimatedWait(data.estimated_wait)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center animate-fade-in">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-stone-400 text-sm font-sans">Loading your status...</p>
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

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className={`relative h-[160px] overflow-hidden`}>
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
              <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl font-bold text-amber-800 font-sans">#{position}</span>
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-1">You&apos;re in the Queue</h2>
              <p className="text-stone-400 text-sm font-sans mb-4">
                {position === 1 ? "You're next!" : `${position - 1} ${position - 1 === 1 ? 'party' : 'parties'} ahead of you`}
              </p>
              {estimatedWait > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
                  <p className="text-xs text-amber-600 uppercase tracking-wide font-semibold font-sans">Estimated Wait</p>
                  <p className="text-2xl font-bold text-amber-800 font-sans">~{estimatedWait} min</p>
                </div>
              )}
              <p className="text-stone-400 text-sm font-sans">📱 We&apos;ll text you when your table is ready</p>
            </>
          )}

          {isCalled && (
            <>
              <div className="w-20 h-20 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center mx-auto mb-4 animate-bounce">
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
              <div className="text-5xl mb-4">😋</div>
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
          <div className="card w-full max-w-sm mt-3 animate-fade-in">
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
          <div className="w-full max-w-sm mt-5 space-y-3 animate-fade-in">
            <p className="text-center text-stone-400 text-sm font-sans font-medium">While you wait...</p>

            {/* Order Now — Highlighted */}
            <Link
              href={`/order/new?context=queue&name=${encodeURIComponent(entry.name)}&phone=${encodeURIComponent(entry.phone)}&queue_id=${entry.id}`}
              className="block"
            >
              <div className="card border-2 border-amber-300 bg-amber-50/30 hover:border-amber-400 transition-all active:scale-[0.98]">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🚀</span>
                  <div>
                    <h3 className="font-bold text-stone-900 text-[16px]">Order &amp; Pay Now</h3>
                    <p className="text-stone-500 text-sm mt-1 font-sans leading-relaxed">
                      Your food will start being prepared and will be served the moment you&apos;re seated. No waiting for food!
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
                    Take your time — browse the menu and order at your own pace once you&apos;re comfortable at your table.
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
          <div className="w-full max-w-sm mt-5 animate-fade-in">
            <Link
              href={`/order/new?context=dine_in&name=${encodeURIComponent(entry.name)}&phone=${encodeURIComponent(entry.phone)}`}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
            >
              <span>🍽️</span> Order & Pay
            </Link>
          </div>
        )}

        {isWaiting && (
          <p className="text-xs text-stone-300 font-sans mt-4">Auto-refreshes every 15 seconds</p>
        )}
      </div>
    </main>
  )
}

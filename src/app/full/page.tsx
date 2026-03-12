'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import { ScrollReveal } from '@/components/ScrollReveal'

export default function FullPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<{ is_closed: boolean; estimated_wait: number } | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [joining, setJoining] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/tables').then(r => r.json()).catch(() => null),
      fetch('/api/queue/settings').then(r => r.json()).catch(() => null),
    ]).then(([tablesData, settingsData]) => {
      if (tablesData?.has_availability) {
        router.push('/tables')
        return
      }
      setSettings(settingsData)
    })
  }, [router])

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Please enter your name')
    if (!phone.trim()) return toast.error('Please enter your phone number')

    setJoining(true)
    try {
      const res = await fetch('/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          party_size: partySize,
          phone: phone.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      router.push(`/queue/${data.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(msg)
    } finally {
      setJoining(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="relative h-[180px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover animate-hero-zoom" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/85" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link href="/join" className="absolute top-4 left-4 text-white/70 text-sm hover:text-white font-sans">← Back</Link>
          <Image src="/images/logo.png" alt="Mr Jackson" width={56} height={56} className="rounded-full shadow-lg mb-2" />
          <h1 className="text-2xl font-bold drop-shadow-lg">We&apos;re Currently Full</h1>
          <div className="w-6 h-0.5 bg-amber-500 mx-auto mt-2" />
        </div>
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 -mt-4 relative z-10 pb-10">
        {/* Sorry message */}
        <div className="card text-center shadow-xl animate-slide-up mb-4">
          <div className="animate-gentle-float">
            <p className="text-3xl mb-3">😔</p>
          </div>
          <p className="text-stone-700 font-semibold font-sans">All tables are currently occupied</p>
          <p className="text-stone-400 text-sm mt-1 font-sans">But don&apos;t worry — you&apos;ve got options!</p>
          {settings && (
            <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-sm px-4 py-2 rounded-full font-sans">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              ~{settings.estimated_wait} min wait
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3 animate-slide-up-1">
          {/* Join the Queue */}
          {!showJoinForm ? (
            <button
              onClick={() => setShowJoinForm(true)}
              className="w-full text-left card border-2 border-transparent hover:border-amber-300 transition-all active:scale-[0.98] card-hover"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">⏳</span>
                <div>
                  <h3 className="font-bold text-stone-900 text-[16px]">Join the Queue</h3>
                  <p className="text-stone-400 text-sm mt-1 font-sans leading-relaxed">
                    We&apos;ll seat you at the next available table. You can pre-order so food&apos;s ready when you sit down.
                  </p>
                </div>
              </div>
            </button>
          ) : (
            <div className="card border-2 border-amber-300 shadow-lg animate-slide-up">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⏳</span>
                <h3 className="font-bold text-stone-900">Join the Queue</h3>
              </div>
              <form onSubmit={handleJoinQueue} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Sarah"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="given-name"
                    required
                  />
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
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Mobile Number</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="04XX XXX XXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={joining}
                  className="btn-primary w-full py-4 text-base disabled:opacity-50"
                >
                  {joining ? 'Joining...' : 'Join Queue'}
                </button>
              </form>
              <button
                onClick={() => setShowJoinForm(false)}
                className="w-full text-center text-xs text-stone-400 mt-2 py-1 hover:text-stone-600 font-sans"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Book a Table */}
          <ScrollReveal delay={100} direction="up">
            <Link href="/book" className="block">
              <div className="card border-2 border-transparent hover:border-stone-300 transition-all active:scale-[0.98] card-hover">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">📅</span>
                  <div>
                    <h3 className="font-bold text-stone-900 text-[16px]">Book a Time</h3>
                    <p className="text-stone-400 text-sm mt-1 font-sans leading-relaxed">
                      Reserve a table for later. Pre-order so food&apos;s ready when you arrive.
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </ScrollReveal>

          {/* Browse menu link */}
          <ScrollReveal delay={200} direction="up">
            <Link
              href="/menu"
              className="block text-center text-stone-400 text-sm hover:text-stone-700 transition-colors py-3 font-sans"
            >
              Browse our menu while you decide →
            </Link>
          </ScrollReveal>
        </div>
      </div>
    </main>
  )
}

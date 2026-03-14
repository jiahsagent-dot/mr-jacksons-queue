'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import { ScrollReveal } from '@/components/ScrollReveal'
import { formatAusPhone, stripPhone } from '@/lib/format'

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
          phone: stripPhone(phone),
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
      <div className="relative h-[200px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson" fill className="object-cover animate-hero-zoom" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/90" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link href="/join" className="absolute top-4 left-4 text-white/70 text-sm hover:text-white font-sans">← Back</Link>
          <Image src="/images/logo.png" alt="Mr Jackson" width={52} height={52} className="rounded-full shadow-lg mb-2.5" />
          <h1 className="text-2xl font-bold drop-shadow-lg" style={{ fontFamily: "'Playfair Display', serif" }}>We&apos;re Currently Full</h1>
          <div className="w-8 h-0.5 mx-auto mt-2.5" style={{ background: 'var(--gold)' }} />
        </div>
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 -mt-5 relative z-10 pb-12">

        {/* Status card */}
        <div className="glass-card rounded-2xl p-5 text-center shadow-xl animate-slide-up mb-4">
          {/* SVG icon instead of emoji */}
          <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeWidth="2"/>
            </svg>
          </div>
          <p className="font-semibold text-stone-800 font-sans text-[15px]">All tables are currently occupied</p>
          <p className="text-stone-400 text-sm mt-1 font-sans">Here are your options while you wait</p>
          {settings && (
            <div className="mt-3.5 inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full font-sans font-medium"
              style={{ background: 'rgba(201,168,76,0.12)', color: '#7A5C1E', border: '1px solid rgba(201,168,76,0.3)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--gold)' }} />
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
              className="w-full text-left glass-card rounded-2xl p-5 transition-all active:scale-[0.98] card-hover"
              style={{ border: '1.5px solid rgba(201,168,76,0.2)' }}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-stone-900 flex items-center justify-center flex-shrink-0 text-white mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-[15px] font-sans">Join the Queue</h3>
                  <p className="text-stone-400 text-[13px] mt-1 font-sans leading-relaxed">
                    We&apos;ll text you when your table is ready. Pre-order so food&apos;s ready when you sit down.
                  </p>
                </div>
              </div>
            </button>
          ) : (
            <div className="glass-card rounded-2xl p-5 shadow-lg animate-slide-up" style={{ border: '1.5px solid rgba(201,168,76,0.35)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center text-white flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                </div>
                <h3 className="font-bold text-stone-900 font-sans">Join the Queue</h3>
              </div>
              <form onSubmit={handleJoinQueue} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Name</label>
                  <input type="text" className="input-field" placeholder="e.g. Sarah" value={name}
                    onChange={e => setName(e.target.value)} autoComplete="given-name" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Party Size</label>
                  <div className="flex items-center gap-4 py-1">
                    <button type="button" onClick={() => setPartySize(Math.max(1, partySize - 1))}
                      className="w-10 h-10 rounded-full border border-stone-200 bg-white text-stone-600 font-bold text-lg flex items-center justify-center hover:border-stone-400 transition-all active:scale-95">−</button>
                    <span className="text-2xl font-bold text-stone-900 w-8 text-center font-sans">{partySize}</span>
                    <button type="button" onClick={() => setPartySize(Math.min(12, partySize + 1))}
                      className="w-10 h-10 rounded-full border border-stone-200 bg-white text-stone-600 font-bold text-lg flex items-center justify-center hover:border-stone-400 transition-all active:scale-95">+</button>
                    <span className="text-sm text-stone-400 font-sans">{partySize === 1 ? 'person' : 'people'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 font-sans">Mobile Number</label>
                  <input type="tel" className="input-field" placeholder="04XX XXX XXX" value={phone}
                    onChange={e => setPhone(formatAusPhone(e.target.value))} autoComplete="tel" inputMode="tel" required />
                </div>
                <button type="submit" disabled={joining} className="btn-primary w-full py-4 text-base disabled:opacity-50">
                  {joining ? 'Joining...' : 'Join Queue'}
                </button>
              </form>
              <button onClick={() => setShowJoinForm(false)}
                className="w-full text-center text-xs text-stone-400 mt-2 py-1 hover:text-stone-600 font-sans">
                Cancel
              </button>
            </div>
          )}

          {/* Book a Table */}
          <ScrollReveal delay={100} direction="up">
            <Link href="/book" className="block">
              <div className="glass-card rounded-2xl p-5 transition-all active:scale-[0.98] card-hover" style={{ border: '1.5px solid rgba(201,168,76,0.2)' }}>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-stone-900 flex items-center justify-center flex-shrink-0 text-white mt-0.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-[15px] font-sans">Book a Time</h3>
                    <p className="text-stone-400 text-[13px] mt-1 font-sans leading-relaxed">
                      Reserve a table for later. Pre-order so food&apos;s ready when you arrive.
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </ScrollReveal>

          {/* Browse menu */}
          <ScrollReveal delay={200} direction="up">
            <Link href="/menu" className="block text-center text-stone-400 text-sm hover:text-stone-700 transition-colors py-3 font-sans">
              Browse our menu while you decide →
            </Link>
          </ScrollReveal>

        </div>
      </div>
    </main>
  )
}

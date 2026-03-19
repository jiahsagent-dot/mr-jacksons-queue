'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function OwnerLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/owner/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (res.ok) {
      sessionStorage.setItem('owner_token', data.token)
      router.push('/owner/dashboard')
    } else {
      setError('Incorrect password')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden mb-3 shadow-xl">
            <Image src="/images/logo.png" alt="Mr Jackson" width={64} height={64} className="object-cover" />
          </div>
          <h1 className="text-white text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Owner Dashboard</h1>
          <p className="text-stone-500 text-sm font-sans mt-1">Mr Jackson's</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full bg-stone-900 text-white border border-stone-700 rounded-2xl px-4 py-4 text-sm font-sans placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {error && <p className="text-red-400 text-xs font-sans text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-bold py-4 rounded-2xl text-sm transition-colors font-sans"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function StaffLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      sessionStorage.setItem('staff_token', data.access_token)
      router.push('/staff/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#faf8f5]">
      <div className="w-full max-w-xs animate-fade-in">
        <div className="text-center mb-8">
          <Image
            src="/images/logo.png"
            alt="Mr Jackson"
            width={64}
            height={64}
            className="mx-auto mb-4 rounded-full shadow-md"
          />
          <h1 className="text-2xl font-bold text-stone-900">Staff Access</h1>
          <p className="text-stone-400 text-sm mt-1">Mr Jackson&apos;s · Mornington</p>
        </div>

        <div className="card shadow-md">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="Enter staff password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-sm"
                  tabIndex={-1}
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { OwnerNav } from '@/components/OwnerNav'

type MenuItem = {
  id: number
  name: string
  description: string
  price: number
  cost_price: number | null
  cogs_pct: number | null
  category: string
  available: boolean
}

type Summary = {
  total: number
  withCosts: number
  missingCosts: number
  avgCogsPct: number | null
}

function cogsStatus(pct: number | null): 'green' | 'amber' | 'red' | 'none' {
  if (pct === null) return 'none'
  if (pct <= 25) return 'green'
  if (pct <= 35) return 'amber'
  return 'red'
}

const STATUS_DOT = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500', none: 'bg-stone-700' }
const STATUS_TEXT = { green: 'text-green-400', amber: 'text-amber-400', red: 'text-red-400', none: 'text-stone-600' }
const STATUS_EMOJI = { green: '🟢', amber: '🟡', red: '🔴', none: '⬜' }
const STATUS_LABEL = { green: 'Great', amber: 'Watch', red: 'High cost', none: 'Not set' }

function ItemRow({ item, onSave }: { item: MenuItem; onSave: (id: number, cost: number | null) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(item.cost_price !== null ? String(item.cost_price) : '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const status = cogsStatus(item.cogs_pct)

  // Preview COGS% as user types
  const previewCogs = value !== '' && item.price > 0
    ? Math.round((parseFloat(value) / item.price) * 1000) / 10
    : null
  const previewStatus = cogsStatus(previewCogs)

  const handleSave = async () => {
    setSaving(true)
    const cost = value === '' ? null : parseFloat(value)
    if (cost !== null && isNaN(cost)) { toast.error('Invalid price'); setSaving(false); return }
    await onSave(item.id, cost)
    setSaving(false)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setEditing(false); setValue(item.cost_price !== null ? String(item.cost_price) : '') }
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  return (
    <div className={`px-4 py-3 border-b border-stone-800 last:border-0 ${editing ? 'bg-stone-800/50' : ''}`}>
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />

        {/* Name + price */}
        <div className="flex-1 min-w-0">
          <p className="text-stone-200 text-sm font-semibold font-sans truncate">{item.name}</p>
          <p className="text-stone-500 text-xs font-sans">Sale: ${item.price.toFixed(2)}</p>
        </div>

        {/* Cost + COGS */}
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-right">
            <div>
              <p className={`text-sm font-bold font-sans tabular-nums ${item.cost_price !== null ? 'text-stone-200' : 'text-stone-600'}`}>
                {item.cost_price !== null ? `$${item.cost_price.toFixed(2)}` : 'Set cost'}
              </p>
              {item.cogs_pct !== null && (
                <p className={`text-[11px] font-bold font-sans ${STATUS_TEXT[status]}`}>
                  {STATUS_EMOJI[status]} {item.cogs_pct}%
                </p>
              )}
            </div>
            <span className="text-stone-600 text-sm">✎</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="text-right">
              {previewCogs !== null && (
                <p className={`text-[11px] font-bold font-sans mb-1 ${STATUS_TEXT[previewStatus]}`}>
                  {STATUS_EMOJI[previewStatus]} {previewCogs}%
                </p>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 text-sm font-sans">$</span>
                <input
                  ref={inputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="0.00"
                  className="w-20 bg-stone-700 text-white border border-amber-500 rounded-lg px-2 py-1.5 text-sm font-sans tabular-nums focus:outline-none text-right"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={handleSave} disabled={saving}
                className="bg-amber-500 text-stone-900 text-xs font-bold px-2.5 py-1.5 rounded-lg font-sans disabled:opacity-50">
                {saving ? '…' : '✓'}
              </button>
              <button onClick={() => { setEditing(false); setValue(item.cost_price !== null ? String(item.cost_price) : '') }}
                className="bg-stone-700 text-stone-300 text-xs font-bold px-2.5 py-1.5 rounded-lg font-sans">
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OwnerMenuPage() {
  const router = useRouter()
  const [byCategory, setByCategory] = useState<Record<string, MenuItem[]>>({})
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'missing'>('all')
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())

  useEffect(() => {
    const t = sessionStorage.getItem('owner_token')
    if (!t) router.push('/owner/login')
  }, [router])

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/owner/menu-costs?_t=${Date.now()}`)
    if (res.ok) {
      const d = await res.json()
      setByCategory(d.byCategory)
      setSummary(d.summary)
      // Auto-open all categories on first load
      setOpenCats(new Set(Object.keys(d.byCategory)))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async (id: number, cost: number | null) => {
    const res = await fetch('/api/owner/menu-costs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, cost_price: cost }),
    })
    if (res.ok) {
      const { item } = await res.json()
      // Update local state
      setByCategory(prev => {
        const next = { ...prev }
        for (const cat of Object.keys(next)) {
          next[cat] = next[cat].map(i => i.id === id ? { ...i, cost_price: item.cost_price, cogs_pct: item.cogs_pct } : i)
        }
        return next
      })
      // Recalculate summary
      setSummary(prev => {
        if (!prev) return prev
        const allItems = Object.values(byCategory).flat()
        const updated = allItems.map(i => i.id === id ? { ...i, cost_price: item.cost_price } : i)
        const withCosts = updated.filter(i => i.cost_price !== null).length
        return { ...prev, withCosts, missingCosts: prev.total - withCosts }
      })
      toast.success(cost !== null ? `Cost saved` : 'Cost cleared')
    } else {
      toast.error('Save failed')
    }
  }

  const toggleCat = (cat: string) => {
    setOpenCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  if (loading) return (
    <main className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-stone-700 border-t-amber-500 rounded-full animate-spin" />
    </main>
  )

  const categories = Object.keys(byCategory).sort()

  const filteredByCategory = filter === 'missing'
    ? Object.fromEntries(
        Object.entries(byCategory)
          .map(([cat, items]) => [cat, items.filter(i => i.cost_price === null)])
          .filter(([, items]) => (items as MenuItem[]).length > 0)
      )
    : byCategory

  return (
    <main className="min-h-screen bg-stone-950 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-950/95 backdrop-blur-sm border-b border-stone-800 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-white text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Item Costs</h1>
            {summary && (
              <span className={`text-xs font-bold font-sans px-2 py-1 rounded-full ${
                summary.missingCosts === 0 ? 'bg-green-900/50 text-green-400' : 'bg-amber-900/50 text-amber-400'
              }`}>
                {summary.withCosts}/{summary.total} set
              </span>
            )}
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 bg-stone-900 rounded-xl p-0.5 border border-stone-800">
            {(['all', 'missing'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-sans transition-all ${filter === f ? 'bg-amber-500 text-stone-900' : 'text-stone-400'}`}>
                {f === 'all' ? 'All Items' : `Missing (${summary?.missingCosts ?? 0})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* Summary card */}
        {summary && (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-white font-sans">{summary.total}</p>
                <p className="text-stone-500 text-[11px] font-sans">Total items</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold font-sans ${summary.missingCosts === 0 ? 'text-green-400' : 'text-amber-400'}`}>{summary.withCosts}</p>
                <p className="text-stone-500 text-[11px] font-sans">Costs set</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold font-sans ${summary.avgCogsPct !== null ? (summary.avgCogsPct <= 25 ? 'text-green-400' : summary.avgCogsPct <= 35 ? 'text-amber-400' : 'text-red-400') : 'text-stone-500'}`}>
                  {summary.avgCogsPct !== null ? `${summary.avgCogsPct}%` : '—'}
                </p>
                <p className="text-stone-500 text-[11px] font-sans">Avg COGS</p>
              </div>
            </div>
            {summary.avgCogsPct !== null && summary.withCosts > 0 && (
              <p className="text-[11px] text-stone-500 font-sans mt-3 text-center">
                Dashboard COGS % now using live item costs ({summary.withCosts} items)
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-3 text-[11px] font-sans text-stone-500 px-1">
          <span>🟢 ≤25% great</span>
          <span>🟡 25–35% watch</span>
          <span>🔴 &gt;35% high</span>
        </div>

        {/* Items by category */}
        {Object.entries(filteredByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, rawItems]) => {
          const items = rawItems as MenuItem[]
          return (
          <div key={cat} className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCat(cat)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-stone-300 text-sm font-bold font-sans">{cat}</span>
                <span className="text-[11px] font-sans text-stone-600">{items.length} items</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Mini status bar */}
                <div className="flex gap-0.5">
                  {items.map(i => (
                    <span key={i.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[cogsStatus(i.cogs_pct)]}`} />
                  ))}
                </div>
                <span className="text-stone-600 text-xs">{openCats.has(cat) ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Items */}
            {openCats.has(cat) && (
              <div className="border-t border-stone-800">
                {items.map(item => (
                  <ItemRow key={item.id} item={item} onSave={handleSave} />
                ))}
              </div>
            )}
          </div>
          )
        })}

        {Object.keys(filteredByCategory).length === 0 && filter === 'missing' && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-stone-300 font-bold font-sans">All costs set!</p>
            <p className="text-stone-500 text-sm font-sans mt-1">Every menu item has a cost price</p>
          </div>
        )}
      </div>

      <OwnerNav />
    </main>
  )
}

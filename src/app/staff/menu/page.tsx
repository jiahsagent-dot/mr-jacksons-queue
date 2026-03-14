'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { StaffNav } from '@/components/StaffNav'

type MenuItem = {
  id: number
  name: string
  description: string
  price: number
  category: string
  tags: string[]
  available: boolean
  sort_order: number
}

const ALL_TAGS = ['V', 'LG', 'VG', 'DF']
const TAG_LABELS: Record<string, string> = { V: 'Vegetarian', LG: 'Low Gluten', VG: 'Vegan', DF: 'Dairy Free' }

export default function StaffMenuPage() {
  const router = useRouter()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', tags: [] as string[] })

  useEffect(() => {
    const t = sessionStorage.getItem('staff_token')
    if (!t) router.push('/staff/login')
  }, [router])

  const fetchMenu = async () => {
    const res = await fetch(`/api/staff/menu?_t=${Date.now()}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data.items || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchMenu() }, [])

  const categories = Array.from(new Set(items.map(i => i.category)))
  const filtered = activeCategory ? items.filter(i => i.category === activeCategory) : items
  const [searchQuery, setSearchQuery] = useState('')

  const searchFiltered = searchQuery
    ? filtered.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    : filtered

  const toggleAvailable = async (item: MenuItem) => {
    const res = await fetch('/api/staff/menu', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, available: !item.available }),
    })
    if (res.ok) {
      toast.success(`${item.name} ${!item.available ? 'available' : 'unavailable'}`)
      fetchMenu()
    }
  }

  const startEdit = (item: MenuItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      tags: item.tags || [],
    })
    setAdding(false)
  }

  const startAdd = () => {
    setAdding(true)
    setEditing(null)
    setForm({ name: '', description: '', price: '', category: activeCategory || categories[0] || '', tags: [] })
  }

  const toggleTag = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }))
  }

  const saveItem = async () => {
    if (!form.name || !form.price || !form.category) return toast.error('Fill in name, price, and category')

    if (editing) {
      const res = await fetch('/api/staff/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...form, price: parseFloat(form.price) }),
      })
      if (res.ok) { toast.success('Updated!'); setEditing(null); fetchMenu() }
      else toast.error('Failed to update')
    } else {
      const res = await fetch('/api/staff/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { toast.success('Added!'); setAdding(false); fetchMenu() }
      else toast.error('Failed to add')
    }
  }

  const deleteItem = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return
    const res = await fetch('/api/staff/menu', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    })
    if (res.ok) { toast.success('Deleted'); fetchMenu() }
    else toast.error('Failed to delete')
  }

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#faf8f5]/95 backdrop-blur-sm border-b border-stone-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>Menu Manager</h1>
            <p className="text-xs text-stone-400 font-sans">{items.length} items · {categories.length} categories</p>
          </div>
          <button
            onClick={startAdd}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5"
          >
            <span className="text-lg leading-none">+</span>
            <span>Add Item</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setActiveCategory(null)}
            className={`py-1.5 px-3 rounded-full text-[11px] font-medium transition-all font-sans ${
              !activeCategory ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >All ({items.length})</button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`py-1.5 px-3 rounded-full text-[11px] font-medium transition-all font-sans ${
                activeCategory === cat ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >{cat} ({items.filter(i => i.category === cat).length})</button>
          ))}
        </div>

        {/* Search + Bulk Actions */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="🔍 Search menu items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {activeCategory && (
            <div className="flex gap-1.5">
              <button
                onClick={async () => {
                  const categoryItems = items.filter(i => i.category === activeCategory && !i.available)
                  if (categoryItems.length === 0) return toast('All items already available')
                  for (const item of categoryItems) {
                    await fetch('/api/staff/menu', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, available: true }) })
                  }
                  toast.success(`All ${activeCategory} items enabled`)
                  fetchMenu()
                }}
                className="text-[10px] px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 font-semibold font-sans whitespace-nowrap hover:bg-green-100"
              >
                All On
              </button>
              <button
                onClick={async () => {
                  const categoryItems = items.filter(i => i.category === activeCategory && i.available)
                  if (categoryItems.length === 0) return toast('All items already unavailable')
                  if (!confirm(`Mark all ${activeCategory} items unavailable?`)) return
                  for (const item of categoryItems) {
                    await fetch('/api/staff/menu', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, available: false }) })
                  }
                  toast.success(`All ${activeCategory} items disabled`)
                  fetchMenu()
                }}
                className="text-[10px] px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 font-semibold font-sans whitespace-nowrap hover:bg-red-100"
              >
                All Off
              </button>
            </div>
          )}
        </div>

        {/* Add / Edit Form */}
        {(adding || editing) && (
          <div className="card border-2 border-amber-300 mb-4 animate-fade-in">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-stone-900">{editing ? 'Edit Item' : 'Add New Item'}</h3>
              <button onClick={() => { setAdding(false); setEditing(null) }} className="text-stone-400 text-sm hover:text-stone-700">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-sans">Name</label>
                <input className="input-field" placeholder="Dish name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-sans">Description</label>
                <input className="input-field" placeholder="Short description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-sans">Price ($)</label>
                  <input className="input-field" type="number" step="0.50" placeholder="0.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-sans">Category</label>
                  <input
                    className="input-field"
                    placeholder="Type or select category"
                    list="categories-list"
                    value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}
                  />
                  <datalist id="categories-list">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1 font-sans">Dietary Tags</label>
                <div className="flex gap-2 flex-wrap">
                  {ALL_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all font-sans ${
                        form.tags.includes(tag) ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200'
                      }`}
                    >{tag} — {TAG_LABELS[tag]}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveItem} className="btn-primary flex-1 py-3">{editing ? 'Save Changes' : 'Add Item'}</button>
                <button onClick={() => { setAdding(false); setEditing(null) }} className="btn-secondary py-3 px-6">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Items List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {searchFiltered.map(item => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                  item.available ? 'bg-white border-stone-100' : 'bg-stone-50 border-stone-200 opacity-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-stone-900 text-sm font-sans">{item.name}</p>
                    {item.tags?.map(tag => (
                      <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-sans">{tag}</span>
                    ))}
                    {!item.available && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-sans">UNAVAILABLE</span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-stone-400 truncate font-sans mt-0.5">{item.description}</p>
                  )}
                  <p className="text-xs text-stone-500 font-sans mt-0.5">{item.category} · ${Number(item.price).toFixed(2)}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`text-[10px] px-2 py-1.5 rounded-lg border font-medium transition-all font-sans ${
                      item.available
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-stone-100 text-stone-500 border-stone-200'
                    }`}
                  >{item.available ? '✓ On' : '✗ Off'}</button>
                  <button
                    onClick={() => startEdit(item)}
                    className="text-[10px] px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-500 font-medium font-sans hover:border-stone-400"
                  >Edit</button>
                  <button
                    onClick={() => deleteItem(item)}
                    className="text-[10px] px-2 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-500 font-medium font-sans hover:bg-red-100"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StaffNav />
    </main>
  )
}

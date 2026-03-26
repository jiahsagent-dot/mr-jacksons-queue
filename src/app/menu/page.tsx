'use client'

import { useState, useEffect } from 'react'
import type { MenuCategory, MenuItem } from '@/lib/menu-config'
import { menuData as fallbackMenu } from '@/lib/menu'
import Link from 'next/link'
import Image from 'next/image'
import { ScrollReveal } from '@/components/ScrollReveal'

const TAG_LABELS: Record<string, string> = { V: 'Vegetarian', LG: 'Low Gluten', VG: 'Vegan', DF: 'Dairy Free' }
const TAG_COLORS: Record<string, string> = {
  V: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  LG: 'bg-amber-100 text-amber-700 border-amber-200',
  VG: 'bg-green-100 text-green-700 border-green-200',
  DF: 'bg-sky-100 text-sky-700 border-sky-200',
}

const CATEGORY_ICONS: Record<string, string> = {
  'All Day Brunch': '🍳', 'Salads & Bowls': '🥗', 'Sandwiches & Toasties': '🥪',
  'Burgers': '🍔', 'Bao Buns': '🥟', 'Something Sweet': '🍯', 'Sides': '🍟',
  'Coffee': '☕', 'Tea & Chai': '🍵', 'Milkshakes': '🥤', 'Smoothies': '🫐',
  'Fresh Juices': '🍊', 'Cold Drinks': '🧊', 'Wine & Sparkling': '🍷',
  'Cocktails': '🍹', 'Beer': '🍺',
}

// Map category photos from Mr Jackson's gallery
const CATEGORY_PHOTOS: Record<string, string> = {
  'All Day Brunch': '/images/food1.jpg',
  'Salads & Bowls': '/images/food9.jpg',
  'Sandwiches & Toasties': '/images/food10.jpg',
  'Burgers': '/images/food4.jpg',
  'Bao Buns': '/images/food12.jpg',
  'Something Sweet': '/images/food13.jpg',
  'Coffee': '/images/food14.jpg',
  'Wine & Sparkling': '/images/food7.jpg',
  'Cocktails': '/images/food8.jpg',
  'Beer': '/images/food11.jpg',
}

export default function MenuPage() {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>(fallbackMenu.categories)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/menu/full')
      .then(r => r.json())
      .then(data => {
        if (data.categories?.length > 0) {
          // Filter out unavailable items for customer view
          const available = data.categories.map((cat: MenuCategory) => ({
            ...cat,
            items: cat.items.filter((item: MenuItem) => item.available !== false),
          })).filter((cat: MenuCategory) => cat.items.length > 0)
          setMenuCategories(available)
        }
        // If API returns empty, keep the fallback
      })
      .catch(() => {
        // Keep fallback menu on error
      })
      .finally(() => setLoading(false))
  }, [])

  const allTags = ['V', 'LG', 'VG', 'DF']

  const filteredCategories = menuCategories
    .filter(cat => !activeCategory || cat.name === activeCategory)
    .map(cat => ({
      ...cat,
      items: activeTag ? cat.items.filter(item => item.tags.includes(activeTag)) : cat.items,
    }))
    .filter(cat => cat.items.length > 0)

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/30">
      {/* Hero with photo */}
      <div className="relative h-[220px] overflow-hidden">
        <Image src="/images/hero.jpg" alt="Mr Jackson Mornington" fill className="object-cover animate-hero-zoom" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link href="/join" className="absolute top-4 left-4 text-white/70 text-sm hover:text-white font-sans">← Back</Link>
          <Image src="/images/logo.png" alt="Mr Jackson" width={56} height={56} className="rounded-full shadow-lg mb-2" />
          <h1 className="text-3xl font-bold tracking-tight drop-shadow-lg">Our Menu</h1>
          <div className="w-8 h-0.5 bg-amber-500 mx-auto mt-2"></div>
          <p className="text-white/60 text-xs mt-2 font-sans">Modern Brunch · Local Bites</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 -mt-4 relative z-10">
        {/* Category Grid */}
        <div className="mb-5">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategory(null)}
              className={`py-1.5 px-3 rounded-full text-[11px] font-medium transition-all font-sans ${
                !activeCategory ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >All</button>
            {menuCategories.map(cat => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                className={`py-1.5 px-3 rounded-full text-[11px] font-medium transition-all font-sans ${
                  activeCategory === cat.name ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >{cat.name}</button>
            ))}
          </div>
        </div>

        {/* Dietary Filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all font-sans ${
                activeTag === tag
                  ? TAG_COLORS[tag] + ' shadow-sm'
                  : 'bg-white text-stone-400 border-stone-200 hover:border-stone-300'
              }`}
            >{TAG_LABELS[tag]}</button>
          ))}
          {activeTag && (
            <button onClick={() => setActiveTag(null)} className="text-xs text-stone-400 underline font-sans">Clear</button>
          )}
        </div>

        {/* Menu Categories */}
        <div className="space-y-8">
          {filteredCategories.map((cat, catIdx) => (
            <ScrollReveal key={cat.name} delay={catIdx < 3 ? catIdx * 80 : 0} direction="up">
            <section>
              {/* Category Header with optional photo */}
              {CATEGORY_PHOTOS[cat.name] ? (
                <div className="relative h-32 rounded-2xl overflow-hidden mb-4">
                  <Image src={CATEGORY_PHOTOS[cat.name]} alt={cat.name} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/20"></div>
                  <div className="absolute inset-0 flex items-center px-5">
                    <h2 className="text-xl font-bold text-white tracking-tight">{cat.name}</h2>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-stone-900">{cat.name}</h2>
                  <div className="flex-1 h-px bg-stone-200 ml-2"></div>
                </div>
              )}
              <div className="space-y-1">
                {cat.items.map(item => (
                    <div
                      key={item.id}
                      className="group flex justify-between items-start gap-3 py-3 px-3 border-b border-stone-100 last:border-0 rounded-xl transition-colors -mx-1 hover:bg-white/60"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-[15px] font-sans text-stone-800">{item.name}</h3>
                          {item.tags.map(tag => (
                            <span key={tag} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${TAG_COLORS[tag]}`}>{tag}</span>
                          ))}
                        </div>
                        {item.description && (
                          <p className="text-[13px] text-stone-400 mt-0.5 leading-relaxed font-sans">{item.description}</p>
                        )}
                      </div>
                      <span className="font-bold whitespace-nowrap text-[15px] tabular-nums pt-0.5 font-sans text-stone-700">${item.price.toFixed(2)}</span>
                    </div>
                ))}
              </div>
            </section>
            </ScrollReveal>
          ))}
        </div>

        {/* Special Deal */}
        <ScrollReveal delay={0} direction="up">
          <div className="mt-8 relative overflow-hidden rounded-2xl">
            <Image src="/images/food2.jpg" alt="Special deal" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/85 to-amber-800/70"></div>
            <div className="relative p-6 text-center text-white">
              <p className="font-bold text-2xl"><span className="shimmer-text">Special Deal — $30.99</span></p>
              <p className="text-amber-100 text-sm mt-2 font-sans">Choose one main meal paired with your choice of alcoholic beverage</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Footer Notes */}
        <ScrollReveal delay={100} direction="up">
          <div className="mt-8 mb-10 text-center space-y-2">
            <div className="flex flex-wrap justify-center gap-3 text-xs text-stone-400 font-sans">
              <span className="bg-stone-100 px-2.5 py-1.5 rounded-lg">Milk alt +$0.90</span>
              <span className="bg-stone-100 px-2.5 py-1.5 rounded-lg">Syrup +$0.90</span>
            </div>
            <p className="text-xs text-stone-400 mt-3 font-sans">10% surcharge weekends · 15% public holidays</p>
            <p className="text-xs text-stone-400 font-sans">Please inform staff of any allergies or dietary requirements</p>
            <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs text-stone-400 font-sans">
              <span>V = Vegetarian</span>
              <span>LG = Low Gluten</span>
              <span>VG = Vegan</span>
              <span>DF = Dairy Free</span>
            </div>

            <div className="mt-6 space-y-1">
              <p className="text-stone-400 text-xs font-sans font-medium">Mon–Fri 7:30AM – 2:30PM · Sat–Sun 7:30AM – 3PM</p>
              <p className="text-stone-300 text-xs font-sans">03 5909 8815</p>
            </div>
            {/* spacer for sticky bar */}
            <div className="h-20" />
          </div>
        </ScrollReveal>
      </div>

      {/* Sticky Order & Pay bar — always visible */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}>
        <div className="max-w-2xl mx-auto">
          <Link href="/order/new" className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base">
            <span className="text-lg">🍽️</span>
            <span>Order & Pay</span>
          </Link>
        </div>
      </div>
    </main>
  )
}

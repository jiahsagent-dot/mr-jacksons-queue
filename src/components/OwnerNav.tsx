'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/owner/dashboard', label: 'Overview', icon: '📊' },
  { href: '/owner/revenue', label: 'Revenue', icon: '💰' },
  { href: '/owner/sales', label: 'Sales', icon: '🏆' },
  { href: '/owner/costs', label: 'Costs', icon: '📉' },
  { href: '/owner/bookings', label: 'Bookings', icon: '📅' },
  { href: '/owner/menu', label: 'Items', icon: '🍽️' },
]

export function OwnerNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-stone-950 border-t border-stone-800 safe-area-pb"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-lg mx-auto flex">
        {tabs.map(tab => {
          const active = path.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href} className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${active ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}>
              <span className="text-base leading-none">{tab.icon}</span>
              <span className={`text-[9px] font-semibold font-sans ${active ? 'text-white' : 'text-stone-500'}`}>{tab.label}</span>
              {active && <span className="w-1 h-1 rounded-full bg-amber-500 mt-0.5" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

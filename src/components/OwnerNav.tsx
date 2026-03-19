'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/owner/dashboard', label: 'Overview', icon: '📊' },
  { href: '/owner/revenue', label: 'Revenue', icon: '💰' },
  { href: '/owner/costs', label: 'Costs', icon: '📉' },
  { href: '/owner/bookings', label: 'Bookings', icon: '📅' },
]

export function OwnerNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-100 safe-area-pb">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(tab => {
          const active = path.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href} className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${active ? 'text-stone-900' : 'text-stone-400'}`}>
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-semibold font-sans ${active ? 'text-stone-900' : 'text-stone-400'}`}>{tab.label}</span>
              {active && <span className="w-1 h-1 rounded-full bg-amber-500 mt-0.5" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

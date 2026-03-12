'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/staff/dashboard', label: 'Queue', icon: '👥' },
  { href: '/staff/orders', label: 'Orders', icon: '🍳' },
  { href: '/staff/tables', label: 'Tables', icon: '🪑' },
  { href: '/staff/menu', label: 'Menu', icon: '📋' },
]

export function StaffNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-4xl mx-auto flex">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2.5 text-[10px] font-semibold transition-colors font-sans ${
                isActive ? 'text-stone-900' : 'text-stone-400'
              }`}
            >
              <span className="text-lg mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <div className="w-4 h-0.5 bg-amber-500 rounded-full mt-0.5" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

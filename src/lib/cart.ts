'use client'

import { useState, useCallback } from 'react'
import type { MenuItem } from './menu'

export type CartItem = MenuItem & { quantity: number }

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((item: MenuItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === id)
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i)
      }
      return prev.filter(i => i.id !== id)
    })
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return { items, addItem, removeItem, clearCart, total, count }
}

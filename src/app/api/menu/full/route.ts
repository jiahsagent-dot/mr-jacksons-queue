export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — full menu from DB, grouped by category, for customer-facing pages
export async function GET() {
  try {
    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('menu_items')
      .select('id, name, description, price, category, tags, available, sort_order')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Menu fetch error:', error.message)
      return NextResponse.json({ categories: [] }, { status: 500 })
    }

    const items = data || []

    // Group by category, preserving insertion order
    const categoryMap = new Map<string, any[]>()
    for (const item of items) {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, [])
      }
      categoryMap.get(item.category)!.push({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        tags: item.tags || [],
        available: item.available,
      })
    }

    const categories = Array.from(categoryMap.entries()).map(([name, items]) => ({
      name,
      items,
    }))

    return NextResponse.json({ categories }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    })
  } catch (err: any) {
    console.error('Menu full error:', err.message)
    return NextResponse.json({ categories: [] }, { status: 500 })
  }
}

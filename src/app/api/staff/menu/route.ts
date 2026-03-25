export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — fetch all menu items
export async function GET() {
  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('menu_items')
    .select('*')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

// POST — add new menu item
export async function POST(req: NextRequest) {
  const admin = supabaseAdmin()
  const body = await req.json()
  const { name, description, price, category, tags, available } = body

  if (!name || !price || !category) {
    return NextResponse.json({ error: 'Name, price, and category required' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('menu_items')
    .insert({
      name,
      description: description || '',
      price: parseFloat(price),
      category,
      tags: tags || [],
      available: available !== false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

// PATCH — update menu item
export async function PATCH(req: NextRequest) {
  const admin = supabaseAdmin()
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  if (updates.price) updates.price = parseFloat(updates.price)

  const { error } = await admin
    .from('menu_items')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — remove menu item
export async function DELETE(req: NextRequest) {
  const admin = supabaseAdmin()
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await admin.from('menu_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

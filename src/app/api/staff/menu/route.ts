export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdmin() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY)
}

// GET — fetch all menu items
export async function GET() {
  const admin = getAdmin()
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
  const body = await req.json()
  const { name, description, price, category, tags, available } = body

  if (!name || !price || !category) {
    return NextResponse.json({ error: 'Name, price, and category required' }, { status: 400 })
  }

  const admin = getAdmin()
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
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  if (updates.price) updates.price = parseFloat(updates.price)

  const admin = getAdmin()
  const { error } = await admin
    .from('menu_items')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — remove menu item
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = getAdmin()
  const { error } = await admin.from('menu_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

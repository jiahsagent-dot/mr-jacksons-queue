export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// GET — public menu endpoint for customers
// Returns only available items + list of unavailable item names
export async function GET() {
  try {
    const admin = getAdmin()
    const { data, error } = await admin
      .from('menu_items')
      .select('name, available')

    if (error || !data || data.length === 0) {
      // No DB menu — return empty unavailable list (static menu will be used as-is)
      return NextResponse.json({ unavailable: [] }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
      })
    }

    // Return list of unavailable item names so the frontend can cross-reference
    const unavailable = data
      .filter((item: any) => item.available === false)
      .map((item: any) => item.name)

    return NextResponse.json({ unavailable }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    })
  } catch (err: any) {
    return NextResponse.json({ unavailable: [] }, { status: 200 })
  }
}

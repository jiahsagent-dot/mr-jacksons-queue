export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Always use the hardcoded service key (env vars can be wrong on Vercel)
function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const admin = getAdmin()

    // Free all tables
    if (body.action === 'free_all') {
      const { data, error } = await admin
        .from('tables')
        .update({ status: 'available', current_customer: null, occupied_at: null })
        .neq('status', 'available')
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, updated: data?.length || 0 })
    }

    // Toggle single table
    const { table_number, status } = body
    if (!table_number || !status) {
      return NextResponse.json({ error: 'Missing table_number or status' }, { status: 400 })
    }

    const updateData: any = { status }
    if (status === 'available') {
      updateData.current_customer = null
      updateData.occupied_at = null
    } else if (status === 'occupied') {
      updateData.occupied_at = new Date().toISOString()
    }

    const { data, error } = await admin
      .from('tables')
      .update(updateData)
      .eq('table_number', table_number)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No rows updated — RLS may be blocking' }, { status: 500 })
    }
    return NextResponse.json({ success: true, table: data[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

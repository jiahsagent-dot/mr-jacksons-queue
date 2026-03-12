export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyNextInQueue } from '@/lib/notifyQueue'

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

    // When a table is freed, check if anyone is waiting in the queue
    let queueEntry = null
    if (status === 'available') {
      queueEntry = await notifyNextInQueue(admin, table_number)
    }

    return NextResponse.json({ success: true, table: data[0], notified: queueEntry?.name || null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — edit table details (label, seats)
export async function PATCH(req: NextRequest) {
  try {
    const { table_number, label, seats } = await req.json()
    if (!table_number) return NextResponse.json({ error: 'Missing table_number' }, { status: 400 })

    const admin = getAdmin()
    const updateData: any = {}
    if (label !== undefined) updateData.label = label
    if (seats !== undefined) updateData.seats = parseInt(seats)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('tables')
      .update(updateData)
      .eq('table_number', table_number)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, table: data?.[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyNextInQueue } from '@/lib/notifyQueue'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = supabaseAdmin()

    // Get the entry
    const { data: entry } = await admin
      .from('queue_entries')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Only expire if still 'called'
    if (entry.status !== 'called') {
      return NextResponse.json({ status: entry.status })
    }

    // Read no_show_minutes
    const { data: settings } = await admin
      .from('queue_settings')
      .select('no_show_minutes')
      .eq('id', 1)
      .maybeSingle()
    const noShowMinutes = (settings as any)?.no_show_minutes ?? 10
    const windowMs = noShowMinutes * 60 * 1000

    // Check if actually expired
    const calledAt = new Date(entry.called_at).getTime()
    if (Date.now() - calledAt < windowMs) {
      return NextResponse.json({ status: 'not_expired_yet' })
    }

    // Mark as left
    await admin
      .from('queue_entries')
      .update({ status: 'left' })
      .eq('id', id)

    // Find and free the table
    let tableNumber: number | null = entry.assigned_table ?? null

    if (!tableNumber) {
      const { data: byCode } = await admin
        .from('tables')
        .select('table_number')
        .eq('table_code', `queue:${id}`)
        .maybeSingle()
      tableNumber = byCode?.table_number ?? null
    }

    if (!tableNumber) {
      const { data: byName } = await admin
        .from('tables')
        .select('table_number')
        .in('status', ['reserved'])
        .eq('current_customer', entry.name)
        .maybeSingle()
      tableNumber = byName?.table_number ?? null
    }

    if (tableNumber) {
      await admin
        .from('tables')
        .update({ status: 'available', current_customer: null, occupied_at: null, table_code: null })
        .eq('table_number', tableNumber)

      // Call the next person
      await notifyNextInQueue(admin, tableNumber)
    }

    return NextResponse.json({ expired: true, table_freed: tableNumber })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyNextInQueue } from '@/lib/notifyQueue'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing queue entry id' }, { status: 400 })

    const admin = supabaseAdmin()

    // Read no_show_minutes from settings (fallback to 10)
    const { data: settings } = await admin
      .from('queue_settings')
      .select('no_show_minutes')
      .eq('id', 1)
      .single()
    const confirmWindowMs = ((settings as any)?.no_show_minutes ?? 10) * 60 * 1000

    const { data: entry, error } = await admin
      .from('queue_entries')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !entry) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 })
    }

    if (entry.status !== 'called') {
      return NextResponse.json({ error: 'This entry is not in a confirmable state' }, { status: 400 })
    }

    // Look up the assigned table using the unique queue entry ID stored in table_code
    const { data: table } = await admin
      .from('tables')
      .select('table_number')
      .eq('table_code', `queue:${id}`)
      .limit(1)
      .single()

    const assignedTable = table?.table_number || null

    // Check if within the confirm window (driven by settings)
    const calledAt = new Date(entry.called_at).getTime()
    const now = Date.now()
    if (now - calledAt > confirmWindowMs) {
      // Expired — mark as left, free the table, notify next person
      await admin.from('queue_entries').update({ status: 'left' }).eq('id', id)

      if (assignedTable) {
        await admin
          .from('tables')
          .update({ status: 'available', current_customer: null, occupied_at: null, table_code: null })
          .eq('table_number', assignedTable)

        await notifyNextInQueue(admin, assignedTable)
      }

      return NextResponse.json({ error: 'Your 10 minute window has expired. Your spot has been given to the next person.' }, { status: 410 })
    }

    // Confirm — mark as seated
    await admin
      .from('queue_entries')
      .update({ status: 'seated', seated_at: new Date().toISOString() })
      .eq('id', id)

    // Mark table as occupied and clear the queue reservation code
    if (assignedTable) {
      await admin
        .from('tables')
        .update({
          status: 'occupied',
          current_customer: entry.name,
          occupied_at: new Date().toISOString(),
          table_code: null,
        })
        .eq('table_number', assignedTable)
    }

    return NextResponse.json({
      success: true,
      table_number: assignedTable,
      name: entry.name,
      phone: entry.phone,
    }, {
      headers: { 'Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store' }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

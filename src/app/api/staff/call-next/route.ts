export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyNextInQueue } from '@/lib/notifyQueue'
import { formatPhone } from '@/lib/phone'

export async function POST(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = supabaseAdmin()

  const { data: entry, error } = await admin
    .from('queue_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  // Find the best available table that fits the party size
  const { data: tables } = await admin
    .from('tables')
    .select('table_number, seats')
    .eq('status', 'available')
    .gte('seats', entry.party_size)
    .order('seats', { ascending: true }) // smallest fitting table first
    .limit(1)

  const table = tables?.[0]

  if (table) {
    // Reserve the table and link it to this queue entry via table_code
    await admin
      .from('tables')
      .update({
        status: 'reserved',
        current_customer: entry.name,
        occupied_at: new Date().toISOString(),
        table_code: `queue:${entry.id}`,
      })
      .eq('table_number', table.table_number)

    // Use notifyNextInQueue's full flow — but we've already reserved the table,
    // so just mark as called and send SMS manually (notifyNextInQueue would pick
    // a different person; here we have a specific person already chosen by staff)
  }

  // Mark as called
  await admin
    .from('queue_entries')
    .update({ status: 'called', called_at: new Date().toISOString(), assigned_table: table?.table_number ?? null })
    .eq('id', id)

  // Fire SMS in background
  const username = process.env.CLICKSEND_USERNAME || 'jiahsagent@gmail.com'
  const apiKey = process.env.CLICKSEND_API_KEY || '6A27AE52-866F-25C1-158C-C1D17531DBA7'
  const credentials = Buffer.from(`${username}:${apiKey}`).toString('base64')
  const confirmUrl = `https://mr-jacksons.vercel.app/queue/${id}`

  // Read no_show_minutes for accurate SMS text
  const { data: settings } = await admin.from('queue_settings').select('no_show_minutes').eq('id', 1).single()
  const noShowMins = (settings as any)?.no_show_minutes ?? 10

  const smsBody = table
    ? `Hi ${entry.name}, a table is ready for you at Mr Jackson's!\n\n` +
      `Table ${table.table_number} is being held for you.\n` +
      `You have ${noShowMins} minutes to confirm your spot before it is given to the next person.\n\n` +
      `Confirm here: ${confirmUrl}\n\n` +
      `1/45 Main St, Mornington`
    : `Hi ${entry.name}, a table is ready for you at Mr Jackson's!\n\n` +
      `You have ${noShowMins} minutes to confirm your spot.\n\n` +
      `Confirm here: ${confirmUrl}\n\n` +
      `1/45 Main St, Mornington`

  // Await the SMS so Vercel doesn't kill the request before it sends
  try {
    const smsRes = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ source: 'mr-jacksons', to: formatPhone(entry.phone), body: smsBody }] }),
    })
    if (!smsRes.ok) {
      const smsErr = await smsRes.json().catch(() => ({}))
      console.error('ClickSend error:', JSON.stringify(smsErr))
    }
  } catch (err) {
    console.error('SMS failed:', err)
  }

  return NextResponse.json({ success: true, table_number: table?.table_number ?? null })
}

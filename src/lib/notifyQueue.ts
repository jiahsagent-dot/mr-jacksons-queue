import { SupabaseClient } from '@supabase/supabase-js'
import { formatPhone } from './phone'

const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME || 'jiahsagent@gmail.com'
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY || '6A27AE52-866F-25C1-158C-C1D17531DBA7'

async function sendSMS(to: string, body: string) {
  // Awaited — in Vercel serverless, fire-and-forget gets killed before the fetch completes
  const credentials = Buffer.from(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`).toString('base64')
  try {
    const r = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ source: 'mr-jacksons', to, body }] }),
    })
    if (!r.ok) {
      const e = await r.json().catch(() => ({}))
      console.error('SMS failed:', JSON.stringify(e))
    }
  } catch (err) {
    console.error('SMS failed:', err)
  }
}

/**
 * When a table becomes free, find the next person waiting in the queue,
 * SMS them, mark them as 'called', and reserve the table for them.
 * Returns the queue entry if one was found, null otherwise.
 */
export async function notifyNextInQueue(admin: SupabaseClient, tableNumber: number) {
  // Read no_show_minutes from settings
  const { data: settingsRow } = await admin.from('queue_settings').select('no_show_minutes').eq('id', 1).maybeSingle()
  const noShowMinutes: number = (settingsRow as any)?.no_show_minutes ?? 10

  // Get the seat count for this table
  const { data: table } = await admin
    .from('tables')
    .select('seats')
    .eq('table_number', tableNumber)
    .single()

  const seats = table?.seats ?? 999

  // Find the next waiting person whose party fits this table (oldest first)
  const { data: next } = await admin
    .from('queue_entries')
    .select('*')
    .eq('status', 'waiting')
    .lte('party_size', seats)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!next) return null

  // Mark them as called
  await admin
    .from('queue_entries')
    .update({ status: 'called', called_at: new Date().toISOString() })
    .eq('id', next.id)

  // Reserve the table — store queue entry ID in table_code so we can find it reliably later
  await admin
    .from('tables')
    .update({
      status: 'reserved',
      current_customer: next.name,
      occupied_at: new Date().toISOString(),
      table_code: `queue:${next.id}`,
    })
    .eq('table_number', tableNumber)

  // Check if this person has a paid order linked to THIS queue entry specifically
  const { data: orders } = await admin
    .from('orders')
    .select('id, status, paid_at, queue_entry_id')
    .eq('queue_entry_id', next.id)
    .not('status', 'in', '(cancelled,pending)')
    .limit(1)

  const hasPaidOrder = orders && orders.length > 0

  // Send appropriate SMS
  if (next.phone) {
    const queueUrl = `https://mr-jacksons.vercel.app/queue/${next.id}`

    let msg: string
    if (hasPaidOrder) {
      // They've already ordered & paid — auto-seat, just tell them to come
      msg =
        `Hi ${next.name}, your table is ready at Mr Jackson's!\n\n` +
        `Table ${tableNumber} is waiting for you.\n` +
        `Your food is being prepared - please head over now!\n\n` +
        `1/45 Main St, Mornington`

      // Auto-confirm — seat them immediately
      await admin
        .from('queue_entries')
        .update({ status: 'seated', seated_at: new Date().toISOString() })
        .eq('id', next.id)

      await admin
        .from('tables')
        .update({ status: 'occupied', current_customer: next.name, occupied_at: new Date().toISOString() })
        .eq('table_number', tableNumber)
    } else {
      // Haven't paid — must confirm within the no_show window or lose their spot
      msg =
        `Hi ${next.name}, a table is ready for you at Mr Jackson's!\n\n` +
        `Table ${tableNumber} is being held for you.\n` +
        `You have ${noShowMinutes} minutes to confirm your spot before it is given to the next person.\n\n` +
        `Confirm here: ${queueUrl}\n\n` +
        `1/45 Main St, Mornington`
    }

    await sendSMS(formatPhone(next.phone), msg)
  }

  return { ...next, has_paid_order: hasPaidOrder }
}

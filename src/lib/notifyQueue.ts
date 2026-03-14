import { SupabaseClient } from '@supabase/supabase-js'
import { formatPhone } from './phone'

const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME || 'jiahsagent@gmail.com'
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY || '6A27AE52-866F-25C1-158C-C1D17531DBA7'

function sendSMS(to: string, body: string) {
  // Fire-and-forget — never await this so callers aren't blocked
  const credentials = Buffer.from(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`).toString('base64')
  fetch('https://rest.clicksend.com/v3/sms/send', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ source: 'mr-jacksons', to, body }] }),
  }).then(r => { if (!r.ok) r.json().then(e => console.error('SMS failed:', JSON.stringify(e))).catch(() => {}) })
    .catch(err => console.error('SMS failed:', err))
}

/**
 * When a table becomes free, find the next person waiting in the queue,
 * SMS them, mark them as 'called', and reserve the table for them.
 * Returns the queue entry if one was found, null otherwise.
 */
export async function notifyNextInQueue(admin: SupabaseClient, tableNumber: number) {
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
    .single()

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
        `Hi ${next.name}! 🎉 Your table is ready at Mr Jackson's!\n\n` +
        `🪑 Table ${tableNumber} is waiting for you.\n` +
        `🍽️ Your food is being prepared — please head over now!\n\n` +
        `📍 1/45 Main St, Mornington`

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
      // Haven't paid — must confirm within 10 minutes or lose their spot
      msg =
        `Hi ${next.name}! 🎉 A table is ready for you at Mr Jackson's!\n\n` +
        `🪑 Table ${tableNumber} is being held for you.\n\n` +
        `⏱️ You have 10 minutes to confirm your spot.\n` +
        `If you don't confirm in time, your table will be given to the next person in the queue.\n\n` +
        `👉 Confirm now:\n${queueUrl}\n\n` +
        `📍 1/45 Main St, Mornington`
    }

    await sendSMS(formatPhone(next.phone), msg)
  }

  return { ...next, has_paid_order: hasPaidOrder }
}

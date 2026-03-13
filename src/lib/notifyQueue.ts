import { SupabaseClient } from '@supabase/supabase-js'
import { formatPhone } from './phone'

const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME || 'jiahsagent@gmail.com'
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY || '6A27AE52-866F-25C1-158C-C1D17531DBA7'

async function sendSMS(to: string, body: string) {
  try {
    const credentials = Buffer.from(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`).toString('base64')
    const res = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ source: 'mr-jacksons', to, body }] }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('SMS failed:', JSON.stringify(err))
    }
  } catch (err: any) {
    console.error('SMS failed:', err.message)
  }
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

  // Reserve the table for them
  await admin
    .from('tables')
    .update({
      status: 'reserved',
      current_customer: next.name,
      occupied_at: new Date().toISOString(),
    })
    .eq('table_number', tableNumber)

  // Send SMS
  if (next.phone) {
    const msg =
      `Hi ${next.name}! 🎉 A table is ready for you at Mr Jackson's.\n\n` +
      `Head to the host stand now — Table ${tableNumber} is waiting for you.\n\n` +
      `📍 1/45 Main St, Mornington`
    await sendSMS(formatPhone(next.phone), msg)
  }

  return next
}

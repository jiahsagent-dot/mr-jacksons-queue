import { SupabaseClient } from '@supabase/supabase-js'
import { formatPhone } from './phone'
import { notifyNextInQueue } from './notifyQueue'

const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME || 'jiahsagent@gmail.com'
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY || '6A27AE52-866F-25C1-158C-C1D17531DBA7'

async function sendSMS(to: string, body: string) {
  try {
    const credentials = Buffer.from(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`).toString('base64')
    await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ source: 'mr-jacksons', to, body }] }),
    })
  } catch {}
}

/**
 * Auto-expire 'called' queue entries that haven't been seated within the timeout.
 * Frees their reserved table, notifies the next person, and sends an apology SMS.
 * Returns the list of expired entry names so the staff page can toast them.
 */
export async function expireNoShows(admin: SupabaseClient, noShowMinutes: number): Promise<string[]> {
  const cutoff = new Date(Date.now() - noShowMinutes * 60 * 1000).toISOString()

  const { data: expired } = await admin
    .from('queue_entries')
    .select('*')
    .eq('status', 'called')
    .lt('called_at', cutoff)

  if (!expired || expired.length === 0) return []

  const expiredNames: string[] = []

  for (const entry of expired) {
    // Mark as left (no-show)
    await admin
      .from('queue_entries')
      .update({ status: 'left' })
      .eq('id', entry.id)

    expiredNames.push(entry.name)

    // Find their reserved table — prefer assigned_table column, fall back to name match
    let tableNumber: number | null = entry.assigned_table ?? null

    if (!tableNumber) {
      const { data: reservedTable } = await admin
        .from('tables')
        .select('table_number')
        .eq('status', 'reserved')
        .eq('current_customer', entry.name)
        .limit(1)
        .single()
      tableNumber = reservedTable?.table_number ?? null
    }

    if (tableNumber) {
      // Free the table
      await admin
        .from('tables')
        .update({ status: 'available', current_customer: null, occupied_at: null })
        .eq('table_number', tableNumber)

      // Call the next person in queue for this table
      await notifyNextInQueue(admin, tableNumber)
    }

    // Send apology SMS to the no-show
    if (entry.phone) {
      const msg =
        `Hi ${entry.name}, we're sorry — your spot at Mr Jackson's has been given to the next party ` +
        `as we didn't see you at the host stand in time.\n\n` +
        `You're welcome to rejoin the queue! 📋\n` +
        `📞 03 5909 8815`
      await sendSMS(formatPhone(entry.phone), msg)
    }
  }

  return expiredNames
}

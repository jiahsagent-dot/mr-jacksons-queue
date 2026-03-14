import { SupabaseClient } from '@supabase/supabase-js'
import { formatPhone } from './phone'
import { notifyNextInQueue } from './notifyQueue'

const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME || 'jiahsagent@gmail.com'
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY || '6A27AE52-866F-25C1-158C-C1D17531DBA7'

function sendSMS(to: string, body: string) {
  const credentials = Buffer.from(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`).toString('base64')
  fetch('https://rest.clicksend.com/v3/sms/send', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ source: 'mr-jacksons', to, body }] }),
  }).catch(() => {})
}

/**
 * Auto-expire 'called' queue entries that haven't confirmed within the timeout.
 * Frees their table and calls the next person in queue.
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
    // 1. Mark as left
    await admin
      .from('queue_entries')
      .update({ status: 'left' })
      .eq('id', entry.id)

    expiredNames.push(entry.name)

    // 2. Find the linked table — try all three methods
    let tableNumber: number | null = entry.assigned_table ?? null

    // Method 2: look up by table_code (most reliable — set by notifyNextInQueue & call-next)
    if (!tableNumber) {
      const { data: byCode } = await admin
        .from('tables')
        .select('table_number')
        .eq('table_code', `queue:${entry.id}`)
        .maybeSingle()
      tableNumber = byCode?.table_number ?? null
    }

    // Method 3: look up by customer name on any reserved table
    if (!tableNumber) {
      const { data: byName } = await admin
        .from('tables')
        .select('table_number')
        .in('status', ['reserved', 'available'])
        .eq('current_customer', entry.name)
        .maybeSingle()
      tableNumber = byName?.table_number ?? null
    }

    // 3. Free the table regardless of which method found it
    if (tableNumber) {
      const { error: freeError } = await admin
        .from('tables')
        .update({ status: 'available', current_customer: null, occupied_at: null, table_code: null })
        .eq('table_number', tableNumber)

      if (freeError) {
        console.error(`Failed to free table ${tableNumber}:`, freeError.message)
      } else {
        // 4. Call the next waiting person for this table
        await notifyNextInQueue(admin, tableNumber)
      }
    } else {
      console.error(`Could not find table for expired entry ${entry.id} (${entry.name})`)
    }

    // 5. Apology SMS to the no-show
    if (entry.phone) {
      sendSMS(formatPhone(entry.phone),
        `Hi ${entry.name}, we're sorry — your spot at Mr Jackson's has been given to the next party ` +
        `as we didn't see you at the host stand in time.\n\n` +
        `You're welcome to rejoin the queue! 📋\n` +
        `📞 03 5909 8815`
      )
    }
  }

  // Also clean up any tables that are still 'reserved' for entries that are now 'left'
  // (catches cases where the above lookup failed previously)
  await cleanupStaleReservations(admin)

  return expiredNames
}

/**
 * Safety net: free any reserved tables whose queue entry is no longer 'called'.
 */
async function cleanupStaleReservations(admin: SupabaseClient) {
  // Find reserved tables with a queue: table_code
  const { data: reservedTables } = await admin
    .from('tables')
    .select('table_number, table_code, current_customer')
    .eq('status', 'reserved')
    .like('table_code', 'queue:%')

  if (!reservedTables || reservedTables.length === 0) return

  for (const table of reservedTables) {
    const queueId = table.table_code?.replace('queue:', '')
    if (!queueId) continue

    const { data: entry } = await admin
      .from('queue_entries')
      .select('id, status')
      .eq('id', queueId)
      .maybeSingle()

    // If the linked queue entry is no longer 'called', free the table
    if (entry && entry.status !== 'called') {
      await admin
        .from('tables')
        .update({ status: 'available', current_customer: null, occupied_at: null, table_code: null })
        .eq('table_number', table.table_number)

      // Call the next person for this newly freed table
      await notifyNextInQueue(admin, table.table_number)
    }
  }
}

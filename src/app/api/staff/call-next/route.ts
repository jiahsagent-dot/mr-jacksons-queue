export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

  await admin
    .from('queue_entries')
    .update({ status: 'called', called_at: new Date().toISOString() })
    .eq('id', id)

  // Fire SMS in background — don't await so the response returns immediately
  const username = process.env.CLICKSEND_USERNAME || 'jiahsagent@gmail.com'
  const apiKey = process.env.CLICKSEND_API_KEY || '6A27AE52-866F-25C1-158C-C1D17531DBA7'
  const credentials = Buffer.from(`${username}:${apiKey}`).toString('base64')
  const confirmUrl = `https://mr-jacksons.vercel.app/queue/${id}`
  const smsBody =
    `Hi ${entry.name}! 🎉 A table is ready for you at Mr Jackson's!\n\n` +
    `🪑 A table is being held for you.\n\n` +
    `⏱️ You have 10 minutes to confirm your spot.\n` +
    `If you don't confirm in time, your table will be given to the next person in the queue.\n\n` +
    `👉 Confirm now:\n${confirmUrl}\n\n` +
    `📍 1/45 Main St, Mornington`

  fetch('https://rest.clicksend.com/v3/sms/send', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ source: 'mr-jacksons', to: entry.phone, body: smsBody }] }),
  }).then(r => { if (!r.ok) r.json().then(e => console.error('ClickSend error:', JSON.stringify(e))).catch(() => {}) })
    .catch(err => console.error('SMS failed:', err))

  return NextResponse.json({ success: true })
}

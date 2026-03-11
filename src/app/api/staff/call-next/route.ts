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

  // Send SMS via ClickSend
  try {
    const username = process.env.CLICKSEND_USERNAME!
    const apiKey = process.env.CLICKSEND_API_KEY!
    const credentials = Buffer.from(`${username}:${apiKey}`).toString('base64')

    const response = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            source: 'mr-jacksons',
            from: 'MrJackson',
            to: entry.phone,
            body: `Hi ${entry.name}! Your table at Mr Jackson's is ready 🎉 Head to the host stand now.`,
          },
        ],
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      console.error('ClickSend error:', JSON.stringify(result))
    }
  } catch (err: unknown) {
    console.error('SMS failed:', err)
    // Don't block — queue status already updated
  }

  return NextResponse.json({ success: true })
}

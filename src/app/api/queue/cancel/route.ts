export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })

    const { data: entry, error } = await admin
      .from('queue_entries')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !entry) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 })
    }

    // Only allow cancelling if still waiting
    if (entry.status !== 'waiting') {
      return NextResponse.json({ error: 'Can only cancel while waiting' }, { status: 400 })
    }

    // Mark as left
    await admin
      .from('queue_entries')
      .update({ status: 'left' })
      .eq('id', id)

    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store' }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

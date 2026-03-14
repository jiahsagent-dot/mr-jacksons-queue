export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  const { data: entry, error } = await admin
    .from('queue_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Position in queue (only for waiting entries)
  let position = 0
  if (entry.status === 'waiting') {
    const { count } = await admin
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .lte('created_at', entry.created_at)

    position = count ?? 1
  }

  // Look up assigned table — first try by unique queue code, fallback to customer name
  let assigned_table: number | null = null
  if (entry.status === 'called' || entry.status === 'seated') {
    const { data: byCode } = await admin
      .from('tables')
      .select('table_number')
      .eq('table_code', `queue:${id}`)
      .limit(1)
      .single()

    if (byCode) {
      assigned_table = byCode.table_number
    } else {
      // Fallback for seated entries where table_code was already cleared
      const { data: byName } = await admin
        .from('tables')
        .select('table_number')
        .eq('current_customer', entry.name)
        .in('status', ['reserved', 'occupied'])
        .limit(1)
        .single()
      if (byName) assigned_table = byName.table_number
    }
  }

  // Get estimated wait from settings
  const { data: settings } = await admin
    .from('queue_settings')
    .select('estimated_wait')
    .eq('id', 1)
    .single()

  return NextResponse.json({
    entry: { ...entry, assigned_table },
    position,
    estimated_wait: settings?.estimated_wait ?? 20,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Vercel-CDN-Cache-Control': 'no-store',
    }
  })
}

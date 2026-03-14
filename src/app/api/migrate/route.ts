export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

// Run SQL migration via Supabase's pg_net or direct connection
// Visit: /api/migrate?key=Cat123
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== 'Cat123') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use Supabase's built-in SQL execution via the REST API
  // We'll use the pg_graphql or direct SQL approach
  const sql = `
    ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS assigned_table integer;
  `

  // Try using Supabase's SQL endpoint (requires service role)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!res.ok) {
    // If the RPC doesn't exist, provide instructions
    return NextResponse.json({
      error: 'Cannot run SQL directly. Please run this in Supabase SQL Editor:',
      sql: 'ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS assigned_table integer;',
      url: 'https://supabase.com/dashboard/project/qducoenvjaotympjedrl/sql/new',
    })
  }

  return NextResponse.json({ success: true, message: 'Migration complete' })
}

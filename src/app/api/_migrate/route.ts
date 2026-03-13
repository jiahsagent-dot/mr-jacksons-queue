// TEMPORARY — delete after running
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results: Record<string, unknown> = {}

  // Add no_show_minutes to queue_settings
  const r1 = await admin.rpc('exec_sql', {
    sql: 'ALTER TABLE queue_settings ADD COLUMN IF NOT EXISTS no_show_minutes INT DEFAULT 10'
  }).catch(() => null)
  results.r1 = r1

  // Add assigned_table to queue_entries
  const r2 = await admin.rpc('exec_sql', {
    sql: 'ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS assigned_table INT'
  }).catch(() => null)
  results.r2 = r2

  return NextResponse.json({ done: true, results })
}

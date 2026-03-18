export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  'https://qducoenvjaotympjedrl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'
)

export async function GET() {
  // Delete ALL bookings
  const { data: deleted, error } = await admin
    .from('bookings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id, code')
  
  // Verify
  const { data: remaining } = await admin.from('bookings').select('id')
  
  return NextResponse.json({ 
    deleted: deleted?.length || 0,
    codes: deleted?.map((b: any) => b.code),
    remaining: remaining?.length || 0,
    error: error?.message
  })
}

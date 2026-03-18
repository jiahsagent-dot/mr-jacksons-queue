export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  'https://qducoenvjaotympjedrl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'
)

export async function GET() {
  // Insert a test booking
  const { data, error } = await admin.from('bookings').insert({
    customer_name: 'Jai Vercel',
    phone: '0483880253',
    party_size: 2,
    date: '2026-03-19',
    time_slot: '11:00',
    status: 'confirmed',
    code: 'MJ-V001'
  }).select()
  
  if (error) {
    return NextResponse.json({ error: error.message })
  }
  return NextResponse.json({ created: data })
}

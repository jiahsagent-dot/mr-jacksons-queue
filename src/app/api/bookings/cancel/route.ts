export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force hardcoded keys to ensure consistency
const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

export async function POST(req: NextRequest) {
  try {
    const { booking_id } = await req.json()
    if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

    const { data: booking, error } = await admin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (error || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.status === 'cancelled') return NextResponse.json({ error: 'This booking has already been cancelled' }, { status: 400 })
    if (booking.status === 'no_show') return NextResponse.json({ error: 'This booking was marked as no-show because the 15-minute check-in window passed' }, { status: 400 })

    await admin.from('bookings').update({ status: 'cancelled' }).eq('id', booking_id)

    // Free the table if one was assigned — covers both reserved and occupied states
    if (booking.table_number) {
      await admin
        .from('tables')
        .update({ status: 'available', current_customer: null, occupied_at: null })
        .eq('table_number', booking.table_number)
        .in('status', ['reserved', 'occupied'])
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

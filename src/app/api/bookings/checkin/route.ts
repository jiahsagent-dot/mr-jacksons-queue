export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// POST /api/bookings/checkin — customer confirms they have arrived
// Sets confirmed_at, updates booking status to seated, marks table occupied
export async function POST(req: NextRequest) {
  try {
    const { booking_id } = await req.json()
    if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

    const admin = getAdmin()

    // Fetch the booking
    const { data: booking, error: fetchErr } = await admin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .in('status', ['confirmed', 'seated'])
      .single()

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found or already cancelled' }, { status: 404 })
    }

    // Set confirmed_at (check-in) — keep status as 'confirmed', no DB constraint issue
    const now = new Date().toISOString()
    await admin
      .from('bookings')
      .update({ confirmed_at: now })
      .eq('id', booking_id)

    // Promote table from reserved → occupied
    if (booking.table_number) {
      await admin
        .from('tables')
        .update({
          status: 'occupied',
          current_customer: booking.customer_name,
          occupied_at: now,
        })
        .eq('table_number', booking.table_number)
        .in('status', ['reserved', 'available'])
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

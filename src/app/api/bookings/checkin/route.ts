export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/bookings/checkin — customer confirms they have arrived
// Sets confirmed_at, updates booking status to seated, marks table occupied
export async function POST(req: NextRequest) {
  try {
    const { booking_id } = await req.json()
    if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

    // Fetch the booking
    const admin = supabaseAdmin()

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

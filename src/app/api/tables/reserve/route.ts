export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const BOOKING_DURATION = 90

export async function POST(req: NextRequest) {
  try {
    const { table_number, customer_name, phone, party_size } = await req.json()

    if (!table_number || !customer_name) {
      return NextResponse.json({ error: 'Missing table_number or customer_name' }, { status: 400 })
    }

    const now = new Date()
    const todayDate = now.toISOString().split('T')[0]
    const currentTime = `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}`
    const currentMinutes = timeToMinutes(currentTime)

    // Check if table has any booking that overlaps with now
    const admin = supabaseAdmin()

    const { data: existingBookings } = await admin
      .from('bookings')
      .select('*')
      .eq('date', todayDate)
      .eq('table_number', table_number)
      .in('status', ['confirmed', 'seated'])

    const hasConflict = (existingBookings || []).some(b => {
      const bMin = timeToMinutes(b.time_slot)
      return currentMinutes < bMin + BOOKING_DURATION && currentMinutes + BOOKING_DURATION > bMin
    })

    if (hasConflict) {
      return NextResponse.json({ error: 'This table has a booking right now. Please choose another table.' }, { status: 409 })
    }

    // Atomically claim the table (only if still available)
    const { data, error } = await admin
      .from('tables')
      .update({
        status: 'occupied',
        current_customer: customer_name,
        occupied_at: now.toISOString(),
      })
      .eq('table_number', table_number)
      .eq('status', 'available')
      .select()

    if (error) throw error

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Table is no longer available' }, { status: 409 })
    }

    // Also create a booking record so it shows in staff timeline
    // Round current time to nearest 30 min slot
    const roundedMinutes = Math.floor(currentMinutes / 30) * 30
    const roundedHour = Math.floor(roundedMinutes / 60)
    const roundedMin = roundedMinutes % 60
    const timeSlot = `${roundedHour.toString().padStart(2, '0')}:${roundedMin.toString().padStart(2, '0')}`

    await admin.from('bookings').insert({
      customer_name,
      phone: phone || '',
      party_size: party_size || 2,
      date: todayDate,
      time_slot: timeSlot,
      table_number,
      status: 'seated',
    })

    return NextResponse.json({ success: true, table: data[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

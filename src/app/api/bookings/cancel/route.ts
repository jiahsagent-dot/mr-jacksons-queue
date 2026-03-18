export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

// Force hardcoded keys
const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

// Native fetch to bypass Supabase JS client caching
async function supabaseGet(table: string, query: string): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    cache: 'no-store'
  })
  return res.ok ? await res.json() : []
}

async function supabasePatch(table: string, query: string, body: any): Promise<boolean> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  })
  return res.ok
}

export async function POST(req: NextRequest) {
  try {
    const { booking_id } = await req.json()
    if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

    // Fetch booking
    const bookings = await supabaseGet('bookings', `id=eq.${booking_id}&select=*`)
    
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    
    const booking = bookings[0]
    
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'This booking has already been cancelled' }, { status: 400 })
    }
    if (booking.status === 'no_show') {
      return NextResponse.json({ error: 'This booking was marked as no-show because the 15-minute check-in window passed' }, { status: 400 })
    }

    // Update booking to cancelled
    await supabasePatch('bookings', `id=eq.${booking_id}`, { status: 'cancelled' })

    // Free the table if one was assigned
    if (booking.table_number) {
      await supabasePatch(
        'tables',
        `table_number=eq.${booking.table_number}&status=in.(reserved,occupied)`,
        { status: 'available', current_customer: null, occupied_at: null }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

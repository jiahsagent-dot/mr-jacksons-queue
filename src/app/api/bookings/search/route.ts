export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// Force hardcoded keys — do NOT use env vars
const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

// Native fetch to Supabase REST API to avoid JS client caching issues
async function supabaseQuery(table: string, query: string): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Cache-Control': 'no-cache, no-store',
    },
    cache: 'no-store'
  })
  return res.ok ? await res.json() : []
}

function formatTime(slot: string) {
  if (!slot) return ''
  const [h, m] = slot.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatBooking(b: any) {
  return {
    id: b.id,
    customer_name: b.customer_name,
    phone: b.phone,
    party_size: b.party_size,
    date: b.date,
    time_slot: b.time_slot,
    table_number: b.table_number,
    status: b.status,
    code: b.code,
  }
}

function noCache() {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Vercel-CDN-Cache-Control': 'no-store',
  }
}

// GET /api/bookings/search?code=MJ-1234  OR  ?phone=0412345678
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const code = params.get('code')?.trim().toUpperCase()
  const phone = params.get('phone')?.trim().replace(/\D/g, '')

  if (!code && !phone) {
    return NextResponse.json({ error: 'Booking code or phone number is required' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  if (code) {
    // Code lookup — returns booking in any status so the page can show the correct state
    const data = await supabaseQuery('bookings', `code=eq.${code}&select=*`)
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Booking not found. Check your code and try again.' }, { status: 404 })
    }

    const booking = data[0]
    const activeOrder = await getActiveOrder(booking.phone)

    return NextResponse.json({
      bookings: null,
      booking: formatBooking(booking),
      active_order: activeOrder,
    }, { headers: noCache() })
  }

  // Phone lookup — may return multiple bookings
  let bookings = await supabaseQuery('bookings', 
    `phone=eq.${phone}&status=eq.confirmed&date=gte.${today}&order=date.asc&select=*`)
  
  // Also check for seated status
  if (bookings.length === 0) {
    bookings = await supabaseQuery('bookings',
      `phone=eq.${phone}&status=eq.seated&date=gte.${today}&select=*`)
  }
  
  // Try alt phone format if still nothing
  if (bookings.length === 0) {
    const altPhone = phone!.startsWith('0') ? phone!.slice(1) : '0' + phone
    bookings = await supabaseQuery('bookings',
      `phone=eq.${altPhone}&status=eq.confirmed&date=gte.${today}&select=*`)
  }

  // Fetch orders for this phone too
  const orders = await getOrders(phone!)

  // Always return success — frontend shows "no bookings" state if empty
  return NextResponse.json({
    bookings: bookings.map(b => ({
      ...formatBooking(b),
      display: `${formatDate(b.date)} at ${formatTime(b.time_slot)} · ${b.party_size} ${b.party_size === 1 ? 'person' : 'people'}`,
    })),
    orders,
    booking: null,
    active_order: null,
  }, { headers: noCache() })
}

async function getOrders(phone: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const orders = await supabaseQuery('orders',
    `phone=eq.${phone}&status=neq.cancelled&created_at=gte.${thirtyDaysAgo.toISOString()}&order=created_at.desc&limit=10&select=id,status,items,created_at,date,time_slot,customer_name,dining_option,order_context,table_number,paid_at`)
  
  return orders.map((o: any) => ({
    id: o.id,
    status: o.status,
    items_count: o.items?.length || 0,
    total: (o.items || []).reduce((s: number, i: any) => s + (i.price * i.quantity), 0),
    created_at: o.created_at,
    date: o.date,
    time_slot: o.time_slot,
    customer_name: o.customer_name,
    context: o.order_context || o.dining_option || 'standard',
    table_number: o.table_number,
    paid: !!o.paid_at,
  }))
}

async function getActiveOrder(phone: string) {
  const orders = await supabaseQuery('orders',
    `phone=eq.${phone}&status=not.in.(cancelled)&order=created_at.desc&limit=1&select=id,status,items,created_at`)
  const o = orders && orders.length > 0 ? orders[0] : null
  return o ? { id: o.id, status: o.status, items_count: o.items?.length || 0 } : null
}

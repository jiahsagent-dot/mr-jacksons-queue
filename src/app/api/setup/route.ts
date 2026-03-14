import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 

// One-time setup endpoint — run this once after deploying to create the tables
// Visit: /api/setup?key=Cat123
export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.get('key') !== 'Cat123') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY)

  const results: string[] = []

  // Check if tables table exists by trying to read from it
  const { error: tablesErr } = await admin.from('tables').select('id').limit(1)

  if (tablesErr) {
    results.push(`Tables table doesn't exist yet — needs SQL migration`)
    results.push(`Run the SQL in: supabase-migration.sql via the Supabase Dashboard SQL Editor`)
    results.push(`URL: https://supabase.com/dashboard/project/qducoenvjaotympjedrl/sql/new`)
  } else {
    // Table exists, seed data if empty
    const { data: existing } = await admin.from('tables').select('id')
    if (!existing || existing.length === 0) {
      const { error: seedErr } = await admin.from('tables').insert([
        { table_number: 1, seats: 2, label: 'Window Seat', status: 'available' },
        { table_number: 2, seats: 2, label: 'Bar Side', status: 'available' },
        { table_number: 3, seats: 4, label: 'Courtyard', status: 'available' },
        { table_number: 4, seats: 4, label: 'Main Floor', status: 'available' },
        { table_number: 5, seats: 2, label: 'Corner Booth', status: 'available' },
        { table_number: 6, seats: 6, label: 'Large Table', status: 'available' },
        { table_number: 7, seats: 4, label: 'Garden View', status: 'available' },
        { table_number: 8, seats: 2, label: 'Front Patio', status: 'available' },
        { table_number: 9, seats: 8, label: 'Group Table', status: 'available' },
      ])
      results.push(seedErr ? `Seed error: ${seedErr.message}` : 'Tables seeded with 9 tables ✅')
    } else {
      results.push(`Tables already has ${existing.length} rows ✅`)
    }
  }

  // Check bookings
  const { error: bookingsErr } = await admin.from('bookings').select('id').limit(1)
  results.push(bookingsErr ? `Bookings table doesn't exist yet — needs SQL migration` : 'Bookings table exists ✅')

  return NextResponse.json({ setup: results })
}

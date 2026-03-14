export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// GET /api/tables/verify?table_number=5&code=2704
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const tableNumber = parseInt(params.get('table_number') || '0')
  const code = params.get('code')?.trim()

  if (!tableNumber || !code) {
    return NextResponse.json({ error: 'Table number and code required' }, { status: 400 })
  }

  const admin = getAdmin()

  const { data: table } = await admin
    .from('tables')
    .select('table_number, table_code, status')
    .eq('table_number', tableNumber)
    .single()

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 })
  }

  if (table.table_code !== code) {
    return NextResponse.json({ error: 'Wrong code. Check the 4-digit code on your table and try again.' }, { status: 403 })
  }

  return NextResponse.json({ verified: true })
}

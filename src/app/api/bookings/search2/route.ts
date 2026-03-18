export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')?.trim().replace(/\D/g, '')
  const today = new Date().toISOString().split('T')[0]
  
  // Use native fetch to Supabase REST API
  const url = `${SUPABASE_URL}/rest/v1/bookings?phone=eq.${phone}&status=eq.confirmed&date=gte.${today}&select=*`
  
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache'
    },
    cache: 'no-store'
  })
  
  const data = await res.json()
  
  return NextResponse.json({
    source: 'native-fetch',
    count: data?.length || 0,
    bookings: data
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  })
}

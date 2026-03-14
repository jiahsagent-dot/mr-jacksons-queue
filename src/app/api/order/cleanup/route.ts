export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Auto-cancel pending orders older than 30 minutes (abandoned before payment)
export async function POST() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL , process.env.SUPABASE_SERVICE_ROLE_KEY )
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { error } = await admin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('status', 'pending')
    .lt('created_at', cutoff)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

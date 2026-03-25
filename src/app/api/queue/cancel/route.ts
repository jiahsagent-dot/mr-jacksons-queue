export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = supabaseAdmin()

    const { data: entry, error } = await admin
      .from('queue_entries')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !entry) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 })
    }

    // Only allow cancelling if still waiting
    if (entry.status !== 'waiting') {
      return NextResponse.json({ error: 'Can only cancel while waiting' }, { status: 400 })
    }

    // Mark as left
    await admin
      .from('queue_entries')
      .update({ status: 'left' })
      .eq('id', id)

    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store' }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

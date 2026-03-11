export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = supabaseAdmin()
  const { data: order, error } = await admin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ order })
}

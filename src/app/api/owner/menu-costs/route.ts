export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

async function dbGet(table: string, query: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  return res.ok ? res.json() : []
}

async function dbPatch(table: string, query: string, body: any): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  return res.ok ? res.json() : []
}

// GET — all menu items with cost_price
export async function GET() {
  const items = await dbGet('menu_items', 'select=id,name,description,price,cost_price,category,available&order=category,sort_order')

  // Group by category
  const byCategory: Record<string, any[]> = {}
  for (const item of items) {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push({
      id: item.id,
      name: item.name,
      description: item.description,
      price: parseFloat(item.price),
      cost_price: item.cost_price !== null ? parseFloat(item.cost_price) : null,
      cogs_pct: item.cost_price !== null && parseFloat(item.price) > 0
        ? Math.round((parseFloat(item.cost_price) / parseFloat(item.price)) * 1000) / 10
        : null,
      category: item.category,
      available: item.available,
    })
  }

  // Summary stats
  const withCosts = items.filter((i: any) => i.cost_price !== null)
  const avgCogsPct = withCosts.length > 0
    ? withCosts.reduce((sum: number, i: any) => {
        const pct = parseFloat(i.cost_price) / parseFloat(i.price) * 100
        return sum + pct
      }, 0) / withCosts.length
    : null

  return NextResponse.json({
    byCategory,
    summary: {
      total: items.length,
      withCosts: withCosts.length,
      missingCosts: items.length - withCosts.length,
      avgCogsPct: avgCogsPct !== null ? Math.round(avgCogsPct * 10) / 10 : null,
    },
  })
}

// PATCH — update cost_price for a single item
export async function PATCH(req: NextRequest) {
  const { id, cost_price } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const rows = await dbPatch('menu_items', `id=eq.${id}`,
    { cost_price: cost_price === '' || cost_price === null ? null : parseFloat(cost_price) })

  if (!rows.length) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  const item = rows[0]
  return NextResponse.json({
    success: true,
    item: {
      id: item.id,
      cost_price: item.cost_price !== null ? parseFloat(item.cost_price) : null,
      cogs_pct: item.cost_price !== null && parseFloat(item.price) > 0
        ? Math.round((parseFloat(item.cost_price) / parseFloat(item.price)) * 1000) / 10
        : null,
    },
  })
}

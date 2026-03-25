export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function dbGet(table: string, query: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  return res.ok ? res.json() : []
}

function getMelbourneDate(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  return fmt.format(d)
}

function getMelbourneParts(utcDate: Date): { date: string; hour: number; dow: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long',
  })
  const parts = fmt.formatToParts(utcDate)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const hour = parseInt(get('hour'))
  const weekday = get('weekday') // Monday, Tuesday, etc.
  const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const dow = DOW.indexOf(weekday)
  const date = `${get('year')}-${get('month')}-${get('day')}`
  return { date, hour: isNaN(hour) ? 0 : hour, dow: dow === -1 ? 0 : dow }
}

function orderTotal(items: any[]): number {
  if (!Array.isArray(items)) return 0
  return items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = (searchParams.get('period') || 'week') as 'today' | 'week' | 'month'

  const today = getMelbourneDate(0)

  // Date ranges for current + previous period
  let startDate: string, endDate: string, prevStart: string, prevEnd: string
  if (period === 'today') {
    startDate = endDate = today
    prevStart = prevEnd = getMelbourneDate(-1)
  } else if (period === 'week') {
    startDate = getMelbourneDate(-6); endDate = today
    prevStart = getMelbourneDate(-13); prevEnd = getMelbourneDate(-7)
  } else {
    startDate = getMelbourneDate(-29); endDate = today
    prevStart = getMelbourneDate(-59); prevEnd = getMelbourneDate(-30)
  }

  // Fetch current + previous period orders + bookings
  const [currentOrders, prevOrders, currentBookings] = await Promise.all([
    dbGet('orders', `date=gte.${startDate}&date=lte.${endDate}&paid_at=not.is.null&status=neq.cancelled&select=id,date,items,created_at,dining_option,table_number`),
    dbGet('orders', `date=gte.${prevStart}&date=lte.${prevEnd}&paid_at=not.is.null&status=neq.cancelled&select=id,items`),
    dbGet('bookings', `date=gte.${startDate}&date=lte.${endDate}&select=id,date,party_size,status,time_slot`),
  ])

  // --- Current period totals ---
  let totalRevenue = 0, totalOrders = currentOrders.length
  for (const o of currentOrders) totalRevenue += orderTotal(o.items)

  const prevRevenue = prevOrders.reduce((s: number, o: any) => s + orderTotal(o.items), 0)
  const prevOrderCount = prevOrders.length

  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const prevAov = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0

  const covers = currentBookings
    .filter((b: any) => ['confirmed', 'seated'].includes(b.status))
    .reduce((s: number, b: any) => s + (b.party_size || 1), 0)

  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null
  const ordersChange = prevOrderCount > 0 ? ((totalOrders - prevOrderCount) / prevOrderCount) * 100 : null
  const aovChange = prevAov > 0 ? ((aov - prevAov) / prevAov) * 100 : null

  // --- Popular items ---
  const itemStats: Record<string, { units: number; revenue: number }> = {}
  for (const order of currentOrders) {
    if (!Array.isArray(order.items)) continue
    for (const li of order.items) {
      if (!li.name) continue
      if (!itemStats[li.name]) itemStats[li.name] = { units: 0, revenue: 0 }
      itemStats[li.name].units += li.quantity || 1
      itemStats[li.name].revenue += (li.price || 0) * (li.quantity || 1)
    }
  }
  const totalItemRevenue = Object.values(itemStats).reduce((s, i) => s + i.revenue, 0)
  const popularItems = Object.entries(itemStats)
    .map(([name, s]) => ({
      name,
      units: s.units,
      revenue: Math.round(s.revenue * 100) / 100,
      pct: totalItemRevenue > 0 ? Math.round((s.revenue / totalItemRevenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15)

  // --- Best days (by day of week) ---
  const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dowStats: Record<number, { revenue: number; orders: number; days: Set<string> }> = {}
  for (let i = 0; i < 7; i++) dowStats[i] = { revenue: 0, orders: 0, days: new Set() }

  for (const order of currentOrders) {
    const { dow, date } = getMelbourneParts(new Date(order.created_at))
    dowStats[dow].revenue += orderTotal(order.items)
    dowStats[dow].orders += 1
    dowStats[dow].days.add(date)
  }

  const bestDays = DOW_NAMES.map((day, i) => {
    const s = dowStats[i]
    const dayCount = Math.max(1, s.days.size)
    return {
      day,
      shortDay: day.slice(0, 3),
      revenue: Math.round(s.revenue * 100) / 100,
      orders: s.orders,
      aov: s.orders > 0 ? Math.round((s.revenue / s.orders) * 100) / 100 : 0,
      avgRevenue: Math.round((s.revenue / dayCount) * 100) / 100,
    }
  })

  // --- Best time slots (by hour) ---
  const hourStats: Record<number, { revenue: number; orders: number }> = {}
  for (let h = 0; h < 24; h++) hourStats[h] = { revenue: 0, orders: 0 }

  for (const order of currentOrders) {
    const { hour } = getMelbourneParts(new Date(order.created_at))
    hourStats[hour].revenue += orderTotal(order.items)
    hourStats[hour].orders += 1
  }

  // Only return hours with activity + flanking hours (7am–9pm range)
  const peakHours = Array.from({ length: 15 }, (_, i) => i + 7).map(h => {
    const fmt12 = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
    return {
      hour: h,
      label: fmt12,
      revenue: Math.round((hourStats[h]?.revenue || 0) * 100) / 100,
      orders: hourStats[h]?.orders || 0,
    }
  })

  // Daily revenue by date (for today: hourly; for week/month: by date)
  const dailyRevenue: { date: string; label: string; revenue: number; orders: number }[] = []
  if (period === 'today') {
    // Hour by hour for today
    for (let h = 6; h <= 22; h++) {
      const fmt12 = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
      dailyRevenue.push({ date: today, label: fmt12, revenue: Math.round((hourStats[h]?.revenue || 0) * 100) / 100, orders: hourStats[h]?.orders || 0 })
    }
  } else {
    // Day by day
    const days = period === 'week' ? 7 : 30
    const revenueByDate: Record<string, { revenue: number; orders: number }> = {}
    for (const o of currentOrders) {
      const d = o.date
      if (!revenueByDate[d]) revenueByDate[d] = { revenue: 0, orders: 0 }
      revenueByDate[d].revenue += orderTotal(o.items)
      revenueByDate[d].orders += 1
    }
    for (let i = days - 1; i >= 0; i--) {
      const d = getMelbourneDate(-i)
      const dt = new Date(d + 'T00:00:00')
      const label = period === 'week'
        ? dt.toLocaleDateString('en-AU', { weekday: 'short' })
        : dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
      dailyRevenue.push({ date: d, label, revenue: Math.round((revenueByDate[d]?.revenue || 0) * 100) / 100, orders: revenueByDate[d]?.orders || 0 })
    }
  }

  const maxHourRevenue = Math.max(...peakHours.map(h => h.revenue), 1)
  const maxDowRevenue = Math.max(...bestDays.map(d => d.revenue), 1)

  return NextResponse.json({
    period,
    dateRange: { start: startDate, end: endDate },
    summary: {
      revenue: Math.round(totalRevenue * 100) / 100,
      orders: totalOrders,
      covers,
      aov: Math.round(aov * 100) / 100,
      revenueChange: revenueChange !== null ? Math.round(revenueChange * 10) / 10 : null,
      ordersChange: ordersChange !== null ? Math.round(ordersChange * 10) / 10 : null,
      aovChange: aovChange !== null ? Math.round(aovChange * 10) / 10 : null,
      prevRevenue: Math.round(prevRevenue * 100) / 100,
      prevOrders: prevOrderCount,
    },
    popularItems,
    bestDays,
    peakHours,
    dailyRevenue,
    maxHourRevenue,
    maxDowRevenue,
  })
}

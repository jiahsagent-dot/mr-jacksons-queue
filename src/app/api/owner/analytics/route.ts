export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://qducoenvjaotympjedrl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdWNvZW52amFvdHltcGplZHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAwNjY0OCwiZXhwIjoyMDg4NTgyNjQ4fQ.BFi8krTlin52yIMGBvdrHdh0Rjy-gGYxjCByqKi2_EU'

async function dbGet(table: string, query: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  return res.ok ? res.json() : []
}

function getMelbourneDate(offsetDays = 0): string {
  const now = new Date()
  now.setDate(now.getDate() + offsetDays)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  return fmt.format(now)
}

function toMelbourneHour(isoString: string): number {
  const d = new Date(isoString)
  const melbStr = d.toLocaleString('en-US', { timeZone: 'Australia/Melbourne', hour: 'numeric', hour12: false })
  return parseInt(melbStr) % 24
}

function orderTotal(items: { price: number; quantity: number }[]): number {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0)
}

function getStatus(value: number, healthy: [number, number], warning: [number, number]): 'green' | 'amber' | 'red' {
  if (value >= healthy[0] && value <= healthy[1]) return 'green'
  if (value >= warning[0] && value <= warning[1]) return 'amber'
  return 'red'
}

function fmtHour(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

export async function GET() {
  const today = getMelbourneDate(0)
  const yesterday = getMelbourneDate(-1)

  const d7Start = getMelbourneDate(-6)
  const d30Start = getMelbourneDate(-29)
  const prevWeekStart = getMelbourneDate(-13)
  const prevWeekEnd = getMelbourneDate(-7)

  const [orders30, bookings30, settings, menuItems] = await Promise.all([
    dbGet('orders', `date=gte.${d30Start}&date=lte.${today}&paid_at=not.is.null&status=neq.cancelled&select=id,date,items,created_at,dining_option,table_number`),
    dbGet('bookings', `date=gte.${d30Start}&date=lte.${today}&select=id,date,party_size,status,time_slot`),
    dbGet('owner_settings', 'id=eq.1&select=*'),
    dbGet('menu_items', 'select=name,price,cost_price&available=eq.true'),
  ])

  const s = settings?.[0] || {}
  const weeklyLabour: number = parseFloat(s.weekly_labour_cost) || 0
  const monthlyRent: number = parseFloat(s.monthly_rent) || 0
  const seats: number = parseInt(s.seats) || 40
  const hoursOpen: number = parseFloat(s.hours_open_per_day) || 10

  const costByName: Record<string, number> = {}
  for (const item of menuItems) {
    if (item.cost_price !== null) costByName[item.name] = parseFloat(item.cost_price)
  }
  const itemsWithCosts = menuItems.filter((i: any) => i.cost_price !== null).length
  const useItemCosts = itemsWithCosts >= 3

  let cogsPercent: number
  if (useItemCosts && orders30.length > 0) {
    let totalRevCalc = 0
    let totalCostCalc = 0
    for (const order of orders30) {
      if (!Array.isArray(order.items)) continue
      for (const li of order.items) {
        const salePrice = (li.price || 0) * (li.quantity || 1)
        const costPrice = costByName[li.name] !== undefined
          ? costByName[li.name] * (li.quantity || 1)
          : salePrice * (parseFloat(s.cogs_percent) || 30) / 100
        totalRevCalc += salePrice
        totalCostCalc += costPrice
      }
    }
    cogsPercent = totalRevCalc > 0 ? (totalCostCalc / totalRevCalc) * 100 : parseFloat(s.cogs_percent) || 30
  } else {
    cogsPercent = parseFloat(s.cogs_percent) || 30
  }

  // Revenue calculations
  const revenueByDate: Record<string, number> = {}
  const orderCountByDate: Record<string, number> = {}

  for (const order of orders30) {
    const total = orderTotal(order.items)
    revenueByDate[order.date] = (revenueByDate[order.date] || 0) + total
    orderCountByDate[order.date] = (orderCountByDate[order.date] || 0) + 1
  }

  const todayRevenue = revenueByDate[today] || 0
  const todayOrders = orderCountByDate[today] || 0
  const yesterdayRevenue = revenueByDate[yesterday] || 0

  const last7Days: { date: string; revenue: number; orders: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = getMelbourneDate(-i)
    last7Days.push({ date: d, revenue: revenueByDate[d] || 0, orders: orderCountByDate[d] || 0 })
  }
  const weekRevenue = last7Days.reduce((s, d) => s + d.revenue, 0)
  const weekOrders = last7Days.reduce((s, d) => s + d.orders, 0)

  const prevWeekRevenue = Object.entries(revenueByDate)
    .filter(([d]) => d >= prevWeekStart && d <= prevWeekEnd)
    .reduce((s, [, v]) => s + v, 0)

  const monthRevenue = Object.values(revenueByDate).reduce((s, v) => s + v, 0)
  const monthOrders = Object.values(orderCountByDate).reduce((s, v) => s + v, 0)

  const weekAOV = weekOrders > 0 ? weekRevenue / weekOrders : 0
  const monthAOV = monthOrders > 0 ? monthRevenue / monthOrders : 0
  const revenueWoW = prevWeekRevenue > 0 ? ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : 0

  const dailyLabour = weeklyLabour / 7
  const dailyRent = monthlyRent / 30

  const labourPct = weekRevenue > 0 ? (weeklyLabour / weekRevenue) * 100 : 0
  const cogsPct = cogsPercent
  const rentPct = weekRevenue > 0 ? ((monthlyRent / 4.33) / weekRevenue) * 100 : 0
  const primeCost = labourPct + cogsPct
  const grossMargin = 100 - cogsPct
  const netMarginPct = weekRevenue > 0
    ? ((weekRevenue - weeklyLabour - (weekRevenue * cogsPct / 100) - (monthlyRent / 4.33)) / weekRevenue) * 100
    : 0

  const breakEvenDaily = cogsPercent < 100 ? (dailyLabour + dailyRent) / (1 - cogsPercent / 100) : 0
  const revPASH = seats > 0 && hoursOpen > 0 ? todayRevenue / (seats * hoursOpen) : 0

  // Bookings intelligence
  const confirmedBookings = bookings30.filter((b: any) => ['confirmed', 'seated'].includes(b.status))
  const cancelledBookings = bookings30.filter((b: any) => b.status === 'cancelled')
  const totalBookingsWithOutcome = confirmedBookings.length + cancelledBookings.length
  const cancellationRate = totalBookingsWithOutcome > 0
    ? (cancelledBookings.length / totalBookingsWithOutcome) * 100 : 0

  const weekBookings = bookings30.filter((b: any) =>
    b.date >= d7Start && ['confirmed', 'seated'].includes(b.status))
  const coversThisWeek = weekBookings.reduce((s: number, b: any) => s + (b.party_size || 1), 0)
  const coversPerDay = coversThisWeek / 7
  const tableTurnover = seats > 0 ? coversPerDay / seats : 0

  const revenueChart: { date: string; revenue: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = getMelbourneDate(-i)
    revenueChart.push({ date: d, revenue: Math.round((revenueByDate[d] || 0) * 100) / 100 })
  }

  // ── Popular Times (last 30 days, Melbourne time) ──────────────────────────
  const hourCounts: Record<number, number> = {}
  for (const order of orders30) {
    if (!order.created_at) continue
    try {
      const hour = toMelbourneHour(order.created_at)
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    } catch {}
  }
  const maxHourCount = Math.max(...Object.values(hourCounts), 1)
  const popularTimes = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: fmtHour(h),
    orders: hourCounts[h] || 0,
    pct: Math.round(((hourCounts[h] || 0) / maxHourCount) * 100),
  })).filter(h => h.orders > 0).sort((a, b) => b.orders - a.orders).slice(0, 8)

  // ── Meal Stats (last 30 days) ─────────────────────────────────────────────
  const mealStats: Record<string, { qty: number; revenue: number; cost: number }> = {}
  for (const order of orders30) {
    if (!Array.isArray(order.items)) continue
    for (const li of order.items) {
      const name = li.name
      if (!name) continue
      const qty = li.quantity || 1
      const revenue = (li.price || 0) * qty
      const unitCost = costByName[name] !== undefined
        ? costByName[name]
        : (li.price || 0) * (cogsPercent / 100)
      const cost = unitCost * qty
      if (!mealStats[name]) mealStats[name] = { qty: 0, revenue: 0, cost: 0 }
      mealStats[name].qty += qty
      mealStats[name].revenue += revenue
      mealStats[name].cost += cost
    }
  }

  // Popular meals — top 5 by quantity sold
  const popularMeals = Object.entries(mealStats)
    .map(([name, s]) => ({
      name,
      qty: s.qty,
      revenue: Math.round(s.revenue * 100) / 100,
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  // Most profitable meals — top 5 by total profit
  const profitableMeals = Object.entries(mealStats)
    .map(([name, s]) => ({
      name,
      qty: s.qty,
      revenue: Math.round(s.revenue * 100) / 100,
      profit: Math.round((s.revenue - s.cost) * 100) / 100,
      margin: s.revenue > 0 ? Math.round(((s.revenue - s.cost) / s.revenue) * 100) : 0,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5)

  // ── Metrics & Alerts ──────────────────────────────────────────────────────
  const metrics = {
    primeCost: {
      value: Math.round(primeCost * 10) / 10,
      status: primeCost <= 65 ? 'green' : primeCost <= 70 ? 'amber' : 'red',
      label: 'Prime Cost %',
      target: '55–65%',
    },
    grossMargin: {
      value: Math.round(grossMargin * 10) / 10,
      status: grossMargin >= 65 ? 'green' : grossMargin >= 55 ? 'amber' : 'red',
      label: 'Gross Margin %',
      target: '~70%',
    },
    netMargin: {
      value: Math.round(netMarginPct * 10) / 10,
      status: netMarginPct >= 10 ? 'green' : netMarginPct >= 5 ? 'amber' : 'red',
      label: 'Net Margin %',
      target: '10–15%',
    },
    labourPct: {
      value: Math.round(labourPct * 10) / 10,
      status: labourPct <= 35 ? 'green' : labourPct <= 40 ? 'amber' : 'red',
      label: 'Labour Cost %',
      target: '30–35%',
    },
    cogsPct: {
      value: Math.round(cogsPct * 10) / 10,
      status: cogsPct <= 32 ? 'green' : cogsPct <= 38 ? 'amber' : 'red',
      label: 'COGS %',
      target: '25–35%',
    },
    rentPct: {
      value: Math.round(rentPct * 10) / 10,
      status: rentPct <= 12 ? 'green' : rentPct <= 15 ? 'amber' : 'red',
      label: 'Rent %',
      target: '8–12%',
    },
    cancellationRate: {
      value: Math.round(cancellationRate * 10) / 10,
      status: cancellationRate <= 10 ? 'green' : cancellationRate <= 15 ? 'amber' : 'red',
      label: 'Cancellation Rate',
      target: '<10%',
    },
  }

  const alerts = Object.entries(metrics)
    .filter(([, m]) => m.status === 'red')
    .map(([key, m]) => ({ key, ...m }))

  return NextResponse.json({
    today: {
      date: today,
      revenue: Math.round(todayRevenue * 100) / 100,
      orders: todayOrders,
      revPASH: Math.round(revPASH * 100) / 100,
      vsYesterday: yesterdayRevenue > 0
        ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 1000) / 10
        : null,
      breakEvenDaily: Math.round(breakEvenDaily * 100) / 100,
      breakEvenMet: todayRevenue >= breakEvenDaily,
    },
    week: {
      revenue: Math.round(weekRevenue * 100) / 100,
      orders: weekOrders,
      aov: Math.round(weekAOV * 100) / 100,
      wowChange: Math.round(revenueWoW * 10) / 10,
      covers: coversThisWeek,
      coversPerDay: Math.round(coversPerDay * 10) / 10,
      tableTurnover: Math.round(tableTurnover * 100) / 100,
    },
    month: {
      revenue: Math.round(monthRevenue * 100) / 100,
      orders: monthOrders,
      aov: Math.round(monthAOV * 100) / 100,
    },
    costs: {
      labourPct: Math.round(labourPct * 10) / 10,
      cogsPct: Math.round(cogsPct * 10) / 10,
      rentPct: Math.round(rentPct * 10) / 10,
      primeCost: Math.round(primeCost * 10) / 10,
      grossMargin: Math.round(grossMargin * 10) / 10,
      netMarginPct: Math.round(netMarginPct * 10) / 10,
      weeklyLabour,
      monthlyRent,
    },
    settings: {
      seats,
      hoursOpen,
      cogsPercent: Math.round(cogsPercent * 10) / 10,
      weeklyLabour,
      monthlyRent,
      cogsSource: useItemCosts ? 'live' : 'manual',
      itemsWithCosts,
      totalMenuItems: menuItems.length,
    },
    bookings: {
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      coversPerDay: Math.round(coversPerDay * 10) / 10,
      totalCancelled30d: cancelledBookings.length,
      totalConfirmed30d: confirmedBookings.length,
    },
    charts: {
      daily: revenueChart,
      weekly: last7Days,
    },
    insights: {
      popularTimes,
      popularMeals,
      profitableMeals,
    },
    metrics,
    alerts,
  })
}

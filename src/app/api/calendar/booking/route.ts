export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

// Format as floating local time (no Z suffix) so calendar uses the device's local timezone
// e.g. date="2026-03-15", time="10:00" → "20260315T100000"
function floatingTime(date: string, time: string, offsetMinutes = 0): string {
  const [h, m] = time.split(':').map(Number)
  const totalMins = h * 60 + m + offsetMinutes
  const hh = Math.floor(totalMins / 60) % 24
  const mm = totalMins % 60
  const dateClean = date.replace(/-/g, '')
  return `${dateClean}T${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') || 'Guest'
  const date = searchParams.get('date') || ''
  const time = searchParams.get('time') || ''
  const party = parseInt(searchParams.get('party') || '2')
  const table = searchParams.get('table') || ''
  const id = searchParams.get('id') || String(Date.now())

  if (!date || !time) {
    return NextResponse.json({ error: 'date and time required' }, { status: 400 })
  }

  const dtStart = floatingTime(date, time, 0)
  const dtEnd = floatingTime(date, time, 60)   // 1 hour
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const descLines = [
    `Booking for ${party} ${party === 1 ? 'person' : 'people'}`,
    table ? `Table: ${table}` : '',
    '',
    `⚠️ Haven't pre-ordered your food? You'll receive an SMS before your booking asking you to confirm you're coming. Tap the link in that SMS or your table may be released.`,
    '',
    'When you arrive:',
    '1. Go to mr-jacksons.vercel.app',
    '2. Tap "I have a booking"',
    '3. Enter your booking code or phone number',
    '4. Pre-order or manage your booking!',
  ].filter(Boolean).join('\\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mr Jackson//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${id}@mr-jacksons.vercel.app`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Mr Jackson — Table Booking`,
    `DESCRIPTION:${descLines}`,
    `LOCATION:Mr Jackson\\, 1/45 Main St\\, Mornington VIC 3931`,
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    "DESCRIPTION:Your Mr Jackson booking is tomorrow — confirm if you haven't pre-ordered!",
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your Mr Jackson booking is in 1 hour — see you soon!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="mr-jackson-booking.ics"',
      'Cache-Control': 'no-store',
    },
  })
}

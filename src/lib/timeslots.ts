export function generateTimeSlots(_selectedDate?: string): string[] {
  const slots: string[] = []
  // Business hours: 7:00 AM – 3:00 PM, every 30 minutes
  // Last bookable slot is 14:30 (guests have until 3 PM to finish)
  for (let hour = 7; hour <= 14; hour++) {
    for (let min = 0; min < 60; min += 30) {
      if (hour === 14 && min > 30) break // cap at 14:30
      const h = hour.toString().padStart(2, '0')
      const m = min.toString().padStart(2, '0')
      slots.push(`${h}:${m}`)
    }
  }
  return slots
}

export function formatTimeSlot(slot: string): string {
  const [h, m] = slot.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function getAvailableDates(): { value: string; label: string }[] {
  const dates: { value: string; label: string }[] = []
  const today = new Date()
  // 7 days ahead (production window)
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const value = d.toISOString().split('T')[0]
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' :
      d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    dates.push({ value, label })
  }
  return dates
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

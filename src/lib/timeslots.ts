export function generateTimeSlots(_selectedDate?: string): string[] {
  const slots: string[] = []
  // TEST MODE: all 24 hours, every 5 mins — revert to 7:00–14:30 / 30min for production
  for (let hour = 0; hour <= 23; hour++) {
    for (let min = 0; min < 60; min += 5) {
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
  // TEST MODE: 30 days — revert to 7 for production
  for (let i = 0; i < 30; i++) {
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

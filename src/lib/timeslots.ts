export function generateTimeSlots(selectedDate?: string): string[] {
  const slots: string[] = []
  // Mr Jackson's hours: 7:00 AM - 3:00 PM
  for (let hour = 7; hour <= 14; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const h = hour.toString().padStart(2, '0')
      const m = min.toString().padStart(2, '0')
      slots.push(`${h}:${m}`)
    }
  }

  // If selected date is today, filter out past times (with 30 min buffer)
  if (selectedDate) {
    const today = new Date().toISOString().split('T')[0]
    if (selectedDate === today) {
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes() + 30 // 30 min buffer
      return slots.filter(slot => {
        const [h, m] = slot.split(':').map(Number)
        return h * 60 + m > currentMinutes
      })
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

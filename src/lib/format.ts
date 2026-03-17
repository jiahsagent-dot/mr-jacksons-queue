/**
 * Format Australian mobile number as you type
 * 0412345678 → 0412 345 678
 */
export function formatAusPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
}

/**
 * Strip formatting from phone for API calls
 */
export function stripPhone(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

/**
 * Validate Australian mobile number
 * Must be 10 digits starting with 04
 */
export function isValidAusPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 && digits.startsWith('04')
}

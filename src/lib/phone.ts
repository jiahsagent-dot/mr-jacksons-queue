/**
 * Format a phone number to E.164 international format for SMS sending.
 * Handles Australian numbers in various formats:
 *   0483880253     → +61483880253
 *   61483880253    → +61483880253
 *   +61483880253   → +61483880253
 *   0483 880 253   → +61483880253 (spaces stripped)
 */
export function formatPhone(phone: string): string {
  // Strip all whitespace, dashes, brackets
  let p = phone.replace(/[\s\-\(\)]/g, '').trim()

  if (p.startsWith('+')) return p             // already E.164
  if (p.startsWith('0')) return '+61' + p.slice(1)  // AU local → international
  if (p.startsWith('61')) return '+' + p      // AU with country code, no +

  return '+61' + p  // fallback: assume AU, prepend country code
}

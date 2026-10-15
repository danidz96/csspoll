/** "2026-10-15" → "Hoy", "2026-10-16" → "Mañana", resto → "Jueves 15 oct" */
export function formatDay(dateStr: string): string {
  if (dateStr === todayISO()) return 'Hoy'
  if (dateStr === isoFromDate(offsetDays(new Date(), 1))) return 'Mañana'
  const d = new Date(dateStr + 'T00:00:00')
  const s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "20:00:00" → "20:00" */
export function formatTime(t: string): string {
  return t.slice(0, 5)
}

function offsetDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** Fecha en ISO local (YYYY-MM-DD) */
function isoFromDate(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Fecha de hoy en ISO local (YYYY-MM-DD) */
export function todayISO(): string {
  return isoFromDate(new Date())
}

/** "Entreno A", "Entreno B"… según índice */
export function defaultEventName(i: number): string {
  return 'Entreno ' + String.fromCharCode(65 + (i % 26))
}

/** "2026-10-15" → "Jueves, 15 oct" */
export function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "20:00:00" → "20:00" */
export function formatTime(t: string): string {
  return t.slice(0, 5)
}

/** Fecha de hoy en ISO local (YYYY-MM-DD) */
export function todayISO(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** "Entreno A", "Entreno B"… según índice */
export function defaultEventName(i: number): string {
  return 'Entreno ' + String.fromCharCode(65 + (i % 26))
}

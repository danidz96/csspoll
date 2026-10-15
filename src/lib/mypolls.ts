// Encuestas guardadas del admin, por dispositivo (sin login).
// El token de administración es la llave de cada encuesta; aquí solo
// anotamos cuáles son tuyas para poder listarlas en /admin.

const KEY = 'csspoll.polls.v1'
/** Tope de encuestas recordadas por dispositivo */
const MAX = 50

export type SavedPoll = {
  token: string
  slug: string
  title: string
  /** ISO de cuándo se guardó por primera vez en este dispositivo */
  savedAt: string
}

function read(): SavedPoll[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr: unknown = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(
      (p): p is SavedPoll =>
        !!p &&
        typeof (p as SavedPoll).token === 'string' &&
        typeof (p as SavedPoll).slug === 'string' &&
        typeof (p as SavedPoll).title === 'string' &&
        typeof (p as SavedPoll).savedAt === 'string',
    )
  } catch {
    return []
  }
}

function write(list: SavedPoll[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Safari privado, cuota llena…: la lista simplemente no persiste
  }
}

/** Encuestas guardadas, de la más reciente a la más antigua. */
export function savedPolls(): SavedPoll[] {
  return read().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
}

/** Añade o actualiza una encuesta (por token), conservando la fecha original. */
export function savePoll(p: { token: string; slug: string; title: string }): void {
  const prev = read()
  const existing = prev.find((x) => x.token === p.token)
  const next = prev.filter((x) => x.token !== p.token)
  next.push({
    token: p.token,
    slug: p.slug,
    title: p.title,
    savedAt: existing?.savedAt ?? new Date().toISOString(),
  })
  write(next.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)).slice(0, MAX))
}

/** Quita una encuesta de la lista (no borra nada en el servidor). */
export function forgetPoll(token: string): void {
  write(read().filter((x) => x.token !== token))
}

/** Saca el token de un enlace de admin (URL completa o token suelto). */
export function extractAdminToken(input: string): string | null {
  const m = input.trim().match(/(?:^|[^0-9a-f])([0-9a-f]{32})(?:[^0-9a-f]|$)/i)
  return m ? m[1]!.toLowerCase() : null
}

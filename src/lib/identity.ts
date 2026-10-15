const DEVICE_KEY = 'csspoll.device'
const NAME_KEY = 'csspoll.name'

/** Identificador anónimo y estable de este navegador (para editar tus confirmaciones sin login). */
export function deviceId(): string {
  let d = localStorage.getItem(DEVICE_KEY)
  if (!d) {
    d = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, d)
  }
  return d
}

export function rememberedName(): string {
  return localStorage.getItem(NAME_KEY) ?? ''
}

export function rememberName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim())
}

/** Eventos en los que este dispositivo confirmó la última vez (por encuesta). */
export function mySelection(slug: string): string[] {
  try {
    const raw = localStorage.getItem('csspoll.sel.' + slug)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function setMySelection(slug: string, ids: string[]): void {
  localStorage.setItem('csspoll.sel.' + slug, JSON.stringify(ids))
}

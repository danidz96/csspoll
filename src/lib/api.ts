// Repositorio local de demo: sustituye Supabase para poder explorar todos los flujos sin conexión.
export type Signup = { id: string; name: string }
export type PollEvent = { id: string; name: string; date: string; time: string; capacity: number | null; signups: Signup[] }
export type Poll = { id: string; slug?: string; title: string; description: string | null; closed: boolean; events: PollEvent[] }
export type EventInput = { name: string; date: string; time: string; capacity: number | null }
export type CreatedPoll = { ok: true; slug: string; admin_token: string } | { ok: false; error: string }
export type JoinResult = { ok: true; poll: Poll } | { ok: false; error: string; full?: string[] }
export type ActionResult = { ok: true } | { ok: false; error: string }

const seed: Poll = {
  id: 'demo-1', slug: 'voley-jueves', title: 'Vóley del jueves', description: 'Pabellón municipal · trae agua y ganas de jugar', closed: false,
  events: [
    { id: 'event-1', name: 'Entreno', date: '2026-10-22', time: '19:30:00', capacity: 16, signups: [{ id: 's1', name: 'Dani' }, { id: 's2', name: 'María' }, { id: 's3', name: 'Álex' }, { id: 's4', name: 'Lucía' }, { id: 's5', name: 'Pablo' }] },
    { id: 'event-2', name: 'Partido', date: '2026-10-22', time: '21:00:00', capacity: 12, signups: [{ id: 's6', name: 'Dani' }, { id: 's7', name: 'María' }, { id: 's8', name: 'Álex' }] },
    { id: 'event-3', name: 'Partido extra', date: '2026-10-24', time: '11:00:00', capacity: null, signups: [{ id: 's9', name: 'Lucía' }, { id: 's10', name: 'Pablo' }] },
  ],
}
let poll: Poll = structuredClone(seed)
let nextId = 20
const clone = () => structuredClone(poll)
const ok = (): ActionResult => ({ ok: true })

export const api = {
  createPoll: async (title: string, description: string, events: EventInput[]): Promise<CreatedPoll> => { poll = { id: `poll-${Date.now()}`, slug: `demo-${Date.now().toString(36)}`, title, description: description || null, closed: false, events: events.map((e, i) => ({ ...e, id: `event-${Date.now()}-${i}`, signups: [] })) }; return { ok: true, slug: poll.slug!, admin_token: 'demo-admin' } },
  getPoll: async (slug: string) => slug === poll.slug || slug === 'voley-jueves' ? clone() : null,
  joinEvents: async (_slug: string, name: string, _device: string, ids: string[]): Promise<JoinResult> => { poll.events.forEach(e => { e.signups = e.signups.filter(s => !s.id.startsWith('device-')) }); ids.forEach(id => { const e = poll.events.find(x => x.id === id); if (e) e.signups.push({ id: `device-${nextId++}`, name }) }); return { ok: true, poll: clone() } },
  adminGet: async (token: string) => token === 'demo-admin' ? ({ ...clone(), slug: 'voley-jueves' }) : null,
  adminUpdatePoll: async (_t: string, title: string | null, description: string | null, closed: boolean | null) => { if (title !== null) poll.title = title; if (description !== null) poll.description = description || null; if (closed !== null) poll.closed = closed; return ok() },
  adminSaveEvent: async (_t: string, eventId: string | null, name: string, date: string, time: string, capacity: number | null) => { if (eventId) { const e = poll.events.find(x => x.id === eventId); if (e) Object.assign(e, { name, date, time: `${time}:00`, capacity }) } else poll.events.push({ id: `event-${nextId++}`, name, date, time: `${time}:00`, capacity, signups: [] }); return ok() },
  adminDeleteEvent: async (_t: string, eventId: string) => { poll.events = poll.events.filter(e => e.id !== eventId); return ok() },
  adminRemoveSignup: async (_t: string, signupId: string) => { poll.events.forEach(e => { e.signups = e.signups.filter(s => s.id !== signupId) }); return ok() },
  adminDuplicatePoll: async (_token: string, _shiftDays = 7): Promise<CreatedPoll> => ({ ok: true, slug: 'demo-nueva', admin_token: 'demo-admin' }),
}
export function errorMessage(code: string, full?: string[]): string { if (code === 'events_full') return full?.length ? `Completo: ${full.join(', ')}.` : 'Algún evento está completo.'; if (code === 'closed') return 'Las inscripciones están cerradas.'; if (code === 'invalid_name') return 'Escribe tu nombre.'; return 'Algo ha ido mal. Inténtalo de nuevo.' }

export const DEMO_HINT = 'Modo demo · datos locales'

// Mantiene la misma superficie de API que la versión conectada, sin persistencia remota.
export async function rpc<T>(_fn: string, _args: Record<string, unknown>): Promise<T> { throw new Error('Demo local') }

export type { Poll as PollType }

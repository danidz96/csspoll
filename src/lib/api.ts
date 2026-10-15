import { supabase } from './supabase'

// ── Tipos (espejo del JSON que devuelven las funciones SQL) ──

export type Signup = { id: string; name: string }

export type PollEvent = {
  id: string
  name: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM:SS */
  time: string
  capacity: number | null
  signups: Signup[]
}

export type Poll = {
  id: string
  /** solo lo devuelve admin_get */
  slug?: string
  title: string
  description: string | null
  closed: boolean
  events: PollEvent[]
}

export type EventInput = { name: string; date: string; time: string; capacity: number | null }

export type CreatedPoll = { ok: true; slug: string; admin_token: string } | { ok: false; error: string }
export type JoinResult = { ok: true; poll: Poll } | { ok: false; error: string; full?: string[] }
export type ActionResult = { ok: true } | { ok: false; error: string }

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args as never)
  if (error) throw new Error(error.message)
  return data as T
}

export const api = {
  createPoll: (title: string, description: string, events: EventInput[]) =>
    rpc<CreatedPoll>('create_poll', { p_title: title, p_description: description, p_events: events }),

  getPoll: (slug: string) => rpc<Poll | null>('get_poll', { p_slug: slug }),

  joinEvents: (slug: string, name: string, deviceId: string, eventIds: string[]) =>
    rpc<JoinResult>('join_events', {
      p_slug: slug,
      p_name: name,
      p_device_id: deviceId,
      p_event_ids: eventIds,
    }),

  adminGet: (token: string) => rpc<Poll | null>('admin_get', { p_token: token }),

  adminUpdatePoll: (token: string, title: string | null, description: string | null, closed: boolean | null) =>
    rpc<ActionResult>('admin_update_poll', {
      p_token: token,
      p_title: title,
      p_description: description,
      p_closed: closed,
    }),

  adminSaveEvent: (
    token: string,
    eventId: string | null,
    name: string,
    date: string,
    time: string,
    capacity: number | null,
  ) =>
    rpc<ActionResult>('admin_save_event', {
      p_token: token,
      p_event_id: eventId,
      p_name: name,
      p_date: date,
      p_time: time,
      p_capacity: capacity,
    }),

  adminDeleteEvent: (token: string, eventId: string) =>
    rpc<ActionResult>('admin_delete_event', { p_token: token, p_event_id: eventId }),

  adminRemoveSignup: (token: string, signupId: string) =>
    rpc<ActionResult>('admin_remove_signup', { p_token: token, p_signup_id: signupId }),

  adminDuplicatePoll: (token: string, shiftDays = 7) =>
    rpc<CreatedPoll>('admin_duplicate_poll', { p_token: token, p_shift_days: shiftDays }),
}

export function errorMessage(code: string, full?: string[]): string {
  switch (code) {
    case 'events_full':
      if (!full || full.length === 0) return 'Alguno de los eventos está completo.'
      return full.length === 1 ? `Está completo: ${full[0]}.` : `Están completos: ${full.join(', ')}.`
    case 'closed':
      return 'Las inscripciones están cerradas.'
    case 'invalid_name':
      return 'Escribe tu nombre (máx. 40 caracteres).'
    case 'not_found':
      return 'No encontramos esta encuesta.'
    case 'invalid_events':
      return 'Revisa los eventos: falta el nombre, la fecha o la hora.'
    case 'invalid_title':
      return 'Ponle un título (máx. 80 caracteres).'
    case 'invalid_event':
      return 'Revisa los datos del evento.'
    case 'last_event':
      return 'La encuesta necesita al menos un evento.'
    default:
      return 'Algo ha ido mal. Inténtalo de nuevo.'
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EventCard } from '../components/EventCard'
import {
  Badge,
  Button,
  Card,
  CopyButton,
  Input,
  Label,
  LinkButton,
  LinkRow,
  SecondaryButton,
  Spinner,
  Textarea,
  Toast,
  secondaryButtonClass,
} from '../components/ui'
import { api, errorMessage, type ActionResult, type Poll } from '../lib/api'
import { defaultEventName, todayISO } from '../lib/format'

type EventFormValues = { name: string; date: string; time: string; capacity: number | null }

function EventForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: { name: string; date: string; time: string; capacity: string; unlimited: boolean }
  onSave: (v: EventFormValues) => Promise<void> | void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time.slice(0, 5))
  const [unlimited, setUnlimited] = useState(initial.unlimited)
  const [capacity, setCapacity] = useState(initial.capacity)
  const [saving, setSaving] = useState(false)
  // Candado síncrono: evita dobles envíos si se hace doble clic antes de que React pinte el botón deshabilitado.
  const savingRef = useRef(false)

  const valid =
    name.trim() !== '' && date !== '' && time !== '' && (unlimited || (/^\d{1,4}$/.test(capacity) && Number(capacity) > 0))

  return (
    <Card className="animate-pop border-emerald-200 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <Label>Nombre</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Entreno A" />
        </label>
        <label>
          <Label>Día</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <Label>Hora</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700 select-none">
          <input
            type="checkbox"
            className="size-4 accent-emerald-600"
            checked={unlimited}
            onChange={(e) => setUnlimited(e.target.checked)}
          />
          Sin límite de plazas
        </label>
        {!unlimited && (
          <label className="flex items-center gap-2 text-sm text-stone-700">
            Plazas
            <Input
              type="number"
              min={1}
              max={9999}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-20"
            />
          </label>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          disabled={!valid || saving}
          onClick={async () => {
            if (savingRef.current) return
            savingRef.current = true
            setSaving(true)
            try {
              await onSave({ name: name.trim(), date, time, capacity: unlimited ? null : Number(capacity) })
            } finally {
              savingRef.current = false
              setSaving(false)
            }
          }}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
        <SecondaryButton type="button" onClick={onCancel}>
          Cancelar
        </SecondaryButton>
      </div>
    </Card>
  )
}

export default function AdminPage() {
  const params = useParams<{ token: string }>()
  const tk = params.token ?? ''

  const [poll, setPoll] = useState<Poll | null | undefined>(undefined)
  const [toast, setToast] = useState<string | null>(null)
  const [dup, setDup] = useState<{ slug: string; admin_token: string } | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const dupRef = useRef(false)
  const [editingPoll, setEditingPoll] = useState(false)
  const [pTitle, setPTitle] = useState('')
  const [pDesc, setPDesc] = useState('')
  const [editingEvent, setEditingEvent] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    if (!tk) return
    try {
      setPoll(await api.adminGet(tk))
    } catch {
      setPoll(null)
    }
  }, [tk])

  useEffect(() => {
    void load()
  }, [load])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const act = useCallback(
    async (fn: () => Promise<ActionResult>, okMsg: string): Promise<boolean> => {
      try {
        const r = await fn()
        if (r.ok) {
          flash(okMsg)
          void load()
          return true
        }
        flash(errorMessage(r.error))
        return false
      } catch {
        flash('No se pudo conectar. Inténtalo de nuevo.')
        return false
      }
    },
    [flash, load],
  )

  async function duplicate() {
    if (dupRef.current) return
    if (!window.confirm('¿Duplicar la encuesta con las fechas +7 días? Se crea una nueva, sin apuntes.')) return
    dupRef.current = true
    setDuplicating(true)
    try {
      const r = await api.adminDuplicatePoll(tk, 7)
      if (r.ok) {
        setDup({ slug: r.slug, admin_token: r.admin_token })
        flash('Encuesta duplicada')
      } else {
        flash(errorMessage(r.error))
      }
    } catch {
      flash('No se pudo conectar. Inténtalo de nuevo.')
    } finally {
      dupRef.current = false
      setDuplicating(false)
    }
  }

  async function savePollEdit() {
    const ok = await act(() => api.adminUpdatePoll(tk, pTitle, pDesc, null), 'Encuesta actualizada')
    if (ok) setEditingPoll(false)
  }

  async function saveEvent(eventId: string | null, v: EventFormValues) {
    const ok = await act(
      () => api.adminSaveEvent(tk, eventId, v.name, v.date, v.time, v.capacity),
      eventId ? 'Evento actualizado' : 'Evento añadido',
    )
    if (ok) {
      setEditingEvent(null)
      setAdding(false)
    }
  }

  if (poll === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-stone-400">
        <Spinner /> Cargando panel…
      </div>
    )
  }

  if (poll === null) {
    return (
      <Card className="animate-pop p-6 text-center">
        <p className="text-3xl">🔒</p>
        <h1 className="mt-2 text-lg font-bold text-stone-900">Enlace de administración no válido</h1>
        <p className="mt-1 text-sm text-stone-600">
          Comprueba que has copiado el enlace completo. Sin él no se puede gestionar la encuesta.
        </p>
      </Card>
    )
  }

  const origin = window.location.origin

  return (
    <>
      <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Panel de administración</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-stone-900">{poll.title}</h1>
        <Badge tone={poll.closed ? 'amber' : 'green'}>{poll.closed ? 'Cerrada' : 'Abierta'}</Badge>
      </div>
      {poll.description && <p className="mt-1 text-sm text-stone-600">{poll.description}</p>}

      {editingPoll ? (
        <Card className="animate-pop mt-4 border-emerald-200 p-4">
          <label className="block">
            <Label>Título</Label>
            <Input value={pTitle} onChange={(e) => setPTitle(e.target.value)} maxLength={80} />
          </label>
          <label className="mt-3 block">
            <Label>Descripción</Label>
            <Textarea rows={2} value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Opcional" />
          </label>
          <div className="mt-4 flex gap-2">
            <Button type="button" disabled={pTitle.trim() === ''} onClick={() => void savePollEdit()}>
              Guardar
            </Button>
            <SecondaryButton type="button" onClick={() => setEditingPoll(false)}>
              Cancelar
            </SecondaryButton>
          </div>
        </Card>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <SecondaryButton
            type="button"
            onClick={() =>
              void act(() => api.adminUpdatePoll(tk, null, null, !poll.closed), poll.closed ? 'Inscripciones abiertas' : 'Inscripciones cerradas')
            }
          >
            {poll.closed ? 'Reabrir inscripciones' : 'Cerrar inscripciones'}
          </SecondaryButton>
          <LinkButton href={`/p/${poll.slug ?? ''}`} target="_blank" rel="noreferrer">
            Ver pública
          </LinkButton>
          <CopyButton text={`${origin}/p/${poll.slug ?? ''}`} label="Copiar enlace" />
          <SecondaryButton
            type="button"
            onClick={() => {
              setPTitle(poll.title)
              setPDesc(poll.description ?? '')
              setEditingPoll(true)
            }}
          >
            Editar
          </SecondaryButton>
          <SecondaryButton type="button" disabled={duplicating} onClick={() => void duplicate()}>
            {duplicating ? 'Duplicando…' : 'Duplicar (+7 días)'}
          </SecondaryButton>
        </div>
      )}

      {dup && (
        <Card className="animate-pop mt-4 border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-emerald-900">Encuesta duplicada ✅</p>
            <button
              type="button"
              className="text-sm text-emerald-700/70 transition hover:text-emerald-900"
              onClick={() => setDup(null)}
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-sm text-emerald-800">Mismos horarios, fechas +7 días y sin apuntes. Estos son sus enlaces:</p>
          <div className="mt-3 space-y-2">
            <LinkRow label="Enlace público de la nueva" url={`${origin}/p/${dup.slug}`} />
            <LinkRow
              label="Tu admin de la nueva"
              url={`${origin}/admin/${dup.admin_token}`}
              hint="Guárdalo para gestionar la nueva."
            />
          </div>
          <div className="mt-3">
            <Link to={`/admin/${dup.admin_token}`} className={secondaryButtonClass}>
              Ir al panel de la nueva
            </Link>
          </div>
        </Card>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Eventos</h2>
        <span className="text-xs text-stone-400">{poll.events.length}</span>
      </div>
      <div className="mt-3 space-y-3">
        {poll.events.map((event) =>
          editingEvent === event.id ? (
            <EventForm
              key={event.id}
              initial={{
                name: event.name,
                date: event.date,
                time: event.time,
                capacity: event.capacity === null ? '16' : String(event.capacity),
                unlimited: event.capacity === null,
              }}
              onSave={(v) => saveEvent(event.id, v)}
              onCancel={() => setEditingEvent(null)}
            />
          ) : (
            <EventCard
              key={event.id}
              event={event}
              renderExtra={(s) => (
                <button
                  type="button"
                  title={`Quitar a ${s.name}`}
                  className="ml-0.5 text-stone-400 transition hover:text-red-600"
                  onClick={() => {
                    if (window.confirm(`¿Quitar a ${s.name} de ${event.name}?`)) {
                      void act(() => api.adminRemoveSignup(tk, s.id), 'Apunte quitado')
                    }
                  }}
                >
                  ✕
                </button>
              )}
              action={
                <div className="mt-3 flex items-center gap-4 border-t border-stone-100 pt-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-stone-600 transition hover:text-stone-900"
                    onClick={() => setEditingEvent(event.id)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="text-sm font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={poll.events.length <= 1}
                    title={poll.events.length <= 1 ? 'La encuesta necesita al menos un evento' : undefined}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar ${event.name}? Se borrarán también sus apuntes.`)) {
                        void act(() => api.adminDeleteEvent(tk, event.id), 'Evento eliminado')
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              }
            />
          ),
        )}
        {adding && (
          <EventForm
            initial={{
              name: defaultEventName(poll.events.length),
              date: todayISO(),
              time: '',
              capacity: '16',
              unlimited: false,
            }}
            onSave={(v) => saveEvent(null, v)}
            onCancel={() => setAdding(false)}
          />
        )}
        {!adding && (
          <SecondaryButton type="button" className="w-full" onClick={() => setAdding(true)}>
            + Añadir evento
          </SecondaryButton>
        )}
      </div>

      <Toast message={toast} />
    </>
  )
}

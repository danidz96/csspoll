import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CalendarPlus,
  CheckCircle2,
  Circle,
  ExternalLink,
  Lock,
  LockKeyhole,
  LockOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { EventCard } from '../components/EventCard'
import {
  Badge,
  Button,
  Card,
  CopyButton,
  IconButton,
  Input,
  Label,
  LinkRow,
  SecondaryButton,
  Spinner,
  Textarea,
  Toast,
  toolbarButtonClass,
} from '../components/ui'
import { api, errorMessage, type ActionResult, type Poll } from '../lib/api'
import { defaultEventName, todayISO } from '../lib/format'
import { useTitle } from '../lib/useTitle'

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
    <Card className="animate-pop border-court-100 p-4">
      <label className="block">
        <Label>Nombre</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Entreno A" />
      </label>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <label>
          <Label>Día</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <Label>Hora</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-2.5">
        {!unlimited ? (
          <label>
            <Label>Plazas</Label>
            <Input
              type="number"
              min={1}
              max={9999}
              inputMode="numeric"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-24"
            />
          </label>
        ) : (
          <span />
        )}
        <label
          className={`pressable flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-[14px] font-medium select-none ${
            unlimited ? 'border-court-600 bg-court-50 text-court-700' : 'border-line-strong text-ink-soft hover:bg-paper'
          }`}
        >
          <input type="checkbox" className="sr-only" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />
          {unlimited ? (
            <CheckCircle2 className="size-4 text-court-600" aria-hidden="true" />
          ) : (
            <Circle className="size-4 text-ink-faint" aria-hidden="true" />
          )}
          Sin límite
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          className="flex-1"
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

  useTitle(poll?.title ? `Panel · ${poll.title}` : 'Panel · csspoll')

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
      <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-ink-faint">
        <Spinner /> Cargando…
      </div>
    )
  }

  if (poll === null) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <LockKeyhole className="size-8 text-ink-faint/50" strokeWidth={1.8} aria-hidden="true" />
        <h1 className="mt-3 text-[17px] font-semibold text-ink">Enlace no válido</h1>
        <p className="mt-1 max-w-[36ch] text-sm text-ink-soft">
          Comprueba que has pegado el enlace completo. Sin él no se puede gestionar la encuesta.
        </p>
      </div>
    )
  }

  const origin = window.location.origin

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[22px] leading-7 font-semibold tracking-tight text-ink">{poll.title}</h1>
        <Badge tone={poll.closed ? 'full' : 'open'}>{poll.closed ? 'Cerrada' : 'Abierta'}</Badge>
      </div>
      {poll.description && <p className="mt-1 text-[15px] text-ink-soft">{poll.description}</p>}

      {editingPoll ? (
        <Card className="animate-pop mt-4 border-court-100 p-4">
          <label className="block">
            <Label>Título</Label>
            <Input value={pTitle} onChange={(e) => setPTitle(e.target.value)} maxLength={80} />
          </label>
          <label className="mt-3 block">
            <Label>
              Descripción <span className="font-normal text-ink-faint">(opcional)</span>
            </Label>
            <Textarea rows={2} value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Llevad balón, cancha 2…" />
          </label>
          <div className="mt-4 flex gap-2">
            <Button type="button" className="flex-1" disabled={pTitle.trim() === ''} onClick={() => void savePollEdit()}>
              Guardar
            </Button>
            <SecondaryButton type="button" onClick={() => setEditingPoll(false)}>
              Cancelar
            </SecondaryButton>
          </div>
        </Card>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={toolbarButtonClass}
            onClick={() =>
              void act(() => api.adminUpdatePoll(tk, null, null, !poll.closed), poll.closed ? 'Inscripciones abiertas' : 'Inscripciones cerradas')
            }
          >
            {poll.closed ? <LockOpen className="size-3.5" aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />}
            {poll.closed ? 'Reabrir' : 'Cerrar'}
          </button>
          <a href={`/p/${poll.slug ?? ''}`} target="_blank" rel="noreferrer" className={toolbarButtonClass}>
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Ver pública
          </a>
          <CopyButton text={`${origin}/p/${poll.slug ?? ''}`} label="Copiar enlace" />
          <button
            type="button"
            className={toolbarButtonClass}
            onClick={() => {
              setPTitle(poll.title)
              setPDesc(poll.description ?? '')
              setEditingPoll(true)
            }}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Editar
          </button>
          <button type="button" className={toolbarButtonClass} disabled={duplicating} onClick={() => void duplicate()}>
            <CalendarPlus className="size-3.5" aria-hidden="true" />
            {duplicating ? 'Duplicando…' : 'Duplicar +7 días'}
          </button>
        </div>
      )}

      {dup && (
        <Card className="animate-pop mt-4 border-court-100 bg-court-50/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 font-semibold text-court-700">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              Encuesta duplicada
            </p>
            <IconButton type="button" aria-label="Cerrar aviso" onClick={() => setDup(null)}>
              <X className="size-4" />
            </IconButton>
          </div>
          <p className="mt-1 text-sm text-court-700/90">Mismos horarios, fechas +7 días y sin apuntes. Estos son sus enlaces:</p>
          <div className="mt-3 space-y-2">
            <LinkRow label="Enlace para el grupo" url={`${origin}/p/${dup.slug}`} />
            <LinkRow
              label="Enlace de administración"
              url={`${origin}/admin/${dup.admin_token}`}
              hint="Guárdalo para gestionar la nueva."
            />
          </div>
          <div className="mt-3">
            <Link to={`/admin/${dup.admin_token}`} className={toolbarButtonClass}>
              Ir al panel de la nueva
            </Link>
          </div>
        </Card>
      )}

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-ink-soft">Eventos</h2>
        <span className="tnum text-[13px] text-ink-faint">{poll.events.length}</span>
      </div>
      <div className="space-y-3">
        {poll.events.map((event, i) =>
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
              showDate={i === 0 || poll.events[i - 1]!.date !== event.date}
              renderExtra={(s) => (
                <button
                  type="button"
                  aria-label={`Quitar a ${s.name}`}
                  title={`Quitar a ${s.name}`}
                  className="pressable -mr-1 grid size-5 place-items-center rounded-full text-ink-faint hover:bg-red-50 hover:text-red-600"
                  onClick={() => {
                    if (window.confirm(`¿Quitar a ${s.name} de ${event.name}?`)) {
                      void act(() => api.adminRemoveSignup(tk, s.id), 'Apunte quitado')
                    }
                  }}
                >
                  <X className="size-3.5" />
                </button>
              )}
              action={
                <div className="mt-3 flex items-center gap-1 border-t border-line pt-2">
                  <button
                    type="button"
                    className="pressable -ml-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-ink-soft hover:bg-paper hover:text-ink"
                    onClick={() => setEditingEvent(event.id)}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="pressable inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={poll.events.length <= 1}
                    title={poll.events.length <= 1 ? 'La encuesta necesita al menos un evento' : undefined}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar ${event.name}? Se borrarán también sus apuntes.`)) {
                        void act(() => api.adminDeleteEvent(tk, event.id), 'Evento eliminado')
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
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
          <SecondaryButton type="button" className="w-full border-dashed" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Añadir evento
          </SecondaryButton>
        )}
      </div>

      <Toast message={toast} />
    </>
  )
}

import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Plus, X } from 'lucide-react'
import {
  Button,
  Card,
  IconButton,
  Input,
  Label,
  LinkRow,
  SecondaryButton,
  Textarea,
  WhatsAppIcon,
  primaryButtonClass,
  secondaryButtonClass,
} from '../components/ui'
import { api, errorMessage, type EventInput } from '../lib/api'
import { defaultEventName, todayISO } from '../lib/format'
import { useTitle } from '../lib/useTitle'

type EventDraft = { key: string; name: string; date: string; time: string; capacity: string; unlimited: boolean }

function newDraft(i: number): EventDraft {
  return {
    key: crypto.randomUUID(),
    name: defaultEventName(i),
    date: todayISO(),
    time: '',
    capacity: '16',
    unlimited: false,
  }
}

export default function CreatePage() {
  useTitle('Nueva encuesta · csspoll')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [events, setEvents] = useState<EventDraft[]>(() => [newDraft(0)])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ slug: string; admin_token: string } | null>(null)
  // Candado síncrono anti doble-clic (el setState de `creating` no llega a pintarse entre clics rápidos)
  const creatingRef = useRef(false)

  const update = (key: string, patch: Partial<EventDraft>) =>
    setEvents((evs) => evs.map((e) => (e.key === key ? { ...e, ...patch } : e)))

  async function submit() {
    if (creatingRef.current) return
    creatingRef.current = true
    try {
      await submitInner()
    } finally {
      creatingRef.current = false
    }
  }

  async function submitInner() {
    if (title.trim() === '') {
      setError('Ponle un título.')
      return
    }
    for (const e of events) {
      if (e.name.trim() === '' || e.date === '' || e.time === '') {
        setError('Revisa los eventos: falta el nombre, la fecha o la hora.')
        return
      }
      if (!e.unlimited && !(/^\d{1,4}$/.test(e.capacity) && Number(e.capacity) > 0)) {
        setError('Las plazas deben ser mayores que 0, o marca «Sin límite».')
        return
      }
    }

    const payload: EventInput[] = events.map((e) => ({
      name: e.name.trim(),
      date: e.date,
      time: e.time,
      capacity: e.unlimited ? null : Number(e.capacity),
    }))

    setCreating(true)
    setError(null)
    try {
      const res = await api.createPoll(title.trim(), description.trim(), payload)
      if (res.ok) {
        setCreated({ slug: res.slug, admin_token: res.admin_token })
      } else {
        setError(errorMessage(res.error))
      }
    } catch {
      setError('No se pudo conectar. Inténtalo de nuevo.')
    } finally {
      setCreating(false)
    }
  }

  if (created) {
    const origin = window.location.origin
    const publicUrl = `${origin}/p/${created.slug}`
    const adminUrl = `${origin}/admin/${created.admin_token}`
    const waHref = `https://wa.me/?text=${encodeURIComponent(`${title.trim()} — apúntate aquí: ${publicUrl}`)}`
    return (
      <Card className="animate-pop p-5">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-court-600" aria-hidden="true" />
          <div>
            <h1 className="text-[17px] font-semibold text-ink">Encuesta creada</h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              Compártela con el grupo y guarda tu enlace de administración.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <LinkRow label="Enlace para el grupo" url={publicUrl} />
          <a href={waHref} target="_blank" rel="noreferrer" className={`${primaryButtonClass} w-full`}>
            <WhatsAppIcon />
            Compartir por WhatsApp
          </a>
          <LinkRow
            label="Enlace de administración"
            url={adminUrl}
            hint="Con él editas, cierras o duplicas la encuesta. No lo compartas."
          />
        </div>
        <div className="mt-4 flex items-center gap-1">
          <Link to={`/p/${created.slug}`} className={`${secondaryButtonClass} flex-1`}>
            Ver encuesta
          </Link>
          <button
            type="button"
            className="pressable h-11 rounded-xl px-4 text-[15px] font-semibold text-ink-soft hover:bg-paper hover:text-ink"
            onClick={() => {
              setCreated(null)
              setTitle('')
              setDescription('')
              setEvents([newDraft(0)])
              setError(null)
            }}
          >
            Crear otra
          </button>
        </div>
      </Card>
    )
  }

  return (
    <>
      <h1 className="text-[22px] leading-7 font-semibold tracking-tight text-ink">Nueva encuesta</h1>
      <p className="mt-1 text-sm text-ink-soft">Añade los horarios y comparte un enlace con el grupo.</p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <Label>Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Vóley del jueves"
            maxLength={80}
            autoFocus
          />
        </label>

        <label className="block">
          <Label>
            Descripción <span className="font-normal text-ink-faint">(opcional)</span>
          </Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Llevad balón, cancha 2…"
          />
        </label>

        <div>
          <Label>Eventos</Label>
          <div className="space-y-3">
            {events.map((e) => (
              <Card key={e.key} className="p-3.5">
                <div className="flex items-center gap-1.5">
                  <Input
                    value={e.name}
                    onChange={(ev) => update(e.key, { name: ev.target.value })}
                    placeholder="Entreno A"
                    aria-label="Nombre del evento"
                    maxLength={80}
                  />
                  {events.length > 1 && (
                    <IconButton
                      type="button"
                      aria-label={`Quitar ${e.name || 'este evento'}`}
                      title="Quitar este evento"
                      onClick={() => setEvents((evs) => evs.filter((x) => x.key !== e.key))}
                    >
                      <X className="size-4" />
                    </IconButton>
                  )}
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <label>
                    <Label>Día</Label>
                    <Input type="date" value={e.date} onChange={(ev) => update(e.key, { date: ev.target.value })} />
                  </label>
                  <label>
                    <Label>Hora</Label>
                    <Input type="time" value={e.time} onChange={(ev) => update(e.key, { time: ev.target.value })} />
                  </label>
                </div>
                <div className="mt-2.5 flex items-end justify-between gap-2.5">
                  {!e.unlimited ? (
                    <label>
                      <Label>Plazas</Label>
                      <Input
                        type="number"
                        min={1}
                        max={9999}
                        inputMode="numeric"
                        value={e.capacity}
                        onChange={(ev) => update(e.key, { capacity: ev.target.value })}
                        className="w-24"
                      />
                    </label>
                  ) : (
                    <span />
                  )}
                  <label
                    className={`pressable flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-[14px] font-medium select-none ${
                      e.unlimited
                        ? 'border-court-600 bg-court-50 text-court-700'
                        : 'border-line-strong text-ink-soft hover:bg-paper'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={e.unlimited}
                      onChange={(ev) => update(e.key, { unlimited: ev.target.checked })}
                    />
                    {e.unlimited ? (
                      <CheckCircle2 className="size-4 text-court-600" aria-hidden="true" />
                    ) : (
                      <Circle className="size-4 text-ink-faint" aria-hidden="true" />
                    )}
                    Sin límite
                  </label>
                </div>
              </Card>
            ))}
          </div>
          <SecondaryButton
            type="button"
            className="mt-3 w-full border-dashed"
            onClick={() => setEvents((evs) => [...evs, newDraft(evs.length)])}
          >
            <Plus className="size-4" aria-hidden="true" />
            Añadir evento
          </SecondaryButton>
        </div>

        {error && <p className="text-[13px] font-medium text-red-600">{error}</p>}

        <Button type="button" className="h-12 w-full" disabled={creating} onClick={() => void submit()}>
          {creating ? 'Creando…' : 'Crear encuesta'}
        </Button>
      </div>
    </>
  )
}

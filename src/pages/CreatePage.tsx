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
      <section className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-end">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-court-100 bg-court-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-court-700">
            <span className="size-1.5 rounded-full bg-court-500" aria-hidden="true" /> Organiza sin ruido
          </div>
          <h1 className="max-w-xl text-4xl leading-[1.03] font-bold tracking-[-0.04em] text-ink sm:text-6xl">Decidid cuándo.<br /><span className="text-court-600">Jugad más.</span></h1>
          <p className="mt-5 max-w-md text-base leading-7 text-ink-soft">Crea una encuesta de horarios en segundos y deja que tu grupo elija el mejor momento.</p>
          <div className="mt-7 flex flex-wrap gap-6 text-sm text-ink-soft">
            <div><strong className="block text-xl tracking-tight text-ink">01</strong> Crea los horarios</div>
            <div><strong className="block text-xl tracking-tight text-ink">02</strong> Comparte el enlace</div>
            <div><strong className="block text-xl tracking-tight text-ink">03</strong> Cerrad el plan</div>
          </div>
        </div>
        <div className="rounded-[2rem] border border-ink bg-ink p-6 text-white shadow-[0_24px_60px_rgba(21,25,35,.18)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Tu próxima decisión</p>
          <p className="mt-5 text-2xl font-semibold tracking-tight">¿Cuándo nos vemos?</p>
          <div className="mt-6 grid gap-2">
            <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3"><span className="text-sm text-white/80">Jueves · 19:30</span><span className="rounded-full bg-court-500 px-2.5 py-1 text-xs font-bold">8 votos</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"><span className="text-sm text-white/60">Viernes · 20:00</span><span className="text-xs text-white/40">5 votos</span></div>
          </div>
          <p className="mt-6 text-xs text-white/40">Una vista clara para grupos que quieren avanzar.</p>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto mt-14 grid max-w-4xl gap-3 sm:grid-cols-3">
        {[
          ['01', 'Diseña tu encuesta', 'Ponle contexto y añade todas las opciones que quieras comparar.'],
          ['02', 'Invita al equipo', 'Comparte un enlace único por WhatsApp, Slack o donde habléis.'],
          ['03', 'Tomad la decisión', 'Ve las respuestas agrupadas y cierra el plan sin perseguir a nadie.'],
        ].map(([number, title, copy]) => (
          <div key={number} className="rounded-2xl border border-line bg-white/70 p-5">
            <span className="text-xs font-bold tracking-[0.18em] text-court-600">{number}</span>
            <h2 className="mt-4 text-[15px] font-bold text-ink">{title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-ink-soft">{copy}</p>
          </div>
        ))}
      </section>

      <div className="mx-auto mt-10 max-w-4xl rounded-[2rem] border border-line bg-white p-5 shadow-[0_20px_60px_rgba(21,25,35,.08)] sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4 border-b border-line pb-6"><div><div className="mb-2 inline-flex rounded-full bg-court-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-court-700">Constructor</div><h2 className="text-2xl font-bold tracking-tight text-ink">Nueva encuesta</h2><p className="mt-1 text-sm text-ink-soft">Una pregunta clara. Varias opciones. Una decisión rápida.</p></div><span className="hidden rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink-faint sm:inline-flex">Borrador · 1/1</span></div>
        <div className="space-y-4">
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
      </div>
    </>
  )
}

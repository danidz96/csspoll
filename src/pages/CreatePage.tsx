import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Input, Label, LinkButton, LinkRow, SecondaryButton, Textarea, secondaryButtonClass } from '../components/ui'
import { api, errorMessage, type EventInput } from '../lib/api'
import { defaultEventName, todayISO } from '../lib/format'

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
      setError('Ponle un título a la encuesta.')
      return
    }
    for (const e of events) {
      if (e.name.trim() === '' || e.date === '' || e.time === '') {
        setError('Revisa los eventos: nombre, fecha y hora son obligatorios.')
        return
      }
      if (!e.unlimited && !(/^\d{1,4}$/.test(e.capacity) && Number(e.capacity) > 0)) {
        setError('Las plazas deben ser un número mayor que 0 (o marca «Sin límite»).')
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
        <h1 className="text-lg font-bold text-stone-900">¡Encuesta creada! 🎉</h1>
        <p className="mt-1 text-sm text-stone-600">Manda el primer enlace al grupo y guarda el segundo solo para ti.</p>
        <div className="mt-4 space-y-3">
          <LinkRow
            label="Enlace para el grupo"
            url={publicUrl}
            extra={
              <LinkButton href={waHref} target="_blank" rel="noreferrer">
                Compartir por WhatsApp
              </LinkButton>
            }
          />
          <LinkRow
            label="Tu enlace de administración"
            url={adminUrl}
            hint="Guárdalo: con él editas, cierras o duplicas la encuesta. No lo compartas."
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/p/${created.slug}`} className={secondaryButtonClass}>
            Ver la encuesta
          </Link>
          <SecondaryButton
            type="button"
            onClick={() => {
              setCreated(null)
              setTitle('')
              setDescription('')
              setEvents([newDraft(0)])
              setError(null)
            }}
          >
            Crear otra
          </SecondaryButton>
        </div>
      </Card>
    )
  }

  return (
    <>
      <h1 className="text-xl font-bold text-stone-900">Crea la encuesta de apuntes</h1>
      <p className="mt-1 text-sm text-stone-600">
        Añade los eventos del día, con o sin límite de plazas. Tú solo compartes un enlace.
      </p>

      <div className="mt-6 space-y-4">
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
            Descripción <span className="font-normal text-stone-400">(opcional)</span>
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
                <div className="flex items-center gap-2">
                  <Input
                    value={e.name}
                    onChange={(ev) => update(e.key, { name: ev.target.value })}
                    placeholder="Entreno A"
                    maxLength={80}
                  />
                  {events.length > 1 && (
                    <button
                      type="button"
                      title="Quitar este evento"
                      className="shrink-0 rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-red-600"
                      onClick={() => setEvents((evs) => evs.filter((x) => x.key !== e.key))}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <label>
                    <Label>Día</Label>
                    <Input type="date" value={e.date} onChange={(ev) => update(e.key, { date: ev.target.value })} />
                  </label>
                  <label>
                    <Label>Hora</Label>
                    <Input type="time" value={e.time} onChange={(ev) => update(e.key, { time: ev.target.value })} />
                  </label>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700 select-none">
                    <input
                      type="checkbox"
                      className="size-4 accent-emerald-600"
                      checked={e.unlimited}
                      onChange={(ev) => update(e.key, { unlimited: ev.target.checked })}
                    />
                    Sin límite
                  </label>
                  {!e.unlimited && (
                    <label className="flex items-center gap-2 text-sm text-stone-700">
                      Plazas
                      <Input
                        type="number"
                        min={1}
                        max={9999}
                        value={e.capacity}
                        onChange={(ev) => update(e.key, { capacity: ev.target.value })}
                        className="w-20"
                      />
                    </label>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <SecondaryButton
            type="button"
            className="mt-3 w-full"
            onClick={() => setEvents((evs) => [...evs, newDraft(evs.length)])}
          >
            + Añadir otro evento
          </SecondaryButton>
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <Button type="button" className="w-full py-3" disabled={creating} onClick={() => void submit()}>
          {creating ? 'Creando…' : 'Crear encuesta'}
        </Button>
        <p className="pb-2 text-center text-xs text-stone-400">Sin registros: quien se apunte solo escribe su nombre.</p>
      </div>
    </>
  )
}

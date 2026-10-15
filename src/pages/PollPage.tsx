import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Circle, Lock, Volleyball } from 'lucide-react'
import { EventCard } from '../components/EventCard'
import { Button, Input, Spinner, Toast } from '../components/ui'
import { api, errorMessage, type Poll } from '../lib/api'
import { deviceId, mySelection, rememberName, rememberedName, setMySelection } from '../lib/identity'
import { useTitle } from '../lib/useTitle'

export default function PollPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug ?? ''
  const device = useMemo(() => deviceId(), [])

  const [poll, setPoll] = useState<Poll | null | undefined>(undefined)
  const [name, setName] = useState(() => rememberedName())
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [hadSignups, setHadSignups] = useState(() => mySelection(slug).length > 0)
  const [dirty, setDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useTitle(poll?.title ? `${poll.title} · csspoll` : 'Encuesta · csspoll')

  const load = useCallback(async () => {
    if (!slug) return
    try {
      setPoll(await api.getPoll(slug))
    } catch {
      setPoll(null)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  // Refresco automático cada 10 s para ver las confirmaciones de los demás
  useEffect(() => {
    const t = setInterval(() => void load(), 10000)
    return () => clearInterval(t)
  }, [load])

  // Restaurar mi selección guardada mientras el usuario no toque nada
  useEffect(() => {
    if (poll && !dirty) {
      const stored = mySelection(slug)
      setSelected(new Set(stored.filter((id) => poll.events.some((e) => e.id === id))))
    }
  }, [poll, dirty, slug])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setDirty(true)
    setError(null)
  }

  async function submit() {
    const trimmed = name.trim()
    if (trimmed === '') {
      setError('Escribe tu nombre para confirmar.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.joinEvents(slug, trimmed, device, [...selected])
      if (res.ok) {
        rememberName(trimmed)
        setMySelection(slug, [...selected])
        setHadSignups(selected.size > 0)
        setDirty(false)
        setPoll(res.poll)
        setToast('Asistencia guardada')
        setTimeout(() => setToast(null), 2500)
      } else {
        setError(errorMessage(res.error, res.full))
        void load()
      }
    } catch {
      setError('No se pudo conectar. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
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
        <Volleyball className="size-8 text-ink-faint/50" strokeWidth={1.8} aria-hidden="true" />
        <h1 className="mt-3 text-[17px] font-semibold text-ink">Esta encuesta no existe</h1>
        <p className="mt-1 max-w-[36ch] text-sm text-ink-soft">
          El enlace puede estar mal o la encuesta ya no está disponible.
        </p>
        <Link to="/" className="mt-4 text-sm font-semibold text-court-700 hover:text-court-600">
          Crear una encuesta
        </Link>
      </div>
    )
  }

  const fullIds = new Set(
    poll.events.filter((e) => e.capacity !== null && e.signups.length >= e.capacity).map((e) => e.id),
  )
  const label = submitting
    ? 'Guardando…'
    : selected.size > 0
      ? hadSignups && dirty
        ? 'Guardar cambios'
        : 'Confirmar'
      : hadSignups
        ? 'Quitar mi confirmación'
        : 'Confirmar'
  const canSubmit = !submitting && name.trim() !== '' && (selected.size > 0 || hadSignups)

  return (
    <>
      <header className="mb-4">
        <h1 className="text-[22px] leading-7 font-semibold tracking-tight text-ink">{poll.title}</h1>
        {poll.description && <p className="mt-1 text-[15px] text-ink-soft">{poll.description}</p>}
        {poll.closed && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] font-medium text-amber-800">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            Inscripciones cerradas. Habla con quien organiza si necesitas cambios.
          </div>
        )}
      </header>

      <div className="space-y-3">
        {poll.events.map((event, i) => {
          const isSelected = selected.has(event.id)
          const isFull = fullIds.has(event.id)
          return (
            <EventCard
              key={event.id}
              event={event}
              showDate={i === 0 || poll.events[i - 1]!.date !== event.date}
              action={
                !poll.closed ? (
                  isFull && !isSelected ? (
                    <div className="mt-3 flex h-10 items-center gap-2.5 rounded-xl border border-line bg-paper px-3 text-[14px] font-medium text-ink-faint">
                      <Lock className="size-4" aria-hidden="true" />
                      Completo
                    </div>
                  ) : (
                    <label
                      className={`pressable mt-3 flex h-10 cursor-pointer items-center gap-2.5 rounded-xl border px-3 text-[14px] font-medium select-none ${
                        isSelected
                          ? 'border-court-600 bg-court-50 text-court-700'
                          : 'border-line-strong text-ink-soft hover:bg-paper'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => toggle(event.id)}
                      />
                      {isSelected ? (
                        <CheckCircle2 className="size-5 text-court-600" aria-hidden="true" />
                      ) : (
                        <Circle className="size-5 text-ink-faint" aria-hidden="true" />
                      )}
                      {isSelected ? 'Voy' : 'Confirmar'}
                    </label>
                  )
                ) : undefined
              }
            />
          )
        })}
      </div>

      {!poll.closed && (
        <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur">
          <div className="mx-auto w-full max-w-md px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:max-w-xl">
            {error && <p className="mb-2 text-[13px] font-medium text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError(null)
                }}
                placeholder="Tu nombre"
                maxLength={40}
                autoComplete="name"
                className="flex-1"
              />
              <Button type="button" className="shrink-0" onClick={() => void submit()} disabled={!canSubmit}>
                {label}
              </Button>
            </div>
            <p className="mt-1.5 text-center text-[12px] text-ink-faint">
              {selected.size > 0
                ? `${selected.size} ${selected.size === 1 ? 'evento seleccionado' : 'eventos seleccionados'}`
                : hadSignups
                  ? 'Desmarca los eventos y guarda para cancelar tu asistencia'
                  : 'Confirma los eventos a los que irás'}
            </p>
          </div>
        </footer>
      )}

      <Toast message={toast} />
    </>
  )
}

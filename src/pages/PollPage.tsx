import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EventCard } from '../components/EventCard'
import { Button, Card, Input, Spinner, Toast } from '../components/ui'
import { api, errorMessage, type Poll } from '../lib/api'
import { deviceId, mySelection, rememberName, rememberedName, setMySelection } from '../lib/identity'

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

  // Refresco automático cada 10 s para ver los apuntes de los demás
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
      setError('Escribe tu nombre para apuntarte.')
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
        setToast(selected.size > 0 ? '¡Apuntado! 🏐' : 'Te hemos quitado de todos los eventos')
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
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-stone-400">
        <Spinner /> Cargando encuesta…
      </div>
    )
  }

  if (poll === null) {
    return (
      <Card className="animate-pop p-6 text-center">
        <p className="text-3xl">🤔</p>
        <h1 className="mt-2 text-lg font-bold text-stone-900">No encontramos esta encuesta</h1>
        <p className="mt-1 text-sm text-stone-600">Puede que el enlace esté mal o que la encuesta se haya borrado.</p>
      </Card>
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
        : 'Apuntarme'
      : hadSignups
        ? 'Quitar mi apunte'
        : 'Apuntarme'
  const canSubmit = !submitting && name.trim() !== '' && (selected.size > 0 || hadSignups)

  return (
    <>
      <header className="mb-4">
        <h1 className="text-xl font-bold text-stone-900">{poll.title}</h1>
        {poll.description && <p className="mt-1 text-sm text-stone-600">{poll.description}</p>}
        {poll.closed && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Las inscripciones están cerradas. Habla con quien organiza si necesitas cambios.
          </div>
        )}
      </header>

      <div className="space-y-3">
        {poll.events.map((event) => {
          const isSelected = selected.has(event.id)
          const isFull = fullIds.has(event.id)
          return (
            <EventCard
              key={event.id}
              event={event}
              action={
                !poll.closed ? (
                  isFull && !isSelected ? (
                    <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-stone-200 px-3 py-2.5 opacity-60">
                      <input type="checkbox" className="size-4 accent-emerald-600" checked={false} disabled readOnly />
                      <span className="text-sm font-medium text-stone-500">Completo</span>
                    </div>
                  ) : (
                    <label
                      className={`mt-3 flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition select-none ${
                        isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-emerald-600"
                        checked={isSelected}
                        onChange={() => toggle(event.id)}
                      />
                      <span className="text-sm font-medium text-stone-800">{isSelected ? '¡Voy!' : 'Apuntarme aquí'}</span>
                    </label>
                  )
                ) : undefined
              }
            />
          )
        })}
      </div>

      <p className="mt-4 text-center text-xs text-stone-400">Esta página se actualiza sola cada pocos segundos.</p>

      {!poll.closed && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur">
          <div className="mx-auto w-full max-w-md px-4 py-3 sm:max-w-xl">
            {error && <p className="mb-2 text-sm font-medium text-red-600">{error}</p>}
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
              <Button type="button" onClick={() => void submit()} disabled={!canSubmit}>
                {label}
              </Button>
            </div>
            <p className="mt-1.5 text-center text-xs text-stone-400">
              {selected.size > 0
                ? `${selected.size} ${selected.size === 1 ? 'evento seleccionado' : 'eventos seleccionados'}`
                : hadSignups
                  ? 'Desmarca todo y guarda para borrar tus apuntes'
                  : 'Marca los eventos a los que vas'}
            </p>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </>
  )
}

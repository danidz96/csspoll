import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, CheckCircle2, ClipboardList, ExternalLink, Plus, X } from 'lucide-react'
import { InstallHint } from '../components/InstallHint'
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
  Toast,
  primaryButtonClass,
  toolbarButtonClass,
} from '../components/ui'
import { api, errorMessage, type PollSummary } from '../lib/api'
import { formatDay, formatTime, todayISO } from '../lib/format'
import { extractAdminToken, forgetPoll, savedPolls, savePoll, type SavedPoll } from '../lib/mypolls'
import { useTitle } from '../lib/useTitle'

type Status = 'hoy' | 'proxima' | 'cerrada' | 'pasada' | 'no_disponible'
type Row = { saved: SavedPoll; summary: PollSummary | null; status: Status }

const STATUS_INFO: Record<Status, { label: string; tone: 'open' | 'full' | 'muted' }> = {
  hoy: { label: 'Hoy', tone: 'open' },
  proxima: { label: 'Próxima', tone: 'open' },
  cerrada: { label: 'Cerrada', tone: 'full' },
  pasada: { label: 'Pasada', tone: 'muted' },
  no_disponible: { label: 'No disponible', tone: 'muted' },
}

const STATUS_ORDER: Record<Status, number> = { hoy: 0, proxima: 1, cerrada: 2, pasada: 3, no_disponible: 4 }

function statusOf(s: PollSummary, today: string): Status {
  if (s.next_date === null) return 'pasada'
  if (s.closed) return 'cerrada'
  return s.next_date === today ? 'hoy' : 'proxima'
}

function countsOf(s: PollSummary): string {
  const events = `${s.events} ${s.events === 1 ? 'evento' : 'eventos'}`
  const signups = `${s.signups} ${s.signups === 1 ? 'confirmación' : 'confirmaciones'}`
  return `${events} · ${signups}`
}

function metaOf(row: Row, offline: boolean): string {
  const s = row.summary
  if (!s) return offline ? 'Sin conexión: no se pudo cargar su estado.' : 'Esta encuesta ya no está disponible.'
  const counts = countsOf(s)
  if (row.status === 'pasada' && s.last_date) return `Última cita: ${formatDay(s.last_date)} · ${counts}`
  if (row.status === 'hoy') return `Hoy${s.next_time ? ` a las ${formatTime(s.next_time)}` : ''} · ${counts}`
  if (s.next_date) return `${formatDay(s.next_date)} · ${counts}`
  return counts
}

/** Hoy primero; después próximas, cerradas y pasadas (la más reciente arriba). */
function sortRows(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (d !== 0) return d
    if (a.status === 'pasada') return (b.summary?.last_date ?? '').localeCompare(a.summary?.last_date ?? '')
    return (a.summary?.next_date ?? '').localeCompare(b.summary?.next_date ?? '')
  })
}

export default function MyPollsPage() {
  useTitle('Tus encuestas · csspoll')

  const [saved, setSaved] = useState<SavedPoll[]>(() => savedPolls())
  const [summaries, setSummaries] = useState<PollSummary[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [importValue, setImportValue] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [dup, setDup] = useState<{ slug: string; admin_token: string } | null>(null)

  const dupRef = useRef(false)
  const importRef = useRef(false)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const load = useCallback(async () => {
    const list = savedPolls()
    setSaved(list)
    if (list.length === 0) {
      setSummaries([])
      return
    }
    try {
      const res = await api.adminSummaries(list.map((p) => p.token))
      // Título y slug al día por si se editaron desde el panel
      for (const s of res) savePoll({ token: s.token, slug: s.slug, title: s.title })
      setSummaries(res)
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Refresco suave para que los estados no se queden rancios
  useEffect(() => {
    const t = setInterval(() => void load(), 60000)
    return () => clearInterval(t)
  }, [load])

  const origin = window.location.origin
  const loaded = summaries !== null
  const offline = loadError && summaries === null
  const rows = sortRows(
    saved.map((p) => {
      const summary = summaries?.find((s) => s.token === p.token) ?? null
      const status: Status = summary ? statusOf(summary, todayISO()) : 'no_disponible'
      return { saved: p, summary, status }
    }),
  )

  async function duplicate(token: string, title: string) {
    if (dupRef.current) return
    if (!window.confirm('¿Duplicar esta encuesta con las fechas +7 días? Se crea una nueva, sin confirmaciones.')) return
    dupRef.current = true
    setDuplicating(token)
    try {
      const r = await api.adminDuplicatePoll(token, 7)
      if (r.ok) {
        savePoll({ token: r.admin_token, slug: r.slug, title })
        setDup({ slug: r.slug, admin_token: r.admin_token })
        flash('Encuesta duplicada')
        void load()
      } else {
        flash(errorMessage(r.error))
      }
    } catch {
      flash('No se pudo conectar. Inténtalo de nuevo.')
    } finally {
      dupRef.current = false
      setDuplicating(null)
    }
  }

  function remove(token: string, title: string) {
    if (window.confirm(`¿Quitar «${title}» de tu lista? No se borra nada: el enlace seguirá funcionando.`)) {
      forgetPoll(token)
      flash('Quitada de tu lista')
      void load()
    }
  }

  async function addExisting() {
    if (importRef.current) return
    const token = extractAdminToken(importValue)
    if (!token) {
      setImportError('Pega el enlace de administración completo (o solo su código).')
      return
    }
    importRef.current = true
    try {
      const res = await api.adminSummaries([token])
      if (res.length === 0) {
        setImportError('Ese enlace no corresponde a ninguna encuesta.')
        return
      }
      const s = res[0]!
      savePoll({ token: s.token, slug: s.slug, title: s.title })
      setImportValue('')
      setImportError(null)
      setAdding(false)
      flash('Encuesta añadida')
      void load()
    } catch {
      setImportError('No se pudo conectar. Inténtalo de nuevo.')
    } finally {
      importRef.current = false
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-7 font-semibold tracking-tight text-ink">Tus encuestas</h1>
          <p className="mt-1 text-sm text-ink-soft">Las que creas o gestionas, guardadas en este móvil.</p>
        </div>
        <Link to="/" className={`${toolbarButtonClass} shrink-0`}>
          <Plus className="size-3.5" aria-hidden="true" />
          Nueva
        </Link>
      </div>

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
          <p className="mt-1 text-sm text-court-700/90">
            Mismos horarios, fechas +7 días y sin confirmaciones. Estos son sus enlaces:
          </p>
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

      {offline && (
        <div className="animate-pop mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] font-medium text-amber-800">
          No se pudo cargar el estado de tus encuestas.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {!loaded && saved.length > 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-ink-faint">
            <Spinner /> Cargando…
          </div>
        ) : saved.length === 0 ? (
          <Card className="animate-pop p-5 text-center">
            <ClipboardList className="mx-auto size-8 text-ink-faint/50" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="mt-3 text-[17px] font-semibold text-ink">Aquí vivirán tus encuestas</h2>
            <p className="mx-auto mt-1 max-w-[42ch] text-sm text-ink-soft">
              Las que crees o gestiones desde este móvil se guardan solas. Si ya tenías una, añádela pegando su enlace
              de administración.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link to="/" className={`${primaryButtonClass} w-full`}>
                <Plus className="size-4" aria-hidden="true" />
                Crear una encuesta
              </Link>
              <SecondaryButton type="button" className="w-full border-dashed" onClick={() => setAdding(true)}>
                Añadir una existente
              </SecondaryButton>
            </div>
          </Card>
        ) : (
          rows.map((row) => {
            const st = STATUS_INFO[row.status]
            return (
              <Card key={row.saved.token} className="animate-pop p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[16px] font-semibold text-ink">{row.saved.title}</h2>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{metaOf(row, offline)}</p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  {row.summary && (
                    <Link
                      to={`/admin/${row.saved.token}`}
                      className={`${toolbarButtonClass} border-court-600 bg-court-50 text-court-700 hover:bg-court-100`}
                    >
                      Abrir panel
                    </Link>
                  )}
                  {row.summary && (
                    <a href={`/p/${row.summary.slug}`} target="_blank" rel="noreferrer" className={toolbarButtonClass}>
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      Ver
                    </a>
                  )}
                  {row.summary && <CopyButton text={`${origin}/p/${row.summary.slug}`} label="Copiar enlace" />}
                  {row.summary && (
                    <button
                      type="button"
                      className={toolbarButtonClass}
                      disabled={duplicating === row.saved.token}
                      onClick={() => void duplicate(row.saved.token, row.saved.title)}
                    >
                      <CalendarPlus className="size-3.5" aria-hidden="true" />
                      {duplicating === row.saved.token ? 'Duplicando…' : 'Duplicar +7 días'}
                    </button>
                  )}
                  <IconButton
                    type="button"
                    aria-label={`Quitar ${row.saved.title} de tu lista`}
                    title="Quitar de la lista"
                    onClick={() => remove(row.saved.token, row.saved.title)}
                  >
                    <X className="size-4" />
                  </IconButton>
                </div>
              </Card>
            )
          })
        )}

        {adding ? (
          <Card className="animate-pop p-4">
            <label className="block">
              <Label>Enlace de administración</Label>
              <Input
                value={importValue}
                onChange={(e) => {
                  setImportValue(e.target.value)
                  setImportError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addExisting()
                }}
                placeholder={`${origin}/admin/…`}
                autoFocus
              />
            </label>
            {importError && <p className="mt-2 text-[13px] font-medium text-red-600">{importError}</p>}
            <div className="mt-3 flex gap-2">
              <Button type="button" className="h-10 flex-1" onClick={() => void addExisting()}>
                Añadir
              </Button>
              <SecondaryButton
                type="button"
                onClick={() => {
                  setAdding(false)
                  setImportError(null)
                }}
              >
                Cancelar
              </SecondaryButton>
            </div>
          </Card>
        ) : (
          saved.length > 0 && (
            <SecondaryButton type="button" className="w-full border-dashed" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Añadir una existente
            </SecondaryButton>
          )
        )}
      </div>

      <InstallHint />
      <Toast message={toast} />
    </>
  )
}

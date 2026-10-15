import type { ReactNode } from 'react'
import type { PollEvent, Signup } from '../lib/api'
import { formatDay, formatTime } from '../lib/format'
import { Badge, Card } from './ui'

export function EventCard({
  event,
  action,
  renderExtra,
}: {
  event: PollEvent
  /** Bloque inferior (checkbox de apuntarse, botones de admin…) */
  action?: ReactNode
  /** Se dibuja junto a cada nombre (p. ej. la ✕ del admin) */
  renderExtra?: (s: Signup) => ReactNode
}) {
  const taken = event.signups.length
  const full = event.capacity !== null && taken >= event.capacity
  const pct = event.capacity === null ? 0 : Math.min(100, Math.round((taken / event.capacity) * 100))

  return (
    <Card className="animate-pop p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{formatDay(event.date)}</p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-semibold text-stone-900 tabular-nums">{formatTime(event.time)}</span>
            <span className="text-sm text-stone-600">{event.name}</span>
          </div>
        </div>
        {event.capacity === null ? (
          <Badge tone="stone">Sin límite</Badge>
        ) : full ? (
          <Badge tone="red">Completo</Badge>
        ) : (
          <Badge tone="green">
            {taken}/{event.capacity}
          </Badge>
        )}
      </div>

      {event.capacity !== null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${full ? 'bg-red-400' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {taken === 0 ? (
          <p className="text-sm text-stone-400">Nadie apuntado todavía</p>
        ) : (
          event.signups.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-sm text-stone-700"
            >
              {s.name}
              {renderExtra?.(s)}
            </span>
          ))
        )}
      </div>

      {action}
    </Card>
  )
}

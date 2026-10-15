import type { ReactNode } from 'react'
import type { PollEvent, Signup } from '../lib/api'
import { formatDay, formatTime } from '../lib/format'
import { Badge, Card } from './ui'

export function EventCard({
  event,
  showDate = true,
  action,
  renderExtra,
}: {
  event: PollEvent
  /** Oculta la fecha cuando el evento anterior es del mismo día */
  showDate?: boolean
  /** Bloque inferior (checkbox de apuntarse, botones de admin…) */
  action?: ReactNode
  /** Se dibuja junto a cada nombre (p. ej. la ✕ del admin) */
  renderExtra?: (s: Signup) => ReactNode
}) {
  const taken = event.signups.length
  const full = event.capacity !== null && taken >= event.capacity
  const pct = event.capacity === null ? 0 : Math.min(100, Math.round((taken / event.capacity) * 100))

  return (
    <Card className="animate-pop border-line/80 p-5 shadow-[0_10px_30px_rgba(25,32,27,0.04)] transition-shadow hover:shadow-[0_14px_36px_rgba(25,32,27,0.08)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showDate && <p className="text-[13px] font-medium text-ink-faint">{formatDay(event.date)}</p>}
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="tnum text-[26px] leading-8 font-semibold tracking-tight text-ink">
              {formatTime(event.time)}
            </span>
            <span className="text-[15px] font-medium text-ink-soft">{event.name}</span>
          </div>
        </div>
        {event.capacity === null ? (
          <Badge tone="neutral">Sin límite</Badge>
        ) : (
          <Badge tone={full ? 'full' : 'open'}>
            {taken}/{event.capacity}
          </Badge>
        )}
      </div>

      {event.capacity !== null && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-paper">
          <div
            className={`h-full rounded-full transition-all duration-300 ${full ? 'bg-amber-400' : 'bg-court-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {taken === 0 ? (
          <p className="text-[13px] text-ink-faint">Aún no se ha apuntado nadie</p>
        ) : (
          event.signups.map((s) => (
            <span
              key={s.id}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-paper px-2.5 text-[13px] font-medium text-ink-soft"
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

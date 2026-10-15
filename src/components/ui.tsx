import { useState, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { Check, Copy, Loader2, Volleyball } from 'lucide-react'

// ── Botones ──────────────────────────────────────────────────────────────

const buttonBase =
  'pressable inline-flex items-center justify-center gap-2 rounded-xl px-4 h-11 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-court-600 disabled:cursor-not-allowed disabled:opacity-40'

export const primaryButtonClass = `${buttonBase} bg-court-600 text-white hover:bg-court-700`
export const secondaryButtonClass = `${buttonBase} border border-line-strong bg-white font-medium text-ink hover:bg-paper`

/** Botón compacto para barras de herramientas (admin) */
export const toolbarButtonClass =
  'pressable inline-flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-white px-3 h-9 text-[13px] font-semibold text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-court-600 disabled:cursor-not-allowed disabled:opacity-40'

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${primaryButtonClass} ${className}`} {...props} />
}

export function SecondaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${secondaryButtonClass} ${className}`} {...props} />
}

export function ToolbarButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${toolbarButtonClass} ${className}`} {...props} />
}

/** Icono suelto (quitar confirmación, cerrar tarjeta…) */
export function IconButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`pressable grid size-8 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-court-600 ${className}`}
      {...props}
    />
  )
}

export function LinkButton({ className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={`${secondaryButtonClass} ${className}`} {...props} />
}

// ── Formularios ──────────────────────────────────────────────────────────

const inputBase =
  'h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-court-500 focus:ring-4 focus:ring-court-500/10 focus:outline-none'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputBase} ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputBase} h-auto py-2.5 leading-relaxed ${className}`} {...props} />
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">{children}</span>
}

// ── Contenedores ─────────────────────────────────────────────────────────

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-white ${className}`}>{children}</div>
}

const badgeTones = {
  neutral: 'bg-paper text-ink-soft',
  muted: 'bg-line/60 text-ink-soft',
  open: 'bg-court-50 text-court-700',
  full: 'bg-amber-50 text-amber-700',
} as const

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold tabular-nums ${badgeTones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Spinner() {
  return <Loader2 className="size-4 animate-spin text-ink-faint" aria-hidden="true" />
}

// ── Marca ────────────────────────────────────────────────────────────────

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-lg bg-court-600 text-white">
        <Volleyball className="size-4" strokeWidth={2.1} aria-hidden="true" />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-ink">csspoll</span>
    </span>
  )
}

export function WhatsAppIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

// ── Compartir enlaces ────────────────────────────────────────────────────

export function CopyButton({ text, label = 'Copiar', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <ToolbarButton
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          window.prompt('Copia este enlace:', text)
        }
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <Check className="size-3.5 text-court-600" /> : <Copy className="size-3.5" />}
      {copied ? 'Copiado' : label}
    </ToolbarButton>
  )
}

export function LinkRow({ label, url, hint, extra }: { label: string; url: string; hint?: string; extra?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-paper/70 p-3">
      <p className="text-[12px] font-semibold text-ink-soft">{label}</p>
      <p className="mt-1 font-mono text-[12px] leading-relaxed break-all text-ink">{url}</p>
      {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">{hint}</p>}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <CopyButton text={url} />
        {extra}
      </div>
    </div>
  )
}

export function Toast({ message, icon }: { message: string | null; icon?: ReactNode }) {
  if (!message) return null
  return (
    <div className="animate-pop fixed bottom-28 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink py-2.5 pr-4 pl-3.5 text-sm font-medium whitespace-nowrap text-white shadow-lg">
      {icon ?? <Check className="size-4 text-court-500" aria-hidden="true" />}
      {message}
    </div>
  )
}

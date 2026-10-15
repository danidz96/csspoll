import { useState, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40'

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${buttonBase} bg-emerald-600 text-white hover:bg-emerald-700 ${className}`} {...props} />
}

export const secondaryButtonClass = `${buttonBase} border border-stone-300 bg-white font-medium text-stone-700 hover:bg-stone-50`

export function SecondaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${secondaryButtonClass} ${className}`} {...props} />
}

export function LinkButton({ className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={`${secondaryButtonClass} ${className}`} {...props} />
}

const inputBase =
  'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[15px] text-stone-900 placeholder-stone-400 shadow-sm transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputBase} ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputBase} ${className}`} {...props} />
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-sm font-medium text-stone-700">{children}</span>
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`}>{children}</div>
}

const badgeTones = {
  stone: 'bg-stone-100 text-stone-600',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-700',
} as const

export function Badge({ tone = 'stone', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeTones[tone]}`}>
      {children}
    </span>
  )
}

export function Spinner() {
  return (
    <svg className="size-5 animate-spin text-stone-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
  )
}

export function CopyButton({ text, label = 'Copiar', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <SecondaryButton
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
      {copied ? '¡Copiado!' : label}
    </SecondaryButton>
  )
}

export function LinkRow({ label, url, hint, extra }: { label: string; url: string; hint?: string; extra?: ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 break-all font-mono text-xs leading-relaxed text-stone-700">{url}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <CopyButton text={url} />
        {extra}
      </div>
    </div>
  )
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="animate-pop fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium whitespace-nowrap text-white shadow-lg">
      {message}
    </div>
  )
}

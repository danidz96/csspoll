import { useEffect, useRef, useState } from 'react'
import { Plus, Share, X } from 'lucide-react'
import { Card, IconButton, primaryButtonClass } from './ui'

const DISMISS_KEY = 'csspoll.install.dismissed'

/** beforeinstallprompt no está en los tipos estándar del DOM */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Tarjeta «instala la app»: botón nativo en Android/Chrome y
 * instrucciones para Safari de iOS. Se oculta si ya está instalada.
 */
export function InstallHint() {
  const [mode, setMode] = useState<'install' | 'ios' | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const promptRef = useRef<InstallPromptEvent | null>(null)

  useEffect(() => {
    if (dismissed) return
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) return

    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
    if (isSafari) setMode('ios')

    const onPrompt = (e: Event) => {
      e.preventDefault()
      promptRef.current = e as InstallPromptEvent
      setMode('install')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [dismissed])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  async function install() {
    const ev = promptRef.current
    if (!ev) return
    await ev.prompt()
    const choice = await ev.userChoice
    promptRef.current = null
    if (choice.outcome === 'accepted') setDismissed(true)
  }

  if (dismissed || mode === null) return null

  return (
    <Card className="mt-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[15px] font-semibold text-ink">Ten csspoll a un toque</p>
          {mode === 'install' ? (
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">
              Añádela a tu pantalla de inicio para abrir tus encuestas al momento.
            </p>
          ) : (
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">
              Toca <Share className="inline size-3.5 align-[-2px]" aria-hidden="true" /> Compartir en Safari y elige
              «Añadir a pantalla de inicio».
            </p>
          )}
        </div>
        <IconButton type="button" aria-label="Descartar sugerencia" onClick={dismiss}>
          <X className="size-4" />
        </IconButton>
      </div>
      {mode === 'install' && (
        <button type="button" className={`${primaryButtonClass} mt-3 h-10 w-full`} onClick={() => void install()}>
          <Plus className="size-4" aria-hidden="true" />
          Instalar app
        </button>
      )}
    </Card>
  )
}

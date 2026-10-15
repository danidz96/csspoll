import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { ArrowUpRight, Volleyball } from 'lucide-react'
import { DEMO_HINT } from './lib/api'
import AdminPage from './pages/AdminPage'
import CreatePage from './pages/CreatePage'
import PollPage from './pages/PollPage'
import { Logo } from './components/ui'

function NotFound() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Volleyball className="size-8 text-ink-faint/50" strokeWidth={1.8} aria-hidden="true" />
      <h1 className="mt-3 text-[17px] font-semibold text-ink">Aquí no hay nada</h1>
      <p className="mt-1 max-w-[36ch] text-sm text-ink-soft">El enlace no es válido o la encuesta ya no existe.</p>
      <Link to="/" className="mt-4 text-sm font-semibold text-court-700 hover:text-court-600">
        Crear una encuesta
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh">
        <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
            <Link to="/" aria-label="csspoll — inicio" className="pressable"><Logo /></Link>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-court-100 bg-court-50 px-3 py-1.5 text-[11px] font-bold tracking-wide text-court-700 sm:inline-flex">{DEMO_HINT}</span>
              <Link to="/" className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-ink-soft">Nueva encuesta <ArrowUpRight className="size-3.5" /></Link>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl px-5 pt-8 pb-32 sm:px-8 sm:pt-14">
          <Routes>
            <Route path="/" element={<CreatePage />} />
            <Route path="/p/:slug" element={<PollPage />} />
            <Route path="/admin/:token" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

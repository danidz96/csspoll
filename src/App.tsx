import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { Volleyball } from 'lucide-react'
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
        <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-md items-center px-4 py-3 sm:max-w-xl">
            <Link to="/" aria-label="csspoll — inicio" className="pressable">
              <Logo />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-md px-4 pt-5 pb-28 sm:max-w-xl">
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

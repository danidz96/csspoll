import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import CreatePage from './pages/CreatePage'
import PollPage from './pages/PollPage'

function NotFound() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
      <p className="text-3xl">🏐</p>
      <h1 className="mt-2 text-lg font-bold text-stone-900">Aquí no hay nada</h1>
      <p className="mt-1 text-sm text-stone-600">El enlace no es válido o la encuesta ya no existe.</p>
      <Link className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-800" to="/">
        Crear una encuesta nueva →
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh">
        <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3 sm:max-w-xl">
            <Link to="/" className="text-lg font-extrabold tracking-tight text-stone-900">
              csspoll<span className="text-emerald-600">.</span>
            </Link>
            <span className="text-xs text-stone-400">apuntes de grupo, sin registros</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28 sm:max-w-xl">
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

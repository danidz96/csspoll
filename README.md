# csspoll

Encuestas de asistencia para grupos, **sin registros**. Pensada para quedadas con varios turnos y aforo limitado (por ejemplo, vóley un jueves a las 20:00, 21:30 y 23:00).

Producción: **https://csspoll.vercel.app**

## Qué hace

- Creas una encuesta con **varios eventos** (día + hora), cada uno con **plazas** o **sin límite**.
- Te devuelve **2 enlaces**: el **público** (el grupo confirma su asistencia solo escribiendo su nombre) y el de **administración** (gestionas la encuesta). El token de admin es la llave: no se puede recuperar.
- **«Tus encuestas»** (`/admin`): tu dispositivo recuerda las encuestas que creas o gestionas, con su estado (**Hoy / Próxima / Cerrada / Pasada**), contadores y accesos directos (panel, pública, copiar enlace, **duplicar +7 días**, quitar de la lista). Se añaden solas al crear, al duplicar y al abrir cualquier enlace de admin; también puedes pegarlas para añadirlas.
- **Instalable como app (PWA)**: desde el móvil puedes añadirla a tu pantalla de inicio y abrirla a pantalla completa con su propio icono (botón nativo en Android/Chrome; «Añadir a pantalla de inicio» en Safari de iOS).
- El **aforo nunca se supera**: cuando un evento se llena queda "Completo" y no admite más confirmaciones.
- Los **nombres son visibles** para todos y la página pública se **refresca sola** cada 10 s.
- Sin cuentas ni contraseñas: cada navegador recuerda el nombre y sus confirmaciones, y puede cambiarlos o quitarlos.
- El admin puede editar/añadir/borrar eventos, quitar confirmaciones, cerrar y reabrir las inscripciones, y **duplicar la encuesta +7 días** (para repetir la semana siguiente sin teclear nada).

## Stack

Vite · React 19 · TypeScript · Tailwind v4 · react-router-dom · Supabase (Postgres + RPC) · vite-plugin-pwa.

## Cómo funciona por dentro

- **Backend**: Supabase. Las tablas `polls`, `events` y `signups` están **cerradas** al público (RLS sin políticas + `revoke`): todo el acceso pasa por funciones RPC `security definer` definidas en [`supabase/migrations/`](supabase/migrations).
- **Aforo atómico**: `join_events` bloquea las filas de los eventos con `SELECT ... FOR UPDATE` (orden estable) antes de contar, así dos personas no pueden pillar la última plaza a la vez.
- **Identidad sin login**: un UUID por dispositivo guardado en `localStorage`, que se almacena en `signups.device_id` (único por evento). `join_events` reconcilia altas, bajas y cambios de nombre en una sola llamada.
- **Lista del admin sin login**: `/admin` guarda `{token, slug, título}` de tus encuestas en el `localStorage` del dispositivo y pide su resumen con la RPC `admin_summaries` (si borras los datos del navegador, la lista se pierde; los enlaces siguen funcionando).
- **PWA**: `vite-plugin-pwa` genera el manifest y un service worker que precachea la app (shell y estáticos). Las llamadas a Supabase no se cachean: los datos van siempre en vivo.
- **Slug público**: 12 caracteres hex aleatorios. **Token de admin**: 32 caracteres hex aleatorios.

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local   # rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
pnpm dev
```

Scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm preview`.

Iconos de la PWA (se regeneran desde el logo con `sharp`):

```bash
node scripts/gen-icons.mjs
```

## Despliegue

Producción en **Vercel** (`main` → Production). La rama **`develop`** genera despliegues de **Preview** automáticos en cada push, para revisar antes de mergear. Vercel tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas en los entornos **Production** y **Preview**. El fallback de rutas SPA está en [`vercel.json`](vercel.json).

```bash
git push origin develop        # preview
git checkout main && git merge develop && git push origin main   # producción
```

## Estructura

| Ruta | Qué es |
| --- | --- |
| `src/pages/CreatePage.tsx` | Crear la encuesta (`/`) |
| `src/pages/PollPage.tsx` | Página pública donde el grupo confirma (`/p/:slug`) |
| `src/pages/MyPollsPage.tsx` | «Tus encuestas»: lista del admin (`/admin`) |
| `src/pages/AdminPage.tsx` | Panel de administración de una encuesta (`/admin/:token`) |
| `src/lib/api.ts` | Envoltorios tipados de las RPC y mensajes de error en español |
| `src/lib/identity.ts` | Identidad por dispositivo (localStorage) |
| `src/lib/mypolls.ts` | Encuestas guardadas del admin (localStorage) |
| `src/components/` | Piezas de UI reutilizables |
| `supabase/migrations/` | Esquema de la base de datos y funciones RPC |

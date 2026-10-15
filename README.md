# csspoll

Encuestas de apuntes para grupos, **sin registros**. Pensada para quedadas con varios turnos y aforo limitado (por ejemplo, vóley un jueves a las 20:00, 21:30 y 23:00).

Producción: **https://csspoll.vercel.app**

## Qué hace

- Creas una encuesta con **varios eventos** (día + hora), cada uno con **plazas** o **sin límite**.
- Te devuelve **2 enlaces**: el **público** (el grupo se apunta solo escribiendo su nombre) y el de **administración** (gestionas la encuesta). El token de admin es la llave: no se puede recuperar.
- El **aforo nunca se supera**: cuando un evento se llena queda "Completo" y no admite más apuntes.
- Los **nombres son visibles** para todos y la página pública se **refresca sola** cada 10 s.
- Sin cuentas ni contraseñas: cada navegador recuerda el nombre y sus apuntes, y puede cambiarlos o quitarlos.
- El admin puede editar/añadir/borrar eventos, quitar apuntes, cerrar y reabrir las inscripciones, y **duplicar la encuesta +7 días** (para repetir la semana siguiente sin teclear nada).

## Stack

Vite · React 19 · TypeScript · Tailwind v4 · react-router-dom · Supabase (Postgres + RPC).

## Cómo funciona por dentro

- **Backend**: Supabase. Las tablas `polls`, `events` y `signups` están **cerradas** al público (RLS sin políticas + `revoke`): todo el acceso pasa por funciones RPC `security definer` definidas en [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
- **Aforo atómico**: `join_events` bloquea las filas de los eventos con `SELECT ... FOR UPDATE` (orden estable) antes de contar, así dos personas no pueden pillar la última plaza a la vez.
- **Identidad sin login**: un UUID por dispositivo guardado en `localStorage`, que se almacena en `signups.device_id` (único por evento). `join_events` reconcilia altas, bajas y cambios de nombre en una sola llamada.
- **Slug público**: 12 caracteres hex aleatorios. **Token de admin**: 32 caracteres hex aleatorios.

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local   # rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
pnpm dev
```

Scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm preview`.

## Despliegue

Producción en **Vercel**. El repositorio está conectado, así que **cada push a `main` despliega solo**. Para desplegar a mano desde la raíz del proyecto:

```bash
npx vercel --prod --yes
```

Variables de entorno (entorno *Production* en Vercel): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. El fallback de rutas SPA está en [`vercel.json`](vercel.json).

## Estructura

| Ruta | Qué es |
| --- | --- |
| `src/pages/CreatePage.tsx` | Crear la encuesta (`/`) |
| `src/pages/PollPage.tsx` | Página pública donde se apunta la gente (`/p/:slug`) |
| `src/pages/AdminPage.tsx` | Panel de administración (`/admin/:token`) |
| `src/lib/api.ts` | Envoltorios tipados de las RPC y mensajes de error en español |
| `src/lib/identity.ts` | Identidad por dispositivo (localStorage) |
| `src/components/` | Piezas de UI reutilizables |
| `supabase/migrations/0001_init.sql` | Esquema de la base de datos y funciones RPC |

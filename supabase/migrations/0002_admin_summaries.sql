-- ============================================================
-- csspoll · 0002: RPC para el panel "Tus encuestas"
-- Devuelve, para una lista de admin_tokens, un resumen de cada
-- encuesta (próxima cita, última cita, nº de eventos y de
-- confirmaciones) con el que la lista pinta su estado.
-- Aditiva: no toca nada de lo existente.
-- ============================================================

create or replace function public.admin_summaries(p_tokens text[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with polls as (
    select *
    from public.polls
    where admin_token = any (coalesce(p_tokens, '{}'::text[]))
    limit 100
  ),
  ev as (
    select
      e.poll_id,
      count(*)::int as events_count,
      min(e.event_date) filter (where e.event_date >= current_date) as next_date,
      max(e.event_date) as last_date
    from public.events e
    group by e.poll_id
  ),
  s as (
    select e.poll_id, count(sg.id)::int as signups_count
    from public.events e
    left join public.signups sg on sg.event_id = e.id
    group by e.poll_id
  ),
  next_t as (
    select distinct on (e.poll_id) e.poll_id, e.start_time as next_time
    from public.events e
    join ev on ev.poll_id = e.poll_id
    where ev.next_date is not null and e.event_date = ev.next_date
    order by e.poll_id, e.start_time
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'token', p.admin_token,
    'slug', p.public_slug,
    'title', p.title,
    'closed', p.closed,
    'created_at', p.created_at,
    'events', coalesce(ev.events_count, 0),
    'signups', coalesce(s.signups_count, 0),
    'next_date', ev.next_date,
    'next_time', nt.next_time,
    'last_date', ev.last_date
  )), '[]'::jsonb)
  from polls p
  left join ev on ev.poll_id = p.id
  left join s on s.poll_id = p.id
  left join next_t nt on nt.poll_id = p.id;
$$;

revoke execute on function public.admin_summaries(text[]) from public, anon, authenticated;
grant execute on function public.admin_summaries(text[]) to anon, authenticated;

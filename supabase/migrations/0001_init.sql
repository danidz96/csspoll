-- ============================================================
-- csspoll · esquema inicial
-- Tablas cerradas (RLS activo, sin políticas): TODO el acceso
-- pasa por funciones RPC SECURITY DEFINER. Sin login: el token
-- de admin y los slugs aleatorios son las llaves.
-- ============================================================

-- ── Tablas ──────────────────────────────────────────────────

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  public_slug text not null unique,
  admin_token text not null unique,
  title text not null,
  description text,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  name text not null,
  event_date date not null,
  start_time time not null,
  capacity integer check (capacity is null or capacity > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index events_poll_id_idx on public.events (poll_id);

create table public.signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  device_id text not null,
  created_at timestamptz not null default now(),
  constraint signups_event_device_key unique (event_id, device_id)
);

-- ── Seguridad de tablas ─────────────────────────────────────
-- Nadie lee/escribe tablas directamente: solo las funciones.

alter table public.polls enable row level security;
alter table public.events enable row level security;
alter table public.signups enable row level security;

revoke all on public.polls from anon, authenticated;
revoke all on public.events from anon, authenticated;
revoke all on public.signups from anon, authenticated;

-- ── Funciones RPC ───────────────────────────────────────────

-- Crear encuesta (p_events: [{name, date "YYYY-MM-DD", time "HH:MM", capacity|null}])
create or replace function public.create_poll(
  p_title text,
  p_description text,
  p_events jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_desc text := nullif(trim(coalesce(p_description, '')), '');
  v_poll public.polls;
  v_ev jsonb;
  v_nm text;
  v_dt text;
  v_tm text;
  v_cp text;
  v_i int := 0;
begin
  if v_title = '' or length(v_title) > 80 then
    return jsonb_build_object('ok', false, 'error', 'invalid_title');
  end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array'
     or jsonb_array_length(p_events) = 0 or jsonb_array_length(p_events) > 20 then
    return jsonb_build_object('ok', false, 'error', 'invalid_events');
  end if;

  -- Validar TODOS los eventos antes de crear nada
  for v_ev in select * from jsonb_array_elements(p_events) loop
    if jsonb_typeof(v_ev) <> 'object' then
      return jsonb_build_object('ok', false, 'error', 'invalid_events');
    end if;
    v_nm := trim(coalesce(v_ev ->> 'name', ''));
    v_dt := coalesce(v_ev ->> 'date', '');
    v_tm := coalesce(v_ev ->> 'time', '');
    v_cp := nullif(trim(coalesce(v_ev ->> 'capacity', '')), '');
    if v_nm = '' or length(v_nm) > 80
       or v_dt !~ '^\d{4}-\d{2}-\d{2}$'
       or v_tm !~ '^\d{2}:\d{2}(:\d{2})?$'
       or (v_cp is not null and (v_cp !~ '^\d{1,4}$' or v_cp::int = 0)) then
      return jsonb_build_object('ok', false, 'error', 'invalid_events');
    end if;
  end loop;

  insert into public.polls (public_slug, admin_token, title, description)
  values (
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    replace(gen_random_uuid()::text, '-', ''),
    v_title,
    v_desc
  )
  returning * into v_poll;

  for v_ev in select * from jsonb_array_elements(p_events) loop
    insert into public.events (poll_id, name, event_date, start_time, capacity, sort_order)
    values (
      v_poll.id,
      trim(v_ev ->> 'name'),
      (v_ev ->> 'date')::date,
      (v_ev ->> 'time')::time,
      nullif(v_ev ->> 'capacity', '')::integer,
      v_i
    );
    v_i := v_i + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'slug', v_poll.public_slug,
    'admin_token', v_poll.admin_token
  );
end;
$$;

-- Leer una encuesta por slug (para la página pública)
create or replace function public.get_poll(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'description', p.description,
    'closed', p.closed,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'date', e.event_date,
        'time', e.start_time,
        'capacity', e.capacity,
        'signups', coalesce((
          select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name)
                           order by s.created_at, s.name)
          from public.signups s
          where s.event_id = e.id
        ), '[]'::jsonb)
      ) order by e.sort_order, e.start_time, e.name)
      from public.events e
      where e.poll_id = p.id
    ), '[]'::jsonb)
  )
  from public.polls p
  where p.public_slug = p_slug;
$$;

-- Apuntarse / actualizar apuntes (reconcilia por device: añade, quita y renombra)
create or replace function public.join_events(
  p_slug text,
  p_name text,
  p_device_id text,
  p_event_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls;
  v_name text := trim(coalesce(p_name, ''));
  v_ids uuid[];
  v_n int;
  v_full jsonb := '[]'::jsonb;
  r record;
begin
  if v_name = '' or length(v_name) > 40 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;
  if p_device_id is null or length(p_device_id) < 8 or length(p_device_id) > 64 then
    return jsonb_build_object('ok', false, 'error', 'invalid_device');
  end if;

  select * into v_poll from public.polls where public_slug = p_slug;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_poll.closed then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  -- Normalizar (sin duplicados) y validar que todos los eventos son de esta encuesta
  select coalesce(array_agg(distinct x), '{}'::uuid[]) into v_ids
  from unnest(coalesce(p_event_ids, '{}'::uuid[])) as x;

  select count(*) into v_n
  from public.events
  where poll_id = v_poll.id and id = any (v_ids);
  if v_n <> coalesce(array_length(v_ids, 1), 0) then
    return jsonb_build_object('ok', false, 'error', 'invalid_events');
  end if;

  -- Bloquear los eventos seleccionados en orden estable: aforo atómico, sin carreras
  perform 1
  from public.events
  where id = any (v_ids)
  order by id
  for update;

  for r in
    select e.name, e.capacity,
           (select count(*)
            from public.signups s
            where s.event_id = e.id and s.device_id <> p_device_id) as taken
    from public.events e
    where e.id = any (v_ids)
  loop
    if r.capacity is not null and r.taken >= r.capacity then
      v_full := v_full || to_jsonb(r.name);
    end if;
  end loop;

  if jsonb_array_length(v_full) > 0 then
    return jsonb_build_object('ok', false, 'error', 'events_full', 'full', v_full);
  end if;

  -- Reconciliar: borrar los apuntes de este dispositivo que ya no se seleccionan…
  delete from public.signups s
  using public.events e
  where s.event_id = e.id
    and e.poll_id = v_poll.id
    and s.device_id = p_device_id
    and not (e.id = any (v_ids));

  -- …y crear/actualizar los seleccionados
  insert into public.signups (event_id, name, device_id)
  select id, v_name, p_device_id
  from unnest(v_ids) as id
  on conflict (event_id, device_id) do update set name = excluded.name;

  return jsonb_build_object('ok', true, 'poll', public.get_poll(p_slug));
end;
$$;

-- ── Administración (token = llave) ──────────────────────────

create or replace function public.admin_get(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_poll public.polls;
begin
  select * into v_poll from public.polls where admin_token = p_token;
  if not found then
    return null;
  end if;
  return public.get_poll(v_poll.public_slug)
         || jsonb_build_object('slug', v_poll.public_slug);
end;
$$;

create or replace function public.admin_update_poll(
  p_token text,
  p_title text,
  p_description text,
  p_closed boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  update public.polls
     set title = coalesce(nullif(trim(p_title), ''), title),
         description = case when p_description is null then description
                            else nullif(trim(p_description), '') end,
         closed = coalesce(p_closed, closed)
   where admin_token = p_token;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_save_event(
  p_token text,
  p_event_id uuid,
  p_name text,
  p_date date,
  p_time time,
  p_capacity integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls;
  v_id uuid;
  v_name text := trim(coalesce(p_name, ''));
begin
  select * into v_poll from public.polls where admin_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_name = '' or length(v_name) > 80 or p_date is null or p_time is null
     or (p_capacity is not null and p_capacity <= 0) then
    return jsonb_build_object('ok', false, 'error', 'invalid_event');
  end if;

  if p_event_id is null then
    insert into public.events (poll_id, name, event_date, start_time, capacity, sort_order)
    values (
      v_poll.id, v_name, p_date, p_time, p_capacity,
      coalesce((select max(sort_order) + 1 from public.events where poll_id = v_poll.id), 0)
    )
    returning id into v_id;
  else
    update public.events
       set name = v_name, event_date = p_date, start_time = p_time, capacity = p_capacity
     where id = p_event_id and poll_id = v_poll.id
    returning id into v_id;
    if v_id is null then
      return jsonb_build_object('ok', false, 'error', 'event_not_found');
    end if;
  end if;

  return jsonb_build_object('ok', true, 'event_id', v_id);
end;
$$;

create or replace function public.admin_delete_event(
  p_token text,
  p_event_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls;
  v_total int;
begin
  select * into v_poll from public.polls where admin_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  select count(*) into v_total from public.events where poll_id = v_poll.id;
  if v_total <= 1 then
    return jsonb_build_object('ok', false, 'error', 'last_event');
  end if;
  delete from public.events where id = p_event_id and poll_id = v_poll.id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'event_not_found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_remove_signup(
  p_token text,
  p_signup_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.signups s
  using public.events e, public.polls p
  where s.id = p_signup_id
    and s.event_id = e.id
    and e.poll_id = p.id
    and p.admin_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Duplicar con fechas desplazadas (por defecto +7 días) — para repetir la semana siguiente
create or replace function public.admin_duplicate_poll(
  p_token text,
  p_shift_days integer default 7
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src public.polls;
  v_new public.polls;
  v_shift int := greatest(0, least(90, coalesce(p_shift_days, 7)));
begin
  select * into v_src from public.polls where admin_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  insert into public.polls (public_slug, admin_token, title, description)
  values (
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    replace(gen_random_uuid()::text, '-', ''),
    v_src.title,
    v_src.description
  )
  returning * into v_new;

  insert into public.events (poll_id, name, event_date, start_time, capacity, sort_order)
  select v_new.id, name, event_date + v_shift, start_time, capacity, sort_order
  from public.events
  where poll_id = v_src.id;

  return jsonb_build_object(
    'ok', true,
    'slug', v_new.public_slug,
    'admin_token', v_new.admin_token
  );
end;
$$;

-- ── Permisos de ejecución ───────────────────────────────────

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.create_poll(text, text, jsonb) to anon, authenticated;
grant execute on function public.get_poll(text) to anon, authenticated;
grant execute on function public.join_events(text, text, text, uuid[]) to anon, authenticated;
grant execute on function public.admin_get(text) to anon, authenticated;
grant execute on function public.admin_update_poll(text, text, text, boolean) to anon, authenticated;
grant execute on function public.admin_save_event(text, uuid, text, date, time, integer) to anon, authenticated;
grant execute on function public.admin_delete_event(text, uuid) to anon, authenticated;
grant execute on function public.admin_remove_signup(text, uuid) to anon, authenticated;
grant execute on function public.admin_duplicate_poll(text, integer) to anon, authenticated;

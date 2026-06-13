-- ============================================================
-- MULTI EVENT LITE
-- One active event per user + unlimited archived events
-- Run after your existing setup / RSVP migrations
-- ============================================================

create extension if not exists pgcrypto;

-- 1. Events: archived state + one active event per owner
alter table public.events
  add column if not exists archived_at timestamptz;

create index if not exists events_owner_archived_idx
  on public.events(owner_user_id, archived_at);

drop index if exists events_owner_single_active_idx;
create unique index events_owner_single_active_idx
  on public.events(owner_user_id)
  where archived_at is null;

-- 2. Guests belong to an event
alter table public.guests
  add column if not exists event_id uuid references public.events(id) on delete cascade;

create index if not exists guests_event_id_idx
  on public.guests(event_id);

-- Ensure every user with guests has at least one active event
insert into public.events (owner_user_id, event_name, public_slug, is_public, theme_color, archived_at)
select distinct
  g.user_id,
  'האירוע שלי',
  concat('event-', substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
  false,
  '#C9A84C',
  null
from public.guests g
where not exists (
  select 1
  from public.events e
  where e.owner_user_id = g.user_id
    and e.archived_at is null
);

-- Backfill guests.event_id to the current active event
update public.guests g
set event_id = e.id
from public.events e
where g.event_id is null
  and e.owner_user_id = g.user_id
  and e.archived_at is null;

alter table public.guests
  alter column event_id set not null;

alter table public.guests
  drop constraint if exists guests_user_id_phone_key;

alter table public.guests
  drop constraint if exists guests_event_id_phone_key;

alter table public.guests
  add constraint guests_event_id_phone_key unique (event_id, phone);

-- 3. Refresh guest RLS to enforce event ownership
alter table public.guests enable row level security;

drop policy if exists "Users can view their own guests" on public.guests;
drop policy if exists "Users can insert their own guests" on public.guests;
drop policy if exists "Users can update their own guests" on public.guests;
drop policy if exists "Users can delete their own guests" on public.guests;

create policy "Users can view their own guests"
  on public.guests
  for select
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.events e
      where e.id = guests.event_id
        and e.owner_user_id = auth.uid()
    )
  );

create policy "Users can insert their own guests"
  on public.guests
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.events e
      where e.id = guests.event_id
        and e.owner_user_id = auth.uid()
    )
  );

create policy "Users can update their own guests"
  on public.guests
  for update
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.events e
      where e.id = guests.event_id
        and e.owner_user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.events e
      where e.id = guests.event_id
        and e.owner_user_id = auth.uid()
    )
  );

create policy "Users can delete their own guests"
  on public.guests
  for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.events e
      where e.id = guests.event_id
        and e.owner_user_id = auth.uid()
    )
  );

-- 4. Public RSVP event page: never 404 when public RSVP is disabled
create or replace function public.get_public_event(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  select *
  into v
  from public.events
  where public_slug = p_slug
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v.archived_at is not null or not coalesce(v.is_public, false) then
    return jsonb_build_object('success', false, 'error', 'not_public', 'event_name', v.event_name);
  end if;

  return jsonb_build_object(
    'success', true,
    'event', jsonb_build_object(
      'id', v.id,
      'owner_user_id', v.owner_user_id,
      'event_name', v.event_name,
      'event_date', v.event_date,
      'venue_name', v.venue_name,
      'venue_address', v.venue_address,
      'description', v.description,
      'cover_image_url', v.cover_image_url,
      'theme_color', v.theme_color,
      'archived_at', v.archived_at
    )
  );
end;
$$;

-- 5. Public RSVP writes guests into the correct event
create or replace function public.public_rsvp_register(
  p_slug text,
  p_full_name text,
  p_phone text,
  p_status text default 'CONFIRMED',
  p_companions int default 0,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_guest record;
  v_token text;
begin
  select *
  into v_event
  from public.events
  where public_slug = p_slug
    and coalesce(is_public, false) = true
    and archived_at is null
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'event_not_found');
  end if;

  if p_full_name is null or trim(p_full_name) = '' then
    return jsonb_build_object('success', false, 'error', 'name_required');
  end if;

  if p_phone is null or trim(p_phone) = '' then
    return jsonb_build_object('success', false, 'error', 'phone_required');
  end if;

  if p_status not in ('CONFIRMED', 'DECLINED') then
    return jsonb_build_object('success', false, 'error', 'invalid_status');
  end if;

  v_token := gen_random_uuid()::text;

  select *
  into v_guest
  from public.guests
  where event_id = v_event.id
    and phone = p_phone
  limit 1;

  if found then
    update public.guests
    set
      full_name = p_full_name,
      rsvp_status = p_status,
      companions = coalesce(p_companions, 0),
      rsvp_public_note = p_note,
      rsvp_via_link = true,
      rsvp_responded_at = now()
    where id = v_guest.id
    returning * into v_guest;
  else
    insert into public.guests (
      user_id,
      event_id,
      full_name,
      phone,
      rsvp_status,
      companions,
      category,
      rsvp_public_note,
      rsvp_via_link,
      rsvp_responded_at,
      rsvp_token
    )
    values (
      v_event.owner_user_id,
      v_event.id,
      p_full_name,
      p_phone,
      p_status,
      coalesce(p_companions, 0),
      'OTHER',
      p_note,
      true,
      now(),
      v_token
    )
    returning * into v_guest;
  end if;

  return jsonb_build_object(
    'success', true,
    'guest_name', v_guest.full_name,
    'status', v_guest.rsvp_status,
    'rsvp_token', v_guest.rsvp_token
  );
end;
$$;

-- 6. Personal RSVP token always resolves through guest.event_id
create or replace function public.get_guest_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest record;
begin
  select
    g.id,
    g.event_id,
    g.full_name,
    g.rsvp_status,
    g.companions,
    g.rsvp_via_link,
    g.rsvp_responded_at,
    e.event_name,
    e.event_date,
    e.venue_name,
    e.venue_address,
    e.cover_image_url
  into v_guest
  from public.guests g
  left join public.events e
    on e.id = g.event_id
  where g.rsvp_token = p_token
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_guest.event_id is null then
    return jsonb_build_object('success', false, 'error', 'guest_unavailable');
  end if;

  return jsonb_build_object(
    'success', true,
    'guest', jsonb_build_object(
      'id', v_guest.id,
      'event_id', v_guest.event_id,
      'full_name', v_guest.full_name,
      'rsvp_status', v_guest.rsvp_status,
      'companions', v_guest.companions,
      'rsvp_via_link', v_guest.rsvp_via_link,
      'rsvp_responded_at', v_guest.rsvp_responded_at,
      'event_name', v_guest.event_name,
      'event_date', v_guest.event_date,
      'venue_name', v_guest.venue_name,
      'venue_address', v_guest.venue_address,
      'cover_image_url', v_guest.cover_image_url
    )
  );
exception
  when others then
    return jsonb_build_object('success', false, 'error', 'general_error');
end;
$$;

-- 7. Create/switch/archive active event
create or replace function public.create_event_lite(p_user_id uuid, p_event_name text default 'אירוע חדש')
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'unauthorized';
  end if;

  update public.events
  set archived_at = now()
  where owner_user_id = p_user_id
    and archived_at is null;

  insert into public.events (
    owner_user_id,
    event_name,
    public_slug,
    is_public,
    theme_color,
    archived_at
  )
  values (
    p_user_id,
    coalesce(nullif(trim(p_event_name), ''), 'אירוע חדש'),
    concat('event-', substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
    false,
    '#C9A84C',
    null
  )
  returning * into v_event;

  return v_event;
end;
$$;

create or replace function public.set_active_event_lite(p_user_id uuid, p_event_id uuid)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'unauthorized';
  end if;

  select *
  into v_event
  from public.events
  where id = p_event_id
    and owner_user_id = p_user_id
  limit 1;

  if not found then
    raise exception 'event_not_found';
  end if;

  update public.events
  set archived_at = now()
  where owner_user_id = p_user_id
    and archived_at is null
    and id <> p_event_id;

  update public.events
  set archived_at = null
  where id = p_event_id
  returning * into v_event;

  return v_event;
end;
$$;

create or replace function public.archive_event_lite(p_user_id uuid, p_event_id uuid)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next public.events;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'unauthorized';
  end if;

  update public.events
  set archived_at = now()
  where id = p_event_id
    and owner_user_id = p_user_id;

  select *
  into v_next
  from public.events
  where owner_user_id = p_user_id
    and id <> p_event_id
  order by archived_at desc nulls first, updated_at desc
  limit 1;

  if found then
    update public.events
    set archived_at = null
    where id = v_next.id
    returning * into v_next;

    return v_next;
  end if;

  insert into public.events (
    owner_user_id,
    event_name,
    public_slug,
    is_public,
    theme_color,
    archived_at
  )
  values (
    p_user_id,
    'האירוע שלי',
    concat('event-', substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
    false,
    '#C9A84C',
    null
  )
  returning * into v_next;

  return v_next;
end;
$$;

grant execute on function public.get_public_event(text) to anon, authenticated;
grant execute on function public.public_rsvp_register(text, text, text, text, int, text) to anon, authenticated;
grant execute on function public.get_guest_by_token(text) to anon, authenticated;
grant execute on function public.create_event_lite(uuid, text) to authenticated;
grant execute on function public.set_active_event_lite(uuid, uuid) to authenticated;
grant execute on function public.archive_event_lite(uuid, uuid) to authenticated;

-- ============================================================
-- Done
-- ============================================================

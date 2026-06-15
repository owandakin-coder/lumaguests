-- ============================================================
-- EVENT SHARING — Luma Guests
-- Allows bride + groom to co-manage one event with separate accounts.
-- Run in Supabase SQL Editor AFTER RSVP_CUTOFF.sql
-- ============================================================

-- 1. event_collaborators table
create table if not exists public.event_collaborators (
  event_id  uuid not null references public.events(id)    on delete cascade,
  user_id   uuid not null references auth.users(id)       on delete cascade,
  added_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_collaborators enable row level security;

-- Only the collaborator themselves and the event owner may read rows
create policy "event_collaborators_select"
  on public.event_collaborators for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.events
      where id = event_collaborators.event_id
        and owner_user_id = auth.uid()
    )
  );

-- Only the event owner may insert (via the invite function, SECURITY DEFINER)
-- Direct client inserts are blocked — use invite_event_collaborator()
create policy "event_collaborators_insert_owner"
  on public.event_collaborators for insert
  with check (
    exists (
      select 1 from public.events
      where id = event_collaborators.event_id
        and owner_user_id = auth.uid()
    )
  );

-- Only the event owner may delete
create policy "event_collaborators_delete_owner"
  on public.event_collaborators for delete
  using (
    exists (
      select 1 from public.events
      where id = event_collaborators.event_id
        and owner_user_id = auth.uid()
    )
  );

-- ── 2. RLS: events — collaborators may READ the shared event ──────────────────

create policy "events_collab_select"
  on public.events for select
  using (
    exists (
      select 1 from public.event_collaborators
      where event_collaborators.event_id = events.id
        and event_collaborators.user_id  = auth.uid()
    )
  );

-- ── 3. RLS: guests — collaborators get full CRUD on the shared event's guests ─

-- SELECT
create policy "guests_collab_select"
  on public.guests for select
  using (
    exists (
      select 1 from public.event_collaborators ec
      where ec.event_id = guests.event_id
        and ec.user_id  = auth.uid()
    )
  );

-- INSERT — collaborator must set user_id = event owner's user_id
create policy "guests_collab_insert"
  on public.guests for insert
  with check (
    exists (
      select 1
        from public.event_collaborators ec
        join public.events e on e.id = ec.event_id
       where ec.event_id    = guests.event_id
         and ec.user_id     = auth.uid()
         and e.owner_user_id = guests.user_id
    )
  );

-- UPDATE
create policy "guests_collab_update"
  on public.guests for update
  using (
    exists (
      select 1 from public.event_collaborators ec
      where ec.event_id = guests.event_id
        and ec.user_id  = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.event_collaborators ec
      where ec.event_id = guests.event_id
        and ec.user_id  = auth.uid()
    )
  );

-- DELETE
create policy "guests_collab_delete"
  on public.guests for delete
  using (
    exists (
      select 1 from public.event_collaborators ec
      where ec.event_id = guests.event_id
        and ec.user_id  = auth.uid()
    )
  );

-- ── 4. SECURITY DEFINER functions ────────────────────────────────────────────

-- Invite a user by email to co-manage the event
create or replace function public.invite_event_collaborator(
  p_event_id  uuid,
  p_email     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id      uuid := auth.uid();
  v_target_user_id uuid;
begin
  -- Caller must own the event
  if not exists (
    select 1 from public.events
    where id = p_event_id and owner_user_id = v_caller_id
  ) then
    return jsonb_build_object('success', false, 'error', 'not_owner');
  end if;

  -- Find invited user by email (requires SECURITY DEFINER to read auth.users)
  select id into v_target_user_id
  from auth.users
  where email = lower(trim(p_email))
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  -- Can't invite yourself
  if v_target_user_id = v_caller_id then
    return jsonb_build_object('success', false, 'error', 'cannot_invite_self');
  end if;

  -- Insert; ignore duplicate
  insert into public.event_collaborators (event_id, user_id)
  values (p_event_id, v_target_user_id)
  on conflict (event_id, user_id) do nothing;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.invite_event_collaborator(uuid, text) to authenticated;

-- List collaborators for an event (returns email addresses)
create or replace function public.get_event_collaborators(
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_result    jsonb;
begin
  -- Must be owner or collaborator
  if not exists (
    select 1 from public.events where id = p_event_id and owner_user_id = v_caller_id
  ) and not exists (
    select 1 from public.event_collaborators where event_id = p_event_id and user_id = v_caller_id
  ) then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id',  ec.user_id,
        'email',    au.email,
        'added_at', ec.added_at
      )
      order by ec.added_at
    ),
    '[]'::jsonb
  )
  into v_result
  from public.event_collaborators ec
  join auth.users au on au.id = ec.user_id
  where ec.event_id = p_event_id;

  return v_result;
end;
$$;

grant execute on function public.get_event_collaborators(uuid) to authenticated;

-- Remove a collaborator from the event
create or replace function public.remove_event_collaborator(
  p_event_id uuid,
  p_user_id  uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
begin
  if not exists (
    select 1 from public.events where id = p_event_id and owner_user_id = v_caller_id
  ) then
    return jsonb_build_object('success', false, 'error', 'not_owner');
  end if;

  delete from public.event_collaborators
  where event_id = p_event_id and user_id = p_user_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.remove_event_collaborator(uuid, uuid) to authenticated;

-- ============================================================
-- Done.
-- New behaviour:
--   • Owner invites collaborator by email → both manage the same guest list
--   • Collaborators see & edit all guests; cannot archive/delete the event
--   • All new guests (by collaborator) are stored with user_id = owner_user_id
-- ============================================================

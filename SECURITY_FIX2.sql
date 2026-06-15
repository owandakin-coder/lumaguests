-- ============================================================
-- SECURITY_FIX2.sql
-- Run in Supabase SQL Editor
--
-- Fixes:
--   1. get_public_event  → remove owner_user_id from public response
--   2. respond_to_rsvp   → block RSVPs on archived events
--   3. set_active_event_lite → add owner check to final UPDATE
-- ============================================================

-- 1. get_public_event: remove owner_user_id from public output
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
      'id',              v.id,
      'event_name',      v.event_name,
      'event_date',      v.event_date,
      'venue_name',      v.venue_name,
      'venue_address',   v.venue_address,
      'description',     v.description,
      'cover_image_url', v.cover_image_url,
      'theme_color',     v.theme_color
    )
  );
end;
$$;

-- 2. respond_to_rsvp: block archived events
create or replace function public.respond_to_rsvp(
  p_token text,
  p_status text,
  p_companions integer default null,
  p_note text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id          uuid;
  v_name        text;
  v_event_date  date;
  v_archived_at timestamptz;
begin
  select g.id, g.full_name, e.event_date::date, e.archived_at
  into v_id, v_name, v_event_date, v_archived_at
  from public.guests g
  left join public.events e on e.id = g.event_id
  where g.rsvp_token = p_token
  limit 1;

  if v_id is null then
    return json_build_object('success', false, 'error', 'not_found');
  end if;

  if v_archived_at is not null then
    return json_build_object('success', false, 'error', 'event_archived');
  end if;

  if v_event_date is not null and v_event_date < current_date then
    return json_build_object('success', false, 'error', 'event_passed');
  end if;

  if p_status not in ('CONFIRMED', 'DECLINED') then
    return json_build_object('success', false, 'error', 'invalid_status');
  end if;

  if p_companions is not null and p_companions > 20 then
    return json_build_object('success', false, 'error', 'too_many_companions');
  end if;

  update public.guests
  set
    rsvp_status        = p_status,
    rsvp_responded_at  = now(),
    rsvp_via_link      = true,
    companions         = case
      when p_companions is not null and p_companions >= 0 and p_companions <= 20
      then p_companions
      else companions
    end,
    rsvp_public_note   = case
      when p_note is not null and char_length(p_note) <= 500
      then p_note
      else rsvp_public_note
    end,
    updated_at         = now()
  where id = v_id;

  return json_build_object('success', true, 'name', v_name, 'status', p_status);
end;
$$;

-- 3. set_active_event_lite: add owner_user_id guard to final UPDATE
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

  -- archive all other active events for this user
  update public.events
  set archived_at = now()
  where owner_user_id = p_user_id
    and archived_at is null
    and id <> p_event_id;

  -- activate the requested event (owner guard added)
  update public.events
  set archived_at = null
  where id = p_event_id
    and owner_user_id = p_user_id
  returning * into v_event;

  return v_event;
end;
$$;

-- ============================================================
-- SECURITY HARDENING MIGRATION — Luma Guests
-- Run in Supabase SQL Editor after all previous migrations
-- ============================================================

-- 1. rsvp_token: guarantee every guest always has a token
alter table public.guests
  alter column rsvp_token set default gen_random_uuid()::text;

update public.guests
set rsvp_token = gen_random_uuid()::text
where rsvp_token is null;

-- 2. respond_to_rsvp: remove PENDING, add event-date gate, cap companions
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
  v_id uuid;
  v_name text;
  v_event_date date;
begin
  select g.id, g.full_name, e.event_date::date
  into v_id, v_name, v_event_date
  from public.guests g
  left join public.events e on e.id = g.event_id
  where g.rsvp_token = p_token
  limit 1;

  if v_id is null then
    return json_build_object('success', false, 'error', 'not_found');
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
    rsvp_status = p_status,
    rsvp_responded_at = now(),
    rsvp_via_link = true,
    companions = case
      when p_companions is not null and p_companions >= 0 and p_companions <= 20
      then p_companions
      else companions
    end,
    rsvp_public_note = case
      when p_note is not null and char_length(p_note) <= 500
      then p_note
      else rsvp_public_note
    end,
    updated_at = now()
  where id = v_id;

  return json_build_object('success', true, 'name', v_name, 'status', p_status);
end;
$$;

-- 3. public_rsvp_register: event-date gate + input length limits + companions cap
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

  if v_event.event_date is not null and v_event.event_date < current_date then
    return jsonb_build_object('success', false, 'error', 'event_passed');
  end if;

  if p_full_name is null or trim(p_full_name) = '' then
    return jsonb_build_object('success', false, 'error', 'name_required');
  end if;

  if char_length(trim(p_full_name)) > 100 then
    return jsonb_build_object('success', false, 'error', 'name_too_long');
  end if;

  if p_phone is null or trim(p_phone) = '' then
    return jsonb_build_object('success', false, 'error', 'phone_required');
  end if;

  if char_length(trim(p_phone)) > 20 then
    return jsonb_build_object('success', false, 'error', 'phone_invalid');
  end if;

  if p_status not in ('CONFIRMED', 'DECLINED') then
    return jsonb_build_object('success', false, 'error', 'invalid_status');
  end if;

  if coalesce(p_companions, 0) < 0 or coalesce(p_companions, 0) > 20 then
    return jsonb_build_object('success', false, 'error', 'invalid_companions');
  end if;

  v_token := gen_random_uuid()::text;

  select *
  into v_guest
  from public.guests
  where event_id = v_event.id
    and phone = trim(p_phone)
  limit 1;

  if found then
    update public.guests
    set
      full_name           = trim(p_full_name),
      rsvp_status         = p_status,
      companions          = coalesce(p_companions, 0),
      rsvp_public_note    = case
        when p_note is not null and char_length(p_note) <= 500 then p_note
        else rsvp_public_note
      end,
      rsvp_via_link       = true,
      rsvp_responded_at   = now()
    where id = v_guest.id
    returning * into v_guest;
  else
    insert into public.guests (
      user_id, event_id, full_name, phone, rsvp_status, companions,
      category, rsvp_public_note, rsvp_via_link, rsvp_responded_at, rsvp_token
    )
    values (
      v_event.owner_user_id,
      v_event.id,
      trim(p_full_name),
      trim(p_phone),
      p_status,
      coalesce(p_companions, 0),
      'OTHER',
      case when p_note is not null and char_length(p_note) <= 500 then p_note else null end,
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

grant execute on function public.respond_to_rsvp(text, text, integer, text) to anon, authenticated;
grant execute on function public.public_rsvp_register(text, text, text, text, int, text) to anon, authenticated;

-- ============================================================
-- After running: configure rate limiting in Supabase Dashboard
-- Database → Rate Limits:
--   public_rsvp_register → 5 req / 60 sec / IP
--   respond_to_rsvp      → 10 req / 60 sec / IP
-- ============================================================

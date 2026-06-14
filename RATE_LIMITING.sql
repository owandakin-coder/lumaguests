-- ============================================================
-- RATE LIMITING — Luma Guests
-- Run in Supabase SQL Editor AFTER SECURITY_HARDENING.sql
-- ============================================================

-- 1. Tracking table — invisible to all clients (no RLS policies = no access)
create table if not exists public.rsvp_rate_limits (
  bucket_key   text         primary key,
  req_count    int          not null default 0,
  window_start timestamptz  not null default now()
);

alter table public.rsvp_rate_limits enable row level security;

create index if not exists rsvp_rate_limits_window_idx
  on public.rsvp_rate_limits (window_start);

-- 2. public_rsvp_register — with rate limiting
create or replace function public.public_rsvp_register(
  p_slug       text,
  p_full_name  text,
  p_phone      text,
  p_status     text    default 'CONFIRMED',
  p_companions int     default 0,
  p_note       text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event        record;
  v_guest        record;
  v_token        text;
  v_event_count  int;
  v_phone_count  int;
begin
  -- Lazy cleanup: remove buckets older than 2 hours to keep the table lean
  delete from public.rsvp_rate_limits
  where window_start < now() - interval '2 hours';

  -- ── Rate limit 1: per event, max 20 registrations per 60 seconds ──
  insert into public.rsvp_rate_limits (bucket_key, req_count, window_start)
  values ('event:' || p_slug, 1, now())
  on conflict (bucket_key) do update
    set
      req_count    = case
                       when now() - rsvp_rate_limits.window_start > interval '60 seconds'
                       then 1
                       else rsvp_rate_limits.req_count + 1
                     end,
      window_start = case
                       when now() - rsvp_rate_limits.window_start > interval '60 seconds'
                       then now()
                       else rsvp_rate_limits.window_start
                     end
  returning req_count into v_event_count;

  if v_event_count > 20 then
    return jsonb_build_object('success', false, 'error', 'rate_limited');
  end if;

  -- ── Rate limit 2: per phone, max 5 submissions per 60 minutes ──
  if p_phone is not null and trim(p_phone) <> '' then
    insert into public.rsvp_rate_limits (bucket_key, req_count, window_start)
    values ('phone:' || trim(p_phone), 1, now())
    on conflict (bucket_key) do update
      set
        req_count    = case
                         when now() - rsvp_rate_limits.window_start > interval '60 minutes'
                         then 1
                         else rsvp_rate_limits.req_count + 1
                       end,
        window_start = case
                         when now() - rsvp_rate_limits.window_start > interval '60 minutes'
                         then now()
                         else rsvp_rate_limits.window_start
                       end
    returning req_count into v_phone_count;

    if v_phone_count > 5 then
      return jsonb_build_object('success', false, 'error', 'rate_limited');
    end if;
  end if;

  -- ── Fetch event ──
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

  -- ── Input validation ──
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

  -- ── Upsert guest ──
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
      full_name         = trim(p_full_name),
      rsvp_status       = p_status,
      companions        = coalesce(p_companions, 0),
      rsvp_public_note  = case
                            when p_note is not null and char_length(p_note) <= 500
                            then p_note
                            else rsvp_public_note
                          end,
      rsvp_via_link     = true,
      rsvp_responded_at = now()
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
    'success',    true,
    'guest_name', v_guest.full_name,
    'status',     v_guest.rsvp_status,
    'rsvp_token', v_guest.rsvp_token
  );
end;
$$;

grant execute on function public.public_rsvp_register(text, text, text, text, int, text)
  to anon, authenticated;

-- ============================================================
-- Done.
-- Limits in effect:
--   • Max 20 RSVP submissions per event per 60 seconds
--   • Max 5 RSVP submissions per phone number per 60 minutes
--   • Bucket table auto-cleans entries older than 2 hours
-- ============================================================

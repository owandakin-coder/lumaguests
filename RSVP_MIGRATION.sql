-- ============================================================
-- RSVP Magic Link Migration — Luma Guests
-- Run this in Supabase SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- 1. Add RSVP columns to guests table
alter table public.guests
  add column if not exists rsvp_token text unique,
  add column if not exists rsvp_responded_at timestamptz,
  add column if not exists rsvp_public_note text,
  add column if not exists rsvp_via_link boolean default false;

-- 2. Generate unique tokens for existing guests
update public.guests
set rsvp_token = gen_random_uuid()::text
where rsvp_token is null;

-- 3. Index for fast token lookup
create index if not exists guests_rsvp_token_idx
on public.guests(rsvp_token);

-- ============================================================
-- 4. RPC: Get public guest info by token
-- ============================================================

create or replace function public.get_guest_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  select json_build_object(
    'id', id,
    'full_name', full_name,
    'rsvp_status', rsvp_status,
    'companions', companions,
    'rsvp_via_link', rsvp_via_link,
    'rsvp_responded_at', rsvp_responded_at
  )
  into v_result
  from public.guests
  where rsvp_token = p_token
  limit 1;

  if v_result is null then
    return json_build_object(
      'success', false,
      'error', 'קישור לא תקין'
    );
  end if;

  return json_build_object(
    'success', true,
    'guest', v_result
  );
end;
$$;

-- ============================================================
-- 5. RPC: Submit RSVP response by token
-- ============================================================

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
begin
  select id, full_name
  into v_id, v_name
  from public.guests
  where rsvp_token = p_token
  limit 1;

  if v_id is null then
    return json_build_object(
      'success', false,
      'error', 'קישור לא תקין'
    );
  end if;

  if p_status not in ('CONFIRMED', 'PENDING', 'DECLINED') then
    return json_build_object(
      'success', false,
      'error', 'סטטוס לא תקין'
    );
  end if;

  update public.guests
  set
    rsvp_status = p_status,
    rsvp_responded_at = now(),
    rsvp_via_link = true,
    companions = case
      when p_companions is not null and p_companions >= 0
      then p_companions
      else companions
    end,
    rsvp_public_note = case
      when p_note is not null
      then p_note
      else rsvp_public_note
    end,
    updated_at = now()
  where id = v_id;

  return json_build_object(
    'success', true,
    'name', v_name,
    'status', p_status
  );
end;
$$;

-- ============================================================
-- 6. Permissions for public RSVP page
-- ============================================================

grant execute on function public.get_guest_by_token(text) to anon;
grant execute on function public.respond_to_rsvp(text, text, integer, text) to anon;

grant execute on function public.get_guest_by_token(text) to authenticated;
grant execute on function public.respond_to_rsvp(text, text, integer, text) to authenticated;

-- Done

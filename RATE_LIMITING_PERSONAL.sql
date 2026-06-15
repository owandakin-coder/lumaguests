-- ============================================================
-- RATE_LIMITING_PERSONAL.sql
-- Run in Supabase SQL Editor AFTER RATE_LIMITING.sql and SECURITY_FIX2.sql
--
-- Adds rate limiting to respond_to_rsvp (personal RSVP links).
-- Reuses the existing rsvp_rate_limits table.
--
-- Limit: max 10 responses per token per 60 minutes
-- (a guest can change their mind, but not spam the DB)
-- ============================================================

create or replace function public.respond_to_rsvp(
  p_token      text,
  p_status     text,
  p_companions integer default null,
  p_note       text    default null
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
  v_req_count   int;
begin
  -- ── Rate limit: max 10 per token per 60 minutes ──
  insert into public.rsvp_rate_limits (bucket_key, req_count, window_start)
  values ('rsvp_token:' || p_token, 1, now())
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
  returning req_count into v_req_count;

  if v_req_count > 10 then
    return json_build_object('success', false, 'error', 'rate_limited');
  end if;

  -- ── Fetch guest + event ──
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

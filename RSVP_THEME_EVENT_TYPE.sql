-- ============================================================
-- RSVP_THEME_EVENT_TYPE.sql
-- Adds event_type to get_guest_by_token response so the RSVP
-- page can adapt its visual theme per event type.
-- Run after ADD_EVENT_TYPE.sql
-- ============================================================

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
    e.cover_image_url,
    e.event_type
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
      'id',                 v_guest.id,
      'event_id',           v_guest.event_id,
      'full_name',          v_guest.full_name,
      'rsvp_status',        v_guest.rsvp_status,
      'companions',         v_guest.companions,
      'rsvp_via_link',      v_guest.rsvp_via_link,
      'rsvp_responded_at',  v_guest.rsvp_responded_at,
      'event_name',         v_guest.event_name,
      'event_date',         v_guest.event_date,
      'venue_name',         v_guest.venue_name,
      'venue_address',      v_guest.venue_address,
      'cover_image_url',    v_guest.cover_image_url,
      'event_type',         coalesce(v_guest.event_type, 'wedding')
    )
  );
exception
  when others then
    return jsonb_build_object('success', false, 'error', 'general_error');
end;
$$;

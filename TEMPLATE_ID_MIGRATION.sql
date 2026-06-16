-- ============================================================
-- TEMPLATE_ID_MIGRATION.sql
-- Adds template_id column to events (design template per event)
-- and extends get_guest_by_token to return it so the RSVP page
-- can render the chosen layout/color scheme.
-- Safe to re-run (IF NOT EXISTS, CREATE OR REPLACE).
-- Run after RSVP_THEME_EVENT_TYPE.sql.
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS template_id TEXT NOT NULL DEFAULT 'wedding_classic';

-- Replace get_guest_by_token to also expose template_id
CREATE OR REPLACE FUNCTION public.get_guest_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest record;
BEGIN
  SELECT
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
    e.event_type,
    e.template_id
  INTO v_guest
  FROM public.guests g
  LEFT JOIN public.events e
    ON e.id = g.event_id
  WHERE g.rsvp_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_guest.event_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'guest_unavailable');
  END IF;

  RETURN jsonb_build_object(
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
      'event_type',         coalesce(v_guest.event_type, 'wedding'),
      'template_id',        coalesce(v_guest.template_id, 'wedding_classic')
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'general_error');
END;
$$;

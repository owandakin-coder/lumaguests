-- ============================================================
-- ADD_RSVP_DEADLINE.sql
-- Run in Supabase SQL Editor AFTER RATE_LIMITING_PERSONAL.sql
--
-- Adds rsvp_deadline DATE column to events.
-- When set, personal (respond_to_rsvp) and public RSVP links
-- stop accepting responses after this date.
-- ============================================================

-- 1. Add column
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS rsvp_deadline DATE;

-- 2. Update respond_to_rsvp (personal links) — adds deadline gate
CREATE OR REPLACE FUNCTION public.respond_to_rsvp(
  p_token      text,
  p_status     text,
  p_companions integer DEFAULT NULL,
  p_note       text    DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id            uuid;
  v_name          text;
  v_event_date    date;
  v_archived_at   timestamptz;
  v_rsvp_deadline date;
  v_req_count     int;
BEGIN
  -- ── Rate limit: max 10 per token per 60 minutes ──
  INSERT INTO public.rsvp_rate_limits (bucket_key, req_count, window_start)
  VALUES ('rsvp_token:' || p_token, 1, now())
  ON CONFLICT (bucket_key) DO UPDATE
    SET
      req_count    = CASE
                       WHEN now() - rsvp_rate_limits.window_start > INTERVAL '60 minutes'
                       THEN 1
                       ELSE rsvp_rate_limits.req_count + 1
                     END,
      window_start = CASE
                       WHEN now() - rsvp_rate_limits.window_start > INTERVAL '60 minutes'
                       THEN now()
                       ELSE rsvp_rate_limits.window_start
                     END
  RETURNING req_count INTO v_req_count;

  IF v_req_count > 10 THEN
    RETURN json_build_object('success', false, 'error', 'rate_limited');
  END IF;

  -- ── Fetch guest + event ──
  SELECT g.id, g.full_name, e.event_date::date, e.archived_at, e.rsvp_deadline
  INTO v_id, v_name, v_event_date, v_archived_at, v_rsvp_deadline
  FROM public.guests g
  LEFT JOIN public.events e ON e.id = g.event_id
  WHERE g.rsvp_token = p_token
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_archived_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'event_archived');
  END IF;

  IF v_event_date IS NOT NULL AND v_event_date < current_date THEN
    RETURN json_build_object('success', false, 'error', 'event_passed');
  END IF;

  -- ── Gate: RSVP deadline passed ──
  IF v_rsvp_deadline IS NOT NULL AND v_rsvp_deadline < current_date THEN
    RETURN json_build_object('success', false, 'error', 'rsvp_closed');
  END IF;

  IF p_status NOT IN ('CONFIRMED', 'DECLINED') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_status');
  END IF;

  IF p_companions IS NOT NULL AND p_companions > 20 THEN
    RETURN json_build_object('success', false, 'error', 'too_many_companions');
  END IF;

  UPDATE public.guests
  SET
    rsvp_status        = p_status,
    rsvp_responded_at  = now(),
    rsvp_via_link      = true,
    companions         = CASE
      WHEN p_companions IS NOT NULL AND p_companions >= 0 AND p_companions <= 20
      THEN p_companions
      ELSE companions
    END,
    rsvp_public_note   = CASE
      WHEN p_note IS NOT NULL AND char_length(p_note) <= 500
      THEN p_note
      ELSE rsvp_public_note
    END,
    updated_at         = now()
  WHERE id = v_id;

  RETURN json_build_object('success', true, 'name', v_name, 'status', p_status);
END;
$$;

-- 3. Update public_rsvp_register — adds deadline gate after existing rsvp_closed gate
CREATE OR REPLACE FUNCTION public.public_rsvp_register(
  p_slug       text,
  p_full_name  text,
  p_phone      text,
  p_status     text    DEFAULT 'CONFIRMED',
  p_companions int     DEFAULT 0,
  p_note       text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event        record;
  v_guest        record;
  v_token        text;
  v_event_count  int;
  v_phone_count  int;
BEGIN
  -- Lazy cleanup: remove rate-limit buckets older than 2 hours
  DELETE FROM public.rsvp_rate_limits
  WHERE window_start < now() - INTERVAL '2 hours';

  -- ── Rate limit 1: per event, max 20 per 60 seconds ──
  INSERT INTO public.rsvp_rate_limits (bucket_key, req_count, window_start)
  VALUES ('event:' || p_slug, 1, now())
  ON CONFLICT (bucket_key) DO UPDATE
    SET
      req_count    = CASE
                       WHEN now() - rsvp_rate_limits.window_start > INTERVAL '60 seconds'
                       THEN 1
                       ELSE rsvp_rate_limits.req_count + 1
                     END,
      window_start = CASE
                       WHEN now() - rsvp_rate_limits.window_start > INTERVAL '60 seconds'
                       THEN now()
                       ELSE rsvp_rate_limits.window_start
                     END
  RETURNING req_count INTO v_event_count;

  IF v_event_count > 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;

  -- ── Rate limit 2: per phone, max 5 per 60 minutes ──
  IF p_phone IS NOT NULL AND trim(p_phone) <> '' THEN
    INSERT INTO public.rsvp_rate_limits (bucket_key, req_count, window_start)
    VALUES ('phone:' || trim(p_phone), 1, now())
    ON CONFLICT (bucket_key) DO UPDATE
      SET
        req_count    = CASE
                         WHEN now() - rsvp_rate_limits.window_start > INTERVAL '60 minutes'
                         THEN 1
                         ELSE rsvp_rate_limits.req_count + 1
                       END,
        window_start = CASE
                         WHEN now() - rsvp_rate_limits.window_start > INTERVAL '60 minutes'
                         THEN now()
                         ELSE rsvp_rate_limits.window_start
                       END
    RETURNING req_count INTO v_phone_count;

    IF v_phone_count > 5 THEN
      RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
    END IF;
  END IF;

  -- ── Fetch event ──
  SELECT *
  INTO v_event
  FROM public.events
  WHERE public_slug = p_slug
    AND coalesce(is_public, false) = true
    AND archived_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  -- ── Gate 1: event date passed ──
  IF v_event.event_date IS NOT NULL AND v_event.event_date < current_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_passed');
  END IF;

  -- ── Gate 2: RSVP registration closed by organizer ──
  IF NOT coalesce(v_event.public_rsvp_enabled, true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'rsvp_closed');
  END IF;

  -- ── Gate 3: RSVP deadline passed ──
  IF v_event.rsvp_deadline IS NOT NULL AND v_event.rsvp_deadline < current_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'rsvp_closed');
  END IF;

  -- ── Input validation ──
  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'name_required');
  END IF;

  IF char_length(trim(p_full_name)) > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'name_too_long');
  END IF;

  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'phone_required');
  END IF;

  IF char_length(trim(p_phone)) > 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'phone_invalid');
  END IF;

  IF p_status NOT IN ('CONFIRMED', 'DECLINED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  IF coalesce(p_companions, 0) < 0 OR coalesce(p_companions, 0) > 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_companions');
  END IF;

  -- ── Upsert guest ──
  v_token := gen_random_uuid()::text;

  SELECT *
  INTO v_guest
  FROM public.guests
  WHERE event_id = v_event.id
    AND phone = trim(p_phone)
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.guests
    SET
      full_name         = trim(p_full_name),
      rsvp_status       = p_status,
      companions        = coalesce(p_companions, 0),
      rsvp_public_note  = CASE
                            WHEN p_note IS NOT NULL AND char_length(p_note) <= 500
                            THEN p_note
                            ELSE rsvp_public_note
                          END,
      rsvp_via_link     = true,
      rsvp_responded_at = now()
    WHERE id = v_guest.id
    RETURNING * INTO v_guest;
  ELSE
    INSERT INTO public.guests (
      user_id, event_id, full_name, phone, rsvp_status, companions,
      category, rsvp_public_note, rsvp_via_link, rsvp_responded_at, rsvp_token
    )
    VALUES (
      v_event.owner_user_id,
      v_event.id,
      trim(p_full_name),
      trim(p_phone),
      p_status,
      coalesce(p_companions, 0),
      'OTHER',
      CASE WHEN p_note IS NOT NULL AND char_length(p_note) <= 500 THEN p_note ELSE NULL END,
      true,
      now(),
      v_token
    )
    RETURNING * INTO v_guest;
  END IF;

  RETURN jsonb_build_object(
    'success',    true,
    'guest_name', v_guest.full_name,
    'status',     v_guest.rsvp_status,
    'rsvp_token', v_guest.rsvp_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_rsvp_register(text, text, text, text, int, text)
  TO anon, authenticated;

-- ============================================================
-- Done.
-- New behaviour:
--   • events.rsvp_deadline DATE — when set, blocks all RSVP
--     responses (personal links + public page) after that date.
--   • Frontend saves via EventManager RSVP section.
-- ============================================================

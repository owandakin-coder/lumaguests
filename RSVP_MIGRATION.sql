-- ============================================================
-- RSVP Magic Link Migration — Luma Guests
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Add new columns to guests table
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS rsvp_token       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS rsvp_responded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rsvp_public_note  TEXT,
  ADD COLUMN IF NOT EXISTS rsvp_via_link     BOOLEAN DEFAULT FALSE;

-- 2. Generate unique tokens for all existing guests
UPDATE guests
SET rsvp_token = gen_random_uuid()::text
WHERE rsvp_token IS NULL;

-- 3. Add index on rsvp_token for fast lookup
CREATE INDEX IF NOT EXISTS guests_rsvp_token_idx ON guests(rsvp_token);

-- ============================================================
-- 4. RPC: Get guest info by token (PUBLIC — no auth needed)
--    Returns only safe, minimal data. Never exposes phone,
--    user_id, or private notes.
-- ============================================================
CREATE OR REPLACE FUNCTION get_guest_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id',               id,
    'full_name',        full_name,
    'rsvp_status',      rsvp_status,
    'companions',       companions,
    'rsvp_via_link',    rsvp_via_link,
    'rsvp_responded_at',rsvp_responded_at
  )
  INTO v_result
  FROM guests
  WHERE rsvp_token = p_token
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 5. RPC: Guest responds to RSVP (PUBLIC — no auth needed)
--    Token validates identity. Only updates safe fields.
-- ============================================================
CREATE OR REPLACE FUNCTION respond_to_rsvp(
  p_token      TEXT,
  p_status     TEXT,
  p_companions INTEGER DEFAULT NULL,
  p_note       TEXT    DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   UUID;
  v_name TEXT;
BEGIN
  -- Validate token exists
  SELECT id, full_name INTO v_id, v_name
  FROM guests
  WHERE rsvp_token = p_token
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'קישור לא תקין');
  END IF;

  -- Validate status value
  IF p_status NOT IN ('CONFIRMED', 'PENDING', 'DECLINED') THEN
    RETURN json_build_object('success', false, 'error', 'סטטוס לא תקין');
  END IF;

  -- Update RSVP safely
  UPDATE guests
  SET
    rsvp_status      = p_status,
    rsvp_responded_at = NOW(),
    rsvp_via_link    = TRUE,
    companions       = COALESCE(p_companions, companions),
    rsvp_public_note = CASE WHEN p_note IS NOT NULL THEN p_note ELSE rsvp_public_note END,
    updated_at       = NOW()
  WHERE id = v_id;

  RETURN json_build_object('success', true, 'name', v_name, 'status', p_status);
END;
$$;

-- ============================================================
-- 6. Grant execute to anon role (public access)
-- ============================================================
GRANT EXECUTE ON FUNCTION get_guest_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION respond_to_rsvp(TEXT, TEXT, INTEGER, TEXT) TO anon;

-- Done ✅

-- ============================================================
-- EVENTS MIGRATION
-- Run this in Supabase SQL Editor after RSVP_MIGRATION.sql
-- ============================================================

-- 1. Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name       TEXT        NOT NULL DEFAULT 'האירוע שלי',
  event_date       TIMESTAMPTZ,
  venue_name       TEXT,
  venue_address    TEXT,
  description      TEXT,
  cover_image_url  TEXT,
  public_slug      TEXT        UNIQUE,
  is_public        BOOLEAN     NOT NULL DEFAULT FALSE,
  theme_color      TEXT        NOT NULL DEFAULT '#C9A84C',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS events_owner_idx ON public.events(owner_user_id);
CREATE INDEX IF NOT EXISTS events_slug_idx  ON public.events(public_slug) WHERE public_slug IS NOT NULL;

-- 3. RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_owner_all"   ON public.events;
DROP POLICY IF EXISTS "events_public_read" ON public.events;

CREATE POLICY "events_owner_all" ON public.events
  FOR ALL USING (owner_user_id = auth.uid());

CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (is_public = TRUE);

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Ensure RSVP columns exist on guests (idempotent)
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS rsvp_token        TEXT,
  ADD COLUMN IF NOT EXISTS rsvp_via_link     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rsvp_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rsvp_public_note  TEXT;

-- 6. RPC: Get public event by slug (anon-safe, security definer)
--    Returns distinct errors: 'not_found' vs 'not_public'
CREATE OR REPLACE FUNCTION public.get_public_event(p_slug TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v RECORD;
BEGIN
  -- Check if slug exists at all (ignore is_public here)
  SELECT * INTO v FROM public.events WHERE public_slug = p_slug;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'not_found');
  END IF;

  -- Slug exists but RSVP is disabled
  IF NOT v.is_public THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'not_public', 'event_name', v.event_name);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'event', jsonb_build_object(
      'id',              v.id,
      'event_name',      v.event_name,
      'event_date',      v.event_date,
      'venue_name',      v.venue_name,
      'venue_address',   v.venue_address,
      'description',     v.description,
      'cover_image_url', v.cover_image_url,
      'theme_color',     v.theme_color,
      'owner_user_id',   v.owner_user_id
    )
  );
END; $$;

-- 7. RPC: Public self-registration via event page (anon-safe)
CREATE OR REPLACE FUNCTION public.public_rsvp_register(
  p_slug       TEXT,
  p_full_name  TEXT,
  p_phone      TEXT,
  p_status     TEXT    DEFAULT 'CONFIRMED',
  p_companions INT     DEFAULT 0,
  p_note       TEXT    DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_event  RECORD;
  v_guest  RECORD;
  v_token  TEXT;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM public.events
  WHERE public_slug = p_slug AND is_public = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'event_not_found');
  END IF;

  -- Validate
  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'name_required');
  END IF;
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'phone_required');
  END IF;
  IF p_status NOT IN ('CONFIRMED', 'DECLINED') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'invalid_status');
  END IF;

  v_token := gen_random_uuid()::TEXT;

  -- Check if guest already exists by phone
  SELECT * INTO v_guest FROM public.guests
  WHERE user_id = v_event.owner_user_id AND phone = p_phone;

  IF FOUND THEN
    UPDATE public.guests SET
      full_name          = p_full_name,
      rsvp_status        = p_status,
      companions         = COALESCE(p_companions, 0),
      rsvp_public_note   = p_note,
      rsvp_via_link      = TRUE,
      rsvp_responded_at  = NOW()
    WHERE id = v_guest.id
    RETURNING * INTO v_guest;
  ELSE
    INSERT INTO public.guests (
      user_id, full_name, phone, rsvp_status, companions,
      category, rsvp_public_note, rsvp_via_link,
      rsvp_responded_at, rsvp_token
    ) VALUES (
      v_event.owner_user_id,
      p_full_name,
      p_phone,
      p_status,
      COALESCE(p_companions, 0),
      'OTHER',
      p_note,
      TRUE,
      NOW(),
      v_token
    )
    RETURNING * INTO v_guest;
  END IF;

  RETURN jsonb_build_object(
    'success',     TRUE,
    'guest_name',  v_guest.full_name,
    'status',      v_guest.rsvp_status,
    'rsvp_token',  v_guest.rsvp_token
  );
END; $$;

-- 8. Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_public_event(TEXT)                             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_rsvp_register(TEXT,TEXT,TEXT,TEXT,INT,TEXT) TO anon, authenticated;

-- ============================================================
-- Done. Run this once in Supabase SQL Editor.
-- ============================================================

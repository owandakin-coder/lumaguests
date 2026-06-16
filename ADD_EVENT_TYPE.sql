-- Add event_type column to events table
-- Safe to run multiple times

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'wedding';

-- Drop constraint first (if exists) then re-add — idempotent
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    'wedding', 'bar_mitzvah', 'bat_mitzvah', 'brit',
    'birthday', 'engagement', 'conference', 'other'
  ));

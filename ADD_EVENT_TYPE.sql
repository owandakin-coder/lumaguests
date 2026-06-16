-- Add event_type column to events table
-- Run this in Supabase SQL editor

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'wedding';

-- Optional: add a check constraint for valid values
ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    'wedding', 'bar_mitzvah', 'bat_mitzvah', 'brit',
    'birthday', 'engagement', 'conference', 'other'
  ));

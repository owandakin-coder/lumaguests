-- ============================================================
-- WHATSAPP TRACKING — Luma Guests
-- Run in Supabase SQL Editor
-- ============================================================

-- Add whatsapp_sent_at column to guests table
alter table public.guests
  add column if not exists whatsapp_sent_at timestamptz;

-- Partial index: fast lookup for guests who were sent (sparse column)
create index if not exists guests_whatsapp_sent_at_idx
  on public.guests(event_id, whatsapp_sent_at)
  where whatsapp_sent_at is not null;

-- ============================================================
-- Done.
-- Effect: each WhatsApp send is now persisted in the database.
-- Sent status survives refresh, logout, and re-login.
-- ============================================================

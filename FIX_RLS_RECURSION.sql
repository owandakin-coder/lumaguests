-- ============================================================
-- FIX_RLS_RECURSION.sql
-- Fixes infinite recursion in event_collaborators RLS policy.
--
-- Root cause:
--   events_collab_select  → queries event_collaborators
--   event_collaborators_select (owner branch) → queries events
--   → infinite loop → 500 error on any events SELECT
--
-- Fix: remove the events reference from event_collaborators_select.
-- The owner can see collaborators via the SECURITY DEFINER
-- get_event_collaborators() function (already exists).
-- ============================================================

drop policy if exists "event_collaborators_select" on public.event_collaborators;

create policy "event_collaborators_select"
  on public.event_collaborators for select
  using (user_id = auth.uid());

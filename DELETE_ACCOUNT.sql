-- ============================================================
-- DELETE_ACCOUNT.sql
-- Run in Supabase SQL Editor
--
-- Creates delete_my_account() — permanently removes all user
-- data (guests, events, collaborators, storage files handled
-- by the frontend) and then deletes the auth user record.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Delete guests from owned events
  DELETE FROM public.guests
  WHERE event_id IN (
    SELECT id FROM public.events WHERE owner_user_id = v_uid
  );

  -- Remove self as collaborator from others' events
  DELETE FROM public.event_collaborators
  WHERE user_id = v_uid;

  -- Remove others from owned events
  DELETE FROM public.event_collaborators
  WHERE event_id IN (
    SELECT id FROM public.events WHERE owner_user_id = v_uid
  );

  -- Delete owned events
  DELETE FROM public.events WHERE owner_user_id = v_uid;

  -- Delete the auth user — session becomes invalid immediately
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ============================================================
-- Done.
-- Frontend flow:
--   1. Delete storage files (signed session still valid)
--   2. Call supabase.rpc('delete_my_account')
--   3. Call supabase.auth.signOut({ scope: 'local' })
--   4. Auth state change redirects to login screen
-- ============================================================

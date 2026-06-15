-- ============================================================
-- FIX_COLLABORATOR_EMAIL.sql
-- Run in Supabase SQL Editor
--
-- Fixes M5: collaborator could see other collaborators' emails.
-- Now: owner sees all collaborators; collaborator sees only themselves.
-- ============================================================

create or replace function public.get_event_collaborators(
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_is_owner  boolean;
  v_result    jsonb;
begin
  v_is_owner := exists (
    select 1 from public.events
    where id = p_event_id and owner_user_id = v_caller_id
  );

  -- Must be owner or collaborator to call this function
  if not v_is_owner and not exists (
    select 1 from public.event_collaborators
    where event_id = p_event_id and user_id = v_caller_id
  ) then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id',  ec.user_id,
        'email',    au.email,
        'added_at', ec.added_at
      )
      order by ec.added_at
    ),
    '[]'::jsonb
  )
  into v_result
  from public.event_collaborators ec
  join auth.users au on au.id = ec.user_id
  where ec.event_id = p_event_id
    and (
      v_is_owner              -- owner sees everyone
      or ec.user_id = v_caller_id  -- collaborator sees only themselves
    );

  return v_result;
end;
$$;

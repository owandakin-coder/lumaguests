-- ============================================================
-- NORMALIZE_PHONES.sql
-- Run in Supabase SQL Editor
--
-- 1. Normalizes all existing phone numbers to Israeli format (0XXXXXXXXX)
-- 2. Merges duplicates that become identical after normalization
--    (keeps the most recently updated record)
-- 3. Adds a unique constraint on (event_id, phone) so the DB
--    enforces deduplication going forward
-- ============================================================

-- Step 1: normalize phone format in place
-- Strips spaces/dashes/parens, converts +972 / 972 prefix to 0
update public.guests
set phone = regexp_replace(
              regexp_replace(
                regexp_replace(phone, '[\s\-\(\)\.]', '', 'g'),
                '^\+972', '0'
              ),
              '^972(\d{9,})$', '0\1'
            )
where phone ~ '[\s\-\(\)\.\+]'
   or phone like '+972%'
   or (phone like '972%' and char_length(phone) >= 12);

-- Step 2: delete duplicate records that now share (event_id, phone)
-- Keep the row with the most recent updated_at; break ties by id
delete from public.guests
where id in (
  select id from (
    select
      id,
      row_number() over (
        partition by event_id, phone
        order by updated_at desc nulls last, id desc
      ) as rn
    from public.guests
  ) ranked
  where rn > 1
);

-- Step 3: add unique constraint so future inserts/updates are enforced at DB level
alter table public.guests
  drop constraint if exists guests_event_phone_unique;

alter table public.guests
  add constraint guests_event_phone_unique unique (event_id, phone);

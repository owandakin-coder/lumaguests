-- ============================================================
-- NORMALIZE_PHONES_PATCH.sql
-- Run AFTER NORMALIZE_PHONES.sql
--
-- Handles the missing-leading-zero case:
--   501234567 → 0501234567  (9-digit number missing leading 0)
-- ============================================================

update public.guests
set phone = '0' || phone
where phone ~ '^[2-9][0-9]{8}$';

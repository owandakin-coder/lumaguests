-- ============================================================
-- STORAGE_POLICIES.sql
-- Run in Supabase SQL Editor
--
-- Adds DELETE policy to the event-covers Storage bucket.
-- Path format: {userId}/{eventId}.{ext}
-- Users may only delete files inside their own userId folder.
-- ============================================================

-- Drop existing delete policies first to avoid conflicts
drop policy if exists "Users can delete own event covers" on storage.objects;
drop policy if exists "Allow delete for owners" on storage.objects;
drop policy if exists "Delete own cover" on storage.objects;

-- Allow authenticated users to delete their own cover images
-- Path format: {userId}/{eventId}.{ext} — first segment must match auth.uid()
create policy "Users can delete own event covers"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'event-covers'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- ============================================================
-- STORAGE_POLICIES.sql
-- Run in Supabase SQL Editor
--
-- Adds DELETE policy to the event-covers Storage bucket.
-- Path format: {userId}/{eventId}.{ext}
-- Users may only delete files inside their own userId folder.
-- ============================================================

-- Allow authenticated users to delete their own cover images
create policy "Users can delete own event covers"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'event-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

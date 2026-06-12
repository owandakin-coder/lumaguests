-- SIDE MIGRATION — Run this in Supabase SQL Editor
-- Adds a separate "side" column (BRIDE/GROOM/SHARED) to guests.
-- Existing guests tagged as category=GROOM or category=BRIDE are safely migrated.
-- No data is lost. Run as a single transaction.

BEGIN;

-- 1. Add the new side column (nullable; existing rows get NULL = "unassigned")
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS side TEXT
  CHECK (side IN ('BRIDE', 'GROOM', 'SHARED'));

-- 2. Migrate existing data:
--    category=GROOM → side=GROOM, category=OTHER
--    category=BRIDE → side=BRIDE, category=OTHER
--    (Setting category to 'OTHER' is valid under the existing CHECK constraint)
UPDATE guests SET side = 'GROOM', category = 'OTHER' WHERE category = 'GROOM';
UPDATE guests SET side = 'BRIDE', category = 'OTHER' WHERE category = 'BRIDE';

-- 3. Drop the old category check constraint (was: GROOM/BRIDE/FAMILY/FRIENDS/WORK/OTHER)
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_category_check;

-- 4. Add the new category constraint — GROOM and BRIDE are no longer categories
ALTER TABLE guests
  ADD CONSTRAINT guests_category_check
  CHECK (category IN ('FAMILY', 'FRIENDS', 'WORK', 'OTHER'));

-- 5. Index for fast side filtering
CREATE INDEX IF NOT EXISTS guests_side_idx ON guests(side);

COMMIT;

-- Verify (optional — run separately after migration):
-- SELECT side, category, COUNT(*) FROM guests GROUP BY side, category ORDER BY side, category;

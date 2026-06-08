-- Luma Guests - Supabase Schema & RLS Policies
-- This file contains the complete database setup for Supabase

-- ========== TABLES ==========

-- Create guests table
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  companions INTEGER DEFAULT 0,
  category TEXT DEFAULT 'OTHER' CHECK (category IN ('GROOM', 'BRIDE', 'FAMILY', 'FRIENDS', 'WORK', 'OTHER')),
  rsvp_status TEXT DEFAULT 'PENDING' CHECK (rsvp_status IN ('PENDING', 'CONFIRMED', 'DECLINED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(user_id, phone)
);

-- ========== INDEXES ==========

CREATE INDEX IF NOT EXISTS guests_user_id_idx ON guests(user_id);
CREATE INDEX IF NOT EXISTS guests_phone_idx ON guests(phone);
CREATE INDEX IF NOT EXISTS guests_category_idx ON guests(category);
CREATE INDEX IF NOT EXISTS guests_rsvp_status_idx ON guests(rsvp_status);

-- ========== ROW LEVEL SECURITY ==========

-- Enable RLS on guests table
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see only their own guests
CREATE POLICY "Users can view their own guests"
  ON guests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert only guests for themselves
CREATE POLICY "Users can insert their own guests"
  ON guests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own guests
CREATE POLICY "Users can update their own guests"
  ON guests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own guests
CREATE POLICY "Users can delete their own guests"
  ON guests
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========== TRIGGER FOR UPDATED_AT ==========

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========== SAMPLE DATA (Optional - for development) ==========

-- Insert test users (requires their auth.users IDs from Supabase Auth)
-- Note: Replace these UUIDs with actual user IDs from your Supabase Auth

-- Example insert (do this via Supabase UI or by getting actual user IDs):
-- INSERT INTO guests (user_id, full_name, phone, companions, category, rsvp_status, notes)
-- VALUES
--   ('USER_ID_1', 'Alice Johnson', '+1 (555) 100-1001', 1, 'BRIDE', 'CONFIRMED', 'Best friend'),
--   ('USER_ID_1', 'Bob Smith', '+1 (555) 100-1002', 0, 'GROOM', 'CONFIRMED', 'College roommate'),
--   ('USER_ID_2', 'Frank Anderson', '+1 (555) 100-2001', 1, 'FAMILY', 'CONFIRMED', 'Uncle'),
-- etc...

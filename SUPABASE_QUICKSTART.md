# Supabase + Vercel Quick Start

## TL;DR - Get Running in 15 Minutes

### 1. Create Supabase Project
- Go to https://supabase.com → New Project
- Name: `luma-guests`
- Set password, pick region
- Wait 2-3 minutes for setup

### 2. Create Tables & RLS

In Supabase dashboard → SQL Editor → paste this:

```sql
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  companions INTEGER DEFAULT 0,
  category TEXT DEFAULT 'OTHER',
  rsvp_status TEXT DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, phone)
);

CREATE INDEX guests_user_id_idx ON guests(user_id);

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_guests" ON guests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_guests" ON guests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_guests" ON guests FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_guests" ON guests FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER guests_update_timestamp BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

Click **Run** ✓

### 3. Get API Keys

Settings → API → Copy:
- **Project URL**
- **anon public** (the key)

### 4. Setup Frontend

```bash
cd frontend
npm install
```

Create `.env.local`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_KEY_HERE
```

### 5. Run Locally

```bash
npm run dev
```

Open http://localhost:5173

### 6. Test

1. Sign up: test@example.com / TestPassword123!
2. Add guest: Alice, +1 (555) 100-1001, 1 companion, FRIENDS, CONFIRMED
3. Check Supabase Table Editor → guests table → your guest appears with your user_id
4. Add another guest with same number → should work (RLS allows same phone per user)
5. Sign up different user → can't see first user's guests (RLS blocks it)

### 7. Deploy to Vercel

```bash
npm run build
```

Push to GitHub → Vercel → Connect repo
Add env vars (same as .env.local)
Done! Live at your-vercel-url.vercel.app

---

## Key Files

- `SUPABASE_SETUP.sql` - Complete SQL schema
- `SUPABASE_DEPLOYMENT.md` - Detailed guide
- `frontend/src/services/supabase.ts` - API client
- `frontend/src/hooks/useSupabaseAuth.ts` - Auth hook
- `.env.example` - Config template

---

## RLS Verification

**The security feature works like this:**

1. User A signs up
2. User A adds guest "Alice" with phone "+1 555 1001"
3. In Supabase Table Editor → guests table:
   - You see Alice with `user_id = USER_A_ID`
4. User B signs up
5. User B adds guest "Bob" with phone "+1 555 1001" (same phone!)
6. In Table Editor → Bob has `user_id = USER_B_ID`
7. Each user in the app only sees their own guests (RLS enforced)
8. Try to query other user's guests from frontend = ERROR 403 (Forbidden)

This is enforced at the DATABASE level, not the app level. Unhackable.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Supabase URL not found" | Check `.env.local` exists and has correct values |
| "Can't create account" | Verify Auth is enabled in Supabase |
| "Can see other users' guests" | Check RLS policies created (Table Editor → Policies) |
| "Same phone error on different user" | That's the wrong error - you CAN have same phone per user |
| "Same phone error on same user" | Correct! You can't have 2 "Alice" with same phone in your list |

---

## Architecture

```
Browser (React)
    ↓ HTTPS
Supabase Edge (Auth + PostgreSQL)
    ↓
RLS Policies (Enforce user isolation)
    ↓
Your data (encrypted, only you see it)
```

No backend. No API server. Just PostgreSQL + RLS.

---

## Environment Variables

Frontend only:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

Get from Supabase: Settings → API

That's it. No backend env vars needed.

---

## What Changed From Express Version

| Old | New |
|-----|-----|
| Express backend | Supabase (no backend needed) |
| Custom JWT auth | Supabase Auth (built-in) |
| bcryptjs hashing | Supabase (handled) |
| REST API routes | Supabase client (library) |
| App-level access control | RLS policies (database-level) |
| Deployed as 2 services | 1 frontend on Vercel |

Benefits:
- ✅ No backend to maintain
- ✅ Auto-scaling
- ✅ Security at database level
- ✅ Free tier is generous
- ✅ Instant deployment

# Luma Guests - Supabase & Vercel Deployment Guide

## Architecture Overview

This is a **serverless architecture** using:
- **Frontend**: React SPA deployed on Vercel
- **Auth**: Supabase Auth (built on PostgreSQL)
- **Database**: Supabase PostgreSQL with Row Level Security
- **No backend server needed** - Supabase handles everything

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up or log in
4. Create a new project:
   - **Project name**: luma-guests
   - **Database password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing**: Start with Free tier

5. Wait for project to initialize (2-3 minutes)

---

## Step 2: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy the entire contents of `SUPABASE_SETUP.sql`
4. Paste it into the SQL editor
5. Click **Run**
6. Verify tables and RLS policies were created:
   - Go to **Table Editor**
   - You should see `guests` table
   - Go to **Authentication** → **Policies** to see RLS policies

---

## Step 3: Get API Keys

1. In Supabase, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (copy the full URL)
   - **anon public** (the anonymous key)

3. Create `.env.local` in frontend folder:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

---

## Step 4: Test Auth Locally

```bash
cd frontend
npm install
npm run dev
```

1. Open http://localhost:5173
2. Click "Sign up"
3. Create account:
   - Email: test@example.com
   - Password: TestPassword123!
   - Name: Test User

4. Verify in Supabase:
   - Go to **Authentication** → **Users**
   - You should see your test user

---

## Step 5: Test Guest Operations

1. After signing up, you're logged in
2. Click "Add Guest"
3. Add a guest:
   - Name: Test Guest
   - Phone: +1 (555) 123-4567
   - Companions: 1
   - Category: FRIENDS
   - RSVP: CONFIRMED
   - Notes: Test guest

4. Click Save
5. Verify in Supabase:
   - Go to **Table Editor** → **guests**
   - You should see your guest with your user_id
   - **Only you can see it** (RLS in action)

---

## Step 6: Test RLS (Row Level Security)

This is the critical security feature. Each user ONLY sees their own guests.

**Test it:**
1. Note the phone number of the guest you created
2. Sign out (logout button)
3. Sign up with a different email:
   - Email: other@example.com
   - Password: TestPassword123!
4. Try adding a guest with the SAME phone number
5. Should work! (RLS allows it per user)
6. You should NOT see the first user's guests
7. RLS policy blocks access

---

## Step 7: Add Sample Data (Optional)

For testing with multiple guests, run this SQL in Supabase SQL Editor:

```sql
-- Get your user ID first
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Replace 'USER_ID_HERE' with the ID above
INSERT INTO guests (user_id, full_name, phone, companions, category, rsvp_status, notes)
VALUES
  ('USER_ID_HERE', 'Alice Johnson', '+1 (555) 100-1001', 1, 'BRIDE', 'CONFIRMED', 'Best friend'),
  ('USER_ID_HERE', 'Bob Smith', '+1 (555) 100-1002', 0, 'GROOM', 'CONFIRMED', 'College roommate'),
  ('USER_ID_HERE', 'Carol Davis', '+1 (555) 100-1003', 2, 'FAMILY', 'CONFIRMED', 'Sister'),
  ('USER_ID_HERE', 'David Wilson', '+1 (555) 100-1004', 1, 'FRIENDS', 'PENDING', 'High school friend'),
  ('USER_ID_HERE', 'Emma Martinez', '+1 (555) 100-1005', 0, 'WORK', 'CONFIRMED', 'Colleague');
```

---

## Step 8: Deploy Frontend to Vercel

### Prerequisites
- GitHub account with your code pushed
- Vercel account (free)

### Steps

1. Go to https://vercel.com
2. Click "New Project"
3. Select your GitHub repository (guest-list-management)
4. Configure:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add Environment Variables:
   - `VITE_SUPABASE_URL`: (from Step 3)
   - `VITE_SUPABASE_ANON_KEY`: (from Step 3)

6. Click **Deploy**
7. Wait for deployment (2-3 minutes)
8. Visit your live app URL

---

## Step 9: Verify Deployment

1. Open your Vercel URL
2. Sign up with new credentials
3. Add a guest
4. Verify it works
5. **Check that RLS works**: Sign in as different user, shouldn't see first user's guests

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Your Browser                       │
│           React SPA (Vercel)                        │
│  ┌─────────────────────────────────────────────┐   │
│  │  Login/Register/Guest List                  │   │
│  │  useSupabaseAuth + guestService             │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         │
         │ HTTPS
         ↓
┌─────────────────────────────────────────────────────┐
│          Supabase (PostgreSQL)                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  Auth:                                      │   │
│  │  - User registration                        │   │
│  │  - User login                               │   │
│  │  - Session tokens                           │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │  Database:                                  │   │
│  │  - guests table                             │   │
│  │  - Row Level Security enabled               │   │
│  │  - Each user sees ONLY their guests         │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### "Supabase URL or key missing"
- Check `.env.local` has correct values
- Vercel: Check Environment Variables in Settings

### "Can't sign up"
- Check Supabase Auth is enabled
- Check RLS policies are created correctly

### "Can't see guests"
- Check RLS policies (should show in Table Editor)
- Check you're logged in as the correct user
- Check user_id matches in guests table

### "Getting CORS errors"
- Supabase CORS is usually configured automatically
- If issues: Settings → API → CORS Configuration

### "Duplicate phone error but phone is different"
- Remember: **Phone is unique PER USER**
- Different users CAN have the same phone
- You can't have 2 guests with same phone in YOUR list

---

## Environment Variables Reference

### Frontend (.env.local)

```env
# Required for Supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

### Supabase Configuration

No additional config needed! Supabase handles:
- PostgreSQL database
- User authentication
- Row Level Security
- Real-time subscriptions (if enabled)

---

## Security Features

✅ **Row Level Security (RLS)**
- Enforced at database level
- Users see ONLY their own guests
- Cannot be bypassed from frontend

✅ **Authentication**
- Supabase Auth with secure password hashing
- Session tokens for Web
- Email verification optional

✅ **Data Validation**
- Phone uniqueness per user (composite unique constraint)
- RSVP status enum
- Category enum
- Required fields

✅ **CORS**
- Supabase handles CORS automatically
- Vercel domain is pre-configured

---

## Costs

**Supabase Free Tier:**
- Up to 50,000 rows
- Up to 5 simultaneous connections
- Perfect for testing and small deployments

**Vercel Free Tier:**
- Unlimited deployments
- Perfect for hosting

---

## Next Steps

1. ✅ Create Supabase project
2. ✅ Run SQL schema
3. ✅ Get API keys
4. ✅ Test locally
5. ✅ Deploy to Vercel
6. ✅ Test production
7. 🎉 Live!

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **React + Supabase**: https://supabase.com/docs/guides/getting-started/tutorials/with-react

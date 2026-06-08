# Pre-Deployment Checklist

Use this checklist before deploying to verify everything is ready.

---

## Code Quality ✓

### TypeScript
- [ ] `npm run build` completes without errors
- [ ] No type errors in `frontend/src/`
- [ ] No unused imports
- [ ] All async functions have error handling

### Imports
- [ ] All pages import from `'../services/supabase'`
- [ ] All components import correct types from `'../types'`
- [ ] All hooks import from `'../hooks'`
- [ ] No imports from deleted files (api.ts, old useAuth.ts)

### Authentication
- [ ] `Login.tsx` uses `onLogin` prop
- [ ] `Register.tsx` uses `onRegister` prop
- [ ] `useSupabaseAuth` hook initializes on mount
- [ ] Auth state updates trigger loadGuests()
- [ ] Logout clears session

---

## Data Isolation ✓

### User ID Passing
- [ ] `App.tsx` loadGuests() passes `auth.user.id`
- [ ] `Dashboard.tsx` getStats() passes `auth.user.id`
- [ ] `GuestDetails.tsx` getById() passes `auth.user.id`
- [ ] `AddGuest.tsx` create() includes `user_id`
- [ ] `EditGuest.tsx` update() passes `auth.user.id`
- [ ] All guest operations check `if (!auth.user)` first

### Property Handling
- [ ] GuestCard.tsx uses fallbacks: `guest.fullName || guest.full_name`
- [ ] GuestForm.tsx initializes: `initialData?.fullName || initialData?.full_name`
- [ ] GuestDetails.tsx creates local variables for property access
- [ ] GuestList.tsx filters use property fallbacks
- [ ] All components handle snake_case from Supabase

---

## Duplicate Phone ✓

### Validation
- [ ] `AddGuest.tsx` calls `checkDuplicatePhone()` before create
- [ ] `EditGuest.tsx` calls `checkDuplicatePhone()` with `excludeId`
- [ ] Error message shown to user if duplicate
- [ ] Same phone allowed across different users
- [ ] Same phone blocked for same user

### Database
- [ ] SUPABASE_SETUP.sql has `UNIQUE(user_id, phone)`
- [ ] Constraint created after table creation

---

## Environment Configuration ✓

### Files Exist
- [ ] `frontend/.env.local` exists (git ignored)
- [ ] `frontend/.env.example` exists (tracked in git)
- [ ] Both have exactly 2 variables (not 3, not 1)

### Variables Set
- [ ] `VITE_SUPABASE_URL` set in .env.local
- [ ] `VITE_SUPABASE_ANON_KEY` set in .env.local
- [ ] Both values match Supabase dashboard
- [ ] No typos in variable names

### No Old Variables
- [ ] No `VITE_API_URL` variable
- [ ] No `PORT` variable
- [ ] No `NODE_ENV` variable
- [ ] No `JWT_SECRET` variable
- [ ] No `DATABASE_URL` variable

---

## Dependencies ✓

### package.json
- [ ] `@supabase/supabase-js` version ^2.38.4
- [ ] `axios` removed
- [ ] `bcryptjs` removed
- [ ] `jsonwebtoken` removed
- [ ] `express` removed
- [ ] All other React deps intact

### Installation
- [ ] `npm install` runs without errors
- [ ] node_modules/ contains @supabase folder
- [ ] No peer dependency warnings
- [ ] Build runs: `npm run build`

---

## Database Schema ✓

### Supabase Project Created
- [ ] Supabase account created
- [ ] Project created (name: luma-guests)
- [ ] Database initialized
- [ ] Project URL visible in Settings → API

### Schema Executed
- [ ] SUPABASE_SETUP.sql copied to SQL Editor
- [ ] Script executed successfully
- [ ] No SQL errors
- [ ] Table "guests" appears in Table Editor

### Table Structure
- [ ] Columns: id, user_id, full_name, phone, companions, category, rsvp_status, notes, created_at, updated_at
- [ ] Correct data types (UUID, VARCHAR, TEXT, TIMESTAMP)
- [ ] Correct defaults (uuid, 0, 'PENDING', NOW())
- [ ] Primary key on id
- [ ] Foreign key user_id → auth.users(id)
- [ ] Cascade delete enabled

### Unique Constraint
- [ ] `UNIQUE(user_id, phone)` exists
- [ ] Can verify in Table Editor → Structure

### Indexes
- [ ] Index on user_id
- [ ] Index on phone
- [ ] Index on category
- [ ] Index on rsvp_status

---

## RLS Policies ✓

### Policies Created
- [ ] 4 policies shown in Table Editor → Policies
- [ ] SELECT policy named "view_own_guests" or similar
- [ ] INSERT policy named "insert_own_guests" or similar
- [ ] UPDATE policy named "update_own_guests" or similar
- [ ] DELETE policy named "delete_own_guests" or similar

### Policy Correctness
- [ ] SELECT: `USING (auth.uid() = user_id)`
- [ ] INSERT: `WITH CHECK (auth.uid() = user_id)`
- [ ] UPDATE: `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
- [ ] DELETE: `USING (auth.uid() = user_id)`

### RLS Enabled
- [ ] Table Editor → guests → toggle shows "RLS Enabled"
- [ ] Not just policies, RLS must be ON

---

## Auto-Update Trigger ✓

### Trigger Created
- [ ] Function `update_updated_at()` exists
- [ ] Trigger `guests_update_timestamp` exists
- [ ] Trigger runs BEFORE UPDATE
- [ ] Trigger sets `updated_at = NOW()`

### Verification
- [ ] Edit a guest
- [ ] Check Supabase table
- [ ] `updated_at` changed to current time

---

## API Keys ✓

### Keys Obtained
- [ ] Go to Settings → API in Supabase dashboard
- [ ] Copy "Project URL" (not API URL)
- [ ] Copy "anon public" key (long string starting with eyJ)
- [ ] Keys visible in .env.local

### Keys Correct
- [ ] Project URL format: `https://xxx.supabase.co`
- [ ] No trailing slashes
- [ ] No spaces
- [ ] Anon key is 200+ characters
- [ ] Both keys active in Supabase

---

## Local Testing ✓

### Build
- [ ] `npm run build` completes
- [ ] No TypeScript errors
- [ ] Output: "dist/" folder created
- [ ] dist/index.html exists

### Dev Server
- [ ] `npm run dev` starts
- [ ] No errors in terminal
- [ ] App opens at localhost:5173
- [ ] No 404 errors in browser console

### Authentication
- [ ] Click "Register"
- [ ] Sign up: test@example.com / TestPassword123!
- [ ] Redirects to dashboard
- [ ] Shows "Luma Guests" title
- [ ] Can see dashboard stats (0 guests)

### Guest CRUD
- [ ] Click "Add Guest"
- [ ] Form loads
- [ ] Enter: Alice, +1-555-0001, 1 companion, FRIENDS, CONFIRMED
- [ ] Click Save
- [ ] Toast shows success
- [ ] Guest appears in list
- [ ] Dashboard shows 1 guest, 1 confirmed, 2 total people

### Duplicate Check
- [ ] Try to add another guest with +1-555-0001
- [ ] Error toast: "A guest with this phone number already exists"
- [ ] Guest NOT added

### Edit
- [ ] Click Edit on Alice
- [ ] Change companions to 2
- [ ] Save
- [ ] Dashboard shows 3 total people
- [ ] Toast shows success

### Delete
- [ ] Click Delete on Alice
- [ ] Confirm delete
- [ ] Guest removed from list
- [ ] Dashboard shows 0 guests
- [ ] Toast shows success

### Search
- [ ] Re-add Alice
- [ ] Re-add Bob (different phone)
- [ ] Type "Alice" in search
- [ ] Only Alice shown
- [ ] Clear search
- [ ] Both shown

### Filters
- [ ] Add different categories
- [ ] Filter by category
- [ ] Filter by RSVP status
- [ ] Both work

### Logout & User Isolation
- [ ] Click Logout (top right)
- [ ] Redirected to login
- [ ] Register new user: other@example.com
- [ ] Dashboard shows 0 guests (different user)
- [ ] Cannot see Alice or Bob

---

## Database Verification ✓

### Check Data in Supabase
- [ ] Log in to Supabase dashboard
- [ ] Table Editor → guests
- [ ] Rows show both users' data
- [ ] Each guest has correct user_id
- [ ] created_at and updated_at timestamps set
- [ ] Verify Alice and Bob have different user_ids

### Verify RLS Works
- [ ] Copy User A's ID (user_id value from Alice's row)
- [ ] Try to query as User B (after sign up as User B)
- [ ] User B cannot see User A's guests
- [ ] Only User B's guests visible

---

## Deployment Preparation ✓

### Git Ready
- [ ] All changes committed: `git status` shows clean
- [ ] Remote connected: `git remote -v` shows origin
- [ ] Ready to push: `git push origin main`

### Vercel Prepared
- [ ] Vercel account created
- [ ] GitHub repo authorized with Vercel
- [ ] Project settings configured in Vercel dashboard

### Environment Ready
- [ ] Vercel env vars set:
  - [ ] VITE_SUPABASE_URL = [exact value from .env.local]
  - [ ] VITE_SUPABASE_ANON_KEY = [exact value from .env.local]

---

## Final Checks ✓

### Documentation
- [ ] README.md updated with Supabase architecture
- [ ] SUPABASE_QUICKSTART.md provided
- [ ] SUPABASE_DEPLOYMENT.md provided
- [ ] All docs mention no backend needed

### No Broken References
- [ ] No imports from backend/
- [ ] No imports from deleted services/api.ts
- [ ] No references to /api/ endpoints
- [ ] No references to Express
- [ ] No references to Prisma

### Security
- [ ] .env.local in .gitignore (verified)
- [ ] No API keys in code
- [ ] No secrets in git history
- [ ] RLS policies active
- [ ] HTTPS everywhere (Vercel + Supabase)

### Performance
- [ ] Frontend bundle size reasonable (< 500KB after gzip)
- [ ] No console errors
- [ ] No console warnings
- [ ] Animations smooth (Framer Motion)

---

## Go/No-Go Decision

### All Checks Passing?

**YES → Ready to Deploy** ✅
```bash
git push origin main
# Vercel auto-deploys
# Verify live: your-vercel-url.vercel.app
```

**NO → Fix Issues** ❌
1. Note which checks failed
2. Fix issues listed in this document
3. Re-test locally
4. Return to "Go/No-Go Decision"

---

## Deployment Steps

Once all checks pass:

```bash
# 1. Final build verification
npm run build

# 2. Commit any final changes
git add .
git commit -m "Pre-deployment verification complete"

# 3. Push to GitHub
git push origin main

# 4. Vercel auto-deploys (watch dashboard)

# 5. Once live, test production URL
# - Sign up
# - Add guest
# - Verify works
```

---

## Post-Deployment

### Monitor (First Hour)
- [ ] Vercel build succeeds
- [ ] App loads at live URL
- [ ] No 500 errors
- [ ] Dashboard visible

### Test (First Hour)
- [ ] Sign up works
- [ ] Guest CRUD works
- [ ] User isolation works
- [ ] Duplicate phone blocked

### Verify (After 1 Hour)
- [ ] Vercel analytics show traffic
- [ ] Supabase dashboard shows queries
- [ ] No error logs
- [ ] All features working

---

**Checklist Status:** Ready for deployment when all boxes checked ✅

Print this page and check boxes as you verify each item.

# Luma Guests

A premium guest-list management web application for event planning. Built with React and Supabase.

## Architecture

**Serverless & Cloud-Native:**
- **Frontend**: React SPA hosted on Vercel
- **Auth**: Supabase Authentication (email/password)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Security**: Each user sees ONLY their own guests (RLS enforced)
- **No backend server needed** - Supabase handles everything

## Features

- User authentication (register/login)
- Add, edit, and delete guests
- RSVP tracking (Pending, Confirmed, Declined)
- Guest categorization (Groom, Bride, Family, Friends, Work, Other)
- Search and filter by name, phone, or category
- Dashboard with real-time stats
- WhatsApp and phone call quick actions
- Duplicate phone validation per user
- Responsive mobile-first design
- Premium lifestyle aesthetic
- Row Level Security - data isolation guaranteed

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide Icons
- Supabase JavaScript client

**Backend:**
- None! (Supabase + PostgreSQL)

## Quick Start

### 1. Prerequisites

- Supabase account (free at https://supabase.com)
- Node.js 18+
- npm

### 2. Setup Supabase

See [SUPABASE_DEPLOYMENT.md](./SUPABASE_DEPLOYMENT.md) for detailed instructions:
- Create Supabase project
- Run SQL schema
- Get API keys

### 3. Install Frontend

```bash
cd frontend
npm install
```

### 4. Configure Environment

Create `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

### 5. Run Locally

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`

### 6. Deploy to Vercel

```bash
npm run build
```

Then connect your GitHub repo to Vercel and add the same environment variables.

## Project Structure

```
guest-list-management/
├── frontend/                        # React SPA (deployed to Vercel)
│   ├── src/
│   │   ├── components/
│   │   │   ├── GuestCard.tsx
│   │   │   ├── GuestForm.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── GuestList.tsx
│   │   │   ├── AddGuest.tsx
│   │   │   ├── EditGuest.tsx
│   │   │   ├── GuestDetails.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── hooks/
│   │   │   ├── useSupabaseAuth.ts  # Auth state management
│   │   │   └── useToast.ts
│   │   ├── services/
│   │   │   └── supabase.ts         # Supabase client + all API calls
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.local                   # Local Supabase credentials
│   ├── .env.example                 # Config template
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── SUPABASE_SETUP.sql               # Database schema + RLS policies
├── SUPABASE_DEPLOYMENT.md           # Detailed deployment guide
├── SUPABASE_QUICKSTART.md           # Quick 15-minute setup
├── REFACTOR_VALIDATION_CHECKLIST.md # Code validation checklist
├── MIGRATION_COMPLETE.md            # Migration summary
└── README.md                        # This file
```

## How It Works

### Client-Side (React)
1. User signs up/logs in → Supabase Auth
2. Supabase returns session token
3. User adds guest → `guestService.create()`
4. Supabase executes RLS policy
5. Database stores guest with user_id

### Server-Side (Supabase)
1. RLS Policy checks: `WHERE auth.uid() = user_id`
2. User can ONLY see their own guests
3. Cannot bypass (enforced at database)
4. Unique constraint: `UNIQUE(user_id, phone)`

### No Backend
- No Express server
- No JWT handling
- No bcryptjs
- Security at database level

## Development

```bash
cd frontend
npm install                    # Install dependencies
npm run dev                    # Start dev server (localhost:5173)
npm run build                  # Production build
npm run preview               # Preview production build
```

## Deployment

### Prerequisites
- Supabase account (free)
- GitHub repo (for Vercel)
- Vercel account (free)

### Steps

1. **Create Supabase Project** (see SUPABASE_QUICKSTART.md)
   - Sign up at https://supabase.com
   - Create project named "luma-guests"
   - Run SUPABASE_SETUP.sql

2. **Get API Keys**
   - Settings → API
   - Copy Project URL
   - Copy anon public key

3. **Configure Environment**
   ```
   frontend/.env.local:
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_KEY
   ```

4. **Deploy to Vercel**
   ```bash
   npm run build
   git push origin main
   ```
   - Connect GitHub repo to Vercel
   - Add environment variables (same as above)
   - Deploy
   - Live in ~2 minutes

## Environment Variables

**Required** (both frontend and Vercel):
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

Get these from: Supabase Dashboard → Settings → API

That's it. No backend env vars needed.

## Security

### Row Level Security (RLS)

Every query is protected by RLS policies:

```sql
CREATE POLICY "view_own_guests" ON guests FOR SELECT 
USING (auth.uid() = user_id);
```

This means:
- ✅ User A can only see User A's guests
- ✅ User B can only see User B's guests
- ❌ User A cannot see User B's guests (even with hack attempts)
- ❌ Enforced at database level (cannot be bypassed from app)

### Duplicate Phone Handling

Composite unique constraint allows same phone across users:
```sql
UNIQUE(user_id, phone)
```

Examples:
- ✅ User A: "Alice" with +1-555-0001
- ✅ User B: "Bob" with +1-555-0001 (allowed, different user)
- ❌ User A: "Charlie" with +1-555-0001 (blocked, same user)

### Authentication

- Built-in Supabase Auth (email/password)
- Session-based (not JWT tokens)
- Passwords hashed by Supabase
- No sensitive data stored locally

## Support & Documentation

- **Quick Start**: See [SUPABASE_QUICKSTART.md](./SUPABASE_QUICKSTART.md)
- **Detailed Guide**: See [SUPABASE_DEPLOYMENT.md](./SUPABASE_DEPLOYMENT.md)
- **Code Validation**: See [REFACTOR_VALIDATION_CHECKLIST.md](./REFACTOR_VALIDATION_CHECKLIST.md)
- **Migration Details**: See [MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md)

## License

MIT

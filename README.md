# Luma Guests

A premium guest-list management web application for event planning. Built with React and Supabase.

## Architecture

**Serverless & Cloud-Native:**
- **Frontend**: React SPA hosted on Vercel
- **Auth**: Supabase Authentication (email/password)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Security**: Each user sees ONLY their own guests (RLS enforced)
- **No backend server needed** - Supabase handles everything
- **Legacy backend folder**: `backend/` contains an older Express/Prisma implementation and is not required for the active Supabase flow

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
- Active app: None, Supabase handles auth + data
- Legacy/optional: Express + Prisma server kept in `backend/`

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
├── SUPABASE_QUICKSTART.md 

# Luma Guests - Setup Instructions

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Step 1: Database Setup

```bash
# Create PostgreSQL database
createdb luma_guests

# Set your database connection string
# Edit backend/.env with your PostgreSQL credentials
# Example:
# DATABASE_URL=postgresql://your_user:your_password@localhost:5432/luma_guests
```

### Step 2: Backend Setup

```bash
cd backend
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) View database with Prisma Studio
npx prisma studio
```

### Step 3: Frontend Setup

```bash
cd frontend
npm install
```

### Step 4: Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server will run on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App will run on http://localhost:5173
```

## Project Structure

```
guest-list-management/
├── backend/
│   ├── src/
│   │   ├── controllers/guestController.ts     # Business logic
│   │   ├── routes/guestRoutes.ts             # API routes
│   │   ├── middleware/errorHandler.ts        # Error handling
│   │   ├── types/index.ts                    # TypeScript types
│   │   └── server.ts                         # Express setup
│   ├── prisma/schema.prisma                  # Database schema
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                                  # Environment variables
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GuestCard.tsx                 # Guest display card
│   │   │   ├── GuestForm.tsx                 # Add/edit form
│   │   │   ├── StatsCard.tsx                 # Dashboard stats
│   │   │   ├── SearchBar.tsx                 # Search input
│   │   │   ├── FilterTabs.tsx                # Filter controls
│   │   │   ├── ConfirmDeleteModal.tsx        # Delete confirmation
│   │   │   └── Toast.tsx                     # Notifications
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx                 # Home page
│   │   │   ├── GuestList.tsx                 # Guest list
│   │   │   ├── AddGuest.tsx                  # Add guest
│   │   │   ├── EditGuest.tsx                 # Edit guest
│   │   │   ├── GuestDetails.tsx              # Guest details
│   │   │   └── Settings.tsx                  # Settings page
│   │   ├── hooks/
│   │   │   └── useToast.ts                   # Toast hook
│   │   ├── services/api.ts                   # API client
│   │   ├── types/index.ts                    # TypeScript types
│   │   ├── App.tsx                           # Main app
│   │   ├── main.tsx                          # Entry point
│   │   └── index.css                         # Global styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── .env.local                            # Local environment
│   └── .gitignore
│
├── .gitignore
├── .env.example
├── README.md
└── SETUP.md
```

## API Endpoints

The backend provides the following REST API endpoints:

### Guests
- `GET /api/guests` - Get all guests
- `GET /api/guests/:id` - Get guest by ID
- `POST /api/guests` - Create new guest
- `PUT /api/guests/:id` - Update guest
- `DELETE /api/guests/:id` - Delete guest

### Stats
- `GET /api/stats` - Get dashboard statistics

### Health Check
- `GET /health` - Check server status

## Features

✅ Add, edit, delete guests
✅ RSVP status tracking (Pending, Confirmed, Declined)
✅ Guest categorization (Groom, Bride, Family, Friends, Work, Other)
✅ Search by name or phone number
✅ Filter by category and RSVP status
✅ Dashboard with real-time statistics
✅ WhatsApp quick action
✅ Phone call quick action
✅ Duplicate phone number validation
✅ Form validation
✅ Responsive mobile-first design
✅ Toast notifications
✅ Confirmation modals
✅ Premium lifestyle aesthetic

## Development

### Backend Commands
```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm start        # Run production build
npx prisma studio  # Open database UI
```

### Frontend Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/luma_guests
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:5000/api
```

## Database Schema

The Guest model includes:
- `id`: UUID primary key
- `fullName`: Required string
- `phone`: Required unique string
- `companions`: Integer (default: 0)
- `category`: Enum (GROOM, BRIDE, FAMILY, FRIENDS, WORK, OTHER)
- `rsvpStatus`: Enum (PENDING, CONFIRMED, DECLINED)
- `notes`: Optional text
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

## Validation

### Form Validation
- Full name: Required
- Phone: Required, valid phone format
- Companions: Non-negative number
- Duplicate phone numbers are blocked

### API Validation
- All required fields are validated on the backend
- Duplicate phone numbers are prevented at the database level

## Production Build

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting
```

## Troubleshooting

### Database connection fails
- Verify PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Ensure database `luma_guests` exists

### Frontend can't reach backend
- Check backend is running on port 5000
- Verify VITE_API_URL in frontend/.env.local
- Check CORS is enabled in backend

### TypeScript errors
```bash
# Backend
cd backend
npx tsc --noEmit

# Frontend
cd frontend
npx tsc --noEmit
```

## Support

For issues or questions, please refer to the code comments or check the CLAUDE.md file for architecture notes.

## License

MIT

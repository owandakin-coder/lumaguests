# Complete Setup and Verification Guide

## Prerequisites
- Node.js 18+ installed
- PostgreSQL running locally
- Database `luma_guests` created

## Step-by-Step Setup

### Step 1: Set Up Database

```bash
# Create PostgreSQL database
createdb luma_guests
```

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies (with authentication support)
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database with 10 sample guests and 2 test users
npm run seed
```

**Test Credentials Created:**
- Email: john@example.com / Password: password123
- Email: jane@example.com / Password: password456

### Step 3: Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

### Step 4: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Expected output:
```
🎉 Server running on http://localhost:5000
📊 API available at http://localhost:5000/api
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 5: Test the Application

1. Open browser: http://localhost:5173
2. You should see the login page
3. Use test credentials to login:
   - Email: john@example.com
   - Password: password123
4. You should see the dashboard with 5 guests populated
5. Test features:
   - View guest list (should show 5 guests for john@example.com)
   - Add new guest
   - Edit guest
   - Delete guest (with confirmation)
   - Search and filter
   - WhatsApp button
   - Call button

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Guests (All Protected - Require Bearer Token)
- `GET /api/guests` - Get all guests for current user
- `GET /api/guests/:id` - Get guest by ID (only if belongs to user)
- `POST /api/guests` - Create new guest
- `PUT /api/guests/:id` - Update guest
- `DELETE /api/guests/:id` - Delete guest
- `GET /api/stats` - Get user statistics

### Test API Endpoints with cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Get guests (replace TOKEN with actual token from login)
curl -X GET http://localhost:5000/api/guests \
  -H "Authorization: Bearer TOKEN"

# Create guest
curl -X POST http://localhost:5000/api/guests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "fullName":"John Smith",
    "phone":"+1 (555) 123-4567",
    "companions":1,
    "category":"FRIENDS",
    "rsvpStatus":"PENDING",
    "notes":"Bringing girlfriend"
  }'

# Get stats
curl -X GET http://localhost:5000/api/stats \
  -H "Authorization: Bearer TOKEN"
```

## Key Features Verified

✅ **Authentication**
- User registration with email/password
- User login with JWT tokens
- Protected routes requiring authentication
- Each user sees only their own guests
- Token stored in localStorage

✅ **Guest Management**
- Add guest with full details
- Edit guest information
- Delete guest with confirmation modal
- View guest details
- Each guest belongs to one user (userId foreign key)
- Unique phone number per user

✅ **Search & Filter**
- Search by guest name or phone
- Filter by RSVP status (Pending, Confirmed, Declined)
- Filter by category (Groom, Bride, Family, Friends, Work, Other)

✅ **Dashboard**
- Real-time statistics
- Total guests count
- Confirmed/Pending/Declined counts
- Total people including companions
- Stats update immediately after guest changes

✅ **Quick Actions**
- WhatsApp button opens WhatsApp with message
- Phone call button initiates phone call

✅ **UI/UX**
- Premium luxury aesthetic
- Responsive mobile-first design
- Toast notifications
- Loading states
- Empty states
- Confirmation modals
- Smooth animations

✅ **Database**
- PostgreSQL with Prisma ORM
- User model with authentication
- Guest model with userId relationship
- Unique (userId, phone) constraint
- Auto timestamps (createdAt, updatedAt)
- Cascading delete on user removal

✅ **Security**
- Password hashing with bcryptjs
- JWT token generation and verification
- Protected API endpoints
- CORS enabled
- Input validation on server
- Phone number per-user uniqueness

## Troubleshooting

### Database Connection Issues
```bash
# Verify PostgreSQL is running
psql -U user -d luma_guests -c "SELECT 1"

# Check DATABASE_URL in backend/.env
# Format: postgresql://user:password@localhost:5432/luma_guests
```

### TypeScript Errors
```bash
# Backend
cd backend
npx tsc --noEmit

# Frontend
cd frontend
npx tsc --noEmit
```

### Dependencies Issue
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Port Already in Use
```bash
# Change backend port in backend/.env
PORT=5001

# Change frontend port in frontend/vite.config.ts
server: { port: 5174 }

# Update frontend VITE_API_URL to http://localhost:5001/api
```

## Sample Data

The seed file creates:
- 2 test users with different emails
- 5 guests per user (10 total)
- Mix of RSVP statuses (Confirmed, Pending, Declined)
- Mix of categories (Bride, Family, Friends, Work)
- Different companion counts
- Sample notes

## Production Deployment

See DEPLOYMENT.md for production setup instructions.

## Support

For issues:
1. Check error messages in browser console
2. Check backend server logs
3. Check PostgreSQL connection
4. Verify environment variables
5. Check TypeScript compilation errors
6. Review SETUP.md for detailed configuration

---

**Status:** ✨ Ready for testing and verification

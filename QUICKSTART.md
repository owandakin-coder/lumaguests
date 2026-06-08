# Luma Guests - Quick Start (5 minutes)

## 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in another terminal)
cd frontend
npm install
```

## 2. Setup Database

```bash
# Create PostgreSQL database
createdb luma_guests

# Run migrations
cd backend
npx prisma migrate dev --name init
```

Note: Update `backend/.env` with your PostgreSQL credentials if different from default.

## 3. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

## 4. Open in Browser

Visit: **http://localhost:5173**

## That's it! 🎉

You now have a fully functional guest-list management app running locally.

### Try These Actions

1. Click **Add Guest** to create your first guest
2. Fill in the form with test data
3. Submit and see it appear in the guest list
4. Click on a guest card to view details
5. Use search/filters to find guests
6. Click WhatsApp or Call buttons
7. Check the stats on the dashboard

## Database Notes

The app uses PostgreSQL + Prisma. Default connection string assumes:
- Host: `localhost`
- Port: `5432`
- User: `user`
- Password: `password`
- Database: `luma_guests`

If your PostgreSQL is different, update `backend/.env`:
```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/luma_guests
```

## Troubleshooting

**Backend won't start:**
- Make sure PostgreSQL is running
- Check `backend/.env` has correct DATABASE_URL
- Run `npx prisma migrate dev` in backend folder

**Frontend won't load:**
- Make sure backend is running (check `http://localhost:5000/health`)
- Clear browser cache and refresh
- Check `frontend/.env.local` has `VITE_API_URL=http://localhost:5000/api`

**TypeScript errors:**
- Run `npm install` again in the folder with errors
- Delete `node_modules` and `package-lock.json`, then `npm install`

## What's Included

✅ Complete database schema
✅ All API endpoints
✅ React frontend with all pages
✅ Form validation
✅ Search & filtering
✅ Real-time statistics
✅ Toast notifications
✅ Responsive design
✅ Production-ready code

## File Structure

```
guest-list-management/
├── backend/          # Express API
├── frontend/         # React SPA
├── README.md         # Main docs
├── SETUP.md          # Detailed setup
└── DEPLOYMENT.md     # Production guide
```

## Documentation

- **README.md** - Overview
- **SETUP.md** - Detailed setup instructions
- **DEPLOYMENT.md** - Deploy to production
- **PROJECT_SUMMARY.md** - Architecture overview
- **CHECKLIST.md** - Complete feature checklist

## Next Steps

1. ✅ Explore the app locally
2. 📖 Read SETUP.md for more details
3. 🚀 See DEPLOYMENT.md when ready to go live
4. 💡 Customize colors and styling in `frontend/tailwind.config.ts`

---

**Happy guest managing! 🎊**

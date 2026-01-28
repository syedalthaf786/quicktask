# 🚀 QuickTask - Quick Start Guide

## Prerequisites Check

Before starting, verify you have:
- [ ] Node.js v18+ (`node --version`)
- [ ] PostgreSQL v14+ installed and running
- [ ] Git installed

## 🎯 Quick Installation (5 Minutes)

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### Step 2: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

## 🗄️ Database Setup

### Option A: Local PostgreSQL (Recommended for Testing)
1. Ensure PostgreSQL is running
2. Create database:
   ```bash
   createdb quicktask
   ```
3. Update `backend/.env` with connection string

### Option B: PostgreSQL Cloud (Supabase/Railway)
1. Create account at [Supabase](https://supabase.com/) or [Railway](https://railway.app/)
2. Create project
3. Get connection string
4. Update `backend/.env`

## 📊 Seed Sample Data (Recommended)
```bash
cd backend
npm run seed
```

**Demo Credentials:**
- Email: `demo@quicktask.com`
- Password: `password123`

## ▶️ Run the Application

### You need 2 terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
✅ Running on http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ Running on http://localhost:3000

## 🎉 Access the Application

Open your browser to: **http://localhost:3000**

1. Click "Sign in here" at the bottom
2. Use demo credentials or create new account
3. Explore all features!

## ✅ Verification Checklist

After starting all services, verify:
- [ ] Backend health: http://localhost:5000/api/health
- [ ] Frontend loads: http://localhost:3000
- [ ] Can login with demo account
- [ ] Dashboard shows statistics
- [ ] Can create new task
- [ ] Analytics page shows charts
- [ ] Dark mode toggle works
- [ ] Export CSV/PDF works

## 🐛 Common Issues

### Port Already in Use
```bash
# Windows - Kill process
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### PostgreSQL Connection Failed
- Check if PostgreSQL service is running
- Verify connection string in `.env`
- Check firewall settings

### Prisma Issues
```bash
# Regenerate Prisma client
cd backend
npx prisma generate

# Sync schema
npx prisma db push
```

### Frontend Build Errors
```bash
# Clear and reinstall
cd frontend
rmdir /s node_modules
npm install
```

## 📖 Full Documentation

For detailed documentation, see [README.md](./README.md)

## 🎓 Next Steps

1. ✅ Create some tasks
2. ✅ Try filtering and searching
3. ✅ Check out the analytics dashboard
4. ✅ Test dark mode
5. ✅ Export tasks to CSV/PDF
6. ✅ Explore the code structure

## 💡 Tips

- Use the demo account for quick testing
- Create tasks with different priorities to see color coding
- Set due dates in the past to see overdue warnings
- Try different time periods in analytics
- All changes are saved to the database in real-time

## 📞 Need Help?

If you encounter issues:
1. Check the terminal for error messages
2. Verify all prerequisites are installed
3. Ensure `.env` file is configured
4. Review the troubleshooting section in README.md

---

**Ready to impress! 🚀**

# ✓ 📊 QuickTask - Smart Task Management Platform

**Organize • Collaborate • Achieve**

A premium full-stack task management application built with the PERN stack (PostgreSQL, Express, React, Node.js). Features a beautiful, responsive UI with dark mode, comprehensive task management, advanced analytics, and export capabilities.

## 🌟 Features

### Core Functionality
- ✅ **User Authentication** - Secure JWT-based registration and login
- 📝 **Task Management** - Complete CRUD operations for tasks
- 🔍 **Advanced Filtering** - Filter by status, priority, and search by title
- 📊 **Analytics Dashboard** - Comprehensive productivity insights and statistics
- 📈 **Node.js Analytics** - Built-in analytics endpoints for advanced data analysis
- 🌓 **Dark Mode** - Beautiful dark/light theme toggle
- 📥 **Export Functionality** - Export tasks as CSV or PDF
- ⚡ **Real-time Updates** - Instant UI updates after every action
- 🎨 **Premium UI/UX** - Glassmorphism, smooth animations, and modern design

### Task Features
- Title, description, priority (Low/Medium/High)
- Status tracking (Todo/In Progress/Completed)
- Due date with overdue warnings
- Visual indicators for tasks due soon
- Completion tracking with timestamps
- Responsive task cards with hover effects

### Analytics Features
- Total tasks, completed, pending, in-progress counts
- Completion rate percentage
- Priority distribution charts (Doughnut chart)
- Task status visualization (Bar chart)
- Productivity timeline (Line chart)
- Average completion time tracking
- Trend analysis (increasing/decreasing/stable)
- Multiple time period views (7/30/90 days)

## 🛠️ Technology Stack

### Frontend
- **React 18.2** - UI library
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **Chart.js** - Beautiful charts and graphs
- **Framer Motion** - Smooth animations
- **React Toastify** - Toast notifications
- **date-fns** - Date manipulation
- **jsPDF** - PDF generation
- **Lucide React** - Modern icon library

### Backend (Node.js)
- **Express.js** - Web framework
- **PostgreSQL & Prisma** - Database and ORM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security headers
- **cors** - CORS middleware
- **compression** - Response compression

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone lmpa
cd lmpa
```

### 2. Backend Setup (Node.js + Express)

```bash
cd backend

# Install dependencies
npm install

# Create environment file
copy .env.example .env

# Edit .env file with your configuration
# DATABASE_URL=postgresql://postgres:password@localhost:5432/quicktask?schema=public
# JWT_SECRET=your_super_secret_key_here
# PORT=5000
```

#### PostgreSQL Setup Options:

**Option A: Local PostgreSQL**
1. Install PostgreSQL Community Edition
2. Start PostgreSQL service:
   - Windows: PostgreSQL should start automatically
   - Mac: `brew services start postgresql`
   - Linux: `sudo systemctl start postgresql`
3. Create database: `createdb quicktask`
4. Use connection string: `postgresql://postgres:password@localhost:5432/quicktask?schema=public`

**Option B: PostgreSQL Cloud (Supabase/Railway)**
1. Create free account at [Supabase](https://supabase.com/) or [Railway](https://railway.app/)
2. Create a new project
3. Get connection string and add to `.env`

#### Seed Sample Data (Optional but Recommended)

```bash
npm run seed
```

This creates a demo user and sample tasks:
- **Email**: demo@quicktask.com
- **Password**: password123

#### Start Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:5000`

### 3. Frontend Setup (React + Vite)

```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
copy .env.example .env

# Edit .env file
# VITE_API_URL=http://localhost:5000/api
```

#### Start Frontend Development Server

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

## 🎯 Running the Complete Application

You need **two terminal windows** running simultaneously:

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

Then open your browser to `http://localhost:3000`

## 📚 API Documentation

### Backend API Endpoints (Node.js)

#### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login user | No |
| GET | `/me` | Get current user | Yes |

#### Task Routes (`/api/tasks`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all tasks (with filters) | Yes |
| GET | `/:id` | Get single task | Yes |
| POST | `/` | Create new task | Yes |
| PUT | `/:id` | Update task | Yes |
| DELETE | `/:id` | Delete task | Yes |
| GET | `/stats/summary` | Get task statistics | Yes |

**Query Parameters for GET /**:
- `status` - Filter by status (Todo, In Progress, Completed)
- `priority` - Filter by priority (Low, Medium, High)
- `search` - Search by title
- `sortBy` - Sort field (dueDate, priority, createdAt)
- `order` - Sort order (asc, desc)

### Analytics Endpoints (Node.js)

#### Analytics Routes (`/api/tasks`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/stats/summary` | Get task statistics | Yes |
| GET | `/analytics/productivity?period=7days` | Get productivity analysis | Yes |

**Productivity Periods**:
- `7days` - Last 7 days
- `30days` - Last 30 days
- `90days` - Last 90 days
- `all` - All time

## 🗄️ Database Schema

### User Schema (Prisma)
```prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  tasks     Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Task Schema
```prisma
model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  tasks     Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Task {
  id          Int       @id @default(autoincrement())
  title       String
  description String?
  priority    Priority  @default(MEDIUM)
  status      Status    @default(TODO)
  dueDate     DateTime
  completedAt DateTime?
  userId      Int
  user        User      @relation(fields: [userId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum Status {
  TODO
  IN_PROGRESS
  COMPLETED
}
```

## 📸 Screenshots

### Login Page
Beautiful glassmorphic login with floating gradients and smooth animations.
![Login Page](./screenshots/login.png)

### Dashboard
Overview with task statistics, completion rate visualization, and recent tasks.
![Dashboard](./screenshots/dashboard.png)

### Tasks Page
Comprehensive task management with filtering, search, and CRUD operations.
![Tasks Page](./screenshots/tasks.png)

### Analytics
Advanced analytics with multiple chart types and productivity trends.
![Analytics](./screenshots/analysis.png)

### Dark Mode
Seamless dark/light mode toggle with smooth transitions.

## ✨ Key Features Explained

### Authentication
- Secure JWT-based authentication
- Password hashing with bcrypt
- Token stored in localStorage
- Protected routes with automatic redirection
- Token auto-refresh on API calls

### Task Management
- Create, read, update, delete operations
- Rich task metadata (priority, status, due date)
- Automatic completion timestamp
- Overdue task detection
- Due soon warnings (3 days)
- Visual priority indicators

### Analytics
- Real-time statistics from Node.js backend
- Built-in analytics endpoints
- Chart.js visualizations
- Multiple time period views
- Productivity trend analysis
- Completion rate tracking

### Export Features
- **CSV Export**: Download tasks in comma-separated format
- **PDF Export**: Professional PDF reports with tables
- Includes all task details and metadata
- Auto-generated filenames with timestamps

### Dark Mode
- System preference detection
- Smooth theme transitions
- Persistent storage
- All components fully styled for both themes

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt (10 salt rounds)
- HTTP-only secure headers (Helmet.js)
- CORS configuration
- Input validation and sanitization
- SQL injection prevention (PostgreSQL with Prisma)
- XSS protection

## 🚢 Deployment

### Backend Deployment (Heroku/Render/Railway)

1. Create new app on hosting platform
2. Set environment variables
3. Deploy from GitHub or CLI
4. Ensure PostgreSQL connection is accessible
5. Run `npx prisma generate` and `npx prisma db push`

### Frontend Deployment (Vercel/Netlify)

```bash
# Build production version
npm run build

# Deploy dist folder
```

Update environment variables with production URLs.

## 🐛 Troubleshooting

### PostgreSQL Connection Issues
- Ensure PostgreSQL is running
- Check connection string in `.env`
- Verify network access
- Check firewall settings

### Port Already in Use
```bash
# Windows - Kill process on port
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### Prisma Issues
- Run `npx prisma generate` to regenerate client
- Run `npx prisma db push` to sync schema

### Frontend Build Errors
- Clear node_modules and reinstall
- Check Node.js version (18+)
- Verify all environment variables

## 📝 Known Limitations

- Single user session (no concurrent sessions)
- File attachments not supported
- Email notifications not implemented
- Task sharing between users not available
- Limited task history/audit trail

## 🤝 Contributing

This is an assessment project, but suggestions are welcome!

## 📄 License

MIT License - feel free to use for learning and personal projects.

## 👤 Author

Built with ❤️ for LeadMasters AI Assessment

## 🎉 Acknowledgments

- React and Vite documentation
- PostgreSQL documentation
- Prisma documentation
- Chart.js library
- Framer Motion animations
- Lucide icons

---

**Happy Task Managing! 🚀**

For questions or support, contact: prudvireddy7733@gmail.com

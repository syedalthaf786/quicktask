# Deploy QuickTask on Render

This guide provides step-by-step instructions to deploy the QuickTask application on [Render](https://render.com/).

## Prerequisites

- A [Render](https://render.com/) account
- A [GitHub](https://github.com/) or [GitLab](https://gitlab.com/) repository with your code
- A [Supabase](https://supabase.com/) or [Neon](https://neon.tech/) PostgreSQL database (free tier available)

## Deployment Steps

### Step 1: Prepare Your Repository

Ensure your project is pushed to GitHub or GitLab with the following structure:

```
your-repo/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── Procfile
│   └── prisma/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

### Step 2: Create a PostgreSQL Database

Render provides PostgreSQL as a managed service, or you can use an external provider:

**Option A: Render PostgreSQL (Recommended)**
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "PostgreSQL"
3. Configure settings:
   - Name: `quicktask-db`
   - Database: `quicktask`
   - User: `quicktask`
4. Click "Create Database"
5. Copy the "Internal Database URL" once created

**Option B: External PostgreSQL (Supabase/Neon)**
1. Create a free account at [Supabase](https://supabase.com/) or [Neon](https://neon.tech/)
2. Create a new project
3. Get your connection string from the project settings

### Step 3: Deploy the Backend Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub/GitLab repository
4. Configure the service:
   - **Name**: `quicktask-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && cd ../frontend && npm install && npm run build`
   - **Start Command**: `cd ../backend && npm start`
   - **Root Directory**: `backend`
5. Add Environment Variables:
   ```
   DATABASE_URL=postgresql://your:password@host:5432/quicktask?schema=public
   JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
   JWT_EXPIRE=7d
   PORT=5000
   NODE_ENV=production
   ```
6. Click "Create Web Service"

### Step 4: Run Database Migrations

After the service is deployed, you need to set up the database schema:

1. Go to your web service on Render
2. Click "Shell" to open a shell session
3. Run the following commands:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. Optionally, seed the database:
   ```bash
   node seed.js
   ```

### Step 5: Access Your Application

Once deployed, your application will be available at:
```
https://quicktask-backend.onrender.com
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | Yes |
| `JWT_EXPIRE` | JWT token expiration time | No (default: 7d) |
| `PORT` | Port for the server | No (default: 5000) |
| `NODE_ENV` | Environment mode | No (default: development) |

## Troubleshooting

### Database Connection Issues
- Ensure your DATABASE_URL is correct and includes `?schema=public`
- Check that your database allows connections from Render's IPs
- Verify the database is running

### Build Failures
- Check that Node.js version is 18 or higher
- Ensure all dependencies are in package.json
- Verify the build command runs successfully locally

### Prisma Errors
- Run `npx prisma generate` to regenerate the client
- Run `npx prisma db push` to sync the schema

### Static Files Not Loading
- Ensure the frontend was built successfully
- Check that NODE_ENV is set to production
- Verify the build output is in `frontend/dist`

## Demo Credentials

After seeding the database, you can log in with:
- **Email**: demo@quicktask.com
- **Password**: password123

## Custom Domain (Optional)

1. Go to your web service settings
2. Click "Custom Domains"
3. Add your domain and follow the DNS configuration instructions

## Monitoring and Logs

- View logs in the Render Dashboard under "Logs"
- Monitor performance in the "Metrics" tab
- Set up alerts for errors or high latency

## Updating Your Deployment

To deploy changes:
1. Push your changes to GitHub/GitLab
2. Render automatically detects changes and redeploys
- Manual trigger: Go to the service → click "Deploy"

## Support

For issues:
- Check the logs in Render Dashboard
- Verify environment variables are set correctly
- Test locally with production settings first

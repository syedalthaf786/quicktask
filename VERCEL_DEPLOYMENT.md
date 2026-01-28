# Deploy QuickTask Frontend on Vercel

This guide explains how to deploy the QuickTask React frontend on Vercel while keeping the backend on Render.

## Architecture

```
Frontend (Vercel)     →    Backend (Render)
https://your-app.vercel.app  https://quicktask-backend-ro57.onrender.com
```

## Deployment Steps

### Step 1: Push Code Changes

```bash
git add .
git commit -m "Configure for Vercel deployment"
git push
```

### Step 2: Deploy Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Root Directory**: `frontend`
5. Add Environment Variable:
   - Key: `VITE_API_URL`
   - Value: `https://quicktask-backend-ro57.onrender.com/api`
6. Click "Deploy"

### Step 3: Update Render CORS (Optional)

For production, you can restrict CORS to your Vercel domain:

1. Go to Render Dashboard
2. Open your backend service
3. Add Environment Variable:
   - Key: `CORS_ORIGIN`
   - Value: `https://your-vercel-app.vercel.app`
4. Redeploy

### Step 4: Access Your Application

- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://quicktask-backend-ro57.onrender.com`

## Environment Variables

| Variable | Description | Where to Set |
|----------|-------------|--------------|
| `VITE_API_URL` | Backend API URL | Vercel |
| `DATABASE_URL` | PostgreSQL connection | Render |
| `JWT_SECRET` | JWT secret key | Render |
| `CORS_ORIGIN` | Allowed frontend origin | Render (optional) |
| `NODE_ENV` | Environment | Render |

## Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGIN` in Render matches your Vercel URL
- Include `https://` but without trailing slash

### API Not Found
- Check `VITE_API_URL` ends with `/api`
- Verify backend is running at `https://quicktask-backend-ro57.onrender.com`

### Login Not Working
- Ensure database is set up on Render
- Check browser console for network errors

## Demo Credentials

- Email: demo@quicktask.com
- Password: password123

## Free Tier Limits

- Vercel: 100GB bandwidth, 100 hours build time/month
- Render: 750 hours/month for web services

This setup is fully free for personal projects and demos.

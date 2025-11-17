# Deployment Guide

This guide covers deploying the Professional ML Engineer Exam Prep application to production on Vercel.

## Prerequisites

- Node.js 18+ installed
- A Supabase project (free tier is sufficient)
- A Vercel account (free tier is sufficient)
- Git repository (GitHub, GitLab, or Bitbucket)

---

## 📋 Pre-Deployment Checklist

### 1. Database Setup

Before deploying, ensure your Supabase database is properly configured:

#### Run Analytics SQL Functions

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/analytics_functions.sql`
4. Paste and run in the SQL Editor
5. Verify all 5 functions were created successfully

#### Verify Tables

Ensure these tables exist:
- ✅ `users` (via Supabase Auth)
- ✅ `topics`
- ✅ `questions`
- ✅ `question_topics`
- ✅ `user_attempts`
- ✅ `study_sessions`

### 2. Environment Variables

Create a `.env` file locally for testing (already in `.gitignore`):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from:
- Supabase Dashboard → Settings → API
- Project URL
- Project API keys → `anon` `public`

---

## 🚀 Deploying to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push to Git**
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Import Project to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click **"Add New Project"**
   - Import your Git repository
   - Vercel will auto-detect Vite framework

3. **Configure Environment Variables**
   - In Vercel project settings, go to **Environment Variables**
   - Add the following variables:
     ```
     VITE_SUPABASE_URL = your_supabase_project_url
     VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
     ```
   - Set for: **Production**, **Preview**, and **Development**

4. **Deploy**
   - Click **"Deploy"**
   - Wait for build to complete (~2-3 minutes)
   - Your app will be live at `your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # First deployment
   vercel

   # Production deployment
   vercel --prod
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

---

## ⚙️ Build Configuration

The project uses the following build settings (configured in `vercel.json`):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### Build Optimizations

The production build includes:
- ✅ Code splitting via React.lazy()
- ✅ Asset optimization and compression
- ✅ Tree shaking for minimal bundle size
- ✅ CSS minification
- ✅ Image optimization
- ✅ Long-term caching for static assets

---

## 🔒 Security Headers

The deployment includes security headers (configured in `vercel.json`):

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Cache-Control` for optimized asset caching

---

## 🧪 Testing Deployment

### 1. Smoke Test

After deployment, verify these critical flows:

- [ ] Can navigate to the site
- [ ] Can sign in / sign up
- [ ] Dashboard loads correctly
- [ ] Can start practice mode
- [ ] Analytics page loads (after completing questions)
- [ ] Exam simulation mode works

### 2. Performance Test

Use these tools to verify performance:

- **Lighthouse** (Chrome DevTools)
  - Target: 90+ Performance score
  - Target: 100 Accessibility score
  - Target: 90+ Best Practices score

- **WebPageTest**
  - Test from multiple locations
  - Verify First Contentful Paint < 2s
  - Verify Time to Interactive < 3s

---

## 🔄 Continuous Deployment

Vercel automatically deploys when you push to your repository:

### Production Deployments
- **Branch**: `main` or `master`
- **Trigger**: Push or merge to main branch
- **URL**: `your-project.vercel.app`

### Preview Deployments
- **Branch**: Any non-production branch
- **Trigger**: Push or pull request
- **URL**: Unique preview URL per deployment

---

## 🐛 Troubleshooting

### Build Fails

**Issue**: "Module not found" errors
```bash
# Solution: Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Issue**: Environment variables not working
```bash
# Ensure variable names start with VITE_
VITE_SUPABASE_URL=...  ✅
SUPABASE_URL=...       ❌
```

### Runtime Errors

**Issue**: Blank page after deployment
- Check browser console for errors
- Verify Supabase URL and keys are correct
- Ensure Supabase RLS policies are set correctly

**Issue**: Analytics not loading
- Verify SQL functions were created in Supabase
- Check Supabase logs for errors
- Ensure user has attempted at least one question

---

## 📊 Monitoring

### Vercel Analytics (Built-in)

Enable Vercel Analytics for free:
1. Go to project settings
2. Navigate to **Analytics**
3. Enable **Audience** and **Web Vitals**

### Error Tracking

For production error tracking, consider integrating:
- Sentry (recommended)
- LogRocket
- Rollbar

---

## 🔄 Updating After Deployment

### Code Updates

```bash
# Make changes locally
git add .
git commit -m "Update: description"
git push origin main

# Vercel auto-deploys within ~2 minutes
```

### Database Updates

For schema changes:
1. Test migrations locally first
2. Apply to production Supabase via SQL Editor
3. Deploy app updates
4. Run smoke tests

---

## 📈 Performance Tips

### Post-Deployment Optimizations

1. **Enable Vercel Edge Network**
   - Automatic CDN for static assets
   - Already configured via `vercel.json`

2. **Monitor Core Web Vitals**
   - LCP (Largest Contentful Paint): < 2.5s
   - FID (First Input Delay): < 100ms
   - CLS (Cumulative Layout Shift): < 0.1

3. **Database Optimization**
   - Enable Supabase connection pooling
   - Add indexes on frequently queried columns
   - Monitor query performance in Supabase dashboard

---

## 🎉 Success!

Your Professional ML Engineer Exam Prep app is now live!

**Next Steps:**
1. Share your deployment URL
2. Monitor analytics and performance
3. Gather user feedback
4. Iterate and improve

For issues or questions, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- Project README for additional help

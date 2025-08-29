# 🚀 Production Deployment Guide

## Quick Vercel Deployment

### 1. GitHub Integration
1. **Import Repository:** https://vercel.com/import
2. **Connect GitHub:** Select your gastrotools-production repository
3. **Framework:** Next.js (auto-detected)
4. **Root Directory:** `.` (default)

### 2. Environment Variables
**Vercel Dashboard → Settings → Environment Variables:**

```bash
DATABASE_URL=postgresql://postgres:Brandaris2025@db.znpqigcfqpqpvvpvfalt.supabase.co:5432/postgres
JWT_SECRET=gastrotools-production-jwt-secret-2024-secure
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app
RESEND_API_KEY=your_resend_key_here
```

### 3. Database Setup
**After first deployment:**
```bash
# Vercel CLI in project root:
vercel env pull .env.local
npx prisma migrate deploy
npx prisma db seed
```

### 4. Custom Domain (Optional)
1. **Vercel Dashboard → Domains**
2. **Add:** gastrotools.de
3. **Configure DNS:** Point to Vercel

---

## Email Service Setup (Resend)

### 1. Create Resend Account
- **URL:** https://resend.com
- **Plan:** Free (100 emails/day)

### 2. Get API Key
- **Dashboard → API Keys → Create**
- **Copy:** `re_...` key
- **Add to Vercel:** `RESEND_API_KEY`

### 3. Verify Email Domain
- **Resend → Domains → Add Domain**
- **Use:** gastrotools.de (if you own it)
- **Or:** Use resend.dev for testing

---

## Database Migration Commands

### Production Deploy
```bash
npx prisma migrate deploy    # Apply all migrations
npx prisma generate          # Update client
```

### Development
```bash
npx prisma db push          # Push schema changes
npx prisma studio           # GUI database manager
```

---

## Health Checks

### API Endpoints
- **Health:** `/api/health` 
- **Demo Login:** `/api/auth/login`
- **Registration:** `/api/auth/register`

### Test Commands
```bash
# Test registration
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "test123"}'

# Test login  
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@gastrotools.de", "password": "demo123"}'
```

---

## Troubleshooting

### Common Issues
1. **Database "unhealthy"** → Check DATABASE_URL format
2. **Registration fails** → Verify Prisma schema is migrated
3. **Email not sending** → Check RESEND_API_KEY
4. **Build fails** → Check all environment variables set

### Support
- **Logs:** Vercel Dashboard → Functions → Logs
- **Monitoring:** `/admin/monitoring` (after auth)
- **Health Check:** `/api/health`

---

**🎯 This guide ensures bulletproof production deployment for professional use and Upwork testing.**
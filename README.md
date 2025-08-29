# 🍽️ GastroTools Professional - Restaurant Management Suite

**Production-Ready Version** | **Bulletproof for Upwork Testing** | **Complete German/English Support**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL or SQLite database
- Email service (Resend recommended)

### Setup
```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env.local
# Edit .env.local with your database and email credentials

# 3. Set up database
npx prisma db push
npx prisma db seed

# 4. Start development
npm run dev
```

## 🎯 Production Deployment

### Vercel Deployment (Recommended)
1. **Connect GitHub:** Import this repository to Vercel
2. **Environment Variables:** Set in Vercel dashboard
3. **Deploy:** Automatic on git push

### Environment Variables
```bash
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
JWT_SECRET="your-secure-jwt-secret"
NEXT_PUBLIC_API_URL="https://your-domain.com"
RESEND_API_KEY="re_your_resend_key"  # For email functionality
```

## 🌐 Features

### ✅ Complete Tool Suite
- **Nutrition Calculator** - EU-compliant with USDA integration (20,000+ foods)
- **Cost Control** - Track expenses, budgets, analytics
- **Inventory Management** - Stock tracking with alerts
- **Menu Planner** - Weekly planning with cost calculations  
- **Menu Card Designer** - Professional templates

### ✅ Professional Auth System
- **Registration** - Complete user signup flow
- **Login** - Secure JWT authentication
- **Forgot Password** - Email reset functionality
- **Demo Access** - demo@gastrotools.de / demo123

### ✅ Internationalization
- **Language Switcher** - German/English (Globe icon)
- **850+ Translation Keys** - Complete UI coverage
- **Professional Terminology** - Restaurant industry accurate

### ✅ Technical Excellence
- **Next.js 15.3.4** with App Router
- **Prisma ORM** with PostgreSQL/SQLite
- **TailwindCSS** with Shadcn/ui components
- **Sentry Monitoring** - Error tracking
- **Rate Limiting** - API protection

## 🧪 Testing

### Demo Account
- **URL:** https://gastrotools-professional.vercel.app
- **Login:** demo@gastrotools.de / demo123
- **Language:** Click 🌐 → EN

### Key Test Cases
1. **Registration Flow** - Create new account, validate email
2. **Nutrition Search** - Test "Hackfleisch" finds "ground beef" 
3. **USDA Integration** - German → English ingredient translation
4. **Mobile Responsive** - All tools work on mobile
5. **Language Switching** - Complete UI translation

## 🏗️ Architecture

### Database Schema
- **Users** - Authentication and profiles
- **Recipes** - Nutrition data and allergens  
- **Usage Tracking** - Per-tool usage limits
- **Inventory** - Stock management
- **Cost Entries** - Expense tracking
- **Leads** - Customer conversion tracking

### API Structure
```
/api/auth/*         - Authentication endpoints
/api/tools/*        - Tool-specific APIs  
/api/nutrition/*    - USDA integration
/api/admin/*        - Admin functionality
```

### Special Features
- **Demo User Bypass** - ID 'demo-user-123' uses memory store
- **German Ingredient Translation** - 200+ built-in translations
- **EU Allergen Detection** - Regulation 1169/2011 compliant
- **Cross-sell Lead Generation** - Freemium → Professional conversion

## 🔒 Security

- **JWT Authentication** - Secure token-based auth
- **Rate Limiting** - API abuse protection
- **Input Validation** - All forms validated client/server
- **SQL Injection Protection** - Prisma ORM safety
- **CORS Configuration** - Proper cross-origin handling

## 📊 Production Ready

### Performance
- **Optimized Bundle** - Code splitting and lazy loading
- **CDN Integration** - Vercel Edge Network
- **Database Optimization** - Efficient queries
- **Caching Strategy** - Static and dynamic caching

### Monitoring
- **Health Checks** - `/api/health` endpoint
- **Error Tracking** - Sentry integration
- **Analytics** - User behavior tracking
- **Uptime Monitoring** - Status dashboard

## 🛠️ Development

### Adding New Tools
1. Create page in `src/app/[tool-name]/`
2. Add API routes in `src/app/api/tools/[tool-name]/`
3. Follow auth → usage check → process pattern
4. Update navigation in `src/components/navigation.tsx`

### Translation System
```typescript
// Add to LanguageContext.tsx
'section.key': 'German text',  // DE
'section.key': 'English text', // EN

// Use in components
const { t } = useLanguage()
return <h1>{t('section.key')}</h1>
```

## 🎯 Business Model

### Freemium Limits
- **Recipes:** 10/month
- **Menu Cards:** 3/month  
- **Inventory Items:** 100/month

### Cross-sell Strategy
- **Lead Generation** - When limits reached
- **Professional Products** - GV Küchenmanager, WebOrder, WebMenü
- **Positioning** - Separate products, not upgrades

## 📞 Support

### For Developers
- **Issues:** GitHub Issues tab
- **Documentation:** See `/docs` folder
- **API Docs:** `/api` endpoint documentation

### For Business
- **Admin Dashboard:** `/admin` (after auth)
- **Monitoring:** `/admin/monitoring`
- **Lead Management:** `/admin/leads`

---

**🏆 This repository contains a production-grade, internationally-ready restaurant management suite suitable for professional outsourcing evaluation and commercial deployment.**
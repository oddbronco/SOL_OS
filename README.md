# Speak Platform

Enterprise stakeholder discovery platform for gathering requirements and generating project documentation.

## 🚀 Production Deployment

### Domains
- **Landing**: https://withspeak.com (Webflow marketing site)
- **App**: https://app.withspeak.com (Customer portal)
- **Admin**: https://admin.withspeak.com (Platform administration)
- **Respond**: https://respond.withspeak.com (Stakeholder interviews)

### Development URLs
- **Main**: https://withspeak.netlify.app (main branch)
- **Previews**: https://deploy-preview-123--withspeak.netlify.app (PR previews)

### Architecture
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Netlify (Auto-deploy from GitHub)
- **DNS**: GoDaddy

## 🔧 Development

### Local Development
```bash
npm install
npm run dev
```

### Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase credentials.

### Database Migrations
Run migrations in Supabase dashboard SQL editor in order.

## 📦 Deployment Process

1. **Develop in Bolt** - Make changes and test
2. **Export files** - Download updated files from Bolt
3. **Push to GitHub** - Commit and push changes
4. **Auto-deploy** - Netlify automatically deploys from main branch
5. **Verify** - Test on production domains

### Branch Strategy
- `main` → Production deployment
- `feature/*` → Deploy previews

## 🔒 Security

- Private GitHub repository
- Environment variables in Netlify
- RLS policies in Supabase
- HTTPS enforced on all domains
- Subdomain-based access control

## 💰 Cost Monitoring

Storage costs are tracked per customer in the `storage_usage` table:
- Storage: $0.021/GB/month
- Bandwidth: $0.09/GB
- Automatic calculation via database functions

## 🛠 Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Supabase** for backend services
- **OpenAI API** for AI features
- **Netlify** for hosting and deployment
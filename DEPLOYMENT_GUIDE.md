# Speak Platform - Complete Deployment Setup Guide

## 🎯 Overview

This guide will walk you through deploying the Speak Platform with:
- **Webflow**: Marketing landing page at `withspeak.com`
- **Netlify**: Application platform with 3 subdomains
- **Supabase**: Backend database and authentication
- **GoDaddy**: Domain management

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] GoDaddy domain: `withspeak.com`
- [ ] GitHub repository with your code
- [ ] Netlify account
- [ ] Supabase project
- [ ] Webflow account (for landing page)

---

## 🗄️ Step 1: Supabase Database Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project: `speak-platform-prod`
3. Choose region closest to your users
4. Save your project URL and anon key

### 1.2 Run Database Migrations
1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file in `/supabase/migrations/` in chronological order
3. Verify all tables are created successfully

### 1.3 Configure Authentication
1. Go to Authentication → Settings
2. **Site URL**: `https://app.withspeak.com`
3. **Redirect URLs**: Add these URLs:
   ```
   https://app.withspeak.com
   https://admin.withspeak.com
   https://respond.withspeak.com
   http://localhost:5173 (for development)
   ```

### 1.4 Set Up Storage Bucket
1. Go to Storage → Create bucket
2. **Bucket name**: `interview-files`
3. **Public**: Enable public access
4. **File size limit**: 100MB

### 1.5 Configure Row Level Security
All tables should already have RLS enabled via migrations. Verify in Database → Tables.

---

## 🌐 Step 2: Domain & DNS Configuration

### 2.1 GoDaddy DNS Records
Log into GoDaddy DNS management and add these records:

#### For Webflow Landing Page:
```
Type: A Record
Name: @ (root)
Value: [Webflow will provide IP addresses]

Type: CNAME  
Name: www
Value: proxy-ssl.webflow.com
```

#### For Netlify Subdomains:
```
Type: CNAME
Name: app
Value: withspeak.netlify.app

Type: CNAME
Name: admin  
Value: withspeak.netlify.app

Type: CNAME
Name: respond
Value: withspeak.netlify.app
```

### 2.2 Verify DNS Propagation
Use [whatsmydns.net](https://whatsmydns.net) to check DNS propagation (can take 24-48 hours).

---

## 🚀 Step 3: Netlify Deployment

### 3.1 Connect GitHub Repository
1. Go to [netlify.com](https://netlify.com)
2. **New site from Git** → Connect to GitHub
3. Select your repository
4. **Build settings**:
   ```
   Base directory: (leave empty)
   Build command: npm run build
   Publish directory: dist
   ```

### 3.2 Configure Environment Variables
Go to Site settings → Environment variables and add:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_LANDING_DOMAIN=withspeak.com
VITE_APP_DOMAIN=app.withspeak.com
VITE_ADMIN_DOMAIN=admin.withspeak.com
VITE_RESPOND_DOMAIN=respond.withspeak.com
VITE_ENVIRONMENT=production
```

### 3.3 Add Custom Domains
Go to Domain settings → Add custom domain:

1. **Add**: `app.withspeak.com`
   - Set as **primary domain**
   - Enable HTTPS (auto-provisioned)

2. **Add**: `admin.withspeak.com`
   - Enable HTTPS

3. **Add**: `respond.withspeak.com`
   - Enable HTTPS

### 3.4 Configure Deploy Settings
Go to Site settings → Build & deploy:

```
✅ Production branch: main
✅ Deploy previews: Automatically build deploy previews for all pull requests
❌ Branch deploys: None (no staging branch yet)
```

### 3.5 Deploy Site
1. **Trigger deploy**: Site settings → Deploys → Trigger deploy
2. **Monitor build**: Check build logs for any errors
3. **Verify deployment**: Visit `withspeak.netlify.app`

---

## 🎨 Step 4: Webflow Landing Page Setup

### 4.1 Create Webflow Project
1. Create new Webflow project
2. Design your landing page
3. Add domain in Webflow: `withspeak.com`

### 4.2 Configure Webflow Domain
1. Go to Project settings → Hosting
2. Add custom domain: `withspeak.com`
3. Webflow will provide DNS instructions
4. Update your GoDaddy A records with Webflow's IPs

---

## 🔐 Step 5: Security & Access Control

### 5.1 Create Master Admin Account
1. Go to your Supabase project → Authentication → Users
2. Create user manually or use the signup flow
3. Update user metadata:
   ```json
   {
     "is_master_admin": true,
     "full_name": "Your Name",
     "company_name": "Your Company"
   }
   ```

### 5.2 Create Access Codes
1. Sign in to `admin.withspeak.com`
2. Go to Platform Admin → Access Codes
3. Create access codes for new user signups

### 5.3 Test Authentication Flow
1. **Test signup**: Use access code at `app.withspeak.com`
2. **Test admin access**: Verify admin panel at `admin.withspeak.com`
3. **Test stakeholder flow**: Create test interview at `respond.withspeak.com`

---

## 🧪 Step 6: Testing & Verification

### 6.1 Domain Testing
Verify each domain loads correctly:
- [ ] `https://withspeak.com` → Webflow landing page
- [ ] `https://app.withspeak.com` → Customer application
- [ ] `https://admin.withspeak.com` → Platform admin (master admin only)
- [ ] `https://respond.withspeak.com/test/test` → Interview page (should show not found)

### 6.2 Application Flow Testing
1. **Create account** at `app.withspeak.com`
2. **Add client** and **create project**
3. **Add stakeholders** and **generate questions**
4. **Create interview session** and test stakeholder URL
5. **Test admin functions** at `admin.withspeak.com`

### 6.3 Stakeholder Interview Testing
1. Generate stakeholder interview URL: `respond.withspeak.com/{project_id}/{stakeholder_id}?pwd={password}`
2. Test password authentication
3. Test question answering (text, audio, video)
4. Verify completion flow
5. Check SEO protection (should have noindex headers)

---

## 📊 Step 7: Monitoring & Analytics

### 7.1 Netlify Analytics
Enable Netlify Analytics for traffic monitoring:
- Site settings → Analytics → Enable

### 7.2 Supabase Monitoring
Monitor database usage:
- Supabase Dashboard → Settings → Usage

### 7.3 Error Tracking
Monitor build logs and runtime errors:
- Netlify → Deploys → Function logs
- Browser console for client-side errors

---

## 🔧 Step 8: Production Configuration

### 8.1 Performance Optimization
Verify these settings in `netlify.toml`:
- [ ] Asset caching enabled
- [ ] Compression enabled
- [ ] Security headers configured

### 8.2 Backup Strategy
- [ ] Supabase automatic backups enabled
- [ ] GitHub repository backed up
- [ ] Environment variables documented securely

### 8.3 SSL Certificates
Verify HTTPS is working on all domains:
- [ ] `https://app.withspeak.com` 
- [ ] `https://admin.withspeak.com`
- [ ] `https://respond.withspeak.com`

---

## 🚨 Troubleshooting Common Issues

### DNS Issues
**Problem**: Domain not resolving
**Solution**: 
- Check DNS propagation at [whatsmydns.net](https://whatsmydns.net)
- Verify CNAME records point to `withspeak.netlify.app`
- Wait 24-48 hours for full propagation

### Build Failures
**Problem**: Netlify build failing
**Solution**:
- Check build logs in Netlify dashboard
- Verify environment variables are set
- Ensure all dependencies are in `package.json`

### Authentication Issues
**Problem**: Users can't sign in
**Solution**:
- Verify Supabase redirect URLs include your domains
- Check environment variables are correct
- Ensure RLS policies allow user access

### Subdomain Routing Issues
**Problem**: Wrong app loading on subdomain
**Solution**:
- Check domain configuration in Netlify
- Verify redirect rules in `netlify.toml`
- Clear browser cache and test in incognito

---

## 📈 Step 9: Go-Live Checklist

### Pre-Launch
- [ ] All domains resolving correctly
- [ ] SSL certificates active on all subdomains
- [ ] Database migrations completed
- [ ] Master admin account created
- [ ] Access codes generated for initial users
- [ ] Webflow landing page published
- [ ] Test complete user journey end-to-end

### Launch Day
- [ ] Monitor Netlify deploy logs
- [ ] Check Supabase database connections
- [ ] Test user registration flow
- [ ] Verify stakeholder interview URLs work
- [ ] Monitor for any errors in browser console

### Post-Launch
- [ ] Set up monitoring alerts
- [ ] Document any issues and solutions
- [ ] Plan regular backups
- [ ] Monitor usage and performance

---

## 🔗 Quick Reference Links

### Development URLs
- **Main App**: https://withspeak.netlify.app
- **Deploy Previews**: https://deploy-preview-{PR#}--withspeak.netlify.app

### Production URLs  
- **Landing**: https://withspeak.com (Webflow)
- **Customer App**: https://app.withspeak.com
- **Platform Admin**: https://admin.withspeak.com
- **Stakeholder Interviews**: https://respond.withspeak.com

### Admin Dashboards
- **Netlify**: https://app.netlify.com/sites/withspeak
- **Supabase**: https://supabase.com/dashboard/project/your-project-ref
- **GoDaddy**: https://dcc.godaddy.com/manage/withspeak.com/dns
- **Webflow**: https://webflow.com/dashboard

---

## 🆘 Support & Maintenance

### Regular Maintenance
- **Weekly**: Check Supabase usage and costs
- **Monthly**: Review Netlify build minutes and bandwidth
- **Quarterly**: Update dependencies and security patches

### Getting Help
- **Netlify Support**: https://docs.netlify.com
- **Supabase Support**: https://supabase.com/docs
- **Platform Issues**: Check browser console and Netlify function logs

---

## 🎉 You're Ready to Deploy!

Follow this guide step by step, and you'll have a fully functional, professional platform deployed across multiple subdomains with proper security, monitoring, and scalability built in.

**Next Steps**: Start with Supabase setup, then move to Netlify, and finish with domain configuration. Take your time with DNS changes as they can take up to 48 hours to fully propagate.
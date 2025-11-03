# Interview Link Deployment Checklist

## Problem Fixed
The interview page at `https://interviews.solprojectos.com/i/{token}?pwd={password}` was showing a blank page due to:
1. Domain mismatch in netlify.toml (speakprojects.com vs solprojectos.com)
2. Missing error handling that left the page in loading state
3. Inconsistent domain references across the codebase

## Changes Made

### 1. Unified All Domains to `solprojectos.com`
- ✅ Updated netlify.toml redirects
- ✅ Updated netlify.toml headers
- ✅ Updated App.tsx domain checks
- ✅ Updated config/environment.ts
- ✅ Updated main.tsx comments
- ✅ All interview URL generators already used solprojectos.com

### 2. Fixed Interview Page Loading Issues
- ✅ Added `setLoading(false)` to all error paths
- ✅ Added `setSessionState('not_found')` to all error cases
- ✅ Fixed useEffect dependency warning with loadSession

### 3. Domain Structure
```
Main Domain: solprojectos.com
├── app.solprojectos.com          (Main app - logged in users)
├── admin.solprojectos.com        (Admin panel - master admins only)
├── interviews.solprojectos.com   (Interview responses - public with password)
└── respond.solprojectos.com      (Alternative interview format)
```

## Netlify Setup Required

### Step 1: Domain Aliases
In Netlify Dashboard → Domain Management → Domains, add these domain aliases:
- `interviews.solprojectos.com`
- `app.solprojectos.com`
- `admin.solprojectos.com`
- `respond.solprojectos.com`

### Step 2: DNS Configuration
In your DNS provider (where solprojectos.com is hosted), add these CNAME records:

```
Type: CNAME
Name: interviews
Value: <your-netlify-site>.netlify.app
TTL: 3600

Type: CNAME
Name: app
Value: <your-netlify-site>.netlify.app
TTL: 3600

Type: CNAME
Name: admin
Value: <your-netlify-site>.netlify.app
TTL: 3600

Type: CNAME
Name: respond
Value: <your-netlify-site>.netlify.app
TTL: 3600
```

### Step 3: Environment Variables
Verify these are set in Netlify → Site Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://bfjyaloyehlwmtqtqnpt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ENVIRONMENT=production
```

### Step 4: SSL Certificates
After adding domain aliases, Netlify will automatically provision SSL certificates.
Wait 5-10 minutes for SSL to complete before testing.

## Testing Interview Links

### Test URLs Format:
```
https://interviews.solprojectos.com/i/{SESSION_TOKEN}?pwd={PASSWORD}
```

### Example URL:
```
https://interviews.solprojectos.com/i/YwJdFAGErSElXgtNYDUxo7PEgNiMkc-2?pwd=56EF811
```

### Expected Behavior:
1. ✅ Page loads (not blank)
2. ✅ Auto-authenticates with password from URL
3. ✅ Shows stakeholder name and project details
4. ✅ Displays interview progress
5. ✅ "Ready to Begin?" button appears
6. ✅ Questions load when clicked

### Browser Console Should Show:
```
🔍 InterviewPage Loading...
📍 URL: https://interviews.solprojectos.com/i/YwJdFAGErSElXgtNYDUxo7PEgNiMkc-2?pwd=56EF811
🚀 loadSession called
🔍 Loading interview session: YwJdFAGErSElXgtNYDUxo7PEgNiMkc-2
✅ Session loaded: {session_token: "...", ...}
✅ Stakeholder loaded: {name: "...", ...}
✅ Project loaded: {name: "...", ...}
✅ Session loaded successfully
🔓 Auto-authenticating with URL password...
✅ Authentication successful
```

## How to Share Interview Links

### From the App:
1. Go to Project → Interviews tab
2. Click on an interview session row
3. Modal opens with interview details
4. Click "Open" button
5. New window opens with shareable URL
6. Copy URL from browser address bar
7. Share URL with stakeholder via email/SMS

### URL Format:
The URL automatically includes the password as a query parameter:
```
https://interviews.solprojectos.com/i/{TOKEN}?pwd={PASSWORD}
```

This allows one-click access for stakeholders - no separate password needed!

## Troubleshooting

### If Interview Page is Still Blank:

1. **Check DNS Propagation**
   ```bash
   nslookup interviews.solprojectos.com
   ```
   Should point to Netlify's servers

2. **Check Netlify Deploy**
   - Ensure latest code is deployed
   - Check deploy log for errors
   - Verify all environment variables are set

3. **Check Browser Console**
   - Open DevTools → Console
   - Look for error messages
   - Check Network tab for failed requests

4. **Check Supabase RLS Policies**
   - Ensure anonymous access is allowed for:
     - interview_sessions (select where session_token matches)
     - stakeholders (select where id matches)
     - projects (select where id matches)
     - questions (select where project_id matches)
     - interview_responses (select/insert where session_id matches)

### Common Issues:

**404 Error**: DNS not configured or Netlify alias not added
**SSL Error**: Certificate provisioning still in progress (wait 10 min)
**Blank Page**: Netlify redirects not working (check netlify.toml deployed)
**Auth Failed**: Password incorrect or session expired
**Questions Not Loading**: RLS policies too restrictive

## Production Checklist

Before sharing interview links with real stakeholders:

- [ ] All Netlify domain aliases added
- [ ] All DNS CNAME records created
- [ ] SSL certificates provisioned (green lock icon)
- [ ] Environment variables set in Netlify
- [ ] Latest code deployed to production
- [ ] Test interview link works end-to-end
- [ ] Questions load and can be answered
- [ ] Responses save to database
- [ ] No console errors
- [ ] Mobile responsive (test on phone)

## Support

If issues persist after following this checklist:
1. Check Netlify deploy logs
2. Check Supabase logs
3. Check browser console for JavaScript errors
4. Verify all RLS policies are correct

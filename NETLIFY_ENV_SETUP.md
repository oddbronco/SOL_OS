# Netlify Environment Variables Setup

## THE PROBLEM

The JavaScript bundle on `interviews.solprojectos.com` doesn't contain the Supabase credentials, which causes the app to fail silently and show a blank page.

**Why?** Environment variables must be set in Netlify BEFORE building. Vite embeds them at build time.

## SOLUTION: Set Environment Variables in Netlify

### Step 1: Go to Netlify Dashboard
1. Log into https://app.netlify.com
2. Select your site
3. Go to **Site Settings** → **Environment Variables**

### Step 2: Add These Variables

Click "Add a variable" and add each of these:

| Key | Value | Scope |
|-----|-------|-------|
| `VITE_SUPABASE_URL` | `https://bfjyaloyehlwmtqtqnpt.supabase.co` | All deploys |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmanlhbG95ZWhsd210cXRxbnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDU2MzMsImV4cCI6MjA3NzU4MTYzM30.mHAK3dOTVrka1_mUobNoxycqhLdlILJvkvxTdU9N7TQ` | All deploys |
| `VITE_ENVIRONMENT` | `production` | Production branch only |

**CRITICAL:** Make sure these are named exactly as shown above, including the `VITE_` prefix!

### Step 3: Trigger a New Deploy

After adding the environment variables:

**Option A: Deploy via Netlify UI**
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**

**Option B: Deploy via Git Push**
```bash
git add .
git commit -m "Fix: Add environment variable support for interview pages"
git push
```

### Step 4: Verify Environment Variables Are Embedded

After the new deploy completes, run this command:

```bash
curl -s https://interviews.solprojectos.com/assets/index-*.js | grep -o 'bfjyaloyehlwmtqtqnpt' | head -1
```

**Expected output:** `bfjyaloyehlwmtqtqnpt`

If you see this, the environment variables are correctly embedded!

### Step 5: Test Interview Link

Now test your interview URL:
```
https://interviews.solprojectos.com/i/YwJdFAGErSElXgtNYDUxo7PEgNiMkc-2?pwd=56EF811
```

You should see:
- ✅ Page loads (not blank)
- ✅ Password screen OR auto-authenticated interview page
- ✅ No console errors

## Verification Checklist

After deploying with environment variables:

- [ ] Netlify build completed successfully
- [ ] Environment variables show in Netlify dashboard
- [ ] Supabase URL is in the JavaScript bundle (curl test)
- [ ] Interview URL loads without blank page
- [ ] Browser console shows no errors
- [ ] Can see "Loading interview..." or password prompt

## Why This Happens

Vite replaces `import.meta.env.VITE_*` with actual values at BUILD time:

```javascript
// In source code:
const url = import.meta.env.VITE_SUPABASE_URL;

// After build (WITH env vars):
const url = "https://bfjyaloyehlwmtqtqnpt.supabase.co";

// After build (WITHOUT env vars):
const url = undefined;  // ❌ CAUSES BLANK PAGE
```

When `undefined`, Supabase client fails to initialize, causing a blank page.

## Troubleshooting

### Still seeing blank page?

1. **Check browser console for errors:**
   - Press F12
   - Go to Console tab
   - Look for red error messages
   - Share them with support

2. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or open in Incognito/Private mode

3. **Verify latest deploy:**
   - Check Netlify deploy log timestamp
   - Make sure it's after you added environment variables
   - Look for "Build succeeded" message

4. **Check Network tab:**
   - F12 → Network tab
   - Reload page
   - Look for any failed requests (red)
   - Check if JavaScript files are loading

### Common Mistakes

❌ Setting variables without `VITE_` prefix
❌ Not redeploying after adding variables
❌ Typos in variable names
❌ Using old deployment before variables were added
❌ Browser caching old JavaScript bundle

## Quick Fix Command

If you have Netlify CLI installed:

```bash
# Set environment variables
netlify env:set VITE_SUPABASE_URL "https://bfjyaloyehlwmtqtqnpt.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmanlhbG95ZWhsd210cXRxbnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDU2MzMsImV4cCI6MjA3NzU4MTYzM30.mHAK3dOTVrka1_mUobNoxycqhLdlILJvkvxTdU9N7TQ"

# Trigger deploy
netlify deploy --prod
```

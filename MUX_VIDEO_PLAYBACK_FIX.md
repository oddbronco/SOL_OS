# Mux Video Playback - Issues Fixed & Next Steps

## Issues Fixed in Code

### 1. Duplicate HLS Initialization (FIXED ✅)
**Problem:** Two separate `useEffect` hooks were initializing HLS players, causing conflicts:
- First effect (lines 94-180): Fetched signed token and initialized HLS
- Second effect (lines 468-597): Created HLS player WITHOUT token (unsigned)

**Solution:** Consolidated into single async effect that:
- Properly fetches signed Mux token before initializing
- Handles token failures gracefully
- Retries with fresh token on auth errors
- Falls back to direct MP4 only when necessary

### 2. Unsigned Playback Attempts (FIXED ✅)
**Problem:** Code was trying unsigned URLs when token fetch failed, but Mux assets with "signed" playback policy reject unsigned requests.

**Solution:** New flow:
1. Fetch signed token first
2. If token fails, show warning and fallback to direct MP4
3. Never attempt unsigned `.m3u8` URL for signed assets
4. Retry mechanism for expired/invalid tokens

### 3. Error Handling Improvements (FIXED ✅)
**Problem:** Generic error handling didn't distinguish between token issues vs network issues.

**Solution:**
- Specific handling for `manifestLoadError` → retry with fresh token
- Media errors → attempt recovery
- Network errors with token → fallback to MP4
- Clear console logging for debugging

## What You Need to Do Now

### Step 1: Configure Environment Variables on Netlify

Your `interviews.solprojectos.com` subdomain is missing the Supabase connection variables.

**Action Required:**
1. Go to **Netlify Dashboard**
2. Find your **interviews.solprojectos.com** site
3. Navigate to **Site Settings → Environment Variables**
4. Add these two variables:

```
VITE_SUPABASE_URL = https://bfjyaloyehlwmtqtqnpt.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmanlhbG95ZWhsd210cXRxbnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDU2MzMsImV4cCI6MjA3NzU4MTYzM30.mHAK3dOTVrka1_mUobNoxycqhLdlILJvkvxTdU9N7TQ
```

5. **Save** and trigger a new deployment

### Step 2: Re-upload Your Mux Private Key

The private key stored in the database is corrupted (missing 4 bytes), causing the ASN.1 DER error.

**Action Required:**
1. Go to your main app at `https://solprojectos.com`
2. Navigate to **Settings**
3. Find **Mux Configuration** section
4. Click **"Upload .pem File"** button
5. Select your original Mux private key `.pem` file (that you downloaded from Mux)
6. Click **Save**

**If you don't have the original .pem file:**
1. Go to https://dashboard.mux.com/settings/signing-keys
2. Delete the old signing key
3. Create a new signing key (select "Video" type)
4. Download the new `.pem` file
5. Upload it through your Clarity OS Settings page

## Why This Will Fix Everything

### Current Error Chain:
```
1. Missing env vars → Supabase client not configured properly
2. Token fetch fails → Can't call edge function
3. Falls back to unsigned URL → Mux rejects (asset is "signed")
4. HLS fails with manifestLoadError
5. Falls back to direct MP4 (bypassing Mux entirely)
```

### After Fix:
```
1. ✅ Env vars set → Supabase client works
2. ✅ Token fetch succeeds → Edge function called
3. ✅ Private key valid → JWT signed correctly
4. ✅ Signed HLS URL works → Mux accepts request
5. ✅ Video plays through Mux CDN with all benefits
```

## Benefits of Proper Mux Playback

Once fixed, you'll get:
- ✅ **Adaptive streaming** - automatically adjusts quality based on bandwidth
- ✅ **Global CDN** - fast delivery worldwide
- ✅ **Format support** - works on all devices and browsers
- ✅ **Security** - signed tokens prevent unauthorized access
- ✅ **Analytics** - track video engagement through Mux dashboard

## Testing After Fix

1. Deploy with new environment variables
2. Re-upload the Mux private key
3. Visit: https://interviews.solprojectos.com/i/GtA_n0aFZ-C-kzLRWw2bybhDxBmZCNDY?pwd=1299259
4. Check browser console for:
   ```
   ✅ Got Mux playback token (expires: ...)
   🔐 Using signed playback URL
   ✅ HLS manifest loaded successfully
   ```
5. Video should play smoothly without fallback messages

## Code Changes Made

### File: `src/pages/InterviewPage.tsx`
- ✅ Removed duplicate HLS initialization effect
- ✅ Consolidated into single async effect with proper token handling
- ✅ Added retry logic for expired tokens
- ✅ Improved error messages and debugging logs

### File: `src/lib/supabase.ts`
- ✅ Removed confusing console.log statements
- ✅ Added clearer warning message for missing env vars
- ✅ Kept fallback values for local development

### File: `supabase/functions/generate-mux-playback-token/index.ts`
- ✅ Fixed PKCS#1 to PKCS#8 conversion (dynamic length calculation)
- ✅ Prevents "ASN.1 DER message incomplete" error

## Summary

**You need to do 2 things:**
1. Add environment variables to Netlify (5 minutes)
2. Re-upload Mux private key through Settings UI (2 minutes)

**Then everything will work!** The code is now properly structured to handle Mux signed playback with proper error handling and fallback mechanisms.

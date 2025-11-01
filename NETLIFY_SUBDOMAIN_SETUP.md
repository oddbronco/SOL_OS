# Netlify Subdomain Setup for Interview Links

## Required Netlify Configuration

### 1. Domain Aliases
In your Netlify site settings under **Domain Management > Domains**, you need to add:

- `interviews.speakprojects.com` as a domain alias

### 2. DNS Configuration
In your DNS provider (where speakprojects.com is hosted), add a CNAME record:

```
Type: CNAME
Name: interviews
Value: <your-netlify-site>.netlify.app
TTL: 3600 (or automatic)
```

### 3. Environment Variables
Ensure these are set in Netlify's Environment Variables section:

```
VITE_SUPABASE_URL=https://bfjyaloyehlwmtqtqnpt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmanlhbG95ZWhsd210cXRxbnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDU2MzMsImV4cCI6MjA3NzU4MTYzM30.mHAK3dOTVrka1_mUobNoxycqhLdlILJvkvxTdU9N7TQ
```

### 4. Verify SSL Certificate
After adding the domain alias, Netlify will automatically provision an SSL certificate. Wait for it to complete (usually takes a few minutes).

## Testing the Setup

Once configured, test these URLs:

1. **Main interview URL format**: `https://interviews.speakprojects.com/i/{SESSION_TOKEN}?pwd={PASSWORD}`
   - Example: `https://interviews.speakprojects.com/i/INT_FF73D5DF-120?pwd=D5A8D57`

2. **Legacy interview format**: `https://interviews.speakprojects.com/interview/{SESSION_TOKEN}?pwd={PASSWORD}`

3. **Direct stakeholder format**: `https://interviews.speakprojects.com/{PROJECT_ID}/{STAKEHOLDER_ID}?pwd={PASSWORD}`

## How It Works

1. User visits interview link on `interviews.speakprojects.com` subdomain
2. Netlify serves the same React app (from `dist/` folder)
3. React Router matches the `/i/:sessionToken` route
4. InterviewPage component loads (with NO authentication required)
5. Component auto-authenticates with password from URL query parameter
6. Questions are loaded from Supabase with anonymous access (RLS policies allow this)
7. Stakeholder can view and answer questions
8. Responses are saved to Supabase

## Key Code Changes Made

1. **Fixed infinite loop**: Wrapped `loadSession`, `recordAccess`, and `handleAuthentication` with `useCallback`
2. **Added RLS policies**: Allowed anonymous access to questions and responses tables
3. **Fixed question loading**: Updated `getStakeholderQuestionAssignments` to filter by session ID
4. **Passed session to modal**: AnswerQuestionsModal now receives and uses the session object

## Browser Console Checks

When you visit the interview URL, you should see in the console:

```
🔍 InterviewPage Loading...
📍 URL: https://interviews.speakprojects.com/i/INT_FF73D5DF-120?pwd=D5A8D57
🚀 loadSession called
✅ Session loaded: {session_token: "INT_FF73D5DF-120", ...}
✅ Stakeholder loaded: {name: "Angela Park", ...}
✅ Project loaded: {name: "New Website for Samsung", ...}
🔓 Auto-authenticating with URL password...
✅ Authentication successful
```

If you see any errors, check:
- Network tab for failed API calls
- Console for error messages
- Supabase dashboard for RLS policy issues

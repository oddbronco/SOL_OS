# Interview Subdomain Setup Guide

## Overview

This guide explains how to set up the **interviews.speakprojects.com** subdomain for stakeholder interview sessions.

## Architecture

### URL Structure

**Production Interview URLs:**
```
https://interviews.speakprojects.com/interview?project={PROJECT_ID}&stakeholder={STAKEHOLDER_ID}
```

**Legacy Format (still supported):**
```
https://interviews.speakprojects.com/interview/{SESSION_TOKEN}
```

### Domain Setup

The application uses subdomain-based routing:
- **speakprojects.com** - Main domain
- **interviews.speakprojects.com** - Interview sessions (requires passcode)
- **respond.withspeak.com** - Legacy subdomain (still supported)

## Netlify Configuration

### Step 1: DNS Configuration

In your DNS provider (where speakprojects.com is hosted), add a CNAME record:

```
Type:  CNAME
Name:  interviews
Value: {your-netlify-site}.netlify.app
TTL:   3600 (or Auto)
```

### Step 2: Add Custom Domain in Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Domain Management** → **Custom domains**
3. Click **Add custom domain**
4. Enter: `interviews.speakprojects.com`
5. Click **Verify** and **Add domain**
6. Netlify will automatically provision an SSL certificate

### Step 3: Configure Domain Alias

In Netlify, configure `interviews.speakprojects.com` as a domain alias:

1. **Site settings** → **Domain management**
2. Under **Domain aliases**, add `interviews.speakprojects.com`
3. Ensure **HTTPS** is enabled

### Step 4: Verify Configuration

The `netlify.toml` file already includes the necessary redirects:

```toml
[[redirects]]
  from = "https://interviews.speakprojects.com/*"
  to = "https://interviews.speakprojects.com/index.html"
  status = 200
```

## How It Works

### 1. URL Generation

The app automatically generates the correct subdomain URL based on the environment:

```typescript
// Development
http://localhost:5173/interview?project=xxx&stakeholder=yyy

// Production
https://interviews.speakprojects.com/interview?project=xxx&stakeholder=yyy
```

### 2. Passcode Authentication

When a stakeholder visits the interview URL:
1. They see a passcode entry screen
2. The passcode is validated against the stakeholder's record
3. Upon successful authentication, questions are loaded
4. Responses are recorded and can include audio/video

### 3. Recording & Processing

The interview workflow supports:
- **Text responses** - Typed answers
- **Audio recording** - Browser-based audio capture
- **Video recording** - Browser-based video capture
- **File uploads** - Supporting documents

All recordings are:
1. Uploaded to Supabase Storage
2. Processed for transcription (if audio/video)
3. Analyzed with AI for summaries
4. Linked to the stakeholder and project

## Testing

### Local Testing

1. Start the dev server: `npm run dev`
2. Navigate to: `http://localhost:5173/interview?project={id}&stakeholder={id}`
3. Enter the stakeholder's passcode
4. Test the interview flow

### Production Testing

1. Deploy to Netlify
2. Configure DNS as described above
3. Wait for DNS propagation (5-30 minutes)
4. Visit: `https://interviews.speakprojects.com/interview?project={id}&stakeholder={id}`
5. Verify SSL certificate is active
6. Test passcode authentication
7. Test recording features

## Security Features

### SEO Protection

The subdomain is configured with no-index headers to prevent search engine indexing:

```toml
[[headers]]
  for = "https://interviews.speakprojects.com/*"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow, noarchive, nosnippet, noimageindex"
```

### Passcode Requirements

- Minimum 6 characters
- Stored securely in Supabase
- Required for every interview session
- No JWT tokens sent in URLs

### Data Security

- All data transmitted over HTTPS
- Audio/video stored in Supabase Storage with RLS
- Interview responses are encrypted at rest
- Access controlled via Row Level Security policies

## Deployment Checklist

- [ ] DNS CNAME record created for `interviews`
- [ ] Custom domain added in Netlify
- [ ] SSL certificate provisioned automatically
- [ ] Test URL accessibility
- [ ] Verify passcode authentication
- [ ] Test audio recording (requires HTTPS)
- [ ] Test video recording (requires HTTPS)
- [ ] Confirm responses are saved
- [ ] Check RLS policies are active

## Troubleshooting

### DNS Not Resolving

**Problem:** interviews.speakprojects.com doesn't resolve

**Solutions:**
1. Wait 30 minutes for DNS propagation
2. Use `dig interviews.speakprojects.com` to check DNS
3. Verify CNAME points to correct Netlify URL
4. Check DNS provider settings

### SSL Certificate Issues

**Problem:** Certificate errors or warnings

**Solutions:**
1. Wait for Netlify to provision certificate (can take 1 hour)
2. Check domain is properly verified in Netlify
3. Ensure DNS CNAME is correct
4. Try **Verify DNS configuration** in Netlify

### Recording Not Working

**Problem:** Audio/video recording fails

**Solutions:**
1. Ensure site is accessed via HTTPS (required for media)
2. Check browser permissions for microphone/camera
3. Verify Supabase Storage is configured
4. Check Storage RLS policies

## Support

For issues with:
- **DNS/Domain:** Contact your DNS provider
- **Netlify:** Check Netlify documentation or support
- **App Logic:** Check browser console for errors
- **Database:** Check Supabase logs and RLS policies

## Related Files

- `/netlify.toml` - Netlify configuration
- `/src/utils/interviewUrls.ts` - URL generation logic
- `/src/pages/InterviewPage.tsx` - Interview page component
- `/src/components/interviews/` - Interview UI components

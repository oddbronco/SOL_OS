# Storage CORS Configuration Fix

## Issue
Videos uploaded to the `project-intro-videos` storage bucket cannot be played back by stakeholders due to missing CORS headers.

**Error:** `MEDIA_ERR_SRC_NOT_SUPPORTED` or `NO_SOURCE` network state

**Root Cause:** Supabase Storage bucket needs CORS configuration to allow video playback from the interview subdomain (`interviews.solprojectos.com`).

## Solution

### Option 1: Configure CORS in Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** → **Configuration**
4. Add CORS configuration:

```json
[
  {
    "allowedOrigins": ["*"],
    "allowedMethods": ["GET", "HEAD"],
    "allowedHeaders": ["Range", "Content-Type"],
    "exposedHeaders": ["Accept-Ranges", "Content-Length", "Content-Range"],
    "maxAgeSeconds": 3600
  }
]
```

5. Save configuration
6. Videos should now play correctly

### Option 2: Use Supabase CLI (Alternative)

If you have the Supabase CLI set up:

```bash
supabase storage update project-intro-videos \
  --cors-allowed-origins "*" \
  --cors-allowed-methods "GET,HEAD" \
  --cors-allowed-headers "Range,Content-Type" \
  --cors-exposed-headers "Accept-Ranges,Content-Length,Content-Range"
```

### Option 3: More Restrictive CORS (Production)

For production, limit allowed origins to your specific domains:

```json
[
  {
    "allowedOrigins": [
      "https://interviews.solprojectos.com",
      "https://app.solprojectos.com",
      "https://solprojectos.com"
    ],
    "allowedMethods": ["GET", "HEAD"],
    "allowedHeaders": ["Range", "Content-Type"],
    "exposedHeaders": ["Accept-Ranges", "Content-Length", "Content-Range"],
    "maxAgeSeconds": 3600
  }
]
```

## Why These Headers Are Needed

- **Range**: Required for video seeking/scrubbing
- **Content-Type**: Needed to identify video MIME type
- **Accept-Ranges**: Tells browser that partial content requests are supported
- **Content-Length**: Required for video duration calculation
- **Content-Range**: Needed for range request responses

## Testing

After applying CORS configuration:

1. Clear browser cache
2. Navigate to an interview page with a video
3. Video should load and play without errors
4. Check browser console - should see `✅ Video can play`

## Troubleshooting

If videos still don't play after CORS configuration:

1. **Check bucket is public**: `storage.buckets` → `public = true`
2. **Verify CORS applied**: Use browser DevTools Network tab to check response headers
3. **Clear CDN cache**: May take a few minutes for CORS changes to propagate
4. **Test direct URL**: Open video URL directly in browser - should download/play

## Quick Check

Run this in browser console while on the interview page:

```javascript
fetch('YOUR_VIDEO_URL', { method: 'HEAD' })
  .then(r => ({
    status: r.status,
    cors: r.headers.get('access-control-allow-origin'),
    type: r.headers.get('content-type'),
    range: r.headers.get('accept-ranges')
  }))
  .then(console.log);
```

Expected output:
```javascript
{
  status: 200,
  cors: "*",  // or your domain
  type: "video/mp4",
  range: "bytes"
}
```

If `cors` is `null`, CORS is not configured correctly.

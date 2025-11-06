# CloudConvert API Setup

## Overview
CloudConvert provides automatic video format conversion for universal browser compatibility. Videos recorded in Chrome (WebM) or uploaded as MOV/AVI are automatically converted to MP4.

## Why CloudConvert?
- ✅ **Free Tier:** 25 conversions/day
- ✅ **Fast:** Typical conversion takes 10-30 seconds
- ✅ **Reliable:** 99.9% uptime, enterprise-grade service
- ✅ **Simple API:** Easy integration with Supabase Edge Functions
- ✅ **High Quality:** Professional FFmpeg-based conversion

## Setup Instructions

### 1. Create CloudConvert Account

1. Go to [CloudConvert](https://cloudconvert.com/)
2. Click "Sign Up" (top right)
3. Register with your email
4. Verify your email address

### 2. Get API Key

1. Log into your CloudConvert dashboard
2. Navigate to **Authorization** → **API Keys**
3. Click "Create new API Key"
4. Give it a name (e.g., "Video Conversion")
5. Copy the API key (starts with `eyJ...`)

### 3. Add to Supabase Environment Variables

#### For Local Development:
Add to your `.env` file:
```bash
CLOUDCONVERT_API_KEY=your_api_key_here
```

#### For Production (Supabase Dashboard):
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Edge Functions**
4. Under "Secrets", add:
   - Name: `CLOUDCONVERT_API_KEY`
   - Value: Your CloudConvert API key

### 4. Deploy the Edge Function

The edge function is already created at `supabase/functions/convert-video/index.ts`

To deploy it:

```bash
# Using Supabase CLI
supabase functions deploy convert-video

# Or push to GitHub (if using auto-deployment)
git add .
git commit -m "Add video conversion"
git push
```

## How It Works

```
User uploads WebM video
         ↓
Upload to Supabase Storage
         ↓
Mark as conversion_status: 'pending'
         ↓
Trigger Edge Function
         ↓
Edge Function calls CloudConvert API
         ↓
CloudConvert converts WebM → MP4
         ↓
Edge Function downloads MP4
         ↓
Upload MP4 to Supabase Storage
         ↓
Update database with new MP4 URL
         ↓
Delete old WebM file
         ↓
Mark as conversion_status: 'completed'
         ↓
✅ Universal MP4 available to all users
```

## Monitoring Usage

### Check Conversion Stats:
1. Log into CloudConvert dashboard
2. Go to **Usage & Billing**
3. View:
   - Conversions used today
   - Conversions remaining
   - Historical usage

### Free Tier Limits:
- **25 conversions/day** (resets daily)
- **1 GB max file size**
- **Unlimited storage** (files deleted after 24 hours)

### If You Hit Limits:
**Option 1:** Upgrade to paid plan ($9/month for 500 conversions)
**Option 2:** Guide users to upload MP4 directly
**Option 3:** Queue conversions for next day

## Testing

### Test Video Conversion:

1. **Record in Chrome** → Creates WebM
2. **Check status indicator:** "⏳ Queued for conversion"
3. **Wait 10-30 seconds**
4. **Status changes to:** "🔄 Converting to MP4..."
5. **Conversion completes:** MP4 URL updated
6. **Video now works** in Safari, Chrome, all browsers ✅

### Check Logs:

**Browser Console:**
```
🎬 Triggering conversion for webm → MP4
✅ Conversion triggered successfully
```

**Edge Function Logs** (Supabase Dashboard → Edge Functions → Logs):
```
📤 Creating CloudConvert job...
✅ Job created: abc123
⏳ Waiting for conversion to complete...
📊 Job status: processing
✅ Conversion complete, downloading MP4...
📦 Downloaded MP4: 1234567 bytes
📤 Uploading to storage
✅ Uploaded to: https://...
🎉 Conversion complete!
```

## Troubleshooting

### "CLOUDCONVERT_API_KEY not configured"
- Check that the API key is set in Supabase Edge Function secrets
- Verify the key name matches exactly: `CLOUDCONVERT_API_KEY`

### "Conversion timeout"
- CloudConvert may be slow for large files
- Check your internet connection
- Verify CloudConvert API status

### "Job creation failed"
- Check API key is valid
- Verify you haven't hit daily limit (25 conversions)
- Check CloudConvert dashboard for errors

### "Failed to download video"
- Video URL must be publicly accessible
- Check Supabase Storage permissions
- Verify CORS settings on storage bucket

## Cost Estimates

### Free Tier (25/day):
- **Perfect for:** Small teams, testing, demos
- **Supports:** ~750 conversions/month
- **Cost:** $0

### Paid Plan ($9/month):
- **Includes:** 500 conversions/month
- **Overage:** $0.022 per conversion
- **Good for:** Growing teams, production use

### Example Scenarios:

**5 videos/day:** Free tier ✅
**50 videos/day:** Paid plan (~$13.50/month)
**200 videos/day:** Paid plan + overage (~$48/month)

## Alternative Solutions (If Needed)

If CloudConvert doesn't work for your use case:

### 1. **Mux** (Video hosting + conversion)
- Pros: All-in-one solution
- Cons: More expensive ($0.005/min)

### 2. **Cloudinary** (Media management)
- Pros: Free tier, CDN included
- Cons: 25 credits = ~5-10 videos

### 3. **AWS Lambda + FFmpeg**
- Pros: Pay per use, scalable
- Cons: Complex setup, requires AWS knowledge

### 4. **User-side conversion**
- Pros: Zero cost
- Cons: User experience, requires tools

## Summary

CloudConvert provides a simple, reliable, cost-effective solution for automatic video conversion. With the free tier, you get 25 conversions per day - perfect for most use cases. The integration is seamless, and videos are converted automatically in the background without user intervention.

**Key Benefits:**
- ✅ Universal browser compatibility (MP4)
- ✅ Automatic background conversion
- ✅ Fast (10-30 seconds typical)
- ✅ Free tier available
- ✅ No client-side processing
- ✅ Professional quality output

# Mux Video Integration

Mux has been integrated to replace CloudConvert for professional video hosting with automatic transcoding.

## What Changed

### Removed
- CloudConvert API integration
- FFmpeg browser-based conversion
- Manual video format handling
- Complex conversion status tracking

### Added
- Mux Video API integration
- Automatic transcoding to all formats
- Global CDN delivery
- Adaptive streaming support

## Database Changes

### Migration: `remove_cloudconvert_add_mux.sql`

**Removed columns from `user_settings`:**
- `cloudconvert_api_key`

**Added columns to `user_settings`:**
- `mux_token_id` - Mux API Token ID
- `mux_token_secret` - Mux API Token Secret

**Removed columns from `project_intro_videos`:**
- `conversion_status`
- `conversion_started_at`
- `conversion_completed_at`
- `conversion_error`
- `cloudconvert_job_id`

**Added columns to `project_intro_videos`:**
- `mux_asset_id` - Mux Asset ID after upload
- `mux_playback_id` - Mux Playback ID for streaming
- `mux_status` - Status: `pending`, `ready`, `error`
- `processing_error` - Error message if processing fails

## Setup Instructions

### 1. Create Mux Account

1. Visit https://dashboard.mux.com
2. Sign up for free account ($20 credit included)
3. Go to Settings → Access Tokens
4. Click "Generate new token"
5. Enable "Mux Video" permissions
6. Copy both Token ID and Token Secret

### 2. Configure in Settings

1. Go to Settings → Integrations
2. Click "Set Up Mux"
3. Paste Token ID and Token Secret
4. Click "Save Credentials"

## How It Works

### Video Upload Flow

1. **User uploads video** → Stored in Supabase Storage (any format)
2. **System calls Mux API** → Creates asset and triggers transcode
3. **Mux processes video** → Transcodes to all formats/qualities
4. **Playback ready** → Returns playback ID for streaming

### Playing Videos

**For uploaded videos with Mux:**
```typescript
// Use HLS streaming
<video src={`https://stream.mux.com/${mux_playback_id}.m3u8`} />
```

**For external videos (YouTube/Vimeo):**
```typescript
// Use iframe embed
<iframe src={getEmbedUrl(video_url)} />
```

## Pricing

- **Free credits:** $20 (enough for ~600 minutes of video)
- **Cost per minute:** ~$0.03 (encoding + storage + delivery)
- **No limits:** Any format, any size, any device

### Cost Breakdown
- Encoding: $0.025/min
- Storage: $0.0024/min
- Delivery: $0.0008/min
- **Total: ~$0.03/min**

### Automatic Savings
- Cold storage: 40% discount after 30 days
- Cold storage: 60% discount after 90 days

## Edge Function

### `mux-upload-video`

**Endpoint:** `/functions/v1/mux-upload-video`

**Method:** POST

**Headers:**
- `Authorization: Bearer {user_token}`
- `Content-Type: application/json`

**Body:**
```json
{
  "videoId": "uuid",
  "projectId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "assetId": "asset_id",
  "playbackId": "playback_id"
}
```

## Video Assignment

Videos can be assigned at three levels (priority order):

1. **Session-specific** (highest) - Specific interview session
2. **Stakeholder-specific** - All interviews for a stakeholder
3. **Project-wide** (default) - All interviews in project

Mark a video as "Active" to use it as the default for all interviews.

## Testing

### Quick Test with External URL

1. Go to Project → Intro Videos
2. Click "Add Video"
3. Select "External URL"
4. Paste: `https://vimeo.com/148751763`
5. Works instantly (no processing needed)

### Test with Uploaded Video

1. Upload any video file (MP4, MOV, WebM, etc.)
2. Mux processes in background (~30-60 seconds)
3. Status shows "Processing..."
4. When ready, status shows "Ready"
5. Video works on all devices/browsers

## Troubleshooting

### "Mux credentials not configured"
→ Go to Settings → Integrations → Set Up Mux

### Video stuck on "Processing"
→ Check Mux dashboard for asset status
→ May take 1-2 minutes for first video

### "Processing failed"
→ Video file may be corrupted
→ Try re-uploading or use external URL

## Benefits Over CloudConvert

| Feature | CloudConvert | Mux |
|---------|-------------|-----|
| Format Support | Limited | Any format |
| Processing | Manual conversion | Automatic |
| Browser Compatibility | Manual encoding | Universal |
| CDN Delivery | No | Yes |
| Adaptive Streaming | No | Yes |
| File Size Limit | 1GB | Unlimited |
| Free Tier | 25/day | $20 credit |

## Migration Notes

Existing videos with CloudConvert will continue to work. New uploads use Mux automatically.

To migrate existing uploaded videos to Mux:
1. Re-upload the original video file
2. Delete old CloudConvert version
3. New version uses Mux processing

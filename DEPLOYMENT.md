# Deployment Guide

This guide covers deploying the Dog Custody Scheduler to Vercel with different storage options.

## Storage Options

The application supports multiple storage backends with automatic fallbacks:

1. **Vercel KV** (Recommended) - Fast key-value store, ideal for real-time data
2. **Vercel Blob** - File storage, works but less optimal for frequent updates
3. **localStorage** - Development fallback, works offline

## Vercel Deployment Steps

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts to link your project
```

### 2. Add Storage (Choose One)

#### Option A: Vercel KV (Recommended)

1. Go to your project dashboard on vercel.com
2. Navigate to "Storage" tab
3. Click "Create Database" → "KV"
4. Name your database (e.g., "dog-custody-kv")
5. Click "Create"

The environment variables will be automatically added to your project.

#### Option B: Vercel Blob

1. Go to your project dashboard on vercel.com
2. Navigate to "Storage" tab
3. Click "Create Database" → "Blob"
4. Name your storage (e.g., "dog-custody-blob")
5. Click "Create"

The environment variables will be automatically added to your project.

### 3. Environment Variables

If you need to manually set environment variables, go to your Vercel project settings → Environment Variables:

#### For Vercel KV:
```
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

#### For Vercel Blob:
```
BLOB_READ_WRITE_TOKEN=your_blob_token
```

### 4. Deploy with Storage

After adding storage, trigger a new deployment:

```bash
vercel --prod
```

## Local Development

For local development, the app automatically uses localStorage as a fallback. No configuration needed!

## Storage Selection Logic

The app automatically selects storage in this order:

1. **Vercel KV** (if configured) - Best performance for real-time updates
2. **Vercel Blob** (if configured) - Works but uses polling for updates
3. **localStorage** (always available) - Development fallback

## Monitoring Storage

The app displays current storage mode in the bottom-right corner for debugging.

## Migration Between Storage Types

If you switch storage types:

1. The app will automatically detect the new storage
2. You may need to re-initialize the app (run setup again)
3. Previous data in other storage won't be automatically migrated

## Performance Comparison

| Storage Type | Real-time Updates | Performance | Setup Complexity |
|-------------|------------------|-------------|------------------|
| Vercel KV   | Smart polling (2s) | Excellent | Easy |
| Vercel Blob | Polling (5s) | Good | Easy |
| localStorage | Instant | Excellent | None |

## Troubleshooting

### Storage Not Working
- Check environment variables in Vercel dashboard
- Redeploy after adding storage
- Check browser console for error messages

### App Shows localStorage in Production
- Verify KV/Blob environment variables are set
- Check Vercel deployment logs for connection errors
- Ensure storage is properly created in Vercel dashboard

### Data Not Syncing Between Users
- Vercel KV: Check polling is working (should sync within 2-5 seconds)
- Vercel Blob: Check polling is working (should sync within 5-10 seconds)
- localStorage: Only works for single user, no sync capability

## Support

For issues with:
- **Vercel deployment**: Check Vercel documentation
- **Storage setup**: Check Vercel Storage documentation
- **App functionality**: Check browser console for errors 
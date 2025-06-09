# Vercel Deployment Guide for Wednes'Days

This guide will help you deploy the Dog Custody Scheduler application to Vercel with full Vercel Blob and KV storage integration.

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fquibitai%2FWednes-Days.git)

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: Repository is hosted at [github.com/quibitai/Wednes-Days](https://github.com/quibitai/Wednes-Days.git)

## 🔧 Manual Deployment Steps

### 1. Import Project to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import from GitHub: `https://github.com/quibitai/Wednes-Days.git`
4. Select the repository and click "Import"

### 2. Configure Project Settings

**Framework Preset:** Next.js
**Root Directory:** `./` (leave as default)
**Build Command:** `npm run build` (auto-detected)
**Output Directory:** `.next` (auto-detected)
**Install Command:** `npm install` (auto-detected)

### 3. Set Up Vercel Storage

#### Option A: Vercel KV (Recommended for Production)

1. In your Vercel dashboard, go to the "Storage" tab
2. Click "Create Database" → "KV Database"
3. Name it `wednes-days-kv`
4. Select your region (choose closest to your users)
5. Click "Create"

#### Option B: Vercel Blob (Alternative Storage)

1. In your Vercel dashboard, go to the "Storage" tab
2. Click "Create Database" → "Blob"
3. Name it `wednes-days-blob`
4. Click "Create"

### 4. Configure Environment Variables

In your Vercel project settings, add these environment variables:

#### AI Configuration (Required for v2.2.0+):
```
OPENAI_API_KEY=your_openai_api_key
```

#### For Vercel KV:
```
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_only_token
```

#### For Vercel Blob:
```
BLOB_READ_WRITE_TOKEN=your_blob_read_write_token
```

#### Optional Firebase Configuration:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

**Note:** If no storage environment variables are provided, the app will automatically use localStorage as a fallback with full functionality.

### 5. Deploy

1. Click "Deploy" to start the deployment
2. Wait for the build to complete (usually 2-3 minutes)
3. Your app will be available at `https://your-project-name.vercel.app`

## 🛠 Advanced Configuration

### Custom Domain

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Configure DNS settings as instructed

### Performance Optimization

The app is already optimized with:
- ✅ Next.js 14 App Router
- ✅ Server-side rendering
- ✅ Automatic code splitting
- ✅ Image optimization
- ✅ Edge functions ready

### Storage Performance

- **Vercel KV**: 2-second polling for real-time updates
- **Vercel Blob**: 5-second polling for real-time updates
- **localStorage**: Instant updates with cross-tab sync

## 🎯 Latest Features Included (v2.2.0)

### 🤖 AI-Powered Schedule Rebalancing
- ✅ **GPT-4.1 Mini Integration**: Advanced AI analyzes your entire schedule context
- ✅ **3-Night Block Optimization**: Targets ideal 3-night custody periods (2-4 nights acceptable)
- ✅ **Smart Pattern Recognition**: Understands existing blocks and prevents problematic extensions
- ✅ **Zero Single-Night Policy**: AI strictly avoids creating isolated single-night assignments
- ✅ **Natural Language Commands**: Tell the AI what you want: "I can't have Emma next Friday"

### 🧠 Intelligent Conflict Resolution
- ✅ **Context-Aware Analysis**: AI considers 4-week schedule context for optimal decisions
- ✅ **Multi-Strategy Approach**: AI → Algorithmic → Minimal fallback system
- ✅ **Block Extension Prevention**: Never extends existing 3+ night blocks inappropriately
- ✅ **Handoff Minimization**: Reduces custody transitions while maintaining fairness

### 🎯 Enhanced User Experience
- ✅ **Footer Action Buttons**: Accept/Discard AI proposals directly in calendar footer
- ✅ **Real-Time Validation**: Immediate feedback on AI proposals with detailed explanations
- ✅ **Transparent Reasoning**: See exactly why AI made each scheduling decision
- ✅ **Fallback Protection**: System automatically falls back to algorithmic approach if AI fails

## 🔒 Security & Privacy

- **No personal data collection**: All schedule data stays in your chosen storage
- **Environment-based storage**: Automatic backend selection based on available services
- **Graceful fallbacks**: Works offline with localStorage if other services are unavailable
- **CORS configured**: Secure cross-origin requests

## 📊 Monitoring

Monitor your deployment:
1. **Vercel Analytics**: Built-in performance monitoring
2. **Storage Metrics**: Track usage in Vercel dashboard
3. **Real-time Logs**: View function logs in Vercel dashboard

## 🆘 Troubleshooting

### Common Issues

**Build Failures:**
- Check that all environment variables are set correctly
- Verify Node.js version compatibility (18.x recommended)

**Storage Connection Issues:**
- Verify environment variables match your Vercel storage credentials
- Check storage region matches deployment region

**Real-time Updates Not Working:**
- Ensure multiple browser tabs/devices for testing
- Check network connection for polling-based updates

### Support

- **Documentation**: Check [README.md](./README.md) for detailed feature documentation
- **Issues**: Report bugs at [GitHub Issues](https://github.com/quibitai/Wednes-Days/issues)
- **Vercel Support**: Check [Vercel Documentation](https://vercel.com/docs)

## 🎉 Post-Deployment

After successful deployment:

1. **Test the application**: Create a schedule and test unavailability scenarios
2. **Share the URL**: Send the deployment URL to your co-parent
3. **Set up notifications**: Consider browser notifications for schedule changes
4. **Backup considerations**: All data is automatically backed up in your chosen storage

Your dog custody scheduler is now live and ready to help manage your shared responsibilities! 🐕

---

**Repository**: [https://github.com/quibitai/Wednes-Days.git](https://github.com/quibitai/Wednes-Days.git) 
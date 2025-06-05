# Dog Custody Scheduler

A modern web application to help two co-parents manage a shared custody schedule for their elderly dog. The app features intelligent schedule adjustment algorithms that respect constraints designed for the dog's well-being while minimizing handoffs.

## ✨ Features

### Core Functionality
- **3-on, 3-off Default Schedule**: Automatic generation of a balanced custody rotation
- **Smart Conflict Resolution**: When someone is unavailable, the system intelligently adjusts the schedule
- **4-Day Maximum Rule**: Ensures neither person has the dog for more than 4 consecutive nights
- **Handoff Minimization**: Prioritizes reducing stress on your elderly dog by minimizing custody transitions
- **Real-time Synchronization**: Both users see updates instantly with multiple storage options

### User Experience
- **Mobile-First Design**: Optimized for use on phones, tablets, and desktops
- **Visual Calendar Interface**: Clear, color-coded calendar showing who has custody each day
- **Unavailability Marking**: Easy selection of dates when you can't care for the dog
- **Schedule Statistics**: Track handoffs and period lengths for insights
- **Automatic Adjustments**: Visual indicators show when the schedule has been modified

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14 with React and TypeScript
- **Styling**: Tailwind CSS with custom color schemes
- **Storage**: Multi-backend support with automatic fallbacks
  - **Vercel KV** (Recommended) - Fast key-value store for production
  - **Vercel Blob** - File storage alternative for Vercel deployment
  - **Firebase Firestore** - Real-time database option
  - **localStorage** - Development fallback with cross-tab sync
- **Icons**: Lucide React for consistent iconography
- **Date Handling**: date-fns for reliable date operations

### Storage Architecture
The app features an intelligent storage adapter system:
- **Automatic Selection**: Chooses the best available storage backend
- **Graceful Fallbacks**: Falls back to localStorage if primary storage fails
- **Environment Detection**: Automatically detects deployment environment
- **Real-time Updates**: Smart polling for storage backends that don't support real-time

### Core Algorithm
The scheduling algorithm implements intelligent conflict resolution:

1. **Extension Strategy**: First attempts to extend the other person's current custody period
2. **Shift Strategy**: If extension isn't possible, shifts handoff dates around conflicts
3. **Constraint Validation**: Always respects the 4-consecutive-day maximum rule
4. **Handoff Optimization**: Prioritizes solutions that minimize custody transitions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd dog-custody-scheduler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open the application**
   Navigate to `http://localhost:3000` in your browser

### Initial Setup
On first visit, you'll be prompted to:
1. Enter both co-parents' names
2. Set the schedule start date
3. Choose who gets the dog first
4. The system will generate the initial 3-month schedule

**Note**: For local development, the app automatically uses localStorage. No additional configuration required!

## 📱 Usage Guide

### Marking Unavailability
1. Click on one or more future dates in the calendar
2. Click the "Mark Unavailable" button
3. Select which person is unavailable
4. The system automatically adjusts the schedule

### Understanding the Calendar
- **Blue days**: Person A has custody
- **Orange days**: Person B has custody  
- **Red days**: Someone is unavailable
- **Yellow border**: Schedule was adjusted by the algorithm
- **Today**: Highlighted with blue border

### Schedule Statistics
View insights about your custody arrangement:
- Total handoffs per month
- Average custody period length
- Number of custody periods

## 🚢 Deployment

### Vercel (Recommended)

The easiest way to deploy is using Vercel with their storage solutions:

#### Quick Deploy
1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy automatically - the app will work with localStorage initially

#### Add Storage for Multi-User Support

**Option 1: Vercel KV (Recommended)**
1. Go to your Vercel project dashboard
2. Navigate to "Storage" tab → "Create Database" → "KV"
3. Name your database (e.g., "dog-custody-kv")
4. Environment variables are automatically configured
5. Redeploy to activate

**Option 2: Vercel Blob**
1. Go to your Vercel project dashboard  
2. Navigate to "Storage" tab → "Create Database" → "Blob"
3. Name your storage (e.g., "dog-custody-blob")
4. Environment variables are automatically configured
5. Redeploy to activate

#### Manual Environment Variables (if needed)
For Vercel KV:
```
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

For Vercel Blob:
```
BLOB_READ_WRITE_TOKEN=your_blob_token
```

### Alternative: Firebase Setup
If you prefer Firebase:
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Add environment variables to Vercel:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### Storage Selection Priority
The app automatically chooses storage in this order:
1. **Vercel KV** (if configured) - Best for real-time updates
2. **Vercel Blob** (if configured) - Good alternative
3. **Firebase** (if configured) - Legacy option with real-time support
4. **localStorage** (always available) - Development fallback

### Monitoring
The app displays current storage mode in the bottom-right corner for debugging.

📖 **Detailed deployment instructions**: See [DEPLOYMENT.md](DEPLOYMENT.md)

## 🔧 Configuration

### Customization Options
The algorithm behavior can be modified in `/lib/scheduling/algorithm.ts`:
- `MAX_CONSECUTIVE_DAYS`: Change the maximum custody period (default: 4)
- `DEFAULT_ROTATION_DAYS`: Modify the base rotation length (default: 3)

### Styling Customization
Colors and themes can be adjusted in `/tailwind.config.js`:
- Person A colors: `person-a-*` classes
- Person B colors: `person-b-*` classes  
- Unavailable colors: `unavailable-*` classes

### Storage Backend Selection
Force a specific storage backend by modifying the ScheduleService constructor in `/lib/services/scheduleService.ts`:
```typescript
const scheduleService = new ScheduleService('vercelKV'); // or 'vercelBlob', 'firebase'
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes following the existing code style
4. Test thoroughly with different scenarios
5. Submit a pull request

### Key Areas for Enhancement
- **Advanced Algorithm**: More sophisticated conflict resolution strategies
- **Notifications**: Email/SMS reminders for upcoming handoffs
- **Mobile App**: Native iOS/Android applications
- **Calendar Integration**: Export to Google Calendar, Apple Calendar
- **Expense Tracking**: Track dog-related expenses between co-parents

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🐕 About

Created for co-parents who want to provide the best care for their elderly dog while maintaining a structured, stress-free custody arrangement. The application prioritizes the dog's well-being by minimizing handoffs and ensuring consistent care schedules.

---

**Need Help?** 
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions
- Open an issue on GitHub for bug reports or feature requests
- View the storage debug info in the bottom-right corner of the app
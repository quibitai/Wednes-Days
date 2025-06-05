# 🐕 Wednes'Days - Dog Custody Scheduler

**A flexible, intelligent scheduling application for co-parents managing shared custody of their elderly dog.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fquibitai%2FWednes-Days.git)

## ✨ Latest Features (New!)

### 🎯 Flexible 4-Day Rule System
- **Warning-based approach**: Override the 4-day rule when life happens
- **Smart conflict resolution**: AI-powered strategies automatically find solutions
- **Visual warnings**: See exactly which violations will occur before confirming
- **Informed decisions**: Make schedule changes with full transparency

### 🧠 Advanced Scheduling Algorithm
1. **Early Handoff Strategy**: End custody before unavailable day
2. **Extension Strategy**: Other person takes over through conflict period  
3. **Period Shifting**: Intelligently adjust custody boundaries
4. **Forced Assignment**: Allow rule violations with clear warnings

## 🚀 Key Features

### Smart Scheduling
- **Default 3-on/3-off rotation** with automatic handoff optimization
- **Flexible unavailability**: Mark when you can't have overnight responsibility
- **Intelligent conflict resolution** with multiple automatic strategies
- **Real-time preview** of schedule changes before applying

### Intuitive Interface
- **Visual calendar** with color-coded assignments and status indicators
- **Click-to-select** date ranges with instant feedback
- **Hover actions** for quick unavailability removal
- **Right-click menus** for context-sensitive operations
- **Mobile-first design** optimized for all devices

### Robust Storage Options
- **Vercel KV**: Production-grade key-value storage (recommended)
- **Vercel Blob**: Alternative cloud storage option
- **Firebase Firestore**: Real-time database integration
- **localStorage**: Offline-capable fallback with cross-tab sync
- **Automatic failover**: Seamless switching between storage backends

### Enhanced User Experience
- **Real-time updates** across multiple devices and browser tabs
- **Comprehensive warnings** for schedule conflicts and rule violations
- **Undo capabilities** with clear change tracking
- **Statistics dashboard** showing handoffs and custody periods

## 📱 Screenshots

### Main Calendar Interface
- Color-coded schedule with person assignments
- Visual indicators for unavailable dates and adjustments
- Hover effects and quick action buttons

### Unavailability Management
- Warning system for 4-day rule violations
- Real-time preview of schedule impacts
- Multiple resolution strategies with explanations

### Mobile-Optimized Design
- Touch-friendly calendar interface
- Responsive layout for all screen sizes
- Quick access to essential functions

## 🛠 Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **Icons**: Lucide React for consistent iconography
- **Storage**: Multi-backend with automatic selection
- **Deployment**: Optimized for Vercel platform

## 🚀 Quick Start

### Option 1: Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fquibitai%2FWednes-Days.git)

**Deployment is fully automated!** See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/quibitai/Wednes-Days.git
cd Wednes-Days

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### Initial Setup
1. **Launch the application** (deployed or local)
2. **Enter co-parent names** (e.g., "Jane" and "Adam")  
3. **Select start date** and initial person for custody
4. **Review the generated schedule** with default 3-day rotations

### Managing Unavailability
1. **Click calendar dates** to select unavailable periods
2. **Choose the unavailable person** from the form
3. **Review the preview** showing schedule adjustments
4. **Confirm or adjust** based on warnings and impact analysis

### Understanding Warnings
- **Yellow warnings**: 4-day rule violations that you can override
- **Schedule adjustments**: Automatic reassignments to resolve conflicts
- **Handoff counts**: Number of custody transitions created

### Best Practices
- **Plan ahead**: Mark unavailability as early as possible
- **Review warnings**: Consider the impact on your co-parent before overriding rules
- **Regular check-ins**: Review the schedule weekly for upcoming conflicts

## 🏗 Architecture

### Storage Strategy
The application uses a sophisticated multi-backend storage system:

```
Storage Priority:
1. Vercel KV (production-grade, 2s polling)
2. Vercel Blob (alternative cloud storage, 5s polling) 
3. Firebase Firestore (real-time database)
4. localStorage (offline fallback, instant sync)
```

### Scheduling Algorithm
Advanced conflict resolution with four strategies:

1. **Early Handoff**: Hand over custody before the unavailable day
2. **Extension**: Extend the other person's period through the conflict
3. **Period Shift**: Adjust custody period boundaries intelligently
4. **Forced Assignment**: Allow violations with comprehensive warnings

### Real-time Synchronization
- **Cross-tab updates**: Changes sync across browser tabs instantly
- **Multi-device support**: Real-time updates across phones, tablets, and computers
- **Conflict prevention**: Automatic refresh when external changes are detected

## 📊 Storage Options & Configuration

### Vercel Storage (Recommended)
Perfect for production deployments with automatic scaling:

```env
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
BLOB_READ_WRITE_TOKEN=your_blob_read_write_token
```

### Firebase Configuration
For real-time database features:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

### LocalStorage Fallback
No configuration needed! Works offline with full functionality.

## 📚 Documentation

- **[Deployment Guide](./VERCEL_DEPLOYMENT.md)**: Complete Vercel deployment instructions
- **[Architecture Overview](./DEPLOYMENT.md)**: Technical architecture and storage details
- **[Algorithm Documentation](./lib/scheduling/algorithm.ts)**: Detailed scheduling logic

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/quibitai/Wednes-Days/issues)
- **Documentation**: Check this README and deployment guides
- **Discussions**: [GitHub Discussions](https://github.com/quibitai/Wednes-Days/discussions)

## 🎯 Roadmap

- [ ] **Push notifications** for schedule changes
- [ ] **Calendar integrations** (Google Calendar, iCal)
- [ ] **Multi-pet support** for families with multiple animals
- [ ] **Advanced reporting** with custody analytics
- [ ] **Mobile app** with native features

---

**Made with ❤️ for co-parents and their furry family members.**

**Repository**: [https://github.com/quibitai/Wednes-Days.git](https://github.com/quibitai/Wednes-Days.git)
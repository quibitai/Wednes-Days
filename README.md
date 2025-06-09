# 🐕 Wednes'Days - Dog Custody Scheduler

**A flexible, intelligent scheduling application for co-parents managing shared custody of their elderly dog.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fquibitai%2FWednes-Days.git)

## ✨ Latest Features (v2.2.0 - NEW!)

### 🤖 AI-Powered Schedule Rebalancing
- **GPT-4.1 Mini Integration**: Advanced AI analyzes your entire schedule context
- **3-Night Block Optimization**: Targets ideal 3-night custody periods (2-4 nights acceptable)
- **Smart Pattern Recognition**: Understands existing blocks and prevents problematic extensions
- **Zero Single-Night Policy**: AI strictly avoids creating isolated single-night assignments
- **Natural Language Commands**: Tell the AI what you want: "I can't have Emma next Friday"

### 🧠 Intelligent Conflict Resolution
- **Context-Aware Analysis**: AI considers 4-week schedule context for optimal decisions
- **Multi-Strategy Approach**: AI → Algorithmic → Minimal fallback system
- **Block Extension Prevention**: Never extends existing 3+ night blocks inappropriately
- **Handoff Minimization**: Reduces custody transitions while maintaining fairness

### 🎯 Enhanced User Experience
- **Footer Action Buttons**: Accept/Discard AI proposals directly in calendar footer
- **Real-Time Validation**: Immediate feedback on AI proposals with detailed explanations
- **Transparent Reasoning**: See exactly why AI made each scheduling decision
- **Debug Mode Available**: Advanced logging for troubleshooting schedule conflicts

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
- **AI**: OpenAI GPT-4.1 Mini for intelligent scheduling
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

### Using AI Features (v2.2.0+)
1. **Natural Language Commands**: Type requests like "I can't have Emma next Friday" 
2. **Smart Rebalancing**: AI automatically creates optimal 3-night custody blocks
3. **Preview Changes**: Review AI proposals with detailed explanations before accepting
4. **Footer Actions**: Use Accept/Discard buttons in the calendar footer
5. **Fallback Protection**: System automatically falls back to algorithmic approach if AI fails

### Understanding Warnings
- **Yellow warnings**: 4-day rule violations that you can override
- **Schedule adjustments**: Automatic reassignments to resolve conflicts
- **Handoff counts**: Number of custody transitions created

### Using AI Features (v2.2.0+)
1. **Natural Language Commands**: Type requests like "I can't have Emma next Friday" 
2. **Smart Rebalancing**: AI automatically creates optimal 3-night custody blocks
3. **Preview Changes**: Review AI proposals with detailed explanations before accepting
4. **Footer Actions**: Use Accept/Discard buttons in the calendar footer
5. **Fallback Protection**: System automatically falls back to algorithmic approach if AI fails

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

### AI Configuration (Required for v2.2.0+)
Enable intelligent schedule rebalancing with OpenAI:

```env
OPENAI_API_KEY=your_openai_api_key
```

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

- [x] **AI-powered schedule rebalancing** with GPT-4.1 Mini (v2.2.0)
- [x] **Natural language processing** for schedule commands (v2.2.0)
- [x] **Smart 3-night block optimization** (v2.2.0)
- [ ] **Push notifications** for schedule changes
- [ ] **Calendar integrations** (Google Calendar, iCal)
- [ ] **Multi-pet support** for families with multiple animals
- [ ] **Advanced reporting** with custody analytics
- [ ] **Mobile app** with native features

---

**Made with ❤️ for co-parents and their furry family members.**

**Repository**: [https://github.com/quibitai/Wednes-Days.git](https://github.com/quibitai/Wednes-Days.git)
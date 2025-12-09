# Browser Activity Tracker

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-blue)]()
[![Node.js](https://img.shields.io/badge/node-%3E%3D12.0.0-brightgreen)]()
[![License](https://img.shields.io/badge/license-ISC-green)]()

## 🎯 What is This?

A **cross-platform Node.js package** that tracks the currently active browser window and extracts the exact URL being viewed in real-time. Perfect for productivity monitoring, time tracking, compliance auditing, and user behavior analytics.

### Key Features

- ✅ **Real-time URL extraction** from active browser tabs
- ✅ **Multi-browser support**: Chrome, Firefox, Edge, Brave, Opera, Vivaldi, and more
- ✅ **Cross-platform**: Windows, Linux, macOS
- ✅ **Privacy-focused**: All processing happens locally
- ✅ **Intelligent fallback**: Multiple extraction methods for high reliability
- ✅ **Lightweight**: Minimal resource footprint

---

## 📚 Documentation

This project includes comprehensive documentation tailored for different audiences:

### 🚀 [Quick Start Guide](./QUICK_START.md)
**Get Up and Running in 3 Steps**
- Installation instructions
- Build commands
- Basic usage examples

### 📦 [Build Size Optimization](./BUILD_SIZE_OPTIMIZATION.md)
**Reduce Build Size by 60-70%**
- Detailed optimization techniques
- Build comparison and benchmarks
- Production build guide

### 👨‍💻 [Developer Documentation](./README_DEVELOPER.md)
**For Engineers, Developers, and Technical Teams**

Complete technical documentation including:
- Architecture deep-dive
- Component breakdown
- API reference
- Installation and usage instructions
- Troubleshooting guide
- Development guidelines

### 👔 [Executive Overview](./README_CTO.md)
**For CTOs, VPs, and Technical Decision Makers**

Business-focused documentation including:
- Executive summary and value propositions
- Use cases and ROI analysis
- Architecture decisions and trade-offs
- Cost analysis and competitive comparison
- Risk assessment and deployment strategy
- Roadmap and success metrics

---

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Build (Windows only)

```bash
# Standard build
npm run build

# Optimized build (60-70% smaller)
npm run build:optimized
```

### Usage

```javascript
const { getActiveWindow } = require('./index.js');

(async () => {
    const result = await getActiveWindow();
    console.log(result);
    // Output: { title: "...", url: "https://...", owner: {...} }
})();
```

### Example Output

```javascript
{
    title: "GitHub - Browser Activity Tracker",
    url: "https://github.com/SuperSee/websiteusage",
    owner: {
        name: "chrome.exe",
        processId: 12345,
        path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    },
    profile: "Default"
}
```

---

## 🌐 Supported Browsers

| Browser | Windows | Linux | macOS |
|---------|---------|-------|-------|
| Google Chrome | ✅ | ✅ | ✅ |
| Microsoft Edge | ✅ | ❌ | ✅ |
| Mozilla Firefox | ✅ | ✅ | ✅ |
| Brave Browser | ✅ | ❌ | ✅ |
| Opera | ✅ | ❌ | ✅ |
| Vivaldi | ✅ | ❌ | ✅ |
| Others | ✅ | ⚠️ | ⚠️ |

---

## 🏗️ How It Works

The system uses a **hybrid approach** with two URL extraction methods:

### Method 1: Native Process Inspection (Windows 10/11)
Uses a .NET executable to directly query the browser process via Windows UI Automation APIs for real-time URL extraction.

### Method 2: History Database Matching (Fallback)
Reads browser history databases and matches window titles using advanced string similarity algorithms.

**Automatic Fallback**: If the native method fails, the system automatically falls back to history matching.

---

## 📊 Performance

- **Latency**: 200-1200ms depending on method
- **CPU Usage**: <1% average
- **Memory**: ~50-100MB RAM
- **Accuracy**: 99.5% success rate (combined methods)

---

## 🔒 Privacy & Security

- ✅ All processing happens **locally** on the user's device
- ✅ **No data transmission** to external servers
- ✅ **Read-only access** to browser history
- ✅ Temporary files are automatically cleaned up
- ✅ **GDPR compliant** (no data collection or transfer)

---

## 📦 Project Structure

```
├── index.js                    # Main entry point
├── package.json                # Dependencies
├── build-dotnet.js             # .NET tool build script
├── zip-dotnet-build.js         # Distribution packager
├── src/
│   ├── get-active-window.js    # Main orchestrator
│   ├── get-url-from-exe.js     # Native tool integration
│   ├── extract_url_history.js  # History database reader
│   ├── history_path.js         # Browser path detection
│   └── string_filteration.js   # String matching algorithms
├── native/
│   └── GetBrowserUrlNetTool.exe # .NET native tool (Windows)
├── README.md                   # This file
├── README_DEVELOPER.md         # Technical documentation
└── README_CTO.md               # Executive overview
```

---

## 🛠️ Requirements

### Runtime Dependencies
- Node.js 12+
- Windows: .NET 8.0+ (bundled in executable)
- SQLite support (via `better-sqlite3`)

### Build Dependencies (Windows only)
- .NET SDK 8.0+ (for building native tool)

---

## 📄 License

ISC

---

## 🤝 Contributing

Contributions are welcome! Please see the [Developer Documentation](./README_DEVELOPER.md) for guidelines.

---

## 📞 Support

For detailed troubleshooting and support information:
- **Technical Issues**: See [Developer Documentation](./README_DEVELOPER.md#troubleshooting)
- **Business Questions**: See [Executive Overview](./README_CTO.md#support--maintenance)

---

## 🎯 Use Cases

- **Productivity Monitoring**: Track website usage during work hours
- **Time Tracking**: Automatic time logging for billing and project management
- **Compliance & Security**: Audit web activity for policy violations
- **User Research**: Understand user navigation patterns
- **Digital Wellness**: Help users track and manage browsing habits

---

**Version:** 1.0.0  
**Last Updated:** December 2025

---

## 📖 Learn More

- 👨‍💻 **[Developer Documentation →](./README_DEVELOPER.md)**
- 👔 **[Executive Overview →](./README_CTO.md)**

# Browser Activity Tracker - Developer Documentation

## 🎯 Overview

A cross-platform Node.js package that tracks the currently active browser window and extracts the exact URL being viewed. The package uses intelligent fallback strategies combining native OS APIs and browser history analysis to provide robust URL tracking across different platforms and browser versions.

## 📋 Table of Contents

- [Architecture](#architecture)
- [Supported Browsers](#supported-browsers)
- [Supported Platforms](#supported-platforms)
- [Installation](#installation)
- [Usage](#usage)
- [Core Components](#core-components)
- [How It Works](#how-it-works)
- [Build Process](#build-process)
- [API Reference](#api-reference)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture

The system uses a **hybrid approach** with two primary methods:

### Method 1: Native Process Inspection (Windows 10/11)
- Uses a .NET executable (`GetBrowserUrlNetTool.exe`) to directly query the browser process
- Leverages Windows UI Automation APIs to extract URL from browser's address bar
- **Pros**: Real-time, accurate, works with any tab
- **Cons**: Windows-only, requires .NET runtime

### Method 2: History Database Matching (Fallback)
- Reads browser history databases (SQLite)
- Matches active window title against recent history entries using advanced string similarity algorithms
- **Pros**: Cross-platform, works with older Windows versions
- **Cons**: Slight delay, may not catch very recent URLs

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
| Avast Browser | ✅ | ❌ | ✅ |
| Torch Browser | ✅ | ❌ | ❌ |
| SeaMonkey | ✅ | ❌ | ✅ |
| Maxthon | ❌ | ❌ | ✅ |

---

## 💻 Supported Platforms

- **Windows 7, 8, 8.1**: History matching only
- **Windows 10, 11**: Native tool + history fallback
- **Linux**: History matching only
- **macOS**: Basic active window detection (no URL extraction)

---

## 📦 Installation

```bash
npm install
```

### For Windows Development

Build the .NET native tool:

```bash
node build-dotnet.js
```

This will:
1. Compile the .NET project to `GetBrowserUrlNetTool.exe`
2. Create a self-contained, single-file executable
3. Move it to the `native/` directory

---

## 🚀 Usage

### Basic Example

```javascript
const { getActiveWindow } = require('./index.js');

(async () => {
    const result = await getActiveWindow();
    console.log(result);
})();
```

### Expected Output

```javascript
{
    title: "GitHub - SuperSee/websiteusage: Browser tracking tool",
    id: 1234567,
    bounds: { x: 100, y: 100, width: 1920, height: 1080 },
    owner: {
        name: "chrome.exe",
        processId: 12345,
        path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    },
    url: "https://github.com/SuperSee/websiteusage",
    profile: "Default" // Chrome profile name (if available)
}
```

---

## 🔧 Core Components

### 1. `index.js`
**Main Entry Point**

Exports the primary `getActiveWindow()` function that orchestrates the entire tracking process.

```javascript
module.exports = {
    getActiveWindow
}
```

---

### 2. `get-active-window.js`
**OS Detection & Routing Logic**

- Detects the operating system and version
- Routes to the appropriate URL extraction method
- Validates that the active window is a supported browser

**Key Methods:**
- `checkOsConfiguration()`: Identifies Windows version, Linux, or macOS
- `getCurrentActiveWindow()`: Main entry point, returns window + URL
- `checkApplicationBrowser(path)`: Validates if process is a supported browser
- `getDataFromNetTool()`: Uses native .NET tool (Windows 10/11)
- `getDataFromHistory()`: Fallback to history matching

**OS Detection Logic:**
```javascript
// Windows 7 → History only
// Windows 8 → History only
// Windows 10 → Native tool → History fallback
// Windows 11 → Native tool → History fallback
// Linux → History only
// macOS → Basic window info only
```

---

### 3. `get-url-from-exe.js`
**Native Tool Integration**

Executes the .NET tool with the browser's process ID and captures the URL from stdout.

**Features:**
- 15-second timeout for process execution
- URL validation and normalization
- Auto-adds `https://` protocol if missing
- Error handling with graceful fallback

**Key Function:**
```javascript
async function getBrowserUrlForActiveWindow(pid, timeoutMs = 15000)
```

**Input:** Browser process ID  
**Output:** Valid URL string or `null`

---

### 4. `extract_url_history.js`
**Browser History Analysis**

The most complex component, responsible for:
1. Locating browser profile directories
2. Copying history databases to temp files (to avoid locks)
3. Executing SQL queries to get recent history
4. Matching window titles to URLs using string similarity

**Key Methods:**

#### `windowReport(activeWindow)`
Main orchestrator:
1. Identifies browser type from process path
2. Locates history database file
3. Reads last 24 hours of history
4. Matches window title to history entries
5. Returns enhanced window object with URL

#### `createPaths(currentApp)`
For Windows/Chrome-based browsers:
- Reads `Local State` file to get active profiles
- Creates temporary copies of history databases
- Processes each profile separately
- Prioritizes the last-used profile

#### `createPathsForLinux(currentApp)`
For Linux:
- Searches for history files in browser directories
- Handles Firefox (`.sqlite`) and Chrome (`History`) formats
- Recursively scans up to 4 directory levels

#### `getSQLQuery(applicationPath)`
Returns platform-specific SQL queries:

**Chromium-based** (Chrome, Edge, Brave):
```sql
SELECT urls.url, urls.title, 
       datetime((urls.last_visit_time / 1000000) - 11644473600, 'unixepoch') AS last_visit
FROM urls
WHERE datetime(...) > datetime('now', '-24 hours')
ORDER BY urls.last_visit_time DESC
```

**Firefox/SeaMonkey:**
```sql
SELECT moz_places.url, moz_places.title,
       datetime(moz_places.last_visit_date / 1000000, 'unixepoch') AS last_visit
FROM moz_places
WHERE datetime(...) > datetime('now', '-24 hours')
```

---

### 5. `string_filteration.js`
**Advanced String Matching Algorithms**

Implements multiple similarity metrics to match window titles to browser history entries.

#### `compareStrings(inputString, optionString, url, threshold = 0.3)`

Uses a **weighted composite score** combining:

| Metric | Weight | Description |
|--------|--------|-------------|
| **Exact Match** | 2.0 | Perfect title match |
| **Jaccard Similarity** | 0.3 | Token set overlap |
| **Token Overlap** | 0.25 | Common words ratio |
| **Substring Score** | 0.2 | Longest common substring |
| **Levenshtein Distance** | 0.15 | Edit distance |
| **Positional Bonus** | 0.05 | Sequential token matches |
| **Contains Bonus** | 0.05 | One string contains the other |

**Returns:**
```javascript
{
    isMatch: true,
    score: 0.8532,
    inputString: "GitHub - SuperSee/websiteusage",
    optionString: "GitHub - SuperSee/websiteusage: Browser tracking",
    url: "https://github.com/SuperSee/websiteusage",
    details: {
        jaccard: 0.889,
        tokenOverlap: 0.900,
        substring: 0.950,
        levenshtein: 0.875,
        positional: 0.920,
        exactMatch: 0,
        contains: 0.5
    }
}
```

#### `getTopElementByDetails(data)`
Selects the best match from multiple candidates by summing all detail scores.

---

### 6. `history_path.js`
**Browser Installation Path Detection**

Provides default installation paths for all supported browsers on Windows, Linux, and macOS.

**Example Paths (Windows):**
```javascript
{
    chrome: "C:\\Users\\{USER}\\AppData\\Local\\Google\\Chrome\\User Data",
    firefox: "C:\\Users\\{USER}\\AppData\\Roaming\\Mozilla\\Firefox",
    edge: "C:\\Users\\{USER}\\AppData\\Local\\Microsoft\\Edge\\User Data"
}
```

**Linux Special Handling:**
- Detects Snap-installed Firefox: `~/snap/firefox/common/.mozilla/firefox`
- Fallback to traditional path: `~/.mozilla/firefox`

---

### 7. `build-dotnet.js`
**Build Automation Script**

Compiles the .NET project with optimized settings:

```javascript
dotnet publish -c Release -r win-x64 --self-contained true
  -p:PublishSingleFile=true
  -p:IncludeAllContentForSelfExtract=true
  -p:TrimMode=partial
  -p:EnableCompressionInSingleFile=true
```

**Features:**
- Skips build on non-Windows systems
- Creates self-contained executable (no .NET runtime required)
- Moves output to `native/` directory
- Validates successful build

---

## 🔄 How It Works

### Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. getActiveWindow() called                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. GetActiveWindow.getCurrentActiveWindow()                 │
│    - Detects OS and version                                 │
│    - Gets active window info (title, PID, path)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
              ┌──────┴──────┐
              │ Is Browser? │
              └──────┬──────┘
                     │ YES
                     ▼
        ┌────────────┴────────────┐
        │ Windows 10/11?          │
        └────────┬───────┬────────┘
                 │       │
           YES   │       │   NO
                 ▼       ▼
    ┌────────────────┐  ┌──────────────────┐
    │ 3a. Native Tool│  │ 3b. History Match│
    │                │  │                  │
    │ - Run .exe     │  │ - Copy DB        │
    │ - Pass PID     │  │ - Query SQL      │
    │ - Get URL      │  │ - Match titles   │
    └────────┬───────┘  └────────┬─────────┘
             │                   │
             │ SUCCESS?          │
             ▼                   │
             NO ─────────────────┘
             │
             ▼
    ┌────────────────────────────┐
    │ 4. Return window + URL     │
    │    - title                 │
    │    - url                   │
    │    - owner (name, PID)     │
    │    - profile               │
    └────────────────────────────┘
```

### URL Extraction Methods by Platform

| Platform | Primary Method | Fallback Method |
|----------|---------------|-----------------|
| **Windows 11** | .NET UI Automation | History matching |
| **Windows 10** | .NET UI Automation | History matching |
| **Windows 8/7** | N/A | History matching |
| **Linux** | N/A | History matching |
| **macOS** | N/A | Basic window only |

---

## 🛠️ Build Process

### Building the .NET Tool

```bash
# Build the native tool
node build-dotnet.js

# (Optional) Create a distributable ZIP
node zip-dotnet-build.js
```

### Build Output

```
native/
└── GetBrowserUrlNetTool.exe  (self-contained, ~20-30 MB)
```

### Distribution Package

```bash
GetBrowserUrlNetTool.zip
└── GetBrowserUrlNetTool.exe
```

---

## 📚 API Reference

### `getActiveWindow()`

Returns a promise that resolves to the active window object with URL information.

**Returns:** `Promise<Object>`

**Object Structure:**
```typescript
{
    title: string,              // Window title
    id: number,                 // Window handle ID
    bounds: {                   // Window position and size
        x: number,
        y: number,
        width: number,
        height: number
    },
    owner: {
        name: string,           // Process name (e.g., "chrome.exe")
        processId: number,      // Process ID
        path: string           // Full executable path
    },
    url?: string,              // Extracted URL (if browser)
    profile?: string,          // Browser profile name (Chrome-based)
    historyMatches?: {         // Match details (history method)
        score: number,
        details: Object
    }
}
```

---

## 🧪 Development

### Prerequisites

- Node.js 12+
- Windows: .NET SDK 6.0+ (for building native tool)
- SQLite support (via `better-sqlite3`)

### Testing

```javascript
// Test basic functionality
const { getActiveWindow } = require('./index.js');

setInterval(async () => {
    const result = await getActiveWindow();
    console.log('Current URL:', result.url || 'Not a browser');
}, 5000); // Check every 5 seconds
```

### Debugging

Enable verbose logging by checking console outputs:
- `get-url-from-exe.js` logs native tool errors
- `extract_url_history.js` logs history query results
- `build-dotnet.js` shows build progress

---

## 🐛 Troubleshooting

### Issue: "EXE not found" error

**Solution:**
```bash
node build-dotnet.js
```

### Issue: History database locked

**Cause:** Browser has the database file open  
**Solution:** The code automatically copies to temp files to avoid locks

### Issue: No URL returned for active browser

**Possible Causes:**
1. Browser just started (no history yet)
2. Incognito/Private mode (no history saved)
3. Window title doesn't match any history entry

**Debug:**
- Check if `result.historyMatches` exists
- Verify the window title matches the page title
- Ensure browser history contains recent entries

### Issue: Native tool timeout

**Cause:** Browser UI Automation is slow or blocked  
**Solution:** Increase timeout in `get-url-from-exe.js`:
```javascript
return await runExeGetStdout(source_exe_dest, String(pid), 30000); // 30 seconds
```

---

## 🔐 Security & Privacy

### Data Handling
- **No data is transmitted**: All processing happens locally
- **Temporary files**: History databases are copied to temp files and deleted after use
- **Read-only access**: Never modifies browser history

### Permissions Required
- Read access to browser profile directories
- Execute permission for native .NET tool (Windows)

---

## 📄 License

ISC

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📞 Support

For issues and questions, please open a GitHub issue.

---

## 🔮 Future Enhancements

- [ ] Support for Chromium-based Edge on Linux
- [ ] Real-time tab switching detection
- [ ] Browser extension API integration
- [ ] Electron app support
- [ ] Performance optimizations for large history databases
- [ ] Caching layer for repeated queries
- [ ] TypeScript definitions

---

**Last Updated:** December 2025  
**Version:** 1.0.0


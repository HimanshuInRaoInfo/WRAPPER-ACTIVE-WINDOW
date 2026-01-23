# Dynamic Browser Configuration - Implementation Guide

## 📚 Quick Reference Implementation Examples

This document provides code examples and implementation patterns for the dynamic browser configuration system.

---

## 1. BrowserConfigManager Implementation

### File: `src/browser-config-manager.js`

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');

class BrowserConfigManager {
    constructor(apiEndpoint, cachePath, cacheTTL = 24 * 60 * 60 * 1000) {
        this.apiEndpoint = apiEndpoint;
        this.cachePath = cachePath || path.join(os.homedir(), '.browser-tracker', 'cache', 'browser-config.json');
        this.cacheTTL = cacheTTL;
        this.config = null;
        this.defaultConfig = this.getDefaultConfig();
    }

    /**
     * Initialize and load configurations
     */
    async initialize() {
        try {
            // Try to load from cache first
            const cached = this.loadFromCache();
            if (cached && !this.isCacheExpired(cached)) {
                this.config = cached.browsers;
                console.log('✅ Loaded browser configs from cache');
                
                // Refresh in background
                this.refreshCacheInBackground();
                return;
            }

            // Try to fetch from API
            const fetched = await this.fetchFromAPI();
            if (fetched) {
                this.config = fetched.browsers;
                this.saveToCache(fetched);
                console.log('✅ Loaded browser configs from API');
                return;
            }

            // Fallback to defaults
            this.config = this.defaultConfig;
            console.log('⚠️ Using default browser configs (fallback)');
        } catch (error) {
            console.error('❌ Error initializing config:', error);
            this.config = this.defaultConfig;
        }
    }

    /**
     * Fetch configurations from backend API
     */
    async fetchFromAPI() {
        return new Promise((resolve, reject) => {
            const url = new URL(this.apiEndpoint);
            const client = url.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'BrowserTracker/1.0'
                },
                timeout: 5000
            };

            const req = client.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const config = JSON.parse(data);
                            if (this.validateConfig(config)) {
                                resolve(config);
                            } else {
                                reject(new Error('Invalid config schema'));
                            }
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        reject(new Error(`API returned ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    /**
     * Load configurations from local cache
     */
    loadFromCache() {
        try {
            if (fs.existsSync(this.cachePath)) {
                const data = fs.readFileSync(this.cachePath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error reading cache:', error);
        }
        return null;
    }

    /**
     * Save configurations to local cache
     */
    saveToCache(config) {
        try {
            const dir = path.dirname(this.cachePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const cacheData = {
                ...config,
                cachedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + this.cacheTTL).toISOString()
            };

            fs.writeFileSync(this.cachePath, JSON.stringify(cacheData, null, 2));
        } catch (error) {
            console.error('Error saving cache:', error);
        }
    }

    /**
     * Check if cache is expired
     */
    isCacheExpired(cached) {
        if (!cached.expiresAt) return true;
        return new Date(cached.expiresAt) < new Date();
    }

    /**
     * Refresh cache in background (non-blocking)
     */
    async refreshCacheInBackground() {
        setImmediate(async () => {
            try {
                const fetched = await this.fetchFromAPI();
                if (fetched) {
                    this.config = fetched.browsers;
                    this.saveToCache(fetched);
                    console.log('✅ Cache refreshed in background');
                }
            } catch (error) {
                console.log('⚠️ Background cache refresh failed:', error.message);
            }
        });
    }

    /**
     * Get browser configuration by ID
     */
    getBrowserConfig(browserId) {
        if (!this.config) return null;
        return this.config.find(b => b.id === browserId) || null;
    }

    /**
     * Detect browser from process path
     */
    getBrowserByPath(processPath) {
        if (!this.config || !processPath) return null;

        const lowerPath = processPath.toLowerCase();

        for (const browser of this.config) {
            if (!browser.enabled) continue;

            // Check detection patterns
            if (browser.detection.patterns) {
                for (const pattern of browser.detection.patterns) {
                    const regex = new RegExp(
                        pattern,
                        browser.detection.caseSensitive ? '' : 'i'
                    );
                    if (regex.test(lowerPath)) {
                        return browser;
                    }
                }
            }

            // Check process names
            if (browser.detection.processNames) {
                for (const processName of browser.detection.processNames) {
                    if (lowerPath.includes(processName.toLowerCase())) {
                        return browser;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Get SQL query for browser
     */
    getSQLQuery(browserId) {
        const browser = this.getBrowserConfig(browserId);
        return browser?.sqlQuery?.query || null;
    }

    /**
     * Get history file path for browser on platform
     */
    getHistoryFilePath(browserId, platform) {
        const browser = this.getBrowserConfig(browserId);
        if (!browser || !browser.platforms[platform]) return null;

        const platformConfig = browser.platforms[platform];
        return this.resolvePath(platformConfig.userDataPath);
    }

    /**
     * Get history file name for browser
     */
    getHistoryFileName(browserId) {
        const browser = this.getBrowserConfig(browserId);
        return browser?.historyFileDetection?.fileName || 'History';
    }

    /**
     * Resolve path with environment variables
     */
    resolvePath(pathTemplate) {
        let resolved = pathTemplate;

        // Replace environment variables
        resolved = resolved.replace(/\$\{APPDATA\}/g, process.env.APPDATA || '');
        resolved = resolved.replace(/\$\{LOCALAPPDATA\}/g, process.env.LOCALAPPDATA || '');
        resolved = resolved.replace(/\$\{HOME\}/g, process.env.HOME || process.env.USERPROFILE || '');
        resolved = resolved.replace(/\$\{USERNAME\}/g, process.env.USERNAME || '');
        resolved = resolved.replace(/\$\{HOMEDRIVE\}/g, process.env.HOMEDRIVE || '');

        return resolved;
    }

    /**
     * Validate configuration schema
     */
    validateConfig(config) {
        if (!config || !Array.isArray(config.browsers)) {
            return false;
        }

        for (const browser of config.browsers) {
            if (!browser.id || !browser.detection || !browser.platforms) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get default hardcoded configurations (fallback)
     */
    getDefaultConfig() {
        // Return the existing hardcoded browser configs
        // This is a fallback if API and cache both fail
        return [
            {
                id: 'chrome',
                name: 'Google Chrome',
                detection: {
                    patterns: ['chrome'],
                    processNames: ['chrome.exe'],
                    caseSensitive: false
                },
                platforms: {
                    win32: {
                        userDataPath: path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data'),
                        localStateFile: 'Local State',
                        historyFile: 'History'
                    }
                },
                sqlQuery: {
                    type: 'chromium',
                    query: "SELECT urls.url AS url, urls.title AS title, datetime((urls.last_visit_time / 1000000) - 11644473600, 'unixepoch') AS last_visit FROM urls WHERE datetime((urls.last_visit_time / 1000000) - 11644473600, 'unixepoch') > datetime('now', '-24 hours') ORDER BY urls.last_visit_time DESC"
                },
                historyFileDetection: {
                    type: 'standard',
                    fileName: 'History',
                    searchDepth: 4
                },
                enabled: true
            }
            // ... other default browsers
        ];
    }

    /**
     * Clear local cache
     */
    clearCache() {
        try {
            if (fs.existsSync(this.cachePath)) {
                fs.unlinkSync(this.cachePath);
            }
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }

    /**
     * Force refresh cache
     */
    async refreshCache() {
        try {
            const fetched = await this.fetchFromAPI();
            if (fetched) {
                this.config = fetched.browsers;
                this.saveToCache(fetched);
                return true;
            }
        } catch (error) {
            console.error('Error refreshing cache:', error);
        }
        return false;
    }
}

module.exports = BrowserConfigManager;
```

---

## 2. Refactored history_path.js

### Before (Hardcoded):
```javascript
function setupForWindows() {
    let defaultPaths = {}
    const appDataDirectory = Path.join(process.env.HOMEDRIVE, "Users", process.env.USERNAME, "AppData");
    defaultPaths.chrome = Path.join(appDataDirectory, "Local", "Google", "Chrome", "User Data");
    defaultPaths.firefox = Path.join(appDataDirectory, "Roaming", "Mozilla", "Firefox");
    // ... more hardcoded paths
    return defaultPaths
}
```

### After (Dynamic):
```javascript
const BrowserConfigManager = require('./browser-config-manager');

let configManager = null;

async function initializeConfigManager() {
    if (!configManager) {
        const apiEndpoint = process.env.BROWSER_CONFIG_API || 'https://api.example.com/browsers/config';
        configManager = new BrowserConfigManager(apiEndpoint);
        await configManager.initialize();
    }
    return configManager;
}

function setupForWindows() {
    return new Promise(async (resolve) => {
        const manager = await initializeConfigManager();
        const defaultPaths = {};

        // Get all browser configs and build paths
        if (manager.config) {
            for (const browser of manager.config) {
                if (browser.platforms && browser.platforms.win32) {
                    const path = manager.resolvePath(browser.platforms.win32.userDataPath);
                    defaultPaths[browser.id] = path;
                }
            }
        }

        // Fallback to defaults if config not available
        if (Object.keys(defaultPaths).length === 0) {
            const appDataDirectory = Path.join(process.env.HOMEDRIVE, "Users", process.env.USERNAME, "AppData");
            defaultPaths.chrome = Path.join(appDataDirectory, "Local", "Google", "Chrome", "User Data");
            defaultPaths.firefox = Path.join(appDataDirectory, "Roaming", "Mozilla", "Firefox");
            // ... default paths
        }

        resolve(defaultPaths);
    });
}
```

---

## 3. Refactored get-active-window.js

### Before (Hardcoded):
```javascript
checkApplicationBrowser(path) {
    if (path.toLowerCase().includes("chrome")) {
        return true;
    } else if (path.toLowerCase().includes("edge")) {
        return true;
    }
    // ... more hardcoded checks
    return false;
}
```

### After (Dynamic):
```javascript
const BrowserConfigManager = require('./browser-config-manager');

class GetActiveWindow {
    constructor() {
        this.configManager = null;
    }

    async initializeConfig() {
        if (!this.configManager) {
            const apiEndpoint = process.env.BROWSER_CONFIG_API || 'https://api.example.com/browsers/config';
            this.configManager = new BrowserConfigManager(apiEndpoint);
            await this.configManager.initialize();
        }
        return this.configManager;
    }

    async checkApplicationBrowser(path) {
        const manager = await this.initializeConfig();
        const browser = manager.getBrowserByPath(path);
        return browser !== null;
    }

    async getCurrentActiveWindow() {
        await this.initializeConfig();
        // ... rest of the logic
    }
}
```

---

## 4. Refactored extract_url_history.js

### Before (Hardcoded):
```javascript
getSQLQuery(applicationPath) {
    if (applicationPath.toLowerCase().includes("firefox")) {
        return `SELECT moz_places.url AS url...`;
    } else if (applicationPath.toLowerCase().includes("maxthon")) {
        return `SELECT zurl AS url...`;
    } else {
        return `SELECT urls.url AS url...`;
    }
}

applicationName(path, browserPaths) {
    if (path.toLowerCase().includes("chrome")) {
        return browserPaths.chrome;
    } else if (path.toLowerCase().includes("edge")) {
        return browserPaths.edge;
    }
    // ... more hardcoded checks
}
```

### After (Dynamic):
```javascript
const BrowserConfigManager = require('./browser-config-manager');

class ExtractUrlHistory {
    constructor() {
        this.configManager = null;
    }

    async initializeConfig() {
        if (!this.configManager) {
            const apiEndpoint = process.env.BROWSER_CONFIG_API || 'https://api.example.com/browsers/config';
            this.configManager = new BrowserConfigManager(apiEndpoint);
            await this.configManager.initialize();
        }
        return this.configManager;
    }

    async getSQLQuery(applicationPath) {
        const manager = await this.initializeConfig();
        const browser = manager.getBrowserByPath(applicationPath);
        
        if (browser && browser.sqlQuery) {
            return browser.sqlQuery.query;
        }

        // Fallback to default queries
        if (applicationPath.toLowerCase().includes("firefox")) {
            return `SELECT moz_places.url AS url...`;
        }
        return `SELECT urls.url AS url...`;
    }

    async applicationName(path, browserPaths) {
        const manager = await this.initializeConfig();
        const browser = manager.getBrowserByPath(path);
        
        if (browser && browser.id && browserPaths[browser.id]) {
            return browserPaths[browser.id];
        }

        return false;
    }

    findPaths(applicationPath, browserPath) {
        return new Promise(async (resolve) => {
            const manager = await this.initializeConfig();
            const browser = manager.getBrowserByPath(applicationPath);
            
            if (browser && browser.historyFileDetection) {
                const fileName = browser.historyFileDetection.fileName;
                const searchDepth = browser.historyFileDetection.searchDepth || 4;
                const results = this.findFilesInDir(browserPath, "", fileName, 0, searchDepth);
                resolve(results);
            } else {
                // Fallback to original logic
                if (applicationPath.toLowerCase().includes("firefox")) {
                    resolve(this.findFilesInDir(browserPath, ".sqlite", path.sep + 'places.sqlite'));
                } else {
                    resolve(this.findFilesInDir(browserPath, "History", path.sep + 'History'));
                }
            }
        });
    }
}
```

---

## 5. Usage Example

### Application Code:
```javascript
const { getActiveWindow } = require('./index.js');

(async () => {
    // First call will initialize config manager
    // Subsequent calls use cached config
    const result = await getActiveWindow();
    console.log(result);
    // Output: { title: "...", url: "https://...", owner: {...} }
})();
```

### Environment Variables:
```bash
# Optional: Override API endpoint
export BROWSER_CONFIG_API=https://api.example.com/browsers/config

# Optional: Override cache TTL (in milliseconds)
export BROWSER_CONFIG_CACHE_TTL=86400000  # 24 hours
```

---

## 6. Testing Examples

### Unit Test: BrowserConfigManager
```javascript
const BrowserConfigManager = require('./src/browser-config-manager');

describe('BrowserConfigManager', () => {
    let manager;

    beforeEach(() => {
        manager = new BrowserConfigManager(
            'http://localhost:3000/api/browsers/config',
            './test-cache.json',
            1000 // 1 second TTL for testing
        );
    });

    test('should detect Chrome browser', async () => {
        await manager.initialize();
        const browser = manager.getBrowserByPath('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
        expect(browser).toBeTruthy();
        expect(browser.id).toBe('chrome');
    });

    test('should get SQL query for browser', async () => {
        await manager.initialize();
        const query = manager.getSQLQuery('chrome');
        expect(query).toContain('SELECT');
        expect(query).toContain('urls.url');
    });

    test('should fallback to defaults on API failure', async () => {
        manager.apiEndpoint = 'http://invalid-url-that-does-not-exist.com/api';
        await manager.initialize();
        expect(manager.config).toBeTruthy();
        expect(Array.isArray(manager.config)).toBe(true);
    });
});
```

---

## 7. Migration Checklist

### Step 1: Add BrowserConfigManager
- [ ] Create `src/browser-config-manager.js`
- [ ] Add unit tests
- [ ] Test API fetching
- [ ] Test caching logic

### Step 2: Refactor history_path.js
- [ ] Update to use BrowserConfigManager
- [ ] Maintain backward compatibility
- [ ] Test all platforms

### Step 3: Refactor get-active-window.js
- [ ] Update browser detection
- [ ] Test browser detection accuracy
- [ ] Verify fallback behavior

### Step 4: Refactor extract_url_history.js
- [ ] Update SQL query logic
- [ ] Update browser name mapping
- [ ] Update history file detection
- [ ] Test all browsers

### Step 5: Integration Testing
- [ ] Test with real browsers
- [ ] Test API unavailable scenario
- [ ] Test cache expiration
- [ ] Test new browser addition

### Step 6: Documentation
- [ ] Update README
- [ ] Add API documentation
- [ ] Create migration guide

---

## 8. Backend API Implementation Example

### Node.js/Express Example:
```javascript
const express = require('express');
const app = express();

// Mock database (replace with real DB)
const browserConfigs = [
    {
        id: 'chrome',
        name: 'Google Chrome',
        detection: { /* ... */ },
        platforms: { /* ... */ },
        sqlQuery: { /* ... */ },
        enabled: true
    },
    // ... more browsers
];

app.get('/api/browsers/config', (req, res) => {
    const enabledBrowsers = browserConfigs.filter(b => b.enabled);
    
    res.json({
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        browsers: enabledBrowsers
    });
});

app.listen(3000, () => {
    console.log('Browser config API running on port 3000');
});
```

---

## 9. Error Handling Patterns

```javascript
// Pattern 1: Graceful degradation
try {
    const config = await manager.fetchFromAPI();
    return config;
} catch (error) {
    console.warn('API fetch failed, using cache:', error.message);
    return manager.loadFromCache() || manager.defaultConfig;
}

// Pattern 2: Retry with exponential backoff
async function fetchWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await manager.fetchFromAPI();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
}

// Pattern 3: Circuit breaker pattern
class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failures = 0;
        this.threshold = threshold;
        this.timeout = timeout;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failures++;
        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
            this.lastFailureTime = Date.now();
        }
    }
}
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Status:** Implementation Guide

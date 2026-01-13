# JIRA Task: Dynamic Browser Configuration System

## 📋 Task Summary

**Title:** Implement Dynamic Browser List and History Path Configuration System

**Type:** Feature / Enhancement

**Priority:** High

**Epic:** Browser Support Extensibility

**Story Points:** 13

---

## 🎯 Objective

Transform the hardcoded browser detection, history paths, and SQL queries into a dynamic, backend-driven configuration system. This will enable adding support for new browsers (e.g., Internet Explorer, Comet, or any future browser) without requiring a new library release. All browser-specific configurations will be fetched from a backend service.

---

## 📝 Description

### Current State
The library currently has hardcoded browser configurations in multiple files:
- Browser paths are hardcoded in `src/history_path.js` (Windows, Mac, Linux)
- Browser detection logic is hardcoded in `src/get-active-window.js` and `src/extract_url_history.js`
- SQL queries are hardcoded in `src/extract_url_history.js`
- History file names are hardcoded in `src/extract_url_history.js`

### Desired State
- All browser configurations (paths, detection patterns, SQL queries, history file names) should be fetched from a backend API
- The library should cache configurations locally for offline operation
- Support for adding new browsers without code changes or library updates
- Graceful fallback to default configurations if backend is unavailable

---

## 🔧 Technical Requirements

### 1. Backend API Contract

#### Endpoint: `GET /api/browsers/config`
**Response Schema:**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-15T10:30:00Z",
  "browsers": [
    {
      "id": "chrome",
      "name": "Google Chrome",
      "detection": {
        "patterns": ["chrome", "google chrome"],
        "processNames": ["chrome.exe", "Google Chrome"],
        "caseSensitive": false
      },
      "platforms": {
        "win32": {
          "userDataPath": "${APPDATA}/Local/Google/Chrome/User Data",
          "localStateFile": "Local State",
          "historyFile": "History",
          "historyPath": "${PROFILE}/History"
        },
        "darwin": {
          "userDataPath": "${HOME}/Library/Application Support/Google/Chrome",
          "historyFile": "History",
          "historyPath": "${PROFILE}/History"
        },
        "linux": {
          "userDataPath": "${HOME}/.config/google-chrome",
          "historyFile": "History",
          "historyPath": "${PROFILE}/History"
        }
      },
      "sqlQuery": {
        "type": "chromium",
        "query": "SELECT urls.url AS url, urls.title AS title, datetime((urls.last_visit_time / 1000000) - 11644473600, 'unixepoch') AS last_visit FROM urls WHERE datetime((urls.last_visit_time / 1000000) - 11644473600, 'unixepoch') > datetime('now', '-24 hours') ORDER BY urls.last_visit_time DESC"
      },
      "historyFileDetection": {
        "type": "standard",
        "fileName": "History",
        "searchDepth": 4
      },
      "enabled": true
    },
    {
      "id": "firefox",
      "name": "Mozilla Firefox",
      "detection": {
        "patterns": ["firefox", "mozilla firefox"],
        "processNames": ["firefox.exe", "firefox"],
        "caseSensitive": false
      },
      "platforms": {
        "win32": {
          "userDataPath": "${APPDATA}/Roaming/Mozilla/Firefox",
          "historyFile": "places.sqlite",
          "historyPath": "${PROFILE}/places.sqlite"
        },
        "darwin": {
          "userDataPath": "${HOME}/Library/Application Support/Firefox",
          "historyFile": "places.sqlite",
          "historyPath": "${PROFILE}/places.sqlite"
        },
        "linux": {
          "userDataPath": "${HOME}/.mozilla/firefox",
          "historyFile": "places.sqlite",
          "historyPath": "${PROFILE}/places.sqlite"
        }
      },
      "sqlQuery": {
        "type": "firefox",
        "query": "SELECT moz_places.url AS url, moz_places.title AS title, datetime(moz_places.last_visit_date / 1000000, 'unixepoch') AS last_visit FROM moz_places WHERE datetime(moz_places.last_visit_date / 1000000, 'unixepoch') > datetime('now', '-24 hours') ORDER BY moz_places.last_visit_date DESC"
      },
      "historyFileDetection": {
        "type": "standard",
        "fileName": "places.sqlite",
        "searchDepth": 4
      },
      "enabled": true
    },
    {
      "id": "internet_explorer",
      "name": "Internet Explorer",
      "detection": {
        "patterns": ["iexplore", "internet explorer"],
        "processNames": ["iexplore.exe"],
        "caseSensitive": false
      },
      "platforms": {
        "win32": {
          "userDataPath": "${APPDATA}/Local/Microsoft/Internet Explorer",
          "historyFile": "index.dat",
          "historyPath": "${PROFILE}/index.dat"
        }
      },
      "sqlQuery": {
        "type": "ie",
        "query": "SELECT url, title, last_visit FROM urls WHERE last_visit > datetime('now', '-24 hours') ORDER BY last_visit DESC"
      },
      "historyFileDetection": {
        "type": "standard",
        "fileName": "index.dat",
        "searchDepth": 2
      },
      "enabled": true
    }
  ]
}
```

#### Environment Variable Substitution
- `${APPDATA}` → `process.env.LOCALAPPDATA` or `process.env.APPDATA`
- `${HOME}` → `process.env.HOME` or `process.env.USERPROFILE`
- `${PROFILE}` → Profile directory name
- `${USERNAME}` → `process.env.USERNAME`

---

### 2. Configuration Manager Module

**File:** `src/browser-config-manager.js`

**Responsibilities:**
- Fetch browser configurations from backend API
- Cache configurations locally (file-based cache)
- Validate configuration schema
- Provide configuration lookup methods
- Handle cache invalidation and refresh
- Fallback to default configurations

**Key Methods:**
```javascript
class BrowserConfigManager {
  constructor(apiEndpoint, cachePath, cacheTTL)
  async fetchConfigurations() // Fetch from backend
  async getBrowserConfig(browserId) // Get specific browser config
  getBrowserByPath(processPath) // Detect browser from process path
  getBrowserByPattern(pattern) // Detect browser by pattern
  getSQLQuery(browserId) // Get SQL query for browser
  getHistoryFilePath(browserId, platform) // Get history file path
  getHistoryFileName(browserId) // Get history file name
  refreshCache() // Force cache refresh
  clearCache() // Clear local cache
}
```

---

### 3. Refactoring Required Files

#### 3.1 `src/history_path.js`
**Changes:**
- Remove hardcoded browser paths
- Use `BrowserConfigManager` to get paths dynamically
- Maintain backward compatibility with default paths if config unavailable

#### 3.2 `src/get-active-window.js`
**Changes:**
- Replace `checkApplicationBrowser()` hardcoded logic with `BrowserConfigManager.getBrowserByPath()`
- Use dynamic browser detection patterns

#### 3.3 `src/extract_url_history.js`
**Changes:**
- Replace `applicationName()` method with `BrowserConfigManager` lookups
- Replace `getSQLQuery()` hardcoded queries with dynamic queries from config
- Replace `findPaths()` hardcoded file detection with config-based detection
- Use dynamic history file names from configuration

---

### 4. Caching Strategy

**Cache Location:** `~/.browser-tracker/cache/browser-config.json`

**Cache TTL:** 24 hours (configurable)

**Cache Structure:**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-15T10:30:00Z",
  "expiresAt": "2025-01-16T10:30:00Z",
  "browsers": [...]
}
```

**Cache Refresh Logic:**
- Check cache expiration on initialization
- Refresh if expired or on explicit refresh call
- Use cached data if backend unavailable
- Fallback to default hardcoded configs if cache invalid

---

### 5. Error Handling & Fallbacks

**Fallback Hierarchy:**
1. **Backend API** (primary source)
2. **Local Cache** (if API unavailable)
3. **Default Hardcoded Configs** (if cache invalid/missing)

**Error Scenarios:**
- Network failure → Use cache
- Invalid API response → Use cache, log error
- Cache corrupted → Use defaults, attempt cache refresh
- No matching browser → Return null, log warning

---

## 📊 Acceptance Criteria

### Functional Requirements
- [ ] Backend API endpoint returns browser configurations in specified format
- [ ] Configuration manager successfully fetches and caches browser configs
- [ ] Library detects browsers using dynamic patterns from backend
- [ ] Library uses dynamic SQL queries from backend
- [ ] Library uses dynamic history paths from backend
- [ ] New browsers can be added via backend without code changes
- [ ] System gracefully falls back to cache/defaults when backend unavailable
- [ ] All existing browsers continue to work after refactoring

### Non-Functional Requirements
- [ ] Cache refresh happens in background (non-blocking)
- [ ] Initial load time < 500ms (with cache)
- [ ] API call timeout < 5 seconds
- [ ] Configuration validation on fetch
- [ ] Comprehensive error logging
- [ ] Backward compatibility maintained

### Testing Requirements
- [ ] Unit tests for `BrowserConfigManager`
- [ ] Integration tests for API fetching
- [ ] Tests for fallback scenarios
- [ ] Tests for cache invalidation
- [ ] Tests for all supported browsers
- [ ] Tests for new browser addition via config

---

## 🔄 Workflow & Implementation Steps

### Phase 1: Backend API & Configuration Manager (Week 1)

#### Task 1.1: Design Backend API
- **Assignee:** Backend Developer
- **Duration:** 2 days
- **Deliverables:**
  - API endpoint specification
  - Database schema for browser configurations
  - API documentation

#### Task 1.2: Implement Backend API
- **Assignee:** Backend Developer
- **Duration:** 3 days
- **Deliverables:**
  - Working API endpoint
  - Database migrations
  - API tests

#### Task 1.3: Create BrowserConfigManager Module
- **Assignee:** Frontend Developer
- **Duration:** 3 days
- **Deliverables:**
  - `src/browser-config-manager.js` implementation
  - Caching logic
  - Configuration validation
  - Unit tests

### Phase 2: Refactor Existing Code (Week 2)

#### Task 2.1: Refactor `history_path.js`
- **Assignee:** Frontend Developer
- **Duration:** 1 day
- **Deliverables:**
  - Updated `history_path.js` using `BrowserConfigManager`
  - Maintain backward compatibility
  - Tests

#### Task 2.2: Refactor `get-active-window.js`
- **Assignee:** Frontend Developer
- **Duration:** 1 day
- **Deliverables:**
  - Updated browser detection logic
  - Tests

#### Task 2.3: Refactor `extract_url_history.js`
- **Assignee:** Frontend Developer
- **Duration:** 2 days
- **Deliverables:**
  - Updated SQL query logic
  - Updated history file detection
  - Updated browser name mapping
  - Tests

### Phase 3: Testing & Integration (Week 3)

#### Task 3.1: Integration Testing
- **Assignee:** QA Engineer
- **Duration:** 2 days
- **Deliverables:**
  - Integration test suite
  - Test all browsers
  - Test fallback scenarios

#### Task 3.2: Performance Testing
- **Assignee:** QA Engineer
- **Duration:** 1 day
- **Deliverables:**
  - Performance benchmarks
  - Load testing results

#### Task 3.3: Documentation
- **Assignee:** Technical Writer / Developer
- **Duration:** 1 day
- **Deliverables:**
  - Updated README
  - API documentation
  - Migration guide

### Phase 4: Deployment & Validation (Week 4)

#### Task 4.1: Deploy Backend API
- **Assignee:** DevOps / Backend Developer
- **Duration:** 1 day
- **Deliverables:**
  - Production API deployment
  - Monitoring setup

#### Task 4.2: Release Library Update
- **Assignee:** Release Manager
- **Duration:** 1 day
- **Deliverables:**
  - Version bump
  - Release notes
  - NPM package publish

#### Task 4.3: Validation & Monitoring
- **Assignee:** Team
- **Duration:** 2 days
- **Deliverables:**
  - Production validation
  - Error monitoring
  - Performance metrics

---

## 🔗 Dependencies

### External Dependencies
- Backend API service (new)
- Network connectivity for initial config fetch
- File system access for cache storage

### Internal Dependencies
- Existing browser detection logic (to be refactored)
- History extraction logic (to be refactored)
- SQL query logic (to be refactored)

---

## 🚨 Risks & Mitigation

### Risk 1: Backend API Unavailability
**Impact:** High  
**Probability:** Medium  
**Mitigation:**
- Implement robust caching
- Fallback to default configurations
- Retry logic with exponential backoff

### Risk 2: Breaking Changes
**Impact:** High  
**Probability:** Low  
**Mitigation:**
- Comprehensive testing
- Backward compatibility layer
- Gradual rollout

### Risk 3: Performance Degradation
**Impact:** Medium  
**Probability:** Low  
**Mitigation:**
- Async cache loading
- Background refresh
- Performance benchmarks

### Risk 4: Configuration Schema Changes
**Impact:** Medium  
**Probability:** Low  
**Mitigation:**
- Versioned API responses
- Schema validation
- Migration scripts

---

## 📈 Success Metrics

### Technical Metrics
- API response time < 500ms (p95)
- Cache hit rate > 95%
- Zero breaking changes for existing browsers
- Configuration fetch success rate > 99%

### Business Metrics
- Time to add new browser support: < 1 hour (vs. days for code changes)
- Zero library releases required for new browsers
- Customer satisfaction with browser support

---

## 📚 Additional Notes

### Future Enhancements
- Real-time configuration updates via WebSocket
- A/B testing for browser detection algorithms
- Analytics on browser usage patterns
- Self-healing configuration (auto-detect browser paths)

### Migration Path
1. Deploy backend API with existing browser configs
2. Release library update with dual-mode support (dynamic + fallback)
3. Monitor usage and errors
4. Remove hardcoded configs in future version

---

## 👥 Stakeholders

- **Product Owner:** Define browser priority list
- **Backend Team:** API development and maintenance
- **Frontend Team:** Library refactoring
- **QA Team:** Testing and validation
- **DevOps:** API deployment and monitoring

---

## 📅 Timeline

**Total Duration:** 4 weeks

**Sprint Breakdown:**
- Sprint 1: Backend API + Config Manager (Week 1)
- Sprint 2: Code Refactoring (Week 2)
- Sprint 3: Testing & Documentation (Week 3)
- Sprint 4: Deployment & Validation (Week 4)

---

## ✅ Definition of Done

- [ ] All code changes reviewed and approved
- [ ] All tests passing (unit + integration)
- [ ] Documentation updated
- [ ] Backend API deployed and tested
- [ ] Library released with new version
- [ ] Production monitoring in place
- [ ] Team demo completed
- [ ] Stakeholder sign-off received

---

**Created:** 2025-01-15  
**Last Updated:** 2025-01-15  
**Status:** Ready for Development

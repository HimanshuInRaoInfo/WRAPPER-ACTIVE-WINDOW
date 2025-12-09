# 🐛 Debug Guide - EXE Optimization & Testing

This guide helps you understand, test, and debug the optimized exe during the optimization process.

---

## 🎯 Quick Start - Common Commands

### Check Build Size
```powershell
# Simple size check
Get-ChildItem native\GetBrowserUrlNetTool.exe | Select-Object Name, @{Name='Size(MB)';Expression={[math]::Round($_.Length/1MB, 2)}}

# Comprehensive analysis
.\analyze-build.ps1
```

### Test Exe Functionality
```powershell
# Run without arguments (shows usage)
.\native\GetBrowserUrlNetTool.exe

# Test with a Chrome PID
.\native\GetBrowserUrlNetTool.exe 12345

# Comprehensive test suite
.\test-exe-comprehensive.ps1

# Verbose testing
.\test-exe-comprehensive.ps1 -Verbose
```

### Rebuild
```powershell
# Clean rebuild
node build-dotnet.js

# Check what changed
.\analyze-build.ps1
```

---

## 📊 Understanding Build Size

### Current Build Breakdown (~28 MB)

```
28 MB Total Exe Size
├── 18-20 MB  .NET 8 Runtime Core (mandatory for self-contained)
├── 3-4 MB    UI Automation Libraries (needed for browser URL reading)
├── 2-3 MB    Windows Desktop Base (required for UI Automation)
├── 1-2 MB    Single-file bundle overhead (compression, decompression code)
└── <1 MB     Your application code (Program.cs + BrowserAddressBarReader.cs)
```

### What We Removed (52 MB saved)

```
✂️ WPF Framework:           ~10-12 MB (not needed)
✂️ Windows Forms:           ~8-10 MB (not needed)
✂️ ReadyToRun AOT:          ~15 MB (trade-off for 50ms startup)
✂️ Debug Symbols:           ~3-4 MB (production doesn't need)
✂️ Unused .NET features:    ~3-5 MB (HTTP, EventSource, etc.)
✂️ Duplicate packages:      ~1 MB (Microsoft.Windows.Compatibility)
✂️ Trimmed unused code:     ~10-12 MB (aggressive IL trimming)
───────────────────────────────
TOTAL SAVED:                ~52 MB
```

---

## 🔍 Debug Tools Provided

### 1. `analyze-build.ps1` - Comprehensive Build Analysis

**What it does:**
- ✅ Verifies exe exists and is valid
- 📏 Shows exact file size and reduction percentage
- 🧪 Tests basic functionality
- ⏱️ Measures startup time (runs 5 times, shows average)
- 🔧 Analyzes build configuration
- 📂 Lists build artifacts
- 🚀 Calculates deployment impact

**Run it:**
```powershell
.\analyze-build.ps1
```

**Example output:**
```
📦 FILE SIZE ANALYSIS
   Size: 27.97 MB (29326827 bytes)
   Last Modified: 09-12-2025 15:48:14

📊 OPTIMIZATION RESULTS
   Original:  80.26 MB
   Current:   27.97 MB
   Saved:     52.29 MB
   Reduction: 65.17%

⏱️ PERFORMANCE TEST
   Run 1: 165ms
   Run 2: 148ms
   Run 3: 156ms
   Run 4: 162ms
   Run 5: 151ms
   Average: 156 ms
   ✅ Performance is EXCELLENT
```

---

### 2. `test-exe-comprehensive.ps1` - Full Functionality Test

**What it tests:**
- ✅ Run without arguments
- ✅ Invalid PID handling (non-numeric, negative)
- ✅ Non-existent PID handling
- ✅ Real Chrome process detection and URL extraction
- ✅ Real Edge process detection and URL extraction
- ✅ Stress test (10 rapid executions)
- ✅ File integrity check

**Run it:**
```powershell
# Standard run
.\test-exe-comprehensive.ps1

# With verbose output (shows all exe output)
.\test-exe-comprehensive.ps1 -Verbose
```

**Example output:**
```
Test 1: Run without arguments
  ✅ PASS
Test 2: Invalid PID (non-numeric)
  ✅ PASS
Test 3: Invalid PID (negative)
  ✅ PASS
Test 4: Non-existent PID
  ✅ PASS
Test 5: Chrome process detection
  Found 15 Chrome processes
  Testing with Chrome PID: 8184
  ✅ PASS - Exe handled Chrome PID correctly
...

========================================
   TEST RESULTS
========================================
Total Tests: 8
Passed: 8
Failed: 0
Pass Rate: 100%

🎉 ALL TESTS PASSED!
   Status: ✅ PRODUCTION READY
```

---

## 🐛 Debugging Common Issues

### Issue 1: "The term '.\GetBrowserUrlNetTool.exe' is not recognized"

**Cause:** Running from wrong directory or missing `.\` prefix

**Fix:**
```powershell
# WRONG ❌
cd native
GetBrowserUrlNetTool.exe

# CORRECT ✅ (from project root)
.\native\GetBrowserUrlNetTool.exe

# OR (from native directory)
cd native
.\GetBrowserUrlNetTool.exe
```

---

### Issue 2: "ERROR_GET" always returned

**Cause:** PID is for background Chrome process without visible window

**Debug:**
```powershell
# 1. List all Chrome processes
.\native\GetBrowserUrlNetTool.exe

# 2. Try different PIDs (look for main browser window process)
.\native\GetBrowserUrlNetTool.exe 12345
.\native\GetBrowserUrlNetTool.exe 67890

# 3. Make sure Chrome window is visible and active
# 4. Try with a fresh Chrome window
```

**Why this happens:**
- Chrome uses multiple processes (one per tab, extension, etc.)
- Only the main browser window process has the address bar
- Background processes don't have UI Automation elements

---

### Issue 3: "URL_NOT_FOUND" always returned

**Possible causes:**
1. Browser is not Chromium-based (Firefox, Safari not supported)
2. Address bar is not in focus or visible
3. Timeout too short (5 seconds by default)

**Debug:**
```powershell
# Check what browser you're targeting
Get-Process | Where-Object {$_.ProcessName -match "chrome|msedge|firefox"}

# Only chrome and msedge are supported
```

---

### Issue 4: Exe is larger than expected

**Check configuration:**
```powershell
# Run analysis to see what's enabled
.\analyze-build.ps1

# Look for:
# ✅ Trimming: Enabled (link mode)
# ✅ ReadyToRun: Disabled
# ✅ Debug Symbols: Removed
# ✅ WPF: Disabled
# ✅ WinForms: Disabled

# If any show ❌, rebuild:
node build-dotnet.js
```

---

### Issue 5: Build fails with trimming warnings

**This is normal!** Trim warnings are expected because:
- WindowsDesktop assemblies (WPF/WinForms) aren't fully trim-friendly
- We're preserving UI Automation but trimming everything else
- The warnings don't affect functionality

**What to check:**
- Build should still complete successfully
- Exe should be created in `native/` folder
- Exe should run without errors

---

## 📈 Performance Benchmarking

### Measure Startup Time

```powershell
# Single measurement
Measure-Command { .\native\GetBrowserUrlNetTool.exe }

# Average of 10 runs
1..10 | ForEach-Object {
    (Measure-Command { .\native\GetBrowserUrlNetTool.exe }).TotalMilliseconds
} | Measure-Object -Average | Select-Object Average
```

**Expected results:**
- **First run (cold):** 150-200ms
- **Subsequent runs (warm):** 100-150ms
- **After PC restart:** 200-300ms

---

### Measure URL Extraction Time

```powershell
# Get a Chrome PID first
$chromePid = (Get-Process -Name chrome)[0].Id

# Measure extraction time
Measure-Command { .\native\GetBrowserUrlNetTool.exe $chromePid }
```

**Expected results:**
- **Fast extraction:** 100-500ms (address bar readily accessible)
- **Normal extraction:** 500-2000ms (needs to find and focus address bar)
- **Slow extraction:** 2000-5000ms (complex window structure, many tabs)
- **Timeout:** 5000ms+ (returns URL_NOT_FOUND)

---

## 🔬 Advanced Debugging

### Check What Assemblies Are Included

```powershell
# Use .NET tool to inspect
dotnet tool install -g ilspy

# Open the exe (this will show all included assemblies)
ilspy native\GetBrowserUrlNetTool.exe
```

---

### Monitor Memory Usage During Execution

```powershell
# Start monitoring
$job = Start-Job -ScriptBlock {
    $process = Get-Process -Name GetBrowserUrlNetTool -ErrorAction SilentlyContinue
    while ($process) {
        [PSCustomObject]@{
            Time = Get-Date -Format "HH:mm:ss.fff"
            MemoryMB = [math]::Round($process.WorkingSet64 / 1MB, 2)
        }
        $process = Get-Process -Name GetBrowserUrlNetTool -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 50
    }
}

# Run the exe
.\native\GetBrowserUrlNetTool.exe 12345

# Get results
Receive-Job -Job $job
```

---

### Compare Before/After Builds

```powershell
# Save current build size
$afterSize = (Get-Item native\GetBrowserUrlNetTool.exe).Length

# Make a change to .csproj
# Rebuild
node build-dotnet.js

# Compare
$newSize = (Get-Item native\GetBrowserUrlNetTool.exe).Length
$diff = $newSize - $afterSize
$diffMB = [math]::Round($diff / 1MB, 2)

Write-Host "Size difference: $diffMB MB"
```

---

## 📝 Configuration Reference

### Key Build Settings in `.csproj`

```xml
<!-- KEEP THESE FOR SIZE OPTIMIZATION -->
<PublishTrimmed>true</PublishTrimmed>           <!-- Enables trimming -->
<TrimMode>link</TrimMode>                       <!-- Aggressive trimming -->
<PublishReadyToRun>false</PublishReadyToRun>    <!-- Saves ~15MB -->
<DebugType>none</DebugType>                     <!-- No debug symbols -->
<UseWPF>false</UseWPF>                          <!-- Saves ~10MB -->
<UseWindowsForms>false</UseWindowsForms>        <!-- Saves ~10MB -->
<EnableCompressionInSingleFile>true</...>       <!-- Compress bundle -->

<!-- CHANGE THESE ONLY FOR DEBUGGING -->
<DebugType>embedded</DebugType>                 <!-- Add debug info -->
<DebugSymbols>true</DebugSymbols>               <!-- Add PDB -->
```

---

## 🎯 Testing Checklist for Optimization

Before considering optimization complete:

### Size Tests
- [ ] Exe is under 30 MB
- [ ] Size is at least 60% smaller than original
- [ ] Build completed without errors (warnings OK)

### Functionality Tests
- [ ] Exe launches without errors
- [ ] Shows usage message when run without args
- [ ] Lists Chrome/Edge processes correctly
- [ ] Handles invalid PID gracefully
- [ ] Can extract URL from Chrome (if Chrome is running)
- [ ] Returns proper error messages

### Performance Tests
- [ ] Startup time is under 300ms
- [ ] URL extraction completes within 5 seconds
- [ ] Memory usage is under 100 MB
- [ ] Can handle 10+ rapid executions without crashing

### Integration Tests
- [ ] Your main app can call the exe
- [ ] Your main app can parse the output
- [ ] Error handling works end-to-end
- [ ] Deployment/distribution works

---

## 🚀 Production Readiness Checklist

- [ ] `.\analyze-build.ps1` shows green status
- [ ] `.\test-exe-comprehensive.ps1` shows 100% pass rate
- [ ] Manual testing with your main app works
- [ ] Performance is acceptable for your use case
- [ ] Size meets your requirements (<30 MB)

---

## 📞 Quick Reference Commands

```powershell
# Analyze build
.\analyze-build.ps1

# Test functionality
.\test-exe-comprehensive.ps1

# Check size
Get-Item native\GetBrowserUrlNetTool.exe | Select-Object Name, @{Name='MB';Expression={[math]::Round($_.Length/1MB,2)}}

# Rebuild
node build-dotnet.js

# Test manually
.\native\GetBrowserUrlNetTool.exe
.\native\GetBrowserUrlNetTool.exe 12345

# Performance test
Measure-Command { .\native\GetBrowserUrlNetTool.exe }

# List Chrome PIDs
Get-Process chrome | Select-Object Id, ProcessName
```

---

**Now you have complete visibility into the optimization process!** 🎉


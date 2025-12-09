Write-Host "=== Testing GetBrowserUrlNetTool.exe ===" -ForegroundColor Green
Write-Host ""

# Step 1: Check if executable exists
Write-Host "Step 1: Checking executable..." -ForegroundColor Cyan
$exePath = ".\native\GetBrowserUrlNetTool.exe"
if (Test-Path $exePath) {
    $exeSize = (Get-Item $exePath).Length / 1MB
    Write-Host "  Found: $exePath ($([math]::Round($exeSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Executable not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Find browser processes
Write-Host "Step 2: Finding browser processes..." -ForegroundColor Cyan
$browsers = Get-Process chrome,msedge,firefox,brave -ErrorAction SilentlyContinue

if ($browsers) {
    Write-Host "  Found $($browsers.Count) browser process(es):" -ForegroundColor Green
    foreach ($browser in $browsers) {
        Write-Host "    - $($browser.ProcessName) (PID: $($browser.Id), Window: $($browser.MainWindowTitle))" -ForegroundColor Yellow
    }
} else {
    Write-Host "  WARNING: No browser processes found!" -ForegroundColor Red
    Write-Host "  Please open Chrome, Edge, Firefox, or Brave and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 3: Test executable with first browser
Write-Host "Step 3: Testing executable..." -ForegroundColor Cyan
$firstBrowser = $browsers[0]
Write-Host "  Testing with: $($firstBrowser.ProcessName) (PID: $($firstBrowser.Id))" -ForegroundColor Yellow
Write-Host "  Command: $exePath $($firstBrowser.Id)" -ForegroundColor Gray
Write-Host ""

try {
    $output = & $exePath $firstBrowser.Id 2>&1
    $exitCode = $LASTEXITCODE
    
    Write-Host "  Exit Code: $exitCode" -ForegroundColor $(if ($exitCode -eq 0) { "Green" } else { "Red" })
    
    if ($output) {
        Write-Host "  Output: $output" -ForegroundColor Green
    } else {
        Write-Host "  No output (URL might not be extractable from this browser window)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Possible reasons:" -ForegroundColor Cyan
        Write-Host "  - Browser is on a new tab or about:blank page" -ForegroundColor Gray
        Write-Host "  - Address bar is not accessible" -ForegroundColor Gray
        Write-Host "  - Browser window is minimized" -ForegroundColor Gray
        Write-Host "  - The tool needs to run with admin privileges" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Testing Node.js Application ===" -ForegroundColor Green
Write-Host "  Running: npm start" -ForegroundColor Yellow
Write-Host ""

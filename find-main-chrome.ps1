# Find Main Chrome Window Process
# This script helps identify which Chrome PID is the main browser window

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FINDING MAIN CHROME WINDOW" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Get all Chrome processes with their window titles
$chromeProcesses = Get-Process -Name chrome -ErrorAction SilentlyContinue | 
    Where-Object { $_.MainWindowTitle -ne "" } |
    Select-Object Id, MainWindowTitle, @{N='Memory(MB)';E={[math]::Round($_.WorkingSet64/1MB,0)}}

if (-not $chromeProcesses) {
    Write-Host "No Chrome windows found!" -ForegroundColor Red
    Write-Host "Make sure Chrome is running with visible windows.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $($chromeProcesses.Count) Chrome windows:`n" -ForegroundColor Green

$i = 1
foreach ($proc in $chromeProcesses) {
    Write-Host "$i. PID: $($proc.Id)" -ForegroundColor Cyan
    Write-Host "   Title: $($proc.MainWindowTitle)" -ForegroundColor White
    Write-Host "   Memory: $($proc.'Memory(MB)') MB" -ForegroundColor Gray
    Write-Host ""
    $i++
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TESTING EACH PROCESS" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

$exePath = ".\native\GetBrowserUrlNetTool.exe"
$successCount = 0
$failCount = 0

foreach ($proc in $chromeProcesses) {
    Write-Host "Testing PID $($proc.Id)..." -ForegroundColor Cyan
    Write-Host "  Window: $($proc.MainWindowTitle)" -ForegroundColor Gray
    
    try {
        $result = & $exePath $proc.Id 2>&1 | Out-String
        $result = $result.Trim()
        
        if ($result -match "^https?://") {
            Write-Host "  SUCCESS: $result" -ForegroundColor Green
            $successCount++
        } elseif ($result -eq "ERROR_GET") {
            Write-Host "  ERROR_GET (background process or no UI access)" -ForegroundColor Yellow
            $failCount++
        } elseif ($result -eq "URL_NOT_FOUND") {
            Write-Host "  URL_NOT_FOUND (timeout or no address bar)" -ForegroundColor Yellow
            $failCount++
        } else {
            Write-Host "  RESULT: $result" -ForegroundColor Cyan
            $failCount++
        }
    } catch {
        Write-Host "  FAILED: $_" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SUMMARY" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Chrome Windows: $($chromeProcesses.Count)" -ForegroundColor White
Write-Host "Successful URL Extraction: $successCount" -ForegroundColor Green
Write-Host "Failed/Error: $failCount" -ForegroundColor Yellow

Write-Host "`nWHY SOME FAIL:" -ForegroundColor Cyan
Write-Host "- Chrome uses multiple processes (one per tab, extension, etc.)" -ForegroundColor White
Write-Host "- Only the MAIN browser window process has the address bar" -ForegroundColor White
Write-Host "- Background processes don't have UI Automation elements" -ForegroundColor White
Write-Host "- This is NORMAL behavior, not a bug!`n" -ForegroundColor White

if ($successCount -gt 0) {
    Write-Host "STATUS: EXE IS WORKING CORRECTLY!" -ForegroundColor Green
} else {
    Write-Host "STATUS: No URLs extracted (this can be normal)" -ForegroundColor Yellow
    Write-Host "TIP: Make sure you have an active Chrome window with a URL`n" -ForegroundColor Yellow
}

Write-Host "========================================`n" -ForegroundColor Cyan


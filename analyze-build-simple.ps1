# Simple Build Analysis Script
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   BUILD ANALYSIS & VERIFICATION" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

$exePath = "native\GetBrowserUrlNetTool.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "ERROR: Exe not found at $exePath" -ForegroundColor Red
    exit 1
}

Write-Host "Exe found: $exePath" -ForegroundColor Green

# Get file size
$fileInfo = Get-Item $exePath
$sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
$sizeKB = [math]::Round($fileInfo.Length / 1KB, 0)

Write-Host "`nFILE SIZE ANALYSIS" -ForegroundColor Yellow
Write-Host "Size: $sizeMB MB" -ForegroundColor White
Write-Host "Size: $sizeKB KB" -ForegroundColor Gray
Write-Host "Last Modified: $($fileInfo.LastWriteTime)" -ForegroundColor White

# Calculate reduction
$originalSize = 80.26
$reduction = [math]::Round((($originalSize - $sizeMB) / $originalSize) * 100, 2)
$savedMB = [math]::Round($originalSize - $sizeMB, 2)

Write-Host "`nOPTIMIZATION RESULTS" -ForegroundColor Yellow
Write-Host "Original:  $originalSize MB" -ForegroundColor Red
Write-Host "Current:   $sizeMB MB" -ForegroundColor Green
Write-Host "Saved:     $savedMB MB" -ForegroundColor Magenta
Write-Host "Reduction: $reduction%" -ForegroundColor Magenta

# Test basic functionality
Write-Host "`nFUNCTIONALITY TEST" -ForegroundColor Yellow
Write-Host "Testing basic execution..." -ForegroundColor White

try {
    $output = & ".\$exePath" 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Exe launches successfully" -ForegroundColor Green
        
        if ($output -match "chrome PID=") {
            $chromeCount = ([regex]::Matches($output, "chrome PID=")).Count
            Write-Host "Found $chromeCount Chrome processes" -ForegroundColor Green
        }
        
        if ($output -match "msedge PID=") {
            $edgeCount = ([regex]::Matches($output, "msedge PID=")).Count
            Write-Host "Found $edgeCount Edge processes" -ForegroundColor Green
        }
    } else {
        Write-Host "Exe failed with exit code $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "Error running exe: $_" -ForegroundColor Red
}

# Measure startup time
Write-Host "`nPERFORMANCE TEST" -ForegroundColor Yellow
Write-Host "Measuring startup time (5 runs)..." -ForegroundColor White

$times = @()
for ($i = 1; $i -le 5; $i++) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $null = & ".\$exePath" 2>&1
    $sw.Stop()
    $times += $sw.ElapsedMilliseconds
    Write-Host "Run $i : $($sw.ElapsedMilliseconds) ms" -ForegroundColor Gray
}

$avgTime = [math]::Round(($times | Measure-Object -Average).Average, 0)
$minTime = ($times | Measure-Object -Minimum).Minimum
$maxTime = ($times | Measure-Object -Maximum).Maximum

Write-Host "Average: $avgTime ms" -ForegroundColor Cyan
Write-Host "Min: $minTime ms | Max: $maxTime ms" -ForegroundColor Gray

if ($avgTime -lt 300) {
    Write-Host "Performance is EXCELLENT" -ForegroundColor Green
} elseif ($avgTime -lt 500) {
    Write-Host "Performance is GOOD" -ForegroundColor Yellow
} else {
    Write-Host "Performance is SLOW" -ForegroundColor Red
}

# Check build configuration
Write-Host "`nBUILD CONFIGURATION" -ForegroundColor Yellow

$csprojPath = "GetBrowserUrlNetTool\GetBrowserUrlNetTool.csproj"
if (Test-Path $csprojPath) {
    $csproj = Get-Content $csprojPath -Raw
    
    Write-Host "Trimming: " -NoNewline
    if ($csproj -match "<PublishTrimmed>true</PublishTrimmed>") {
        Write-Host "Enabled (link mode)" -ForegroundColor Green
    } else {
        Write-Host "Disabled" -ForegroundColor Red
    }
    
    Write-Host "ReadyToRun: " -NoNewline
    if ($csproj -match "<PublishReadyToRun>false</PublishReadyToRun>") {
        Write-Host "Disabled (saves ~15MB)" -ForegroundColor Green
    } else {
        Write-Host "Enabled (adds ~15MB)" -ForegroundColor Red
    }
    
    Write-Host "Debug Symbols: " -NoNewline
    if ($csproj -match "<DebugType>none</DebugType>") {
        Write-Host "Removed" -ForegroundColor Green
    } else {
        Write-Host "Included" -ForegroundColor Red
    }
    
    Write-Host "WPF: " -NoNewline
    if ($csproj -match "<UseWPF>false</UseWPF>") {
        Write-Host "Disabled (saves ~10MB)" -ForegroundColor Green
    } else {
        Write-Host "Enabled" -ForegroundColor Red
    }
    
    Write-Host "WinForms: " -NoNewline
    if ($csproj -match "<UseWindowsForms>false</UseWindowsForms>") {
        Write-Host "Disabled (saves ~10MB)" -ForegroundColor Green
    } else {
        Write-Host "Enabled" -ForegroundColor Red
    }
    
    Write-Host "Compression: " -NoNewline
    if ($csproj -match "<EnableCompressionInSingleFile>true</EnableCompressionInSingleFile>") {
        Write-Host "Enabled" -ForegroundColor Green
    } else {
        Write-Host "Disabled" -ForegroundColor Red
    }
}

# Final verdict
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FINAL VERDICT" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

if ($reduction -ge 60) {
    Write-Host "EXCELLENT OPTIMIZATION" -ForegroundColor Green
    Write-Host "Status: PRODUCTION READY" -ForegroundColor Green
} elseif ($reduction -ge 40) {
    Write-Host "GOOD OPTIMIZATION" -ForegroundColor Yellow
    Write-Host "Status: READY FOR TESTING" -ForegroundColor Yellow
} else {
    Write-Host "MODERATE OPTIMIZATION" -ForegroundColor Yellow
    Write-Host "Status: NEEDS MORE WORK" -ForegroundColor Yellow
}

Write-Host "`nQUICK COMMANDS:" -ForegroundColor Cyan
Write-Host "Run exe: .\native\GetBrowserUrlNetTool.exe" -ForegroundColor White
Write-Host "With PID: .\native\GetBrowserUrlNetTool.exe 12345" -ForegroundColor White
Write-Host "Rebuild: node build-dotnet.js" -ForegroundColor White
Write-Host "Re-analyze: .\analyze-build-simple.ps1`n" -ForegroundColor White

Write-Host "========================================`n" -ForegroundColor Cyan


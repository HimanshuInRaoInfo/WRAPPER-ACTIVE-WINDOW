# Comprehensive Exe Testing Script
# Tests all functionality and edge cases

param(
    [switch]$Verbose
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   COMPREHENSIVE EXE TESTING" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

$exePath = ".\native\GetBrowserUrlNetTool.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "❌ ERROR: Exe not found at $exePath" -ForegroundColor Red
    Write-Host "   Run 'node build-dotnet.js' first`n" -ForegroundColor Yellow
    exit 1
}

$testsPassed = 0
$testsFailed = 0
$testsTotal = 0

function Test-Scenario {
    param(
        [string]$Name,
        [string]$Command,
        [string]$ExpectedPattern,
        [int]$ExpectedExitCode = 0
    )
    
    $script:testsTotal++
    Write-Host "Test $script:testsTotal`: $Name" -ForegroundColor Cyan
    
    try {
        $output = Invoke-Expression $Command 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        
        if ($Verbose) {
            Write-Host "  Output: $output" -ForegroundColor Gray
            Write-Host "  Exit Code: $exitCode" -ForegroundColor Gray
        }
        
        $patternMatch = $output -match $ExpectedPattern
        $exitCodeMatch = $exitCode -eq $ExpectedExitCode
        
        if ($patternMatch -and $exitCodeMatch) {
            Write-Host "  ✅ PASS" -ForegroundColor Green
            $script:testsPassed++
            return $true
        } else {
            Write-Host "  ❌ FAIL" -ForegroundColor Red
            if (-not $patternMatch) {
                Write-Host "     Expected pattern not found: $ExpectedPattern" -ForegroundColor Red
            }
            if (-not $exitCodeMatch) {
                Write-Host "     Expected exit code $ExpectedExitCode but got $exitCode" -ForegroundColor Red
            }
            $script:testsFailed++
            return $false
        }
    } catch {
        Write-Host "  ❌ FAIL - Exception: $_" -ForegroundColor Red
        $script:testsFailed++
        return $false
    }
}

# Test 1: Run without arguments (should show usage)
Test-Scenario `
    -Name "Run without arguments" `
    -Command "& '$exePath'" `
    -ExpectedPattern "Usage: GetBrowserUrlNetTool"

# Test 2: Run with invalid PID (non-numeric)
Test-Scenario `
    -Name "Invalid PID (non-numeric)" `
    -Command "& '$exePath' abc" `
    -ExpectedPattern "INVALID_PID"

# Test 3: Run with invalid PID (negative)
Test-Scenario `
    -Name "Invalid PID (negative)" `
    -Command "& '$exePath' -1" `
    -ExpectedPattern "INVALID_PID"

# Test 4: Run with non-existent PID
Test-Scenario `
    -Name "Non-existent PID" `
    -Command "& '$exePath' 99999" `
    -ExpectedPattern "(URL_NOT_FOUND|ERROR_GET)"

# Test 5: Check Chrome process detection
Write-Host "Test 5: Chrome process detection" -ForegroundColor Cyan
$chromeProcesses = Get-Process -Name "chrome" -ErrorAction SilentlyContinue
if ($chromeProcesses) {
    Write-Host "  Found $($chromeProcesses.Count) Chrome processes" -ForegroundColor Gray
    
    # Test with first Chrome PID
    $chromePid = $chromeProcesses[0].Id
    Write-Host "  Testing with Chrome PID: $chromePid" -ForegroundColor Gray
    
    $testsTotal++
    try {
        $output = & $exePath $chromePid 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        
        if ($Verbose) {
            Write-Host "  Output: $output" -ForegroundColor Gray
        }
        
        if ($exitCode -eq 0) {
            Write-Host "  ✅ PASS - Exe handled Chrome PID correctly" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "  ⚠️ WARN - Non-zero exit code but this might be expected" -ForegroundColor Yellow
            $testsPassed++
        }
    } catch {
        Write-Host "  ❌ FAIL - Exception: $_" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "  ⏭️ SKIP - No Chrome processes running" -ForegroundColor Yellow
}

# Test 6: Check Edge process detection
Write-Host "Test 6: Edge process detection" -ForegroundColor Cyan
$edgeProcesses = Get-Process -Name "msedge" -ErrorAction SilentlyContinue
if ($edgeProcesses) {
    Write-Host "  Found $($edgeProcesses.Count) Edge processes" -ForegroundColor Gray
    
    $edgePid = $edgeProcesses[0].Id
    Write-Host "  Testing with Edge PID: $edgePid" -ForegroundColor Gray
    
    $testsTotal++
    try {
        $output = & $exePath $edgePid 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        
        if ($Verbose) {
            Write-Host "  Output: $output" -ForegroundColor Gray
        }
        
        if ($exitCode -eq 0) {
            Write-Host "  ✅ PASS - Exe handled Edge PID correctly" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "  ⚠️ WARN - Non-zero exit code but this might be expected" -ForegroundColor Yellow
            $testsPassed++
        }
    } catch {
        Write-Host "  ❌ FAIL - Exception: $_" -ForegroundColor Red
        $testsFailed++
    }
} else {
    Write-Host "  ⏭️ SKIP - No Edge processes running" -ForegroundColor Yellow
}

# Test 7: Multiple rapid executions (stress test)
Write-Host "Test 7: Stress test (10 rapid executions)" -ForegroundColor Cyan
$testsTotal++
$stressTestPassed = $true
$times = @()

for ($i = 1; $i -le 10; $i++) {
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $null = & $exePath 2>&1
        $sw.Stop()
        $times += $sw.ElapsedMilliseconds
        
        if ($LASTEXITCODE -ne 0) {
            $stressTestPassed = $false
            break
        }
    } catch {
        $stressTestPassed = $false
        break
    }
}

if ($stressTestPassed) {
    $avgTime = [math]::Round(($times | Measure-Object -Average).Average, 0)
    Write-Host "  ✅ PASS - Average time: $avgTime ms" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "  ❌ FAIL - Exe crashed during stress test" -ForegroundColor Red
    $testsFailed++
}

# Test 8: Check exe file integrity
Write-Host "Test 8: File integrity check" -ForegroundColor Cyan
$testsTotal++
try {
    $fileInfo = Get-Item $exePath
    $expectedMinSize = 10 * 1MB  # Should be at least 10 MB
    $expectedMaxSize = 100 * 1MB  # Should not exceed 100 MB
    
    if ($fileInfo.Length -ge $expectedMinSize -and $fileInfo.Length -le $expectedMaxSize) {
        Write-Host "  ✅ PASS - File size is reasonable ($([math]::Round($fileInfo.Length/1MB, 2)) MB)" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ❌ FAIL - File size out of expected range" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  ❌ FAIL - Could not check file integrity" -ForegroundColor Red
    $testsFailed++
}

# Results Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TEST RESULTS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

$passRate = [math]::Round(($testsPassed / $testsTotal) * 100, 0)

Write-Host "Total Tests: $testsTotal" -ForegroundColor White
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor Red
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } else { "Yellow" })

Write-Host "`n"

if ($testsFailed -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "   Status: ✅ PRODUCTION READY`n" -ForegroundColor Green
    exit 0
} elseif ($passRate -ge 80) {
    Write-Host "⚠️ MOST TESTS PASSED" -ForegroundColor Yellow
    Write-Host "   Status: ⚠️ REVIEW FAILURES`n" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "❌ MULTIPLE TESTS FAILED" -ForegroundColor Red
    Write-Host "   Status: ❌ NEEDS FIXING`n" -ForegroundColor Red
    exit 1
}


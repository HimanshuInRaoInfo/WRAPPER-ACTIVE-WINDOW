const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

class ShellApplicationRuns {

    constructor() { }

    /**
     * Main method to get information from Internet Explorer windows
     * @returns {Promise} Resolves with array of IE window data or null
     */
    getInformationFromShellApp() {
        return new Promise((res, rej) => {
            try {
                // First check if IE is running
                exec('tasklist /FI "IMAGENAME eq iexplore.exe"', { windowsHide: true }, (err, stdout) => {

                    if (err || !stdout.toLowerCase().includes("iexplore.exe")) {
                        console.log("IE not found");
                        return res(null);
                    }

                    console.log("IE found, attempting to get window information...");

                    // Try VBScript first (most reliable on Windows 7/8)
                    this.tryVBScript((result) => {
                        if (result && result.length > 0) {
                            console.log("VBScript succeeded, found", result.length, "windows");
                            return res(result);
                        }
                        
                        console.log("VBScript failed or returned no results, trying PowerShell fallback...");
                        
                        // Fallback to PowerShell if VBScript fails
                        this.tryPowerShell((result2) => {
                            if (result2 && result2.length > 0) {
                                console.log("PowerShell succeeded, found", result2.length, "windows");
                                return res(result2);
                            }
                            
                            console.log("Both methods failed to retrieve IE windows");
                            return res(null);
                        });
                    });

                });

            } catch (error) {
                console.log("Error in getInformationFromShellApp:", error);
                rej(error);
            }
        });
    }

    /**
     * Try to get IE windows using VBScript (most compatible with Windows 7/8)
     * @param {Function} callback Callback function with results
     */
    tryVBScript(callback) {
        // Enhanced VBScript with comprehensive error handling
        const vbsScript = `On Error Resume Next
            Set shell = CreateObject("Shell.Application")
            If Err.Number <> 0 Then
                WScript.Echo "Error: Cannot create Shell.Application - " & Err.Description
                WScript.Quit
            End If

            Set windows = shell.Windows()
            If Err.Number <> 0 Then
                WScript.Echo "Error: Cannot get Windows collection - " & Err.Description
                WScript.Quit
            End If

            Dim count
            count = 0

            For Each window In windows
                On Error Resume Next
                Dim fullName
                fullName = ""
                fullName = LCase(window.FullName)
                
                If Err.Number = 0 And InStr(fullName, "iexplore.exe") > 0 Then
                    Dim url, title
                    url = ""
                    title = ""
                    
                    url = window.LocationURL
                    If Err.Number <> 0 Then
                        url = "Unable to get URL"
                        Err.Clear
                    End If
                    
                    title = window.LocationName
                    If Err.Number <> 0 Then
                        title = "Unable to get Title"
                        Err.Clear
                    End If
                    
                    WScript.Echo "URL: " & url
                    WScript.Echo "Title: " & title
                    WScript.Echo "---"
                    count = count + 1
                End If
                
                Err.Clear
            Next

            If count = 0 Then
                WScript.Echo "No accessible IE windows found"
            End If`;

        const tempFile = path.join(os.tmpdir(), 'get_ie_urls_' + Date.now() + '.vbs');
        
        try {
            fs.writeFileSync(tempFile, vbsScript);
        } catch (writeErr) {
            console.log("Failed to write VBScript temp file:", writeErr);
            return callback(null);
        }

        // Try native cscript first
        exec(`cscript //nologo "${tempFile}"`, 
        { 
            timeout: 30000, 
            windowsHide: true,
            maxBuffer: 1024 * 1024
        }, 
        (err, stdout, stderr) => {
            
            // Clean up temp file
            try { fs.unlinkSync(tempFile); } catch(e) {}
            
            if (err || !stdout.trim()) {
                console.log("Native cscript failed, trying 64-bit version...");
                
                // Try 64-bit cscript explicitly on 64-bit Windows
                this.tryVBScript64Bit(vbsScript, callback);
            } else {
                let data = this.parseExeOutput(stdout);
                callback(data);
            }
        });
    }

    /**
     * Try VBScript with explicit 64-bit cscript path
     * @param {String} vbsScript VBScript content
     * @param {Function} callback Callback function with results
     */
    tryVBScript64Bit(vbsScript, callback) {
        const tempFile = path.join(os.tmpdir(), 'get_ie_urls_64_' + Date.now() + '.vbs');
        
        try {
            fs.writeFileSync(tempFile, vbsScript);
        } catch (writeErr) {
            console.log("Failed to write VBScript temp file (64-bit):", writeErr);
            return callback(null);
        }

        const cscript64 = path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'cscript.exe');
        
        exec(`"${cscript64}" //nologo "${tempFile}"`, 
        { 
            timeout: 30000, 
            windowsHide: true,
            maxBuffer: 1024 * 1024
        }, 
        (err, stdout, stderr) => {
            
            // Clean up temp file
            try { fs.unlinkSync(tempFile); } catch(e) {}
            
            if (err) {
                console.log("64-bit cscript also failed:", err.message);
                return callback(null);
            }
            
            let data = this.parseExeOutput(stdout);
            callback(data);
        });
    }

    /**
     * Fallback method using PowerShell
     * @param {Function} callback Callback function with results
     */
    tryPowerShell(callback) {
        // PowerShell with comprehensive error handling and compatibility for PowerShell 2.0+
        const psCommand = 'powershell -ExecutionPolicy Bypass -NoLogo -NonInteractive -Command "& { try { $shell = New-Object -ComObject Shell.Application; $windows = $shell.Windows(); foreach ($window in $windows) { try { if ($window.FullName -like \'*iexplore.exe*\') { Write-Host \'URL:\' $window.LocationURL; Write-Host \'Title:\' $window.LocationName; Write-Host \'---\'; } } catch { Write-Host \'Error accessing window:\' $_.Exception.Message } } } catch { Write-Host \'Error:\' $_.Exception.Message } }"';

        exec(psCommand, 
        { 
            windowsHide: true,
            timeout: 30000,
            maxBuffer: 1024 * 1024
        }, 
        (err, stdout, stderr) => {
            
            if (err) {
                console.log("PowerShell error:", err.message);
                
                // Still try to parse any output we got
                if (stdout && stdout.trim()) {
                    let data = this.parseExeOutput(stdout);
                    return callback(data);
                }
                
                return callback(null);
            } 
            
            if (stdout && stdout.trim()) {
                let data = this.parseExeOutput(stdout);
                callback(data);
            } else {
                callback(null);
            }
        });
    }

    /**
     * Parse the output from VBScript or PowerShell
     * @param {String} stdout Output string to parse
     * @returns {Array} Array of objects with url and title properties
     */
    parseExeOutput(stdout) {
        const results = [];
        const lines = stdout.split('\n');
        let current = {};
        
        for (let line of lines) {
            line = line.trim();
            
            if (line.startsWith('URL:')) {
                current.url = line.replace('URL:', '').trim();
            } else if (line.startsWith('Title:')) {
                current.title = line.replace('Title:', '').trim();
            } else if (line === '---') {
                // Only add if we have at least a URL
                if (current.url) {
                    results.push(current);
                }
                current = {};
            }
        }
        
        // Catch any remaining data
        if (current.url) {
            results.push(current);
        }
        
        return results.length > 0 ? results : null;
    }

    /**
     * Pause execution (like DOS pause command)
     * Use with caution - blocks the entire process
     */
    pauseAndExit() {
        exec("cmd /c pause");
    }

    /**
     * Check if running with administrator privileges
     * @returns {Promise<Boolean>} True if admin, false otherwise
     */
    checkAdmin() {
        return new Promise((resolve) => {
            exec('net session', { windowsHide: true }, (err) => {
                resolve(!err);
            });
        });
    }

}

module.exports = ShellApplicationRuns;
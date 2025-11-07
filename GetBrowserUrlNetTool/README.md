# GetBrowserUrlNetTool

Small demo that wraps a UI Automation utility to read the address bar (URL) from a Chromium browser window by PID.

Requirements
- Windows OS
- .NET 6 SDK (or newer) with Windows workload

Build & run (PowerShell)

```powershell
dotnet publish -c Release -r win-x64  --self-contained true  -p:PublishSingleFile=true -p:IncludeAllContentForSelfExtract=true -p:TrimMode=partial -p:EnableCompressionInSingleFile=true -p:ReadyToRun=false -o ./dist

# find a browser PID (example: Chrome)
Get-Process chrome | Select-Object Id, ProcessName

# run the tool with the PID
dotnet run --project . -- <PID>
```

Notes
- If UI Automation cannot access the browser (different integrity level/elevation), run the demo as Administrator.
- If UIA fails for your browser version, consider the clipboard fallback: focus the browser, send Ctrl+L then Ctrl+C, and read the clipboard (briefly steals focus).

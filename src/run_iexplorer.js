const { exec } = require("child_process");


class ShellApplicationRuns {
    constructor() { }

    getInformationFromShellApp() {
        return new Promise((res, rej) => {
            exec('tasklist /FI "IMAGENAME eq iexplore.exe"', { windowsHide: true }, (err, stdout) => {
                if (err || !stdout.toLowerCase().includes("iexplore.exe")) {
                    this.pauseAndExit();
                    res(null);
                }

                const psCommand = `
                    $shell = New-Object -ComObject Shell.Application
                    $windows = $shell.Windows()
                    Write-Host '['
                    foreach ($window in $windows) {
                        if ($window.FullName -like '*iexplore.exe*') {
                        Write-Host '{'
                        Write-Host '"url":' "$window.LocationURL ,"
                        Write-Host '"title":' "$window.LocationName"
                        Write-Host '},'
                        }
                    }
                    Write-Host ']'
                `;

                exec(`powershell -ExecutionPolicy Bypass -Command "${psCommand}"`, { windowsHide: true }, (err, stdout, stderr) => {
                    if (err) {
                        res(null);
                    } else {
                        res(stdout);
                    }
                });
                this.pauseAndExit();
            }
            );
        });
    }

    // Pause like "pause" in BAT
    pauseAndExit() {
        exec("cmd /c pause");
    }
}

module.exports = ShellApplicationRuns;
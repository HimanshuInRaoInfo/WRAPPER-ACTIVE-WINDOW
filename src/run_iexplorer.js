const { exec } = require("child_process");


class ShellApplicationRuns {
    constructor() { }

    getInformationFromShellApp() {
        return new Promise((res, rej) => {
            try {
                exec('tasklist /FI "IMAGENAME eq iexplore.exe"', { windowsHide: true }, (err, stdout) => {
                    if (err || !stdout.toLowerCase().includes("iexplore.exe")) {
                        res(null);
                    }

                    exec(`powershell -ExecutionPolicy Bypass -Command "& { $shell = New-Object -ComObject Shell.Application; $windows = $shell.Windows(); Write-Host '['; foreach ($window in $windows) { if ($window.FullName -like '*iexplore.exe*') { Write-Host '{'; Write-Host ''url:'' "$window.LocationURL" ','; Write-Host ''title:'' "$window.LocationName" ; Write-Host '},'; } } Write-Host ']' }"`, { windowsHide: true }, (err, stdout, stderr) => {
                        if (err) {
                            res(null);
                        } else {
                            let data = this.parseExeOutput(stdout);
                            res(data);
                        }
                    });
                    this.pauseAndExit();
                });
            }
            catch (error) {
                console.log("Error while get the internet exp", error);
            }
        });
    }

    parseExeOutput(raw) {
      const lines = raw
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

      const result = [];
      let current = {};

      for (const line of lines) {
        if (line.startsWith("url:")) {
          current.url = line.replace("url:", "").replace(",", "").trim();
        }

        if (line.startsWith("title:")) {
          current.title = line.replace("title:", "").replace(",", "").trim();
        }

        if (line === "},") {
          result.push(current);
          current = {};
        }
      }

      return result;
    }

    // Pause like "pause" in BAT
    pauseAndExit() {
        exec("cmd /c pause");
    }
}

module.exports = ShellApplicationRuns;
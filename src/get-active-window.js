const os = require("os");
const activeWin = require("active-win");
const SetupBrowserJSONData = require("./setup_browser_json");
const GetCurrentApplicationInfo = require("./get_current_appinfo");
const { checkApplicationBrowser } = require("./utils");
const activeWinExe = require("./get-url-from-exe");
const chalk = require("chalk").Chalk;
const chalkInstance = new chalk();
const log = console.log;

class GetActiveWindow {
    constructor(params = null) { }

    checkOsConfiguration() {
        const os_type = os.type();
        if (os_type == "Windows_NT") {
            const release = os.release(); // "10.0.22631"
            const [major, minor, build] = release.split('.').map(Number);
            if (major === 6 && minor === 1) return 'win_7';
            if (major === 6 && minor === 2) return 'win_8';
            if (major === 6 && minor === 3) return 'win_8';
            if (major === 10) {
                if (build >= 22000) {
                    return 'win_11';
                }
                return 'win_10';
            }
        }
        return os_type;
    }

    getDataFromHistory() {
        return new Promise(async (res, rej) => {
            const extract_url_history = new GetCurrentApplicationInfo();
            const active_win = this.getActiveWin();
            const browserInformationJSON = new SetupBrowserJSONData().getFileData();
            if (active_win) {
                let result = await extract_url_history.getCurrentApplicationInfo(active_win, browserInformationJSON);
                if (result) {
                    log(chalkInstance.green(" -- History gets url -- "), result);
                    res(result);
                } else {
                    res(active_win);
                }
            }
        })
    }

    getDataFromNetTool(active_win) {
        return new Promise(async (resolve, reject) => {
            if (active_win.owner && active_win.owner.path) {
                if (active_win.owner.processId) {
                    const result_from_tool = await activeWinExe(active_win.owner.processId);
                    if (result_from_tool) {
                        active_win['url'] = result_from_tool;
                        active_win['isBrowser'] = true;
                        log(chalkInstance.cyan(" -- Native exe gets url -- "), result_from_tool);
                        resolve(active_win);
                    } else {
                        resolve(this.getDataFromHistory());
                    }
                } else {
                    resolve(this.getDataFromHistory());
                }
            } else {
                resolve(active_win);
            }
        })
    }

    getWindowsInfo(win_type) {
        let browserData = new SetupBrowserJSONData().getFileData();
        let active_win = this.getActiveWin();
        if (!active_win) { return null }
        // Checking if browser data is available or not
        if (browserData && browserData['browsers']) {
            const is_browser = checkApplicationBrowser(active_win?.owner.name, browserData); // application is browser or not
            log(chalkInstance.blue("Is application is browser"), is_browser);
            log("\n\n");
            if (!is_browser) {
                return active_win
            };
        }
        switch (win_type) {
            case "win_7":
                log(chalkInstance.yellow("System is windows 7 we use history"));
                return this.getDataFromHistory();
                break;
            case "win_8":
                log(chalkInstance.yellow("System is windows 8 we use history"));
                return this.getDataFromHistory();
                break;
            case "win_11":
                log(chalkInstance.yellow("System is windows 11 we use native exe"));
                return this.getDataFromNetTool(active_win);
                break;
            case "win_10":
                log(chalkInstance.yellow("System is windows 10 we use native exe"));
                return this.getDataFromNetTool(active_win);
                break;
        }
    }

    getLinuxInfo() {
        return this.getDataFromHistory();
    }

    getDarwinInfo() {
        return this.getActiveWin();
    }

    getActiveWin() {
        const active_win = activeWin.sync();
        if (!active_win) return null;
        return active_win;
    }


    async getCurrentActiveWindow() {
        const os_info = this.checkOsConfiguration();
        switch (os_info) {
            case "Linux":
                return this.getLinuxInfo();
                break;
            case "Darwin":
                return this.getDarwinInfo();
                break;
            default:
                return this.getWindowsInfo(os_info);
                break;
        }
    }
}

module.exports = GetActiveWindow;

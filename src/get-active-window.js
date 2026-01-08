const os = require("os");
const activeWin = require("active-win");
const ExtractUrlHistory = require("./extract_url_history");
const activeWinExe = require("./get-url-from-exe");

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
            const extract_url_history = new ExtractUrlHistory();
            const active_win = this.getActiveWin();
            if (active_win) {
                let result = await extract_url_history.windowReport(active_win);
                if (result) {
                    res(result);
                } else {
                    res(active_win);
                }
            }
        })
    }

    getDataFromNetTool() {
        return new Promise(async (resolve, reject) => {
            let active_win = this.getActiveWin();
            if (!active_win) { resolve(null) }
            if (active_win.owner && active_win.owner.path) {

                console.log("Checking what is returns by active win", active_win);
                console.log("\n\n");
                const is_browser = this.checkApplicationBrowser(active_win.owner.path);
                console.log("Is browser", is_browser);
                console.log("\n\n");
                if (!is_browser) {
                    resolve(active_win)
                    return;
                };

                // now we get information from history not from exe
                if (active_win.owner.processId) {
                    const result_from_tool = await activeWinExe(active_win.owner.processId);
                    if (result_from_tool) {
                        active_win['url'] = result_from_tool;
                        active_win['isBrowser'] = true;
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
        switch (win_type) {
            case "win_7":
                return this.getDataFromHistory();
                break;
            case "win_8":
                return this.getDataFromHistory();
                break;
            case "win_11":
                return this.getDataFromNetTool();
                break;
            case "win_10":
                return this.getDataFromNetTool();
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

    checkApplicationBrowser(path) {
        if (path.toLowerCase().includes("chrome")) {
            return true;
        } else if (path.toLowerCase().includes("edge") || path.toLowerCase().includes("msedge")) {
            return true;
        } else if (path.toLowerCase().includes("brave")) {
            return true;
        } else if (path.toLowerCase().includes("vivaldi")) {
            return true;
        } else if (path.toLowerCase().includes("seamonkey")) {
            return true;
        } else if (path.toLowerCase().includes("torch")) {
            return true;
        } else if (path.toLowerCase().includes("opera")) {
            return true;
        } else if (path.toLowerCase().includes("firefox")) {
            return true;
        } else if (path.toLowerCase().includes("uc")) {
            return true;
        } else if (path.toLowerCase().includes("ucbrowser")) {
            return true;
        } else if (path.toLowerCase().includes("avast")) {
            return true;
        } else {
            return false;
        }
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

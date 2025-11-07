const fs = require("fs");
const path = require("path");
const Database = require('better-sqlite3');
const os = require("os");
const setupDefaultPaths = require("./history_path");
const stringFilter = require("./string_filteration");

class ExtractUrlHistory {
    userDataPath = path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "User Data");
    localStatePath = path.join(this.userDataPath, "Local State");

    constructor() { }

    readHistory(tempPath) { // this will read history from browsers db files...
        return new Promise((resolve) => {
            try {
                const db = new Database(tempPath, { readonly: true });
                const query = `
                SELECT 
                urls.url AS url,
                urls.title AS title,
                datetime((urls.last_visit_time / 1000000) - 11644473600, 'unixepoch') AS last_visit
                FROM urls
                WHERE datetime((urls.last_visit_time / 1000000) - 11644473600, 'unixepoch') > datetime('now', '-24 hours')
                ORDER BY urls.last_visit_time DESC
            `;

                const stmt = db.prepare(query);
                const rows = stmt.all(); // synchronous
                db.close();

                resolve(rows);
            } catch (err) {
                console.error('Error reading history:', err);
                resolve([]);
            }
        });
    }

    matchActiveTitleToHistory(history, currentApp, profile) {
        let historyMatches = [];
        for (const h of history) {
            const stringResult = stringFilter.compareStrings(currentApp.title.trim(), h.title || "", h.url);
            if (stringResult.isMatch) {
                historyMatches.push(stringResult);
            }
        }

        if (historyMatches.length > 0) {
            let foundedApp = currentApp;
            foundedApp['historyMatches'] = stringFilter.getTopElementByDetails(historyMatches);
            foundedApp['profile'] = profile;
            if (foundedApp['historyMatches'] && (foundedApp['historyMatches'].url && foundedApp['historyMatches'].url != "")) {
                foundedApp['url'] = foundedApp['historyMatches'].url;
            }
            return foundedApp;
        } else {
            return null;
        }
    }

    createPaths = async (currentApp) => {
        try {
            const raw = fs.readFileSync(this.localStatePath, "utf-8");
            const localState = JSON.parse(raw);
            const lastActive = localState?.profile?.last_active_profiles;
            const lastUsedProfile = localState?.profile?.last_used;
            console.log(lastActive, localState?.profile?.last_used);
            let results = [];
            if (Array.isArray(lastActive) && lastActive.length > 0) {
                const tempPaths = lastActive.map((profile) => {
                    const tempPath = path.join(os.tmpdir(), `${profile}.db`);
                    const localStatePath = path.join(this.userDataPath, profile, "History");
                    fs.copyFileSync(localStatePath, tempPath);
                    return { tempPath, profile };
                })

                for (let i = 0; i < tempPaths.length;) {
                    let history = await this.readHistory(tempPaths[i].tempPath);
                    if (history.length === 0) {
                        console.log("⚠️ No history found.");
                        i++;
                    } else {
                        const result = await this.matchActiveTitleToHistory(history, currentApp, tempPaths[i].profile);
                        results.push(result);
                        i++;
                    }
                }

                results = results.filter((value) => value);

                if (results.length > 1) {
                    let defaultProfile = results.filter((result) => result.profile == lastUsedProfile);
                    if (defaultProfile.length > 0) {
                        return defaultProfile[0];
                    } else {
                        return results[0];
                    }
                } else if (results.length > 0) {
                    return results[0]
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } catch (err) {
            console.log("Error while getting local state:", err);
            return null;
        }
    }

    applicationName(path, browserPaths) {
        let currentApplication = "";
        if (path.toLowerCase().includes("chrome")) {
            currentApplication = browserPaths.chrome;
        } else if (path.toLowerCase().includes("edge") || path.toLowerCase().includes("msedge")) {
            currentApplication = browserPaths.edge;
        } else if (path.toLowerCase().includes("brave")) {
            currentApplication = browserPaths.brave;
        } else if (path.toLowerCase().includes("vivaldi")) {
            currentApplication = browserPaths.vivaldi;
        } else if (path.toLowerCase().includes("seamonkey")) {
            currentApplication = browserPaths.seamonkey;
        } else if (path.toLowerCase().includes("torch")) {
            currentApplication = browserPaths.torch;
        } else if (path.toLowerCase().includes("opera")) {
            currentApplication = browserPaths.opera;
        } else if (path.toLowerCase().includes("firefox")) {
            currentApplication = browserPaths.firefox;
        } else if (path.toLowerCase().includes("avast")) {
            currentApplication = browserPaths.avast;
        } else {
            currentApplication = false;
        }
        return currentApplication;
    }

    windowReport(activeWindow) {
        return new Promise(async (resolve, reject) => {
            const currentApplication = activeWindow;
            if (currentApplication?.owner.path) {
                if (this.applicationName(currentApplication.owner.path, setupDefaultPaths.setupDefaultPaths()) != false) {
                    let browserPath = this.applicationName(currentApplication.owner.path, setupDefaultPaths.setupDefaultPaths());
                    this.userDataPath = path.join(browserPath);
                    this.localStatePath = path.join(this.userDataPath, "Local State");
                    const findApplication = await this.createPaths(currentApplication);
                    if (findApplication) {
                        resolve(findApplication);
                    } else {
                        resolve(activeWindow);
                    }
                } else {
                    resolve(activeWindow);
                }
            }
        })
    }
}

module.exports = ExtractUrlHistory;
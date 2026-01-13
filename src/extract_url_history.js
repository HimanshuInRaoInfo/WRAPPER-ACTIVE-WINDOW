const fs = require("fs");
const path = require("path");
const Database = require('better-sqlite3');
const os = require("os");
const stringFilter = require("./string_filteration");
const { extractDomain } = require("./utils");
class ExtractUrlHistory {
    userDataPath;
    localStatePath;
    createdTemPath = [];
    constructor() { }

    readHistory(tempPath, query) { // this will read history from browsers db files...
        return new Promise((resolve) => {
            try {
                const db = new Database(tempPath, { readonly: true });

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
            foundedApp['historyMatches'] = stringFilter.pickBestRecord(historyMatches);
            foundedApp['profile'] = profile;
            if (foundedApp['historyMatches'] && (foundedApp['historyMatches'].url && foundedApp['historyMatches'].url != "")) {
                let url = extractDomain(foundedApp['historyMatches'].url);
                foundedApp['url'] = url;
                foundedApp['isBrowser'] = true;
            }
            return foundedApp;
        } else {
            return null;
        }
    }

    createPaths = async (currentApp, browserInformation) => {
        try {
            if (fs.existsSync(this.localStatePath)) {
                const raw = fs.readFileSync(this.localStatePath, "utf-8");
                const localState = JSON.parse(raw);
                const lastActive = localState?.profile?.last_active_profiles;
                const lastUsedProfile = localState?.profile?.last_used;
                let results = [];
                if (Array.isArray(lastActive) && lastActive.length > 0) {
                    // Remove all previous temp files
                    const tempPaths = lastActive.map((profile) => {
                        const tempPath = path.join(os.tmpdir(), `${profile}.db`);
                        const localStatePath = path.join(this.userDataPath, profile, "History");
                        fs.copyFileSync(localStatePath, tempPath);
                        return { tempPath, profile };
                    });

                    this.createdTemPath = tempPaths.map(tp => tp.tempPath);

                    for (let i = 0; i < tempPaths.length;) {
                        let history = await this.readHistory(tempPaths[i].tempPath, browserInformation.sqlQuery);
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
            } else {
                return null;
            }
        } catch (err) {
            console.log("Error while getting local state:", err);
            return null;
        }
    }

    createPathsForLinux = async (currentProvidedApp, browserInformation) => {
        try {
            let fileLocations = this.findFilesInDir(this.userDataPath, browserInformation["linux"]["historyFile"]);
            let results = [];
            if (Array.isArray(fileLocations) && fileLocations.length > 0) {

                const tempPaths = fileLocations.map((pathsLocation) => {
                    let randomName = Math.floor(Math.random() * 9000000000) + 1000000000;
                    const tempPath = path.join(os.tmpdir(), `${randomName}.db`);
                    fs.copyFileSync(pathsLocation, tempPath);
                    return { tempPath };
                })
                this.createdTemPath = tempPaths.map(tp => tp.tempPath);
                for (let i = 0; i < tempPaths.length;) {
                    let history = await this.readHistory(tempPaths[i].tempPath);
                    if (history.length === 0) {
                        console.log("⚠️ No history found.", tempPaths[i].tempPath);
                        i++;
                    } else {
                        const result = await this.matchActiveTitleToHistory(history, currentProvidedApp, tempPaths[i].profile);
                        results.push(result);
                        i++;
                    }
                }
                results = results.filter((value) => value);
                if (results.length > 0) {
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

    findFilesInDir(startPath, targetFile, depth = 0) {
        if (depth === 4) {
            return [];
        }
        let results = [];
        if (!fs.existsSync(startPath)) {
            return results;
        }
        let files = fs.readdirSync(startPath);
        for (let i = 0; i < files.length; i++) {
            let filename = path.join(startPath, files[i]);
            if (!fs.existsSync(filename)) {
                continue;
            }
            let stat = fs.lstatSync(filename);
            if (stat.isDirectory()) {
                results = results.concat(this.findFilesInDir(filename, targetFile, depth + 1)); //recurse
            } else if (filename.endsWith(targetFile) === true) {
                // console.log('-- found: ', filename);
                results.push(filename);
            }
        }
        return results;
    }

    windowReport(activeWindow, browserInformation) {
        return new Promise(async (resolve, reject) => {
            const currentApplication = activeWindow;
            if (currentApplication?.owner.path) {
                let findApplication;
                const appDataDirectory = path.join(process.env.HOMEDRIVE, "Users", process.env.USERNAME, "AppData");
                if (os.type() == "Linux") {
                    let browserPath = browserInformation['platforms']['linux']['userDataPath'];
                    this.userDataPath = path.join(appDataDirectory, browserPath);
                    if (fs.existsSync(this.userDataPath)) {
                        browserPath = browserInformation['platforms']['linux']['userDataPath'];
                    } else if (browserInformation['platforms']['linux']['snapPath'] && fs.existsSync(path.join(appDataDirectory, browserInformation['platforms']['linux']['snapPath']))) {
                        browserPath = browserInformation['platforms']['linux']['snapPath'];
                        this.userDataPath = path.join(appDataDirectory, browserPath);
                    }
                    findApplication = await this.createPathsForLinux(currentApplication, browserInformation);
                } else {
                    let browserPath = browserInformation['platforms']['win32']['userDataPath'];
                    this.userDataPath = path.join(appDataDirectory, browserPath);
                    this.localStatePath = path.join(this.userDataPath, "Local State");
                    findApplication = await this.createPaths(currentApplication, browserInformation);
                }

                console.log("Before removing temp files", this.createdTemPath);
                if (this.createdTemPath.length > 0) {
                    for (let path = 0; path < this.createdTemPath.length; path++) {
                        if (fs.existsSync(this.createdTemPath[path])) {
                            console.log("Removing temp file", this.createdTemPath[path]);
                            fs.unlinkSync(this.createdTemPath[path]);
                        }
                    }
                }
                this.createdTemPath = [];

                if (findApplication) {
                    resolve(findApplication);
                } else {
                    resolve(activeWindow);
                }
            }
        })
    }
}

module.exports = ExtractUrlHistory;
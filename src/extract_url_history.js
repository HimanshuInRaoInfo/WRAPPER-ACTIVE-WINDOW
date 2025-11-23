const fs = require("fs");
const path = require("path");
const Database = require('better-sqlite3');
const os = require("os");
const setupDefaultPaths = require("./history_path");
const stringFilter = require("./string_filteration");

class ExtractUrlHistory {
    userDataPath;
    localStatePath;
    createdTemPath = [];
    constructor() {
        this.setPathsOlyWindows();
    }

    setPathsOlyWindows() {
        if (os.type() == "Windows_NT") {
            this.userDataPath = path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "User Data");
            this.localStatePath = path.join(this.userDataPath, "Local State");
        }
    }

    getSQLQuery(applicationPath) {
        if (applicationPath.toLowerCase().includes("firefox") || applicationPath.toLowerCase().includes("seamonkey")) {
            return `SELECT moz_places.url AS url, moz_places.title AS title, datetime(moz_places.last_visit_date / 1000000, 'unixepoch') AS last_visit FROM moz_places WHERE datetime(moz_places.last_visit_date / 1000000, 'unixepoch') > datetime('now', '-24 hours') ORDER BY moz_places.last_visit_date DESC`;
        } else if (applicationPath.toLowerCase().includes("maxthon")) {
            return `SELECT zurl AS url, ztitle AS title, datetime(ZLASTVISITDATE / 1000000, 'unixepoch') AS last_visit FROM zmxhistoryentry WHERE datetime(ZLASTVISITDATE / 1000000, 'unixepoch') > datetime('now', '-24 hours') ORDER BY ZLASTVISITDATE DESC`;
        } else {
            return `SELECT urls.url AS url, urls.title AS title, datetime((urls.last_visit_time / 1000000) - 11644473600, 'unixepoch') AS last_visit FROM urls WHERE datetime((urls.last_visit_time / 1000000) - 11644473600, 'unixepoch') > datetime('now', '-24 hours') ORDER BY urls.last_visit_time DESC`;
        }
    }

    readHistory(tempPath) { // this will read history from browsers db files...
        return new Promise((resolve) => {
            try {
                const db = new Database(tempPath, { readonly: true });
                const query = this.getSQLQuery(this.userDataPath);

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
                        console.log("Pushed temp path", tempPath);
                        return { tempPath, profile };
                    });

                    this.createdTemPath = tempPaths.map(tp => tp.tempPath);

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
            } else {
                return this.createPathsForLinux(currentApp);
            }
        } catch (err) {
            console.log("Error while getting local state:", err);
            return null;
        }
    }

    applicationName(path, browserPaths) {
        let currentApplication = "";
        if (path.toLowerCase().includes("chrome")) {
            if (browserPaths.chrome) {
                currentApplication = browserPaths.chrome;
            } else {
                currentApplication = false;
            }
        } else if (path.toLowerCase().includes("edge") || path.toLowerCase().includes("msedge")) {
            if (browserPaths.edge) {
                currentApplication = browserPaths.edge;
            } else {
                currentApplication = false;
            }
        } else if (path.toLowerCase().includes("brave")) {
            if (browserPaths.brave) {
                currentApplication = browserPaths.brave;
            } else {
                currentApplication = false;
            }
        } else if (path.toLowerCase().includes("vivaldi")) {
            if (browserPaths.vivaldi) {
                currentApplication = browserPaths.vivaldi;
            } else {
                currentApplication = false;
            }
        } else if (path.toLowerCase().includes("seamonkey")) {
            if (browserPaths.seamonkey) {
                currentApplication = browserPaths.seamonkey;
            } else {
                currentApplication = false;
            }
        } else if (path.toLowerCase().includes("torch")) {
            if (browserPaths.torch) {
                currentApplication = browserPaths.torch;
            } else {
                currentApplication = false;
            }
        } else if (path.toLowerCase().includes("opera")) {
            if (browserPaths.opera) {
                currentApplication = browserPaths.opera;
            } else {
                currentApplication = false;
            }
        } else if (path.toLowerCase().includes("firefox")) {
            if (browserPaths.firefox) {
                currentApplication = browserPaths.firefox;
            } else {
                currentApplication = false;
            }
        } else if (path.toLowerCase().includes("avast")) {
            if (browserPaths.avast) {
                currentApplication = browserPaths.avast;
            } else {
                currentApplication = false;
            }
        } else {
            currentApplication = false;
        }
        return currentApplication;
    }

    createPathsForLinux = async (currentProvidedApp) => {
        try {
            let fileLocations = this.findPaths(currentProvidedApp.owner.path, this.userDataPath);
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

    findPaths(applicationPath, browserPath) {
        if (applicationPath.toLowerCase().includes("firefox") || applicationPath.toLowerCase().includes("seamonkey")) {
            return this.findFilesInDir(browserPath, ".sqlite", path.sep + 'places.sqlite');
        } else if (applicationPath.toLowerCase().includes("maxthon")) {
            return this.findFilesInDir(browserPath, ".dat", path.sep + 'History.dat');
        } else {
            return this.findFilesInDir(browserPath, "History", path.sep + 'History');
        }
    }

    findFilesInDir(startPath, filter, targetFile, depth = 0) {
        if (depth === 4) {
            return [];
        }
        let results = [];
        if (!fs.existsSync(startPath)) {
            //console.log("no dir ", startPath);
            return results;
        }
        let files = fs.readdirSync(startPath);
        for (let i = 0; i < files.length; i++) {
            let filename = path.join(startPath, files[i]);
            if (!fs.existsSync(filename)) {
                // console.log('file doesn\'t exist ', startPath);
                continue;
            }
            let stat = fs.lstatSync(filename);
            if (stat.isDirectory()) {
                results = results.concat(this.findFilesInDir(filename, filter, targetFile, depth + 1)); //recurse
            } else if (filename.endsWith(targetFile) === true) {
                // console.log('-- found: ', filename);
                results.push(filename);
            }
            /*
            } else if (filename.indexOf(filter) >= 0 && regExp.test(filename)) {
                results.push(filename);
            } else if (filename.endsWith('\\History') === true) {
                // console.log('-- found: ', filename);
                results.push(filename);
            }*/
        }
        return results;
    }


    windowReport(activeWindow) {
        return new Promise(async (resolve, reject) => {
            const currentApplication = activeWindow;
            if (currentApplication?.owner.path) {
                if (this.applicationName(currentApplication.owner.path, setupDefaultPaths.setupDefaultPaths()) != false) {
                    let browserPath = this.applicationName(currentApplication.owner.path, setupDefaultPaths.setupDefaultPaths());
                    let findApplication;
                    if (os.type() == "Linux") {
                        this.userDataPath = path.join(browserPath);
                        findApplication = await this.createPathsForLinux(currentApplication);
                    } else {
                        this.userDataPath = path.join(browserPath);
                        this.localStatePath = path.join(this.userDataPath, "Local State");
                        findApplication = await this.createPaths(currentApplication);
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
                    console.log("After removing temp files", this.createdTemPath);

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
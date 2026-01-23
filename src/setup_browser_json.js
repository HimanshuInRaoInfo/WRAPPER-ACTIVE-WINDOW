const fs = require("fs");
const path = require("path");
const os = require("os");

class SetupBrowserJSONData {
    constructor() { }

    saveFile(browserData, folderName) {
        let platform = os.type();
        const roamingPath = this.getAppDataPath();
        console.log("Browser information shows here", browserData);
        if (platform === 'Windows_NT' || platform === 'Linux') {
            console.log("Checking ", roamingPath, folderName);
            let browser_storage_path = path.join(roamingPath, folderName, "browser_storage");
            if (!fs.existsSync(browser_storage_path)) {
                fs.mkdirSync(browser_storage_path);
            }
            const filePath = path.join(browser_storage_path, 'browsersInformation.json');
            console.log("File path to store", filePath)
            fs.writeFileSync(filePath, JSON.stringify(browserData, null, 2), 'utf-8');
            console.log('browsersInformation.json created with this path', filePath);
        } else {
            console.log('Unsupported OS, file not created');
        }
    }

    getFileData(folderName) {
        try {
            const roamingPath = this.getAppDataPath();
            console.log("Checking roaming path", roamingPath, folderName);
            const filePath = path.join(roamingPath, folderName, "browser_storage", 'browsersInformation.json');
            let result = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(result);
        } catch (err) {
            console.log("Error handle when read browser json file")
            return null;
        }
    }
    
    getAppDataPath() {
        if (process.platform === "win32") {
            return process.env.APPDATA;
        }
        
        if (process.platform === "darwin") {
            return path.join(os.homedir(), "Library", "Application Support");
        }

        // Linux and others
        return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
    }
}

module.exports = SetupBrowserJSONData;
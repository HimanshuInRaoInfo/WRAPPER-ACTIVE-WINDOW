const fs = require("fs");
const path = require("path");
const os = require("os");

class SetupBrowserJSONData {
    constructor() { }

    saveFile(browserData, folderName) {
        let platform = os.type();
        const roamingPath = process.env.APPDATA;
        console.log("Browser information shows here", browserData);
        if (platform === 'Windows_NT' || platform === 'Linux') {
            const filePath = path.join(roamingPath, folderName, "browser_storage", 'browsersInformation.json');
            console.log("File path to store", filePath)
            fs.writeFileSync(filePath, JSON.stringify(browserData, null, 2), 'utf-8');
            console.log('browsersInformation.json created with this path', filePath);
        } else {
            console.log('Unsupported OS, file not created');
        }
    }

    getFileData(folderName) {
        try {
            const roamingPath = process.env.APPDATA;
            const filePath = path.join(roamingPath, folderName, "browser_storage", 'browsersInformation.json');
            let result = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(result);
        } catch (err) {
            console.log("Error handle when read file", err)
            return null;
        }
    }
}

module.exports = SetupBrowserJSONData;
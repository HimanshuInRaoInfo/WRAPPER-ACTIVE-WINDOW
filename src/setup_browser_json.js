const fs = require("fs");
const path = require("path");

class SetupBrowserJSONData {
    constructor() { }

    saveFile(browserData) {
        if (platform === 'win32' || platform === 'linux') {
            const filePath = path.join(__dirname, 'browsersInformation.json');
            fs.writeFileSync(filePath, JSON.stringify(browserData, null, 2), 'utf-8');
            console.log('browsersInformation.json created with this path', filePath);
        } else {
            console.log('Unsupported OS, file not created');
        }
    }
}

module.exports = SetupBrowserJSONData;
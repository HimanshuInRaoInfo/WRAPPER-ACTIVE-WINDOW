const fs = require("fs");
const path = require("path");
const GetActiveWindow = require("./src/get-active-window.js");

const checkIsExeAvailable = () => {
    const source_fold_dest = path.join(__dirname, "native");
    const source_exe_dest = path.join(source_fold_dest, "GetBrowserUrlNetTool.exe")
    const build_source_path = path.join(__dirname, "GetBrowserUrlNetTool", "dist", "GetBrowserUrlNetTool.exe")

    if (!fs.existsSync(source_exe_dest)) {
        fs.mkdirSync(source_fold_dest, { recursive: true });
        fs.renameSync(build_source_path, source_exe_dest)
        return;
    }
}

const getActiveWindow = async () => {
    const get_active_win = new GetActiveWindow();
    const result = await get_active_win.getCurrentActiveWindow();
    return result;
}

module.exports = {
    checkIsExeAvailable,
    getActiveWindow
}
const fs = require("fs");
const path = require("path");
const GetActiveWindow = require("./src/get-active-window.js");

const getActiveWindow = async () => {
    const get_active_win = new GetActiveWindow();
    const result = await get_active_win.getCurrentActiveWindow();
    return result;
}

module.exports = {
    getActiveWindow
}
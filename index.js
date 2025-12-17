const fs = require("fs");
const path = require("path");
const GetActiveWindow = require("./src/get-active-window.js");

const getActiveWindow = async () => {
    const get_active_win = new GetActiveWindow();
    const result = await get_active_win.getCurrentActiveWindow();
    return result;
}


// For testing uncomment the following code and comment the code below it

setInterval(() => {
    console.log("\n\n")
    getActiveWindow().then(result => {
        console.log("result", result);
    });
}, 5000);

module.exports = {
    getActiveWindow
}
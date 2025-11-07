const activeWin = require('active-win');
const { execFile } = require('child_process');
const path = require('path');

/**
 * Get the current active browser tab URL by:
 * - detecting the active window (via `active-win`)
 * - verifying the process is a browser
 * - running the provided native exe with the PID
 *
 * @param {string} [exePath] - path to the native exe that accepts PID and prints URL. Defaults to ./GetBrowserUrlDemo.exe
 * @param {number} [timeoutMs] - timeout for the native exe in milliseconds (default 7000)
 * @returns {Promise<string|null>} - URL string or null if none / error
 */

module.exports = async function getBrowserUrlForActiveWindow(pid, timeoutMs = 15000) {
    try {
        if (!pid) return null;
        // default exe path next to this file
        const source_fold_dest = path.join(__dirname, "..", "native");
        const source_exe_dest = path.join(source_fold_dest, "GetBrowserUrlNetTool.exe")

        return await runExeGetStdout(source_exe_dest, String(pid), timeoutMs);
    } catch (err) {
        // swallow errors and return null so caller can continue gracefully
        console.log('getBrowserUrlForActiveWindow error', err && err.message ? err.message : err);
        return null;
    }
};

const resultFilter = (result) => {
    if (typeof result !== 'string' || !result.trim()) return null;

    let trimmed = result.trim();

    // If missing protocol, add https://
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
        trimmed = 'https://' + trimmed;
    }

    try {
        const url = new URL(trimmed);
        if (!url.href) return null;
        return url.toString();
    } catch {
        return null;
    }
}

function runExeGetStdout(exePath, argPid, timeoutMs) {
    return new Promise((resolve) => {
        const opts = {
            windowsHide: true,
            timeout: timeoutMs
        };

        execFile(exePath, [argPid], opts, (error, stdout, stderr) => {
            if (error) {
                console.log('native exe error', error);
                return resolve(null);
            }

            if (!stdout) {
                return resolve(null);
            }

            if (
                stdout.includes("INVALID_PID") ||
                stdout.includes("URL_NOT_FOUND") ||
                stdout.includes("ERROR_GET") ||
                stdout.includes("url_not_found") ||
                stdout.includes("error_get") ||
                stdout.includes("invalid_pid")
            ) {
                return resolve(null);
            }
            const validUrl = resultFilter(stdout);
            return resolve(validUrl);
        });
    });
}

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

            const validUrl = resolveAddressBarInput(stdout);
            return resolve(validUrl);
        });
    });
}

function resolveAddressBarInput(raw) {
    if (!raw || typeof raw !== 'string') return null;

    const value = raw.trim();
    if (!value) return null;

    /* ---------------- FILE URL ---------------- */
    if (/^file:\/\//i.test(value)) {
        const path = value.replace(/^file:\/\//i, '').replace(/^\/+/, '');
        console.log("---------------- FILE URL ----------------");
        return buildFileRoot(path);
    }

    /* ---------------- LOCAL PATH ---------------- */
    if (/^[a-zA-Z]:[\\/]/.test(value)) {
        console.log("---------------- LOCAL PATH ----------------");
        return buildFileRoot(value);
    }

    /* ---------------- INTERNAL / EXTENSION ---------------- */
    if (/^(about|chrome|edge|brave|opera|vivaldi|moz-extension|chrome-extension|comet|):\/\//i.test(value)) {
        console.log("---------------- INTERNAL EXTENSION BROWSER ----------------", value);
        return value;
    }

    /* ---------------- FULL WEB URL ---------------- */
    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value);
            console.log("---------------- FULL WEB URL AND RETURNS ONLY ORIGIN ----------------", url.origin);
            return url.origin; // ✅ ONLY ORIGIN
        } catch {
            return null;
        }
    }

    /* ---------------- LOCALHOST ---------------- */
    if (/^localhost(:\d+)?(\/.*)?$/i.test(value)) {
        console.log("---------------- LOCALHOST RETURNS ----------------", `http://${value.split('/')[0]}`);
        return `http://${value.split('/')[0]}`;
    }

    /* ---------------- IPV4 ---------------- */
    if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(value)) {
        console.log("---------------- IPV4 RETURNS ----------------", `http://${value.split('/')[0]}`);
        return `http://${value.split('/')[0]}`;
    }

    /* ---------------- DOMAIN ONLY ---------------- */
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(value)) {
        const domain = value.split('/')[0];
        console.log("---------------- DOMAIN ONLY RETURNS ----------------", `https://${domain}`);
        return `https://${domain}`;
    }

    console.log("---------------- NOTHING WILL TRACKED AND RETURN NULL ----------------", null);
    return null;
}

function buildFileRoot(path) {
    try {
        if (!path) return null;
        const normalized = path.replace(/\\/g, '/');
        // ✅ CASE 1: Drive root only (C:/)
        const driveOnly = normalized.match(/^([a-zA-Z]:)\/?$/);
        if (driveOnly) {
            return `file://${driveOnly[1]}/`;
        }
        // ✅ CASE 2: Drive + first folder (C:/Users/...)
        const match = normalized.match(/^([a-zA-Z]:)\/([^/]+)/);
        if (!match) return null;
        const drive = match[1];
        const firstFolder = match[2];
        return `file://${drive}/${firstFolder}/`;
    }
    catch (err) {
        console.log("Error while getting file route", err)
        return null;
    }
}

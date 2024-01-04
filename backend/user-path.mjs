import { existsSync, promises as fs } from "fs";
import os from "os";
import path from "path";
import process from "process";

const configFile = path.join(os.homedir(), ".aiv4u.json");

/**
 * Save the user chosen directory path in a .json file.
 * @param {string} userPath
 */
export async function saveUserPath(userPath) {
    let fullPath = ensureTrailingSlash(userPath);
    const config = { fullPath };
    await fs.writeFile(configFile, JSON.stringify(config));

    return fullPath;
}

/**
 * Load the user chosen directory path from a .json file.
 * @returns {Promise<string>} userPath
 */
export async function loadUserPath() {
    //check if file exists
    const fileExists = existsSync(configFile);

    if (fileExists) {
        const config = JSON.parse(await fs.readFile(configFile, "utf8"));

        return ensureTrailingSlash(config.fullPath);
    } else {
        return "";
    }
}

/**
 * Ensure that the path has a trailing slash.
 * @param {string} path
 * @returns {string} path
 */
function ensureTrailingSlash(path) {
    if (path.endsWith("/") || path.endsWith("\\")) {
        return path;
    }

    const separator = process.platform === "win32" ? "\\" : "/";

    return path + separator;
}

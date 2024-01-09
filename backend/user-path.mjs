import { existsSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
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
 * Load the user chosen directory path from a .json file. If the file does not exist, return the user home directory.
 * @returns {Promise<string>} userPath
 */
export async function loadUserPath() {
    //check if file exists
    const fileExists = existsSync(configFile);

    if (fileExists) {
        const config = JSON.parse(await fs.readFile(configFile, "utf8"));

        return ensureTrailingSlash(config.fullPath);
    } else {
        return os.homedir();
    }
}

/**
 * Ensure that the path has a trailing slash.
 * @param {string} path
 * @returns {string} path
 */
export function ensureTrailingSlash(path) {
    if (path.endsWith("/") || path.endsWith("\\")) {
        return path;
    }

    const separator = process.platform === "win32" ? "\\" : "/";

    return path + separator;
}

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "process";

/**
 * @typedef {Object} Config
 * @property {string} fullPath
 */

const configFile = path.join(os.homedir(), ".aiv4u.json");

/**
 * Save the user chosen directory path in a .json file.
 * @param {string} userPath
 */
export async function saveUserPath(userPath) {
    let fullPath = ensureTrailingSlash(userPath);
    const config = { fullPath };
    await writeFile(configFile, JSON.stringify(config));

    return fullPath;
}

/**
 * Load the user chosen directory path from a .json file. If the file does not exist, return the user home directory.
 *
 * @param {string} configFile
 *
 * @returns Promise<string> userPath
 */
export async function loadUserPath(configFile) {

    /** @type {boolean} */
    const fileExists = existsSync(configFile);

    if (fileExists) {
        /** @type {string} */
        const configFileContent = await readFile(configFile, "utf8");

        /** @type {Config} */
        const config = JSON.parse(configFileContent);

        return Promise.resolve(ensureTrailingSlash(config.fullPath));

    } else {

        return Promise.resolve(os.homedir());
    }
}

/**
 * Ensure that the path has a trailing slash.
 *
 * @param {string} path
 *
 * @returns {string} path
 */
export function ensureTrailingSlash(path) {
    if (path.endsWith("/") || path.endsWith("\\")) {
        return path;
    }

    const separator = process.platform === "win32" ? "\\" : "/";

    return path + separator;
}

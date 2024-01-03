import { existsSync, promises as fs } from "fs";
import os from "os";
import path from "path";

const configFile = path.join(os.homedir(), ".aiv4u.json");

/**
 * Save the user chosen directory path in a .json file.
 * @param {string} userPath
 */
export async function saveUserPath(userPath) {
    const config = { userPath };
    await fs.writeFile(configFile, JSON.stringify(config));
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

        return config.userPath;
    } else {
        return "";
    }
}

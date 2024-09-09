import express from "express";
import {
    createDatabaseTable, db,
    getDbRowSize,
    writePdfDataToDatabase,
} from "./database.mjs";
import { loadUserPath } from "./user-path.mjs";
import { app } from "./app.mjs";
import { cacheAllPdfsInDir, fetchAllPdfFromDir } from "./pdf.mjs";
import { homedir } from "node:os";
import path from "node:path";
import exec from "node:child_process";
import { resetCacheValues } from "./variables.mjs";

/** @type {number} */
const port = 3000;

/**
 * Makes the PDFs available to the frontend.
 *
 * @returns {Promise<string>} mainDir
 */
export async function makePdfsAvailableToFrontend() {
    /** @type {string} */
    const configFile = path.join(homedir(), ".aiv4u.json");
    /** @type {string} */
    const mainDir = await loadUserPath(configFile);

    // make pdfs available to the frontend
    app.use("/pdf", express.static(mainDir));

    return mainDir;
}


/**
 * Retrieves all PDFs from the directory.
 *
 * @param {string} mainDir
 *
 * @returns {string[]}
 */
export function retrievePdfsFromDir(mainDir) {
    /** @type {string[]} */
    const pdfList = fetchAllPdfFromDir(mainDir);

    pdfList.filter((pdf) => pdf.endsWith(".pdf"));

    return pdfList;
}

/**
 * Opens the URL in the default browser on Linux.
 *
 * @param {string} url
 * @returns void
 */
function openUrlInDefaultBrowserOnLinux(url) {

    exec.exec(`xdg-open ${url}`, (error, _, stderr) => {

        if (error) {
            console.error(`Error opening URL: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`Error: ${stderr}`);
            return;
        }
    });
}

// start server, cache pdfs and open server port
app.listen(port, async () => {

    createDatabaseTable(db);

    /** @type {string} */
    const mainDir = await makePdfsAvailableToFrontend();
    /** @type {string[]} */
    const pdfList = retrievePdfsFromDir(mainDir);
    /** @type {number} */
    const dbRowSize = await getDbRowSize(db);

    consoleLogStatementsForTheTerminal(mainDir, dbRowSize, pdfList);

    if (dbRowSize !== pdfList.length) {
        resetCacheValues(pdfList);
        await cacheAllPdfsInDir(db, pdfList, writePdfDataToDatabase);
    }

    const url = `http://localhost:${port}`;
    console.log(`fuzzy finder app listening on ${url}`);

    if (process.platform === "linux") {
        openUrlInDefaultBrowserOnLinux(url);
    }
});

/**
 * Print out statements for the terminal.
 *
 * @param {string} mainDir - The path to the directory with the PDFs.
 * @param {number} dbRowSize - The number of rows in the database.
 * @param {string[]} pdfList - The list of PDFs in the directory.
 *
 * @returns void
 */
function consoleLogStatementsForTheTerminal(mainDir, dbRowSize, pdfList) {
    console.log(`

 ██████  ██████  ███████     ███████ ██    ██ ███████ ███████ ██    ██     ███████ ██ ███    ██ ██████  ███████ ██████  
 ██   ██ ██   ██ ██          ██      ██    ██    ███     ███   ██  ██      ██      ██ ████   ██ ██   ██ ██      ██   ██ 
 ██████  ██   ██ █████       █████   ██    ██   ███     ███     ████       █████   ██ ██ ██  ██ ██   ██ █████   ██████  
 ██      ██   ██ ██          ██      ██    ██  ███     ███       ██        ██      ██ ██  ██ ██ ██   ██ ██      ██   ██ 
 ██      ██████  ██          ██       ██████  ███████ ███████    ██        ██      ██ ██   ████ ██████  ███████ ██   ██ 
            
################# ################# ################# #################
|| Chosen PDF Path: ${mainDir}
|| ${dbRowSize} DB rows are present
|| ${pdfList.length} PDFs are available
|| = ${Math.floor((dbRowSize / pdfList.length) * 100)}% pdfs are in the database
################# ################# ################# #################
`);
}

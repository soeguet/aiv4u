import {readdirSync, readFileSync} from "node:fs";
import {
    addToFactor,
    getFactor,
    getRecachingCurrent,
    getRecachingTotal,
    incrementRecachingCurrent,
    resetCacheValues
} from "./variables.mjs";
import {loadUserPath} from "./user-path.mjs";
// @ts-ignore
import PDF from "pdf-parse-fork";
import {createDatabaseTable, dropDatabaseTable, writePdfDataToDatabase} from "./database.mjs";
import express from "express";
import process from "node:process";
import path from "node:path";
import { homedir } from "node:os";

/**
 * @typedef {Object} PdfEntry
 * @property {string} name - pdf name
 * @property {number} pages - pdf page count
 * @property {string} text - pdf content as string
 */

/**
 * Fetches all PDF names from selected Folder.
 *
 * @param {string} mainDir
 *
 * @returns {string[]}
 */
export function fetchAllPdfFromDir(mainDir) {
    return readdirSync(mainDir);
}

/**
 * Caches all PDFs in selected Folder.
 * @param {import("sqlite3").Database} db
 * @param {string[]} pdfList
 * @param {Function} writePdfToDatabaseFn
 *
 * @returns void
 */
export async function cacheAllPdfsInDir(db, pdfList, writePdfToDatabaseFn) {
    resetCacheValues(pdfList);

    const configFile = path.join(homedir(), ".aiv4u.json");
    const mainDir = await loadUserPath(configFile);

    for (const pdf of pdfList) {
        incrementRecachingCurrent();

        try {
            let dataBuffer = readFileSync(mainDir + pdf);
            let bufferedPdf = await PDF(dataBuffer);

            const pdfEntry = {
                name: pdf,
                pages: bufferedPdf.numpages,
                text: bufferedPdf.text,
            };

            await writePdfToDatabaseFn(db, pdfEntry);
        } catch (err) {
            console.log("Error processing PDF " + pdf + ": " + err);
        }

        let progress = (getRecachingCurrent() / getRecachingTotal()) * 100;
        if (progress > getFactor()) {
            addToFactor(10);
            console.log(
                "\nprogress: " +
                Math.round(progress) +
                "%, recaching status: " +
                getRecachingCurrent()+
                "/" +
                getRecachingTotal()
            );
        } else if (getRecachingCurrent()% 10 === 0) {
            process.stdout.write(".");
        }
    }
}

/**
 *
 * Wraps the recaching process in a promise.
 *
 * @param {import("sqlite3").Database} db
 * @param {express.Express} app
 *
 * @returns {Promise<boolean>}
 */
export async function handleRecachingProcess(db, app) {
    dropDatabaseTable(db);
    createDatabaseTable(db);

    const configFile = path.join(homedir(), ".aiv4u.json");
    const mainDir = await loadUserPath(configFile);
    app.use("/pdf", express.static(mainDir));

    const pdfList = fetchAllPdfFromDir(mainDir);
    pdfList.filter(pdf => pdf.endsWith(".pdf"));

    if (pdfList.length === 0) {
        return false;
    }

    await cacheAllPdfsInDir(db, pdfList, writePdfDataToDatabase);

    return true;
}

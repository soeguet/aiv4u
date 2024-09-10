import {readdirSync, readFileSync} from "node:fs";
import {
    incrementRecachingCurrent,
    resetCacheValues
} from "./variables.mjs";
import {loadUserPath} from "./user-path.mjs";
// @ts-ignore
import PDF from "pdf-parse-fork";
import {createDatabaseTable, dropDatabaseTable, writePdfDataToDatabase} from "./database.mjs";
import path from "node:path";
import { homedir } from "node:os";
import { makePdfsAvailableToFrontend, retrievePdfsFromDir } from "./server.mjs";


//const DEFAULT_OPTIONS = {
//    pagerender: render_page,
//    max: 0,
//    //check https://mozilla.github.io/pdf.js/getting_started/
//    version: 'v1.10.100'
//}

/**
 * @typedef {Object} PDFDocument
 * @property {Object} info
 * @property {string | null} metadata
 * @property {number} numpages
 * @property {number} numrender
 * @property {string} text
 * @property {string} version
 * /

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
 * @returns {import("node:fs").Dirent[]}
 */
export function fetchAllPdfFromDir(mainDir) {
    return readdirSync(mainDir,
        { withFileTypes:true,
            encoding: "utf8",
            recursive: true,
        }
    );
}

/**
 * Caches all PDFs in selected Folder.
 * @param {import("sqlite3").Database} db
 * @param {import("node:fs").Dirent[]} pdfList
 * @param {Function} writePdfToDatabaseFn
 *
 * @returns void
 */
export async function cacheAllPdfsInDir(db, pdfList, writePdfToDatabaseFn) {

    const configFile = path.join(homedir(), ".aiv4u.json");
    const mainDir = await loadUserPath(configFile);


    for (const pdf of pdfList) {

        incrementRecachingCurrent();

        try {
            /** @type {Buffer} */
            let dataBuffer = readFileSync(mainDir + pdf.name);
            /** @type {PDFDocument} */
            let bufferedPdf = await PDF(dataBuffer);

            /** @type {PdfEntry} */
            const pdfEntry = {
                name: pdf.name,
                pages: bufferedPdf.numpages,
                text: bufferedPdf.text,
            };

            writePdfToDatabaseFn(db, pdfEntry);

        } catch (err) {
            console.log("Error processing PDF " + pdf + ": " + err);
        }

        //let progress = (getRecachingCurrent() / getRecachingTotal()) * 100;
        //if (progress > getFactor()) {
        //    addToFactor(10);
        //    console.log(
        //        "\nprogress: " +
        //        Math.round(progress) +
        //        "%, recaching status: " +
        //        getRecachingCurrent()+
        //        "/" +
        //        getRecachingTotal()
        //    );
        //} else if (getRecachingCurrent()% 10 === 0) {
        //    process.stdout.write(".");
        //}
    }
}

/**
 *
 * Wraps the recaching process in a promise.
 *
 * @param {import("sqlite3").Database} db
 *
 * @returns {Promise<boolean>}
 */
export async function handleRecachingProcess(db) {
    dropDatabaseTable(db);
    createDatabaseTable(db);

    /** @type {string} */
    const mainDir = await makePdfsAvailableToFrontend();
    /** @type  {import("node:fs").Dirent[]} */
    const pdfList = retrievePdfsFromDir(mainDir)

    if (pdfList.length === 0) {
        return false;
    }

    resetCacheValues(pdfList);
    await cacheAllPdfsInDir(db, pdfList, writePdfDataToDatabase);

    return true;
}

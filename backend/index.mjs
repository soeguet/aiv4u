import express from "express";
import fs from "fs";
import PDF from "pdf-parse-fork";
import cors from "cors";
import db from "./database.mjs";

import {
    createDatabaseTable,
    dropDatabaseTable,
    getDbRowSize,
    writePdfDataToDatabase,
} from "./database.mjs";
import { loadUserPath, saveUserPath } from "./user-path.mjs";
import path from "path";
import process from "process";

const app = express();
let recacheRunning = false;
let recachingCurrent = 0;
let recachingTotal = 0;
let nextThreshold = recachingTotal / 10;

// middleware setup
app.use(cors());
app.use(express.json());
app.use(express.static("./frontend/"));

/**
 * Fetches all PDF names from selected Folder.
 *
 * @param {string} mainDir
 *
 * @returns Promise<string[]>
 */
export async function fetchAllPdfFromDir(mainDir) {
    // const mainDir = await loadUserPath();
    // app.use("/pdf", express.static(mainDir));
    return fs.readdirSync(mainDir);
}

function printProgressToStdout() {
    if (recachingCurrent === 0) {
        console.log("recaching started");
        process.stdout.write("0%");
        return;
    }
    if (recachingCurrent / recachingTotal === 0.1) {
        process.stdout.write("10%");
        return;
    }
    if (recachingCurrent / recachingTotal === 0.2) {
        process.stdout.write("20%");
        return;
    }
    if (recachingCurrent / recachingTotal === 0.3) {
        process.stdout.write("30%");
        return;
    }
    if (recachingCurrent / recachingTotal === 0.4) {
        process.stdout.write("40%");
        return;
    }
    if (recachingCurrent / recachingTotal === 0.5) {
        process.stdout.write("50%");
        return;
    }
    if (recachingCurrent / recachingTotal === 0.6) {
        process.stdout.write("60%");
        return;
    }
    if (recachingCurrent / recachingTotal === 0.7) {
        process.stdout.write("70%");
        return;
    }
    if (recachingCurrent / recachingTotal === 0.8) {
        process.stdout.write("80%");
        return;
    }
    if (recachingCurrent / recachingTotal === 0.9) {
        process.stdout.write("90%");
        return;
    }
    if (recachingCurrent / recachingTotal === 1) {
        process.stdout.write("100%");
        return;
    }
    process.stdout.write(".");
}

// TODO check if folder is empty

/**
 * Caches all PDFs in selected Folder.
 * @param {import('sqlite3').Database} db
 * @param {Array<String>} pdfList
 * @param {Function} writePdfToDatabaseFn
 */
export async function cacheAllPdfsInDir(db, pdfList, writePdfToDatabaseFn) {
    console.log("start caching all PDFs");
    console.log("pdfList: " + pdfList.length);

    try {
        const mainDir = await loadUserPath();

        for (const pdf of pdfList) {
            printProgressToStdout();

            try {
                let dataBuffer = fs.readFileSync(mainDir + pdf);
                let bufferedPdf = await PDF(dataBuffer);

                recachingCurrent++;

                const pdfEntry = {
                    name: pdf,
                    pages: bufferedPdf.numpages,
                    text: bufferedPdf.text,
                };

                await writePdfToDatabaseFn(db, pdfEntry);
            } catch (err) {
                console.log("Error processing PDF " + pdf + ": " + err);
            }
        }
    } catch (err) {
        console.log("Error processing PDFs: " + err);
    }
}

// query search terms from frontend
app.post("/api/v1/search", (req, res) => {
    /** @type {string[]} */
    const terms = req.body.query.split(" ");
    /** @type {string} */
    let query = "SELECT * FROM pdfs WHERE ";
    /** @type {string[]} */
    let queryParams = [];
    /** @type {string[]} */
    let queryParts = [];

    // stream through all search terms and concat them to query
    terms.forEach((term) => {
        queryParts.push("(text LIKE ? OR name LIKE ?)");
        queryParams.push(`%${term}%`, `%${term}%`);
    });
    query += queryParts.join(" AND ");

    /**
     * fires db query
     *
     * @param {string} query - predefined query
     * @param {string[]} queryParams - separate query params
     * @param {Function} callback
     *
     * the callback contains the following parameters:
     * @param {Error} err - error object
     * @param {Array<Object>} rows - array of objects from database (each row - see below)
     * @param {number} rows[].id - pdf id
     * @param {string} rows[].name - pdf name
     * @param {number} rows[].pages - pdf page count
     * @param {string} rows[].text - pdf content as string
     */
    db.all(query, queryParams, async (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send("internal server error");
            return;
        }

        if (rows.length > 0) {
            res.json(rows);
        } else {
            // check if database is empty
            const dbRowSize = await getDbRowSize(db);
            if (dbRowSize === 0) {
                res.json({ status: "no results", total: 0 });
                return;
            }
            res.json({ status: "no results", total: dbRowSize });
        }
    });
});

app.get("/api/v1/folder-path", async (_, res) => {
    let mainDir = await loadUserPath();
    res.json({ path: mainDir });
});

app.post("/api/v1/recache", async (req, res) => {
    console.log("recaching started");

    /** @type {boolean} */
    const recachingSuccess = await handleRecachingProcess();

    console.log("recaching done (after handleRecachingProcess part)");

    if (recachingSuccess) {
        res.status(200).send("Recaching completed");
    } else {
        res.status(500).send("Recaching failed");
    }
});

/**
 *
 * Wraps the recaching process in a promise.
 *
 * @returns Promise<boolean>
 */
async function handleRecachingProcess() {
    try {
        await dropDatabaseTable(db);
        await createDatabaseTable(db);

        const mainDir = await loadUserPath();
        app.use("/pdf", express.static(mainDir));

        const pdfList = await fetchAllPdfFromDir(mainDir).then((pdfList) =>
            pdfList.filter((pdf) => pdf.endsWith(".pdf"))
        );
        await cacheAllPdfsInDir(db, pdfList, writePdfDataToDatabase);

        return true;
    } catch (err) {
        throw new Error(err.message);
    }
}

app.get("/api/v1/recache", (req, res) => {
    console.log("recaching status requested - get request");
    if (recacheRunning) {
        console.log("recaching running");
        res.json({
            status: "running",
            current: recachingCurrent,
            total: recachingTotal,
        });
    } else {
        res.json({ status: "done" });
    }
});

app.post("/api/v1/folder-path", (req, res) => {
    // first check if path is valid
    fs.access(req.body.path, fs.constants.R_OK, async (err) => {
        if (err) {
            // throw error if not
            console.log("path not found");
            res.status(404).send({ error: "Path not found" });
        } else {
            // if ok, save path @backend
            const savedPath = await saveUserPath(req.body.path);
            res.json({ path: savedPath, status: "ok" });
        }
    });
});

export default app;

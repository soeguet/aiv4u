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

const app = express();
let recacheRunning = false;
let recachingCurrent = 0;
let recachingTotal = 0;

// middleware setup
app.use(cors());
app.use(express.json());

/**
 *
 * Fetches all PDF names from selected Folder.
 * @returns Promise<string[]>
 */
export async function fetchAllPdfFromDir() {

    const mainDir = await loadUserPath();
    return fs.readdirSync(mainDir);
}

// TODO check if folder is empty

/**
 *
 * Caches all PDFs in selected Folder.
 * @param {import('sqlite3').Database} db
 * @param {Array<String>} pdfList
 * @param {Function} writePdfToDatabaseFn
 */
export async function cacheAllPdfsInDir(
    db,
    pdfList,
    writePdfToDatabaseFn
) {
    console.log("start caching all PDFs");
    console.log("pdfList: " + pdfList.length);

    const mainDir = await loadUserPath();

    for (const pdf of pdfList) {
        try {
            let dataBuffer = fs.readFileSync(mainDir + pdf);
            let bufferedPdf = await PDF(dataBuffer);

            if (recacheRunning) {
                recachingCurrent++;
            }

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
}

// query search terms from frontend
app.post("/api/v1/search", (req, res) => {
    /** @type {String[]} */
    const terms = req.body.query.split(" ");
    /** @type {String} */
    let query = "SELECT * FROM pdfs WHERE ";
    /** @type {String[]} */
    let queryParams = [];
    /** @type {String[]} */
    let queryParts = [];

    // stream through all search terms and concat them to query
    terms.forEach((term) => {
        queryParts.push("(text LIKE ? OR name LIKE ?)");
        queryParams.push(`%${term}%`, `%${term}%`);
    });
    query += queryParts.join(" AND ");

    // fire query
    db.all(query, queryParams, async (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send("internal server error");
            return;
        }

        // console.log(rows);

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

app.get("/api/v1/folder-path", async(_, res) => {
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
    await dropDatabaseTable(db)
        .then(async () => await createDatabaseTable(db))
        .then(async () => await fetchAllPdfFromDir())
        .then((pdfList) => pdfList.filter((pdf) => pdf.endsWith(".pdf")))
        .then((pdfList) => {
            console.log("pdfList: " + pdfList);
            return pdfList;
        })
        .then(
            async (pdfList) =>
                await cacheAllPdfsInDir(
                    db,
                    pdfList,
                    writePdfDataToDatabase
                )
        )
        .then(() => {
            recachingTotal = 0;
            recachingCurrent = 0;
            recacheRunning = false;
        })
        .catch((err) => console.log(err.message));

    return true;
}

app.get("/api/v1/recache", (req, res) => {
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
    fs.access(req.body.path, fs.constants.R_OK, (err) => {
        if (err) {
            console.log("path not found");
            res.status(404).send({ error: "Path not found" });
        } else {
            saveUserPath(req.body.path);
            res.json({ path: req.body.path, status: "ok" });
        }
    });
});

export default app;

import express from "express";
import fs from "fs";
import PDF from "pdf-parse-fork";
import cors from "cors";

import sqlite3 from "sqlite3";
import {
    createDatabaseTable,
    dropDatabaseTable,
    getDbRowSize,
    writePdfDataToDatabase,
} from "./database.mjs";

const db = new sqlite3.Database("./myDB.db");
const app = express();
const port = 3000;
let recacheRunning = false;
let recachingCurrent = 0;
let recachingTotal = 0;

// middleware setup
app.use(cors());
app.use(express.json());

let mainDir = "/home/soeguet/Downloads/";

/**
 *
 * Fetches all PDF names from selected Folder.
 * @param {String} dir
 * @returns Promise<string[]>
 */
async function fetchAllPdfFromDir(dir) {
    return fs.readdirSync(dir);
}

// TODO check if folder is empty

/**
 *
 * Caches all PDFs in selected Folder.
 * @param {Object} db
 * @param {Array<String>} pdfList
 * @param {Function} writePdfToDatabaseFn
 */
async function cacheAllPdfsInDir(db, pdfList, writePdfToDatabaseFn) {
    console.log("start caching all PDFs");
    console.log("pdfList: " + pdfList.length);

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
    let terms = req.body.query.split(" ");
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

app.get("/api/v1/folder-path", (_, res) => {
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
        .then(async () => await fetchAllPdfFromDir(mainDir))
        .then((pdfList) => pdfList.filter((pdf) => pdf.endsWith(".pdf")))
        .then((pdfList) => {
            console.log("pdfList: " + pdfList);
            return pdfList;
        })
        .then(
            async (pdfList) =>
                await cacheAllPdfsInDir(pdfList, writePdfDataToDatabase)
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
    // console.log(req.body);
    fs.access(req.body.path, fs.constants.R_OK, (err) => {
        if (err) {
            console.log("pathh not found");
            res.status(404).send({ error: "Path not found" });
        } else {
            mainDir = req.body.path;
            res.json({ path: mainDir, status: "ok" });
        }
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

createDatabaseTable(db)
    .then(async () => await fetchAllPdfFromDir(mainDir))
    .then((pdfList) => pdfList.filter((pdf) => pdf.endsWith(".pdf")))
    .then(async (pdfList) => {
        const dbRowSize = await getDbRowSize(db);
        console.log("dbRowSize: " + dbRowSize);
        console.log("pdfList.length: " + pdfList.length);
        if (dbRowSize === pdfList.length) {
            throw new Error("No new PDFs to cache");
        }
        return pdfList;
    })
    .then(
        async (pdfList) =>
            await cacheAllPdfsInDir(db, pdfList, writePdfDataToDatabase)
    )
    .catch((err) => console.log(err.message));

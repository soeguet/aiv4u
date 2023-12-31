import express from "express";
import fs from "fs";
import PDF from "pdf-parse-fork";
import cors from "cors";

import sqlite3 from "sqlite3";

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
 * @param {Array} pdfList
 */
async function cacheAllPdfsInDir(pdfList) {
    console.log("start caching all PDFs");

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

            await writePdfDataToDatabase(pdfEntry);
        } catch (err) {
            console.log("Error processing PDF " + pdf + ": " + err);
        }
    }
}

/**
 *
 * Creates database table if it does not exist yet and renders name column unique.
 * @param {Object} db
 */
async function createDatabaseTable(db) {
    db.serialize(() => {
        db.run(
            "CREATE TABLE IF NOT EXISTS pdfs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, pages INTEGER, text TEXT)"
        );
        db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_name ON pdfs(name)");
    });
}

/**
 *
 * Check if PDF already in Database and store if not
 *
 * @param {Object} pdfEntry
 * @param {string} pdfEntry.name
 * @param {number} pdfEntry.pages
 * @param {string} pdfEntry.text
 */
async function writePdfDataToDatabase(pdfDict) {
    db.serialize(() => {
        db.run(
            "INSERT OR IGNORE INTO pdfs(name, pages, text) VALUES(?, ?, ?);",
            [pdfDict.name, pdfDict.pages, pdfDict.text],
            (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
            }
        );
    });
    // console.log(`wrote ${pdfDict.name} to database`);
}

// query search terms from frontend
app.post("/api/v1/search", (req, res) => {
    let terms = req.body.query.split(" ");
    let query = "SELECT * FROM pdfs WHERE ";
    let queryParams = [];
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

        console.log(rows);

        if (rows.length > 0) {
            res.json(rows);
        } else {
            res.json({ status: "no results", total: rows.length });
        }
    });
});

async function dropDatabaseTable(db) {
    db.serialize(() => {
        db.run("DROP TABLE IF EXISTS pdfs;");
    });
}

app.get("/api/v1/folder-path", (_, res) => {
    res.json({ path: mainDir });
});

app.post("/api/v1/recache", (req, res) => {
    console.log("recaching started");
    dropDatabaseTable(db)
        .then(() => createDatabaseTable(db))
        .then(() =>
            fetchAllPdfFromDir(mainDir)
                .then((pdfList) =>
                    pdfList.filter((pdf) => pdf.endsWith(".pdf"))
                )
                .then(async (pdfList) => cacheAllPdfsInDir(pdfList))
                .then(() => {
                    recachingTotal = 0;
                    recachingCurrent = 0;
                    recacheRunning = false;
                })
                .catch((err) => console.log(err.message))
        );
});

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
    console.log(req.body);
    fs.access(req.body.path, fs.constants.R_OK, (err) => {
        if (err) {
            console.log("path not found");
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

async function getDbRowSize() {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) FROM pdfs;", (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row["COUNT(*)"]);
        });
    });
}

await createDatabaseTable(db)
    .then(async () => await fetchAllPdfFromDir(mainDir))
    .then((pdfList) => pdfList.filter((pdf) => pdf.endsWith(".pdf")))
    .then(async (pdfList) => {
        const dbRowSize = await getDbRowSize();
        if (dbRowSize === pdfList.length) {
            throw new Error("No new PDFs to cache");
        }
        return pdfList;
    })
    .then(async (pdfList) => cacheAllPdfsInDir(pdfList))
    .catch((err) => console.log(err.message));

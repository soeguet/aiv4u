import express from "express";
import fs from "fs";
import PDF from "pdf-parse-fork";
import cors from "cors";

import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./myDB.db");
const app = express();
const port = 3000;

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

/**
 *
 * Caches all PDFs in selected Folder.
 * @param {Array} pdfList
 */
async function cacheAllPdfsInDir(pdfList) {
    console.log("start caching all PDFs");

    // const pdfListLength = pdfList.length;
    for (const pdf of pdfList) {
        let dataBuffer = fs.readFileSync(mainDir + pdf);
        await PDF(dataBuffer)
            .then(async (bufferedPdf) => {
                // if not in database, write to database
                const pdfEntry = {
                    name: pdf,
                    pages: bufferedPdf.numpages,
                    text: bufferedPdf.text,
                };
                await writePdfDataToDatabase(pdfEntry);
            })
            .catch((err) => console.log("Invalid PDF func" + err));
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
    console.log(`wrote ${pdfDict.name} to database`);
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
    db.all(query, queryParams, (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send("internal server error");
            return;
        }

        if (rows.length > 0) {
            res.json(rows);
        } else {
            res.status(404).send("no entries found");
        }
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

await createDatabaseTable(db);

fetchAllPdfFromDir(mainDir)
    .then(async (pdfList) => await cacheAllPdfsInDir(pdfList))
    .catch((err) => console.log("Invalid PDF " + err));

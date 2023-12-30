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

let mainDir = "C:\\Users\\Osman\\Desktop\\_pharma4u\\";

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

    await Promise.all(
        pdfList.map((pdf) => {
            let dataBuffer = fs.readFileSync(mainDir + pdf);

            PDF(dataBuffer)
                .then(async function(data) {
                    const pdfEntry = {
                        name: pdf,
                        pages: data.numpages,
                        text: data.text,
                    };
                    await writePdfDataToDatabase(pdfEntry);
                })
                .catch((err) => console.log("Invalid PDF func" + err));
        })
    );
}

/**
 *
 * Creates database table if it does not exist yet.
 * @param {Object} db
 */
async function createDatabaseTable(db) {
    db.serialize(() => {
        db.run(
            "CREATE TABLE IF NOT EXISTS pdfs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, pages INTEGER, text TEXT)"
        );
    });
}

async function checkIfEntryAlreadyInDb(pdfDict) {
    db.serialize(() => {
        // check if pdf name already exists
        db.get(
            "SELECT name FROM pdfs WHERE name = ?",
            [pdfDict.name],
            (err, row) => {
                // error
                if (err) {
                    console.error(err);
                    return;
                }

                // does exist
                if (row) {
                    return true;
                } else {
                    // if not in database
                    return false;
                }
            }
        );
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

    if (checkIfEntryAlreadyInDb(pdfDict)) {
        console.log(
            "Entry with the name '" + pdfDict.name + "' already exists."
        );
        return;
    }
    db.serialize(() => {
        // check if pdf name already exists
        db.get(
            "SELECT name FROM pdfs WHERE name = ?",
            [pdfDict.name],
            (err, row) => {
                // error
                if (err) {
                    console.error(err);
                    return;
                }

                // does exist
                if (row) {
                    console.log(
                        "Entry with the name '" +
                        pdfDict.name +
                        "' already exists."
                    );
                } else {
                    // if not in database
                    const stmt = db.prepare(
                        "INSERT INTO pdfs (name, pages, text) VALUES (?, ?, ?)"
                    );

                    stmt.run(
                        pdfDict.name,
                        pdfDict.pages,
                        pdfDict.text,
                        (err) => {
                            if (err) {
                                console.error(err);
                                return;
                            }

                            console.log("Successfully persisted data.");
                        }
                    );

                    stmt.finalize();
                }
            }
        );
    });
}

// query search terms from frontend
app.post("/api/v1/search", (req, res) => {
    let terms = req.body.query.split(" ");
    let query = "SELECT * FROM pdfs WHERE ";
    let queryParams = [];

    // stream through all search terms
    terms.forEach((term, index) => {
        query += "text LIKE ? OR name LIKE ?";
        queryParams.push(`%${term}%`, `%${term}%`);

        if (index < terms.length - 1) {
            query += " AND ";
        }
    });

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

fetchAllPdfFromDir(mainDir)
    .then((anzahl) => cacheAllPdfsInDir(anzahl))
    .then(createDatabaseTable(db))
    .catch((err) => console.log("Invalid PDF " + err));

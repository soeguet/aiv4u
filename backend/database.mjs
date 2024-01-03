/**
 * @typedef {Object} PdfEntry
 * @property {string} name - pdf name
 * @property {number} pages - pdf page count
 * @property {string} text - pdf content as string
 */

import sqlite3 from "sqlite3";
const db = new sqlite3.Database("./myDB.db");

/**
 *
 * Drop database table
 *
 * @param {import('sqlite3').Database} db - The SQLite3 database instance.
 */
export async function dropDatabaseTable(db) {
    console.log("dropping table");
    db.serialize(() => {
        db.run("DROP TABLE IF EXISTS pdfs;");
    });
}

/**
 *
 * Check if PDF already in Database and store if not
 *
 * @param {import('sqlite3').Database} db - The SQLite3 database instance.
 * @param {PdfEntry} pdfEntry - Das PdfEntry-Objekt.
 */
export async function writePdfDataToDatabase(db, pdfEntry) {
    db.serialize(() => {
        db.run(
            "INSERT OR IGNORE INTO pdfs(name, pages, text) VALUES(?, ?, ?);",
            [pdfEntry.name, pdfEntry.pages, pdfEntry.text],
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

/**
 * Creates a database table.
 *
 * @param {import('sqlite3').Database} db - The SQLite3 database instance.
 */
export async function createDatabaseTable(db) {
    db.serialize(() => {
        db.run(
            "CREATE TABLE IF NOT EXISTS pdfs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, pages INTEGER, text TEXT)"
        );
        db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_name ON pdfs(name)");
    });
}

/**
 *
 * Counts the number of rows in the database and returns the number.
 *
 * @param {import('sqlite3').Database} db - The SQLite3 database instance.
 * @returns {Promise<number>}
 */
export async function getDbRowSize(db) {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) FROM pdfs;", (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row["COUNT(*)"]);
        });
    });
}

export default db;

import express from "express";
import db, {
    createDatabaseTable,
    getDbRowSize,
    writePdfDataToDatabase,
} from "./database.mjs";
import app, { cacheAllPdfsInDir, fetchAllPdfFromDir } from "./index.mjs";
import { loadUserPath } from "./user-path.mjs";

const port = 3000;

/**
 * Wrapper for the main initialization.
 */
async function main() {
    // 1) create database table
    await createDatabaseTable(db);

    // 2) user path
    const mainDir = await loadUserPath();
    if (mainDir === "") {
        return;
    }

    // 3) -> make pdfs available to the frontend
    app.use("/pdf", express.static(mainDir));

    const pdfList = (await fetchAllPdfFromDir(mainDir)).filter((pdf) =>
        pdf.endsWith(".pdf")
    );

    // 4) print out the number of pdfs in directory and in database
    const dbRowSize = await getDbRowSize(db);
    consoleLogStatementsForTheTerminal(mainDir, dbRowSize, pdfList);

    // bail out if all pdfs are already in the database
    if (dbRowSize === pdfList.length) {
        return;
    }

    // otherwise cache PDFs
    await cacheAllPdfsInDir(db, pdfList, writePdfDataToDatabase);
}

// start server, cache pdfs and open server port
app.listen(port, async () => {
    await main();
    console.log(`fuzzy finder app listening on port ${port}`);
});

/**
 * Print out statements for the terminal.
 * @param {string} mainDir - The path to the directory with the PDFs.
 * @param {number} dbRowSize - The number of rows in the database.
 * @param {string[]} pdfList - The list of PDFs in the directory.
 */
async function consoleLogStatementsForTheTerminal(mainDir, dbRowSize, pdfList) {
    console.log(`
____________
____________

        ██████  ██████  ███████     ███████ ██    ██ ███████ ███████ ██    ██     ███████ ██ ███    ██ ██████  ███████ ██████  
        ██   ██ ██   ██ ██          ██      ██    ██    ███     ███   ██  ██      ██      ██ ████   ██ ██   ██ ██      ██   ██ 
        ██████  ██   ██ █████       █████   ██    ██   ███     ███     ████       █████   ██ ██ ██  ██ ██   ██ █████   ██████  
        ██      ██   ██ ██          ██      ██    ██  ███     ███       ██        ██      ██ ██  ██ ██ ██   ██ ██      ██   ██ 
        ██      ██████  ██          ██       ██████  ███████ ███████    ██        ██      ██ ██   ████ ██████  ███████ ██   ██ 
        
____________
____________
started process
`);
    console.log("____________");
    console.log("____________");
    console.log("");
    console.log("dbRowSize: " + dbRowSize);
    console.log("pdf path: " + mainDir);
    console.log("pdfList.length: " + pdfList.length);
    console.log(
        `= ${(dbRowSize / pdfList.length) * 100}% pdfs are in the database`
    );
    console.log("");
    console.log("____________");
    console.log("____________");
    console.log("");
    console.log("");
}

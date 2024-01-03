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
    try {
        // 1) create database table
        await createDatabaseTable(db);

        // 2) user path
        const mainDir = await loadUserPath();
        if (mainDir === "") {
            return;
        }

        app.use("/pdf", express.static(mainDir));

        const pdfList = (await fetchAllPdfFromDir(mainDir)).filter((pdf) =>
            pdf.endsWith(".pdf")
        );

        // 3) print out the number of pdfs in directory and in database
        const dbRowSize = await getDbRowSize(db);
        console.log("dbRowSize: " + dbRowSize);
        console.log("pdfList.length: " + pdfList.length);
        console.log(
            `= ${(dbRowSize / pdfList.length) * 100}% pdfs are in the database`
        );

        // bail out if all pdfs are already in the database
        if (dbRowSize === pdfList.length) {
            return;
        }

        // otherwise cache PDFs
        await cacheAllPdfsInDir(db, pdfList, writePdfDataToDatabase);
    } catch (err) {
        // TODO specify error handling
        throw new Error(err.message);
    }
}

// start server, cache pdfs and open server port
app.listen(port, async () => {
    await main();
    console.log(`fuzzy finder app listening on port ${port}`);
});

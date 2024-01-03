import db, {
    createDatabaseTable,
    getDbRowSize,
    writePdfDataToDatabase,
} from "./database.mjs";
import app, { cacheAllPdfsInDir, fetchAllPdfFromDir } from "./index.mjs";

const port = 3000;

/**
 * Wrapper for the main initialization.
 */
async function main() {
    try {
        await createDatabaseTable(db);
        const pdfList = (await fetchAllPdfFromDir()).filter((pdf) =>
            pdf.endsWith(".pdf")
        );

        const dbRowSize = await getDbRowSize(db);
        console.log("dbRowSize: " + dbRowSize);
        console.log("pdfList.length: " + pdfList.length);

        if (dbRowSize === pdfList.length) {
            return;
        }

        await cacheAllPdfsInDir(db, pdfList, writePdfDataToDatabase);
    } catch (err) {
        // TODO specify error handling
        throw new Error(err.message);
    }
}

main();

// open server port
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

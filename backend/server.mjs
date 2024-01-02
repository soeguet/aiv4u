import db, {
    createDatabaseTable,
    getDbRowSize,
    writePdfDataToDatabase,
} from "./database.mjs";
import app, {
    cacheAllPdfsInDir,
    fetchAllPdfFromDir,
    mainDir,
} from "./index.mjs";

const port = 3000;

// main initialization bloack
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
            await cacheAllPdfsInDir(
                db,
                pdfList,
                writePdfDataToDatabase
            )
    )
    .catch((err) => console.log(err.message));

// open server port
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

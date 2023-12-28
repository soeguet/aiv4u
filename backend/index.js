import express from 'express'
import fs from 'fs'
import PDF from 'pdf-parse-fork'
import cors from 'cors'

import sqlite3 from 'sqlite3'

const db = new sqlite3.Database('./myDB.db')
const app = express()
const port = 3000
app.use(cors());

let mainDir = '/home/soeguet/Downloads/'

/**
 *
 * Fetches all PDF names from selected Folder.
 * @param {String} dir
 * @returns Promise<string[]>
 */
async function fetchAllPdfFromDir(dir) {
  return fs.readdirSync(dir)
}
const anzahl = fetchAllPdfFromDir(mainDir)

/**
 *
 * Caches all PDFs in selected Folder.
 * @param {Array} pdfList
 */
async function cacheAllPdfsInDir(pdfList) {

  pdfList.forEach((pdf) => {

    let dataBuffer = fs.readFileSync(mainDir + pdf);

    PDF(dataBuffer).then(function(data) {

      const pdfEntry = {
        "name": pdf,
        "pages": data.numpages,
        "text": data.text
      }
      writePdfDataToDatabase(pdfEntry)
    });
  })
}

cacheAllPdfsInDir(anzahl)

/**
 *
 * Creates database table if it does not exist yet.
 * @param {Object} db
 */
async function createDatabaseTable(db) {
  db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS pdfs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, pages INTEGER, text TEXT)");
  });
}

createDatabaseTable(db)

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

    // check if pdf name already exists
    db.get("SELECT name FROM pdfs WHERE name = ?", [pdfDict.name], (err, row) => {

      // error
      if (err) {
        console.error(err);
        return;
      }

      // does exist
      if (row) {

        console.log("Entry with the name '" + pdfDict.name + "' already exists.");

      } else {

        // if not in database
        const stmt = db.prepare("INSERT INTO pdfs (name, pages, text) VALUES (?, ?, ?)");

        stmt.run(pdfDict.name, pdfDict.pages, pdfDict.text, (err) => {

          if (err) {
            console.error(err);
            return;
          }

          console.log("Successfully persisted data.");
        });

        stmt.finalize();
      }
    });
  });
}

// db.close();

app.post('/search', (req, res) => {
  const testData = {
    "status": "Erfolg",
    "message": "Daten erfolgreich abgerufen",
    "data": [
      {
        "id": 1,
        "name": "Beispielprodukt 1",
        "kategorie": "Elektronik",
        "preis": 99.99
      },
      {
        "id": 2,
        "name": "Beispielprodukt 2",
        "kategorie": "Bücher",
        "preis": 14.99
      },
      {
        "id": 3,
        "name": "Beispielprodukt 3",
        "kategorie": "Haushaltswaren",
        "preis": 29.99
      }
    ]
  };
  res.send(testData);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

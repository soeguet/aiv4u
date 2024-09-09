import express from "express";
import { loadUserPath, saveUserPath } from "./user-path.mjs";
import { getDbRowSize } from "./database.mjs";
import {db} from "./database.mjs";
import {handleRecachingProcess} from "./pdf.mjs";
import {access, constants} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const app = express();

// middleware setup
app.use(express.json());
app.use(express.static("./frontend/"));

// routes
// query search terms from frontend
app.post("/api/v1/search", (req, res) => {
    /** @type {string[]} */
    const terms = req.body.query.split(" ");
    /** @type {string} */
    let query = "SELECT * FROM pdfs WHERE ";
    /** @type {string[]} */
    let queryParams = [];
    /** @type {string[]} */
    let queryParts = [];

    // stream through all search terms and concat them to query
    terms.forEach((term) => {
        queryParts.push("(text LIKE ? OR name LIKE ?)");
        queryParams.push(`%${term}%`, `%${term}%`);
    });
    query += queryParts.join(" AND ");

    /**
     * fires db query
     *
     * @param {string} query - predefined query
     * @param {string[]} queryParams - separate query params
     * @param {Function} callback
     *
     * the callback contains the following parameters:
     * @param {Error} err - error object
     * @param {Array<Object>} rows - array of objects from database (each row - see below)
     * @param {number} rows[].id - pdf id
     * @param {string} rows[].name - pdf name
     * @param {number} rows[].pages - pdf page count
     * @param {string} rows[].text - pdf content as string
     */
    db.all(query, queryParams, async (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send("internal server error");
            return;
        }

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

app.get("/api/v1/folder-path", async (_, res) => {
    const configFile = path.join(homedir(), ".aiv4u.json");
    let mainDir = await loadUserPath(configFile);
    res.json({ path: mainDir });
});

app.post("/api/v1/recache", async (_, res) => {

    /** @type {boolean} */
    const recachingSuccess = await handleRecachingProcess(db);

    if (recachingSuccess) {
        res.status(200).send("Recaching completed");
    } else {
        res.status(500).send("Recaching failed");
    }
});

app.get("/api/v1/recache", (_, res) => {
    res.json({ status: "done" });
});

app.post("/api/v1/folder-path", (req, res) => {
    access(req.body.path, constants.R_OK, async (err) => {
        if (err) {
            console.log("path not found");
            res.status(404).send({ error: "Path not found" });
        } else {
            const savedPath = await saveUserPath(req.body.path);
            res.json({ path: savedPath, status: "ok" });
        }
    });
});

export {app};

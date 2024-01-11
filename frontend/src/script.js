/**
 * Check if HTMLInputElement and get value.
 * @param {HTMLElement | null} el
 * @return {string}
 */
function getValueFromValueFieldInHtmlInputElement(el) {
    if (el == null) throw new Error("el is null");

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return el.value;
    }

    throw new Error(`${el} is not an HTMLInputElement`);
}

/**
 * Check if HTMLInputElement and set value.
 * @param {HTMLElement | null} el
 * @param {string} value
 */
function setHtmlElementValue(el, value) {
    if (el == null) throw new Error("el is null");

    if (el instanceof HTMLInputElement) {
        el.value = value;

        return;
    }

    throw new Error(`${el} is not an HTMLInputElement`);
}

document.addEventListener("DOMContentLoaded", async () => {
    const searchBox = document.getElementById("searchBox");

    if (!searchBox) throw new Error("search box not found");

    const resultsDiv = document.getElementById("results");

    if (!resultsDiv) throw new Error("results div not found");

    const statusFieldDiv = document.getElementById("status-field");

    if (!statusFieldDiv) throw new Error("status field not found");

    const pathField = document.getElementById("pathInputGrid");

    if (!pathField) throw new Error("path field not found");

    const newPathField = document.getElementById("new-path");

    if (!newPathField) throw new Error("new path field not found");

    const savePathButton = document.getElementById("send-new-path-button");

    if (!savePathButton) throw new Error("save path button not found");

    const recacheSpinner = document.getElementById("recache");

    if (!recacheSpinner) throw new Error("recache spinner not found");

    const recacheDisableCandidates = [searchBox, pathField];

    recacheSpinner.addEventListener("click", () => {
        recacheSpinner.classList.add("recaching");
        statusFieldDiv.classList.add("text-warning");
        statusFieldDiv.innerHTML = "recaching...";
        recacheDisableCandidates.forEach((element) => {
            element.setAttribute("disabled", "disabled");
        });

        fetch("http://localhost:3000/api/v1/recache", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw response;
                }

                console.log("recaching request response ok");
            })
            .catch((error) => {
                if (error.status === 404) {
                    statusFieldDiv.classList.add("text-danger");
                    statusFieldDiv.innerHTML =
                        "recaching failed" + error.message;
                } else {
                    console.error("Error:", error);
                }
            });

        setTimeout(checkForRecacheStatus, 3000);
    });

    /**
     * check if recaching is done - recursive
     */
    async function checkForRecacheStatus() {
        if (!statusFieldDiv) throw new Error("status field not found");

        let response = await fetch("http://localhost:3000/api/v1/recache");

        if (!response.ok) {
            console.log("Error fetching recache status: " + response.status);
            statusFieldDiv.classList.add("text-danger");
            statusFieldDiv.innerHTML =
                "woops. looks like the recaching process failed";
            return;
        }

        let jsonStatus = await response.json();

        console.log(jsonStatus);

        statusFieldDiv.classList.add("text-success");
        statusFieldDiv.innerHTML = "recaching done";

        if (!recacheSpinner) {
            throw new Error("recache spinner not found");
        }

        recacheSpinner.classList.remove("recaching");
        recacheDisableCandidates.forEach((element) => {
            element.removeAttribute("disabled");
        });
    }

    savePathButton.addEventListener("click", () => {
        const newPath = getValueFromValueFieldInHtmlInputElement(newPathField);

        fetch("http://localhost:3000/api/v1/folder-path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({path: newPath}),
        })
            .then((response) => {
                if (!response.ok) {
                    throw response;
                }

                return response.json();
            })
            .then((data) => {
                // update path field with new path
                setHtmlElementValue(pathField, data.path);
            })
            .catch((error) => {
                if (error.status === 404) {
                    statusFieldDiv.classList.add("text-danger");
                    statusFieldDiv.innerHTML =
                        "path not found, ignored request";
                    // reset path field in modal back to old value
                    setHtmlElementValue(
                        newPathField,
                        getValueFromValueFieldInHtmlInputElement(pathField)
                    );
                } else {
                    console.error("Error:", error);
                }
            });
    });

    /**
     * initial request at backend. will ask for pdf path on local filesystem. the backend will look for a .json file on
     * the home folder path. if said file does not exist, it will show an error message.
     *
     * @returns {void}
     */
    function retrievePathToPdfs() {
        if (!statusFieldDiv) throw new Error("status field not found");

        new Promise((_, reject) => {
            fetch("http://localhost:3000/api/v1/folder-path")
                .then((response) => {
                    if (!response.ok) {
                        throw response;
                    }

                    return response;
                })
                .then((response) => response.json())
                .then((data) => {
                    setHtmlElementValue(pathField, data.path);
                    setHtmlElementValue(newPathField, data.path);
                })
                .catch((error) => {
                    statusFieldDiv.classList.add("text-danger");
                    statusFieldDiv.innerHTML =
                        "error - server might not be ready or running";

                    reject(error);
                });
        });
    }

    retrievePathToPdfs();

    searchBox.addEventListener(
        "input",
        debounceBackendRequest(handleSearch, 2000)
    );

    /**
     *
     */
    function handleSearch() {
        if (!statusFieldDiv) throw new Error("status field not found");

        // measure time for fetch request
        const start = performance.now();
        const query = getValueFromValueFieldInHtmlInputElement(searchBox);

        if (query.length > 2) {
            // start searching at 2
            fetch("http://localhost:3000/api/v1/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({query: query}),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (
                        data.status !== undefined &&
                        data.status === "no results"
                    ) {
                        throw new CustomError(data.total, "no results");
                    }

                    return data;
                })
                .then((data) => {
                    displayResults(data);

                    // stop timer
                    const end = performance.now();
                    // time total
                    const duration = end - start;
                    const timerField = document.getElementById("timer");

                    if (!timerField) throw new Error("timer field not found");

                    timerField.textContent = `${duration} ms`;
                    statusFieldDiv.className = "";
                    statusFieldDiv.innerHTML = `${data.length} results`;
                })
                .catch((error) => {
                    if (error instanceof CustomError) {
                        if (error.data === 0) {
                            statusFieldDiv.classList.add("text-warning");
                            statusFieldDiv.innerHTML =
                                error.message +
                                ". your database is empty. you should recache.";
                        } else {
                            statusFieldDiv.classList.add("text-primary");
                            statusFieldDiv.innerHTML = `no matches. your database contains ${error.data} results in total. try changing your search query.`;
                        }
                    }
                });
        }
    }

    /**
     * Disassemble the data and display it in the results div in a table.
     *
     * @param {Object[]} data - array of objects from database (each row - see below)
     * @param {number} data[].id - pdf id
     * @param {string} data[].name - pdf name
     * @param {number} data[].pages - pdf page count
     * @param {string} data[].text - pdf content as string
     */
    function displayResults(data) {
        if (!resultsDiv) throw new Error("results div not found");

        //delete old entries
        resultsDiv.innerHTML = "";

        // create table
        const table = document.createElement("table");

        table.classList.add("table");
        table.classList.add("table-striped");

        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");
        // table head
        const headerRow = document.createElement("tr");

        if (data.length > 0) {
            const firstRow = data[0];

            if (firstRow == null) throw new Error("first row is null");

            Object.keys(firstRow).forEach((key) => {
                const th = document.createElement("th");

                th.textContent = key;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
        }

        // table body
        data.forEach((entry) => {
            const row = document.createElement("tr");

            Object.entries(entry).forEach(([key, value]) => {
                let customValue = value;
                const td = document.createElement("td");

                if (key === "text") {
                    td.innerHTML =
                        "<a href='/pdf/" +
                        entry.name +
                        "' target='_blank'>preview</a>";
                } else {
                    // since value could is of type string | number
                    td.textContent = customValue.toString();
                }

                row.appendChild(td);
            });
            tbody.appendChild(row);
        });

        // patch everything together
        table.appendChild(thead);
        table.appendChild(tbody);
        resultsDiv.appendChild(table);
    }
});

/**
 * trigger buffer for requests to the backend.
 *
 * @param {function(Event):void} func
 * @param {number} delay
 * @return {function(Event):void}
 */
function debounceBackendRequest(func, delay) {
    /**@type {NodeJS.Timeout}**/
    let timeoutId;

    /**
     * @param {any} args
     */
    return /**@this {any}**/ function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * Custom Error class to handle search result errors.
 */
class CustomError extends Error {
    constructor(/**@type {number}**/ data, /**@type {string}**/ message) {
        super(`Error: ${message}`);
        this.data = data;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const searchBox = document.getElementById("searchBox");
    const resultsDiv = document.getElementById("results");
    const statusFieldDiv = document.getElementById("status-field");
    const pathField = document.getElementById("pathInputGrid");
    const newPathField = document.getElementById("new-path");
    const savePathButton = document.getElementById("send-new-path-button");
    const recacheSpinner = document.getElementById("recache");

    recacheSpinner.addEventListener("click", () => {
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
        console.log("checking for recache status");

        try {
            console.log("checking for recache status");
            let response = await fetch("http://localhost:3000/api/v1/recache");
            console.log("checking for recache status");

            // Überprüfen Sie, ob der Fetch-Aufruf erfolgreich war
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            let jsonStatus = await response.json();

            console.log(jsonStatus);

            if (jsonStatus.status === "running") {
                statusFieldDiv.classList.remove("text-warning");
                statusFieldDiv.innerHTML =
                    "recaching.. (" +
                    jsonStatus.current +
                    "/" +
                    jsonStatus.total +
                    ")";
                setTimeout(checkForRecacheStatus, 3000);
            } else {
                console.log("recaching done");
                statusFieldDiv.classList.add("text-success");
                statusFieldDiv.innerHTML = "recaching done";
            }
        } catch (error) {
            console.log("Error fetching recache status:", error);
            // Behandlung von Netzwerkfehlern oder anderen Fehlern
        }
    }

    savePathButton.addEventListener("click", () => {
        const newPath = newPathField.value;
        fetch("http://localhost:3000/api/v1/folder-path", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: newPath }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw response;
                }
                return response.json();
            })
            .then((data) => {
                // update path field with new path
                pathField.value = data.path;
            })
            .catch((error) => {
                if (error.status === 404) {
                    statusFieldDiv.classList.add("text-danger");
                    statusFieldDiv.innerHTML =
                        "path not found, ignored request";
                    // reset path field in modal back to old value
                    newPathField.value = pathField.value;
                } else {
                    console.error("Error:", error);
                }
            });
    });

    function retrievePathToPdfs() {
        new Promise((_, reject) => {
            fetch("http://localhost:3000/api/v1/folder-path")
                .then((response) => response.json())
                .then((data) => {
                    pathField.value = data.path;
                    newPathField.value = data.path;
                })
                .catch((error) => {
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
        // measure time for fetch request
        const start = performance.now();

        const query = searchBox.value;

        if (query.length > 2) {
            // start searching at 2
            fetch("http://localhost:3000/api/v1/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query: query }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (
                        data.status != undefined &&
                        data.status === "no results"
                    ) {
                        statusFieldDiv.innerHTML =
                            data.total +
                            " results. you should recache your database.";
                        throw new Error("no results");
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
                    timerField.textContent = `${duration} ms`;
                    statusFieldDiv.classList.remove("text-danger");
                    statusFieldDiv.innerHTML = `${data.length} results`;
                })
                .catch((error) => {
                    if (error.message === "no results") {
                        statusFieldDiv.innerHTML =
                            "no results. db size: " + statusFieldDiv.innerHTML;
                    } else {
                        statusFieldDiv.innerHTML = "error";
                    }

                    statusFieldDiv.classList.add("text-danger");
                    console.error("Error:", error);
                });
        }
    }

    /**
     *
     * @param {String} data
     */
    function displayResults(data) {
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
            Object.keys(data[0]).forEach((key) => {
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
                let displayValue = value;

                if (key === "text") {
                    displayValue = value.substring(0, 15) + "...";
                }

                const td = document.createElement("td");
                td.textContent = displayValue;
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
 * @param {String} func
 * @param {number} delay
 * @return {function}
 */
function debounceBackendRequest(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, arguments);
        }, delay);
    };
}

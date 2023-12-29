document.addEventListener("DOMContentLoaded", () => {
    const searchBox = document.getElementById("searchBox");
    const resultsDiv = document.getElementById("results");

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
                    displayResults(data);

                    // stop timer
                    const end = performance.now();
                    // time total
                    const duration = end - start;

                    const timerField = document.getElementById("timer");
                    timerField.textContent = `${duration} ms`;
                })
                .catch((error) => console.error("Error:", error));
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
    return function () {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, arguments);
        }, delay);
    };
}

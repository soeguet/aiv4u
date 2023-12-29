document.addEventListener("DOMContentLoaded", () => {
    const searchBox = document.getElementById("searchBox");
    const resultsDiv = document.getElementById("results");

    searchBox.addEventListener("input", debounceBackendRequest(handleSearch, 2000));

    /**
     *
     */
    function handleSearch() {
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
                })
                .catch((error) => console.error("Error:", error));
        }
    }

    /**
     *
     * @param {String} data
     */
    function displayResults(data) {
        resultsDiv.innerHTML = ""; // Delete old entries

        data.forEach((entry) => {
            const div = document.createElement("div");
            div.innerHTML = entry.name;
            resultsDiv.appendChild(div);
        });
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

document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('searchBox');
    const resultsDiv = document.getElementById('results');

    searchBox.addEventListener('input', debounce(handleSearch, 500));

    function handleSearch() {
        const query = searchBox.value;
        if (query.length > 2) { // start searching at 2
            fetch('http://localhost:3000/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: query })
            })
                .then(response => response.json())
                .then(data => {
                    displayResults(data);
                })
                .catch(error => console.error('Error:', error));
        }
    }

    function displayResults(data) {
        console.log(data)
        resultsDiv.innerHTML = ''; // Delete old entries
        const div = document.createElement('div');
        div.textContent = data.name; //  or w/e
        resultsDiv.innerHTML = data.message
    }
});

function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, arguments);
        }, delay);
    };
}


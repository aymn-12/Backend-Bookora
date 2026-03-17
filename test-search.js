const axios = require("axios");

async function testSearch() {
    console.log("Testing search results...");
    try {
        const response = await axios.get("http://localhost:5000/api/search", {
            params: { q: "فن" }
        });
        
        console.log("Success:", response.data.success);
        console.log("Query:", response.data.query);
        console.log("Books found:", response.data.data.books.length);
        if (response.data.data.books.length > 0) {
            console.log("First book title:", response.data.data.books[0].title);
        }
        
        const autocomplete = await axios.get("http://localhost:5000/api/search/autocomplete", {
            params: { q: "ها" }
        });
        console.log("Autocomplete count:", autocomplete.data.data.length);

    } catch (error) {
        console.error("Test failed. Is the server running on port 5000?");
        console.error(error.message);
    }
}

testSearch();

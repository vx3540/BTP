const driver = neo4j.driver(
    "bolt://localhost:7687",
    neo4j.auth.basic("neo4j", "123456789")
);

const session = driver.session();

// Initialize the Leaflet map
const map = L.map('map').setView([17.4, 78.5], 12); // Set initial coordinates to Hyderabad's center
map.setZoom(map.getZoom() - 1);

// Set up the map tile layer (using OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Function to fetch authors for a location (as you already have)
async function fetchAuthorsForLocation(locationName) {
    try {
        const result = await session.run(`
            MATCH (a:Author)-[:LIVED_IN]->(l:Location {name: $locationName})
            RETURN a.name AS authorName
        `, { locationName });

        const authors = result.records.map(record => record.get("authorName") || "Unknown Author");
        return authors;
    } catch (error) {
        console.error("Error fetching authors for location:", error);
        return [];
    }
}

// Function to show the image popup
function showImagePopup(imageData, locationName) {
    let popup = document.getElementById("popup");
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "popup";
        popup.style.position = "fixed";
        popup.style.top = "50%";
        popup.style.left = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.backgroundColor = "white";
        popup.style.border = "1px solid #ccc";
        popup.style.padding = "10px";
        popup.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
        popup.style.zIndex = "1000";

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "X";
        closeBtn.style.position = "absolute";
        closeBtn.style.top = "5px";
        closeBtn.style.right = "5px";
        closeBtn.style.cursor = "pointer";
        closeBtn.addEventListener("click", () => popup.remove());

        popup.appendChild(closeBtn);
        document.body.appendChild(popup);
    } else {
        popup.innerHTML = ""; // Clear previous content
    }

    const title = document.createElement("h3");
    title.textContent = locationName;
    popup.appendChild(title);

    if (imageData) {
        const img = document.createElement("img");
        img.src = `data:image/jpeg;base64,${imageData}`;
        img.alt = locationName;
        img.style.width = "200px";
        img.style.height = "200px";
        img.style.objectFit = "cover";
        img.style.cursor = "pointer";
        popup.appendChild(img);

        img.addEventListener("click", () => {
            window.location.href = `authors.html?location=${encodeURIComponent(locationName)}`;
        });
    } else {
        popup.innerHTML += "<p>No image available.</p>";
    }

    // Close the popup when clicking anywhere else on the map
    map.on("click", function() {
        popup.remove();
    });
}


// Function to fetch locations and add them to the map
async function fetchLocations() {
    try {
        const result = await session.run(`
            MATCH (l:Location)
            RETURN l.name AS locationName, l.image_data AS imageData, l.coordinates AS coordinates
        `);

        result.records.forEach((record) => {
            const locationName = record.get("locationName") || "Unknown Location";
            const imageData = record.get("imageData");
            const coordinates = record.get("coordinates");
        
            if (!coordinates) return; // Skip if no coordinates available
        
            const [latitude, longitude] = coordinates; // Extract latitude and longitude
        
            // Add a marker to the map for the location
            const marker = L.marker([latitude, longitude]).addTo(map);
            marker.bindPopup(`<b>${locationName}</b>`).openPopup();

            // When the marker is clicked, show the image popup
            marker.on("click", () => showImagePopup(imageData, locationName));
        });
        
    } catch (error) {
        console.error("Error fetching locations:", error);
    }
}

fetchLocations();

window.addEventListener("beforeunload", () => {
    driver.close();
});

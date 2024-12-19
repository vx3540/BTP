const driver = neo4j.driver(
    "bolt://localhost:7687",
    neo4j.auth.basic("neo4j", "123456789")
);

const session = driver.session();

// Initialize the Leaflet map
const map = L.map('map', { zoomControl: true }).setView([17.4, 78.5], 12);

// Define tile layers
const lightLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
});

const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
});

const satelliteLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
});

// Add the default tile layer
lightLayer.addTo(map);

// Add layer control
const baseMaps = {
    "Light Mode": lightLayer,
    "Dark Mode": darkLayer,
    "Satellite": satelliteLayer
};
L.control.layers(baseMaps).addTo(map);

// Adjust map size when resizing browser
window.addEventListener('resize', () => {
    const mapElement = document.getElementById('map');
    mapElement.style.height = `${window.innerHeight - 50}px`; // Dynamic height minus header
    map.invalidateSize(); // Recalculate map size
})
// Function to fetch authors for a location
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
        img.style.width = "100%";
        img.style.maxWidth = "300px";
        img.style.height = "auto";
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
    map.on("click", function () {
        popup.remove();
    });
}

// Function to fetch locations and add them to the map
async function fetchLocations() {
    try {
        const customIcon = L.icon({
            iconUrl: 'images/blue-marker.png', // Path to the default marker image
            iconSize: [40, 40], // Adjust size to fit your design
            iconAnchor: [15, 45], // Anchor the bottom center of the icon
            popupAnchor: [0, -45] // Adjust popup position relative to the icon
        });
        
        const hoverIcon = L.icon({
            iconUrl: 'images/red-marker.png', // Path to the hover marker image
            iconSize: [40, 40],
            iconAnchor: [15, 45],
            popupAnchor: [0, -45]
        });
        
        const result = await session.run(`
            MATCH (l:Location)
            RETURN l.name AS locationName, l.image_data AS imageData, l.coordinates AS coordinates
        `);
        
        result.records.forEach((record) => {
            const locationName = record.get("locationName") || "Unknown Location";
            const coordinates = record.get("coordinates");
            const imageData = record.get("imageData");

            if (!coordinates) return;
        
            const [latitude, longitude] = coordinates;
        
            const marker = L.marker([latitude, longitude], { icon: customIcon });
        
            // Change to hover icon on mouseover
            marker.on("mouseover", () => {
                marker.setIcon(hoverIcon);
            });
        
            // Revert to default icon on mouseout
            marker.on("mouseout", () => {
                marker.setIcon(customIcon);
            });
        
            // Add popup and click behavior
            marker.bindPopup(`
                <div style="text-align: center;">
                    <h3>${locationName}</h3>
                </div>
            `);
        
            marker.on("click", () => {
                map.flyTo([latitude, longitude], 15, { duration: 1.5 });
                showImagePopup(imageData, locationName);
            });
        
            marker.addTo(map);
        });
        
    } catch (error) {
        console.error("Error fetching locations:", error);
    }
}

fetchLocations();

window.addEventListener("beforeunload", () => {
    driver.close();
});

// 1. SETTINGS & MULTIPLE POI DATA
const soundZones = [
    {
        name: "Spot 1 (EMF)",
        lat: 52.089268,
        lng: 5.130624,
        radius: 20,
        audioFile: 'Nature noise - Echoes - EMF.mp3'
    },
    {
        name: "Spot 2 (PIEP)",
        lat: 52.090111,
        lng: 5.131919,
        radius: 20,
        audioFile: 'Nature noise - Echoes - PIEP.mp3'
    },
    {
        name: "Spot 3 (WATERLEIDING)",
        lat: 52.090944,
        lng: 5.133195,
        radius: 20,
        audioFile: 'Nature noise - Echoes - WATERLEIDING.mp3'
    }
];

// 2. INITIALIZE MAP
// Start view at Spot 1
const map = L.map('map').setView([soundZones[0].lat, soundZones[0].lng], 16);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

const centerDisplay = document.getElementById('center-coords');

// Function to update the coordinate readout based on the crosshair (map center)
function updateCenterCoords() {
    const center = map.getCenter();
    if (center) {
        centerDisplay.innerText = `Center: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
    }
}

// Listen for map movement (constant update + final stop update)
map.on('move', updateCenterCoords);
map.on('moveend', updateCenterCoords);
// Initial call to ensure it's not 0 on load
map.whenReady(updateCenterCoords);

// The User's GPS Dot
const userMarker = L.circleMarker([0, 0], { radius: 8, color: 'red', zIndexOffset: 1000 }).addTo(map);

// 3. PREPARE ZONES (Audio & Visuals)
soundZones.forEach(zone => {
    // Add visual circle
    L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color: '#3498db',
        fillOpacity: 0.2
    }).addTo(map).bindPopup(zone.name);

    // Initialize Howl for each zone
    zone.howl = new Howl({
        src: [zone.audioFile],
        loop: true,
        volume: 0,
        html5: true 
    });
});

// 4. START BUTTON LOGIC
document.getElementById('start-btn').addEventListener('click', function() {
    this.style.display = 'none';
    document.getElementById('status').innerText = "Walk into a blue circle...";
    
    if (Howler.ctx.state === 'suspended') {
        Howler.ctx.resume();
    }

    startTracking();
});

// 5. GPS TRACKING ENGINE
function startTracking() {
    navigator.geolocation.watchPosition((pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;

        // Update the red dot location
        userMarker.setLatLng([uLat, uLng]);

        const userPoint = turf.point([uLng, uLat]);
        let activeZoneName = "No zone detected...";

        soundZones.forEach(zone => {
            const poiPoint = turf.point([zone.lng, zone.lat]);
            const distance = turf.distance(userPoint, poiPoint, {units: 'meters'});

            if (distance <= zone.radius) {
                if (!zone.howl.playing()) zone.howl.play();
                zone.howl.fade(zone.howl.volume(), 1.0, 2000); 
                activeZoneName = `Playing: ${zone.name}`;
            } else {
                zone.howl.fade(zone.howl.volume(), 0, 2000);
                // Optional: Pause after fade to save juice
                if (zone.howl.volume() === 0 && zone.howl.playing()) {
                    zone.howl.pause();
                }
            }
        });

        document.getElementById('status').innerText = activeZoneName;

    }, (err) => {
        console.error("GPS Error:", err);
        document.getElementById('status').innerText = "GPS Error. Check your settings.";
    }, { 
        enableHighAccuracy: true, 
        maximumAge: 0 
    });
}

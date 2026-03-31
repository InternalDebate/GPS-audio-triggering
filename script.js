// 1. SETTINGS & MULTIPLE POI DATA
const soundZones = [
    {
        name: "Spot 1",
        lat: 52.089268,
        lng: 5.130624,
        radius: 20,
        audioFile: 'Nature noise - Echoes - EMF.mp3',
        howl: null // This will hold the audio object
    },
    {
        name: "Spot 2",
        lat: 52.090111, // Example coordinate - change these!
        lng: 5.131919,
        radius: 20,
        audioFile: 'Nature noise - Echoes - PIEP.mp3',
        howl: null
    },
    {
        name: "Spot 3",
        lat: 52.090944, // Example coordinate - change these!
        lng: 5.133195,
        radius: 20,
        audioFile: 'Nature noise - Echoes - WATERLEIDING.mp3',
        howl: null
    }
    // You can add as many { } blocks here as you like!
];

// 2. INITIALIZE MAP
// Set the initial view to the first zone in your list
const map = L.map('map').setView([soundZones[0].lat, soundZones[0].lng], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// The User's Dot (starting at 0,0 until GPS kicks in)
const userMarker = L.circleMarker([0, 0], { radius: 8, color: 'red', zIndexOffset: 1000 }).addTo(map);

// 3. PREPARE ZONES (Audio & Visuals)
soundZones.forEach(zone => {
    // Add the visual circle to the map
    L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color: '#3498db',
        fillOpacity: 0.2
    }).addTo(map).bindPopup(zone.name);

    // Initialize Howl for each zone
    zone.howl = new Howl({
        src: [zone.file || zone.audioFile], // Checks both naming conventions
        loop: true,
        volume: 0,
        html5: true // Better for mobile battery and larger files
    });
});

// 4. START BUTTON LOGIC
document.getElementById('start-btn').addEventListener('click', function() {
    this.style.display = 'none';
    document.getElementById('status').innerText = "Walk into a blue circle to hear the sound...";
    
    // Resume AudioContext (Required by browsers)
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

        // Create a Turf point for the user
        const userPoint = turf.point([uLng, uLat]);

        let activeZoneName = "Looking for zones...";

        // LOOP THROUGH ALL ZONES
        soundZones.forEach(zone => {
            const poiPoint = turf.point([zone.lng, zone.lat]);
            const distance = turf.distance(userPoint, poiPoint, {units: 'meters'});

            if (distance <= zone.radius) {
                // USER IS INSIDE THIS ZONE
                if (!zone.howl.playing()) zone.howl.play();
                zone.howl.fade(zone.howl.volume(), 1.0, 2000); 
                activeZoneName = `In Zone: ${zone.name}`;
            } else {
                // USER IS OUTSIDE THIS ZONE
                // Fade out; Howler will keep the file ready but silent
                zone.howl.fade(zone.howl.volume(), 0, 2000);
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

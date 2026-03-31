// 1. SETTINGS & POI DATA
// Find these coords on Google Maps (Right-click a spot > Copy coordinates)
const poiSettings = {
    lat: 51.505, 
    lng: -0.09, 
    radiusInMeters: 30,
    audioFile: 'Nature noise - Echoes - EMF.mp3' // Make sure this is in your folder!
};

// 2. INITIALIZE MAP & AUDIO
const map = L.map('map').setView([poiSettings.lat, poiSettings.lng], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Add the visual "Zone" to the map
L.circle([poiSettings.lat, poiSettings.lng], {
    radius: poiSettings.radiusInMeters,
    color: '#3498db',
    fillOpacity: 0.2
}).addTo(map);

// The User's Dot
const userMarker = L.circleMarker([0, 0], { radius: 8, color: 'red' }).addTo(map);

// The Sound
const sound = new Howl({
    src: [poiSettings.audioFile],
    loop: true,
    volume: 0 // Start silent
});

// 3. START BUTTON LOGIC
document.getElementById('start-btn').addEventListener('click', function() {
    this.style.display = 'none';
    document.getElementById('status').innerText = "Walk toward the blue circle...";
    
    // Begin tracking
    startTracking();
});

// 4. GPS TRACKING ENGINE
function startTracking() {
    navigator.geolocation.watchPosition((pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;

        // Update Map
        userMarker.setLatLng([uLat, uLng]);
        map.panTo([uLat, uLng]);

        // SPATIAL LOGIC WITH TURF.JS
        const userPoint = turf.point([uLng, uLat]);
        const poiPoint = turf.point([poiSettings.lng, poiSettings.lat]);
        const distance = turf.distance(userPoint, poiPoint, {units: 'meters'});

        // AUDIO TRIGGER
        if (distance <= poiSettings.radiusInMeters) {
            if (!sound.playing()) sound.play();
            sound.fade(sound.volume(), 1.0, 2000); // Fade in over 2 seconds
            document.getElementById('status').innerText = "Now Playing: Zone Audio";
        } else {
            sound.fade(sound.volume(), 0, 2000); // Fade out
            document.getElementById('status').innerText = "Outside Zone";
        }
    }, (err) => console.error(err), { 
        enableHighAccuracy: true, 
        maximumAge: 0 
    });
}

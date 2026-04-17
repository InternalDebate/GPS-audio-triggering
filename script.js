// --- 0. GLOBALS & VIRTUAL CONSOLE ---
const VERSION = 'v0.108';
let closestZone = null;
let smoothLat = 0;
let smoothLng = 0;
const smoothingFactor = 0.15;
let experienceStarted = false;

const logContainer = document.getElementById('log-container');
const oldLog = console.log;
console.log = function (...args) {
    oldLog.apply(console, args);
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerText = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    if (logContainer) {
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
};

// --- 1. DATA ---
const soundZones = [
    { name: "maliebaan 1", lat: 52.088679, lng: 5.129786, radius: 10, audioFile: 'Nature noise - EMF 1.mp3' },
    { name: "maliebaan 13", lat: 52.089120, lng: 5.130747, radius: 10, audioFile: 'Nature noise - EMF 2.mp3' },
    { name: "electriciteitskast", lat: 52.089430, lng: 5.130836, radius: 7, audioFile: 'Nature noise - EMF 3' },
    { name: "maliebaan 14", lat: 52.090412, lng: 5.131557, radius: 5, audioFile: 'Nature noise - EMF 4 - phones & chips.mp3' },
    { name: "maliebaan 143 charging station", lat: 52.093790, lng: 5.137581, radius: 7, audioFile: 'Nature noise - EMF 4 - phones & chips.mp3' },
    { name: "maliebaan vrijmetselaarsloge", lat: 52.093349, lng: 5.135959, radius: 12, audioFile: 'Nature noise - EMF 6 - headphone conus.mp3' },
    { name: "maliebaan 24 charging station", lat: 52.090992, lng: 5.132597, radius: 10, audioFile: 'Nature noise - EMF 5.mp3' },
    { name: "maliebaan voorbijgaande auto's", lat: 52.089994, lng: 5.131597, radius: 20, audioFile: 'Nature noise - EMF 7 - Autos.mp3' },
    { name: "maliebaan duif", lat: 52.091572, lng: 5.133955, radius: 20, audioFile: 'Nature noise - Vogel - Duif.mp3' },
    { name: "maliebaan mus", lat: 52.089168, lng: 5.129830, radius: 20, audioFile: 'Nature noise - Vogel - mus.mp3' },
];

// --- 2. MAP SETUP ---
const map = L.map('map').setView([soundZones[0].lat, soundZones[0].lng], 16);

// Create tile layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri'
});

// Add default layer
osmLayer.addTo(map);

let isSatellite = false;

// Toggle satellite view
document.getElementById('toggle-satellite').addEventListener('click', () => {
    if (isSatellite) {
        map.removeLayer(satelliteLayer);
        map.addLayer(osmLayer);
    } else {
        map.removeLayer(osmLayer);
        map.addLayer(satelliteLayer);
    }
    isSatellite = !isSatellite;
});

// Set header with version
document.getElementById('header-h1').innerText = `Ghosts of the Maliebaan (${VERSION})`;

document.getElementById('center-coords').innerText = `Center: ${map.getCenter().lat.toFixed(6)}, ${map.getCenter().lng.toFixed(6)}`;

const userNeedleIcon = L.divIcon({
    className: 'user-needle-container',
    html: '<div id="user-needle"></div>',
    iconSize: [20, 30],
    iconAnchor: [10, 13]
});

const userMarker = L.marker([0, 0], { icon: userNeedleIcon }).addTo(map);

// --- 3. AUDIO PREP ---
soundZones.forEach(zone => {
    L.circle([zone.lat, zone.lng], { radius: zone.radius, color: '#3498db' }).addTo(map);
    zone.howl = new Howl({
        src: [zone.audioFile],
        loop: true,
        volume: 0,
        html5: false,
        preload: true
    });
    zone.isInside = false;
});

// --- 4. GUIDANCE ENGINE ---
function updateGuidance(uLat, uLng) {
    if (!uLat || uLat === 0) return;
    const userPoint = turf.point([uLng, uLat]);

    //are we currently inside a zone ???
    let currentOccupiedZone = null;   
    let minDistance = Infinity;
    let targetZone = null; 
    
    soundZones.forEach(zone => {
        const zonePoint = turf.point([zone.lng, zone.lat]);
        const d = turf.distance(userPoint, zonePoint, { units: 'meters' });
        
        // Check if inside any zone
        if (d <= zone.radius) {
            currentOccupiedZone = zone;
        }
        
        if (d < minDistance) {
            minDistance = d;
            targetZone = zone;
        }
    });

    
        soundZones.forEach(zone => {
            //skip current zone
        if (currentOccupiedZone && zone === currentOccupiedZone) return;
            
        const zonePoint = turf.point([zone.lng, zone.lat]);
        const d = turf.distance(userPoint, zonePoint, { units: 'meters' });
        if (d < minDistance) {
            minDistance = d;
            targetZone = zone;
        }
    });
    
    closestZone = targetZone || soundZones[0];

    // B. Audio Trigger Logic
    let activeName = currentOccupiedZone ? `Playing: ${currentOccupiedZone.name}` : "No portal detected";
    
    soundZones.forEach(zone => {
        const poiPoint = turf.point([zone.lng, zone.lat]);
        const zDist = turf.distance(userPoint, poiPoint, { units: 'meters' });

        if (zDist <= zone.radius) {
            activeName = `Playing: ${zone.name}`;
            if (!zone.isInside) {
                zone.isInside = true;
                zone.howl.off('fade');
                zone.howl.volume(0);
                if (!zone.howl.playing()) zone.howl.play();
                zone.howl.fade(0, 1.0, 3000);
                console.log("Auto Fade-In:", zone.name);
            }
        } else {
            if (zone.isInside) {
                zone.isInside = false;
                zone.howl.off('fade');
                zone.howl.fade(zone.howl.volume(), 0, 5000);
                zone.howl.once('fade', () => {
                    if (!zone.isInside) {
                        zone.howl.pause();
                        zone.howl.volume(0);
                    }
                });
                console.log("Auto Fade-Out:", zone.name);
            }
        }
    });
    document.getElementById('status').innerText = activeName;
}

// --- 5. COMPASS LOGIC ---
let targetHeading = 0;
let currentHeading = 0;

function initCompass() {
    // Look for the needle element now living on the map
    const handleMotion = (e) => {
        let heading = e.webkitCompassHeading || e.alpha;
        if (heading !== null && heading !== undefined) {
            targetHeading = e.webkitCompassHeading ? heading : 360 - heading;
        }
    };

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(state => { if (state === 'granted') window.addEventListener('deviceorientation', handleMotion, true); })
            .catch(console.error);
    } else {
        window.addEventListener('deviceorientationabsolute', handleMotion, true);
    }

    function animate() {
        // Smooth rotation
        let diff = targetHeading - currentHeading;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        currentHeading += diff * 0.15;

        // TARGET THE NEEDLE ON THE MAP
        const needleElement = document.getElementById('user-needle');
        if (needleElement) {
            needleElement.style.transform = `rotate(${currentHeading}deg)`;
        }
        
        requestAnimationFrame(animate);
    }
    animate();
}

// --- 6. BUTTONS & UI EVENTS ---

// Manual Fade In
document.getElementById('manual-in').addEventListener('click', () => {
    if (!closestZone) return;
    console.log("Manual Fade-In Target:", closestZone.name);
    closestZone.isInside = true;
    closestZone.howl.off('fade');
    if (!closestZone.howl.playing()) {
        closestZone.howl.volume(0);
        closestZone.howl.play();
    }
    closestZone.howl.fade(closestZone.howl.volume(), 1.0, 3000);
});

// Manual Fade Out
document.getElementById('manual-out').addEventListener('click', () => {
    if (!closestZone) return;
    console.log("Manual Fade-Out Target:", closestZone.name);
    closestZone.isInside = false;
    closestZone.howl.off('fade');
    closestZone.howl.fade(closestZone.howl.volume(), 0, 5000);
    closestZone.howl.once('fade', () => {
        if (!closestZone.isInside) closestZone.howl.pause();
    });
});

// Start Button
document.getElementById('start-btn').addEventListener('click', function () {
    this.style.display = 'none';
    experienceStarted = true;

    // Force the browser to resume audio
    if (Howler.ctx.state === 'suspended') Howler.ctx.resume();

    // Initialize the compass
    initCompass();

    // IMPORTANT: Run guidance immediately so 'closestZone' is found right away
    const p = userMarker.getLatLng();
    if (p.lat !== 0) {
        updateGuidance(p.lat, p.lng);
    } else {
        // If GPS hasn't found you yet, use the first zone as a fallback for the buttons
        closestZone = soundZones[0];
        console.log("Waiting for GPS... Defaulting to Spot 1");
    }
});

// Toggle Debug
document.getElementById('toggle-console').addEventListener('click', () => {
    const consoleDiv = document.getElementById('debug-console');
    consoleDiv.style.display = consoleDiv.style.display === 'none' ? 'flex' : 'none';
});

// Locate User
document.getElementById('locate-btn').addEventListener('click', () => {
    const userPos = userMarker.getLatLng();
    if (userPos && userPos.lat !== 0) {
        map.setView([userPos.lat, userPos.lng], 18, { animate: true });
    }
});

// --- 7. GPS WATCHER ---
navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;

    if (smoothLat === 0) { smoothLat = latitude; smoothLng = longitude; }

    smoothLat += (latitude - smoothLat) * smoothingFactor;
    smoothLng += (longitude - smoothLng) * smoothingFactor;

    userMarker.setLatLng([smoothLat, smoothLng]);
    if (experienceStarted) updateGuidance(smoothLat, smoothLng);
}, err => console.error(err), { enableHighAccuracy: true });

// --- 8. MAP CENTER COORDINATES ---
map.on('move', function () {
    const center = map.getCenter();
    const lat = center.lat.toFixed(6);
    const lng = center.lng.toFixed(6);

    // Update the UI text
    document.getElementById('center-coords').innerText = `Center: ${lat}, ${lng}`;
});

function clearLog() { logContainer.innerHTML = ''; }

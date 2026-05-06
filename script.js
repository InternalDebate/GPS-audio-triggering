// --- 0. GLOBALS & VIRTUAL CONSOLE ---
const VERSION = 'v0.114.1';
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

// --- 1. ZONES AND DATA ---
const soundZones = [
    { name: "maliebaan 1", lat: 52.088679, lng: 5.129786, radius: 10, audioFile: 'Nature noise - EMF 1.mp3' },
    { name: "maliebaan 13", lat: 52.089120, lng: 5.130747, radius: 10, audioFile: 'Nature noise - EMF 2.mp3' },
    { name: "electriciteitskast", lat: 52.089430, lng: 5.130836, radius: 7, audioFile: 'Nature noise - EMF 3' },
    { name: "maliebaan 14", lat: 52.090412, lng: 5.131557, radius: 5, audioFile: 'Nature noise - EMF 4 - phones & chips.mp3' },
    { name: "maliebaan 143 charging station", lat: 52.093790, lng: 5.137581, radius: 7, audioFile: 'Nature noise - EMF 4 - phones & chips.mp3' },
    { name: "maliebaan vrijmetselaarsloge", lat: 52.093208, lng: 5.135714, radius: 12, audioFile: 'Nature noise - EMF 6 - headphone conus.mp3' },
    { name: "maliebaan 24 charging station", lat: 52.090992, lng: 5.132597, radius: 10, audioFile: 'Nature noise - EMF 5.mp3' },
    { name: "maliebaan voorbijgaande auto's", lat: 52.089994, lng: 5.131597, radius: 20, audioFile: 'Nature noise - EMF 7 - Autos.mp3' },
    { name: "maliebaan duif", lat: 52.091572, lng: 5.133955, radius: 20, audioFile: 'Nature noise - Vogel - Duif.mp3' },
    { name: "maliebaan mus", lat: 52.089168, lng: 5.129830, radius: 20, audioFile: 'Nature noise - Vogel - mus.mp3' },
    { name: "maliebaan brom", lat: 52.092356, lng: 5.135255, radius: 15, audioFile: 'Nature noise - EMF 8 - fan noise.mp3' },
    { name: "maliebaan 50", lat: 52.092397, lng: 5.134868, radius: 9, audioFile: 'Nature noise - EMF 9 - phone IR.mp3' },
    { name: "maliebaan eind thema", lat: 52.094434, lng: 5.137989, radius: 45, audioFile: 'Nature noise - Music - EMF 1.mp3' },
];

// --- 2. MAP SETUP ---
const map = L.map('map').setView([soundZones[0].lat, soundZones[0].lng], 16);

// Title layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri'
});

// default layer
osmLayer.addTo(map);

let isSatellite = false;

// Sattelite view toggle
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

// HEADER & VERSION
document.getElementById('header-h1').innerText = `Ghosts of the Maliebaan (${VERSION})`;

document.getElementById('center-coords').innerText = `coordinates: ${map.getCenter().lat.toFixed(6)}, ${map.getCenter().lng.toFixed(6)}`;

// Create user marker with circle and orientation line as single SVG icon
const userIcon = L.divIcon({
    className: 'user-marker',
    html: `<svg class="user-marker-svg" width="50" height="50" viewBox="0 0 50 50" style="filter: drop-shadow(0 0 2px rgba(0,0,0,0.3)); display: block; margin: 0; padding: 0;">
        <circle cx="25" cy="25" r="12" fill="white" stroke="darkred" stroke-width="2" opacity="0.7"/>
        <line x1="25" y1="6" x2="25" y2="24" stroke="darkred" stroke-width="2" opacity="0.8"/>
    </svg>`,
    iconSize: [50, 50],
    iconAnchor: [25, 25]
});

const userMarker = L.marker([0, 0], { icon: userIcon }).addTo(map);

const panel = document.getElementById('right-panel');
let isDragging = false;
let startX, startY, startLeft, startTop;

// TOUCH
panel.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startLeft = panel.offsetLeft;
    startTop = panel.offsetTop;
});

panel.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    panel.style.left = startLeft + dx + 'px';
    panel.style.top = startTop + dy + 'px';
    panel.style.right = 'auto';
});

panel.addEventListener('touchend', () => isDragging = false);

// MOUSE
panel.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = panel.offsetLeft;
    startTop = panel.offsetTop;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = startLeft + dx + 'px';
    panel.style.top = startTop + dy + 'px';
    panel.style.right = 'auto';
});

document.addEventListener('mouseup', () => isDragging = false);

panel.addEventListener('touchend', () => {
    isDragging = false;
});

// --- 3. AUDIO PREPARATION ---
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

    //CHECKING FOR CURRENT ZONE & FINDING CLOSEST ZONE
    let currentOccupiedZone = null;
    // 
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

        //skip currently occupied zone when finding next closest zone, so we target the correct zone after this one.
        soundZones.forEach(zone => {

        if (currentOccupiedZone && zone === currentOccupiedZone) return;
            
        const zonePoint = turf.point([zone.lng, zone.lat]);
        const d = turf.distance(userPoint, zonePoint, { units: 'meters' });
        if (d < minDistance) {
            minDistance = d;
            targetZone = zone;
        }
    });
    
    closestZone = targetZone || soundZones[0];

    // AUDIO TRIGGER LOGIC
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
    const handleMotion = (e) => {
        let heading = e.webkitCompassHeading || e.alpha;
        if (heading !== null && heading !== undefined) {
            targetHeading = e.webkitCompassHeading ? heading : 360 - heading;
        }
    };
    // For iOS 13+ devices, we need to request permission to access device orientation
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

        // Rotate only the SVG inside the marker
        const svgElement = document.querySelector('.user-marker-svg');
        if (svgElement) {
            svgElement.style.transformOrigin = 'center center';
            svgElement.style.transform = `rotate(${currentHeading}deg)`;
        }
    
        requestAnimationFrame(animate);
    }
    animate();
}

// --- 6. BUTTONS & UI EVENTS ---

// Start Button
document.getElementById('start-btn').addEventListener('click', function () {
    this.style.display = 'none';
    experienceStarted = true;

    // Force the browser to resume audio
    if (Howler.ctx.state === 'suspended') Howler.ctx.resume();

    // Initialize the compass
    initCompass();

    //Run guidance immediately so 'closestZone' is found right away
    const p = userMarker.getLatLng();
    if (p.lat !== 0) {
        updateGuidance(p.lat, p.lng);
    } else {
        // If GPS hasn't found user yet, use the first zone as a fallback for the buttons
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

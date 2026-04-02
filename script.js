// --- GLOBALS & DATA ---
let closestZone = null; 
let smoothLat = 0;
let smoothLng = 0;
const smoothingFactor = 0.15; 
let experienceStarted = false;

const soundZones = [
    { name: "Spot 1", lat: 52.089268, lng: 5.130624, radius: 20, audioFile: 'Nature noise - Echoes - EMF.mp3' },
    { name: "Spot 2", lat: 52.090111, lng: 5.131919, radius: 20, audioFile: 'Nature noise - Echoes - PIEP.mp3' },
    { name: "Spot 3", lat: 52.090944, lng: 5.133195, radius: 20, audioFile: 'Nature noise - Echoes - WATERLEIDING.mp3' },
    { name: "Spot 4", lat: 51.5841, lng: 4.7753, radius: 10, audioFile: 'Nature noise - Echoes - DUIF.mp3' },
    { name: "Spot 5", lat: 51.5842, lng: 4.7751, radius: 10, audioFile: 'Nature noise - Echoes - EMF.mp3' },
];

// --- VIRTUAL CONSOLE ---
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

// --- MAP SETUP ---
const map = L.map('map').setView([soundZones[0].lat, soundZones[0].lng], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const userMarker = L.circleMarker([0, 0], { radius: 8, color: 'red' }).addTo(map);
const satelliteMarker = L.divIcon({ className: 'radar-dot', iconSize: [12, 12] });
const radarMarker = L.marker([0, 0], { icon: satelliteMarker, interactive: false }).addTo(map);

// --- AUDIO PREP ---
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

// --- GUIDANCE ENGINE ---
function updateGuidance(uLat, uLng) {
    if (!uLat || uLat === 0) return;

    const userPoint = turf.point([uLng, uLat]);
    
    // 1. Find Closest Zone
    let minDist = Infinity;
    soundZones.forEach(zone => {
        const zonePoint = turf.point([zone.lng, zone.lat]);
        const d = turf.distance(userPoint, zonePoint, {units: 'meters'});
        if (d < minDist) {
            minDist = d;
            closestZone = zone; 
        }
    });

    // 2. Radar/Triangle Logic
    radarMarker.setLatLng([uLat, uLng]);
    const angleToZone = turf.bearing(userPoint, turf.point([closestZone.lng, closestZone.lat]));
    const triangleElement = document.querySelector('.radar-triangle');
    if (triangleElement) {
        triangleElement.style.transform = `rotate(${angleToZone}deg) translateY(-25px)`;
    }

    // 3. Audio Logic
    let activeName = "No zone detected...";
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
                console.log("Fade In started:", zone.name);
            }
        } else {
            if (zone.isInside) {
                zone.isInside = false;
                zone.howl.off('fade');
                const currentVol = zone.howl.volume();
                zone.howl.fade(currentVol, 0, 5000);
                zone.howl.once('fade', () => {
                    if (!zone.isInside) {
                        zone.howl.pause();
                        zone.howl.volume(0);
                        console.log("Audio paused:", zone.name);
                    }
                });
            }
        }
    });
    document.getElementById('status').innerText = activeName;
}

// --- BUTTONS & EVENTS ---

document.getElementById('start-btn').addEventListener('click', function () {
    this.style.display = 'none';
    experienceStarted = true;
    if (Howler.ctx.state === 'suspended') Howler.ctx.resume();
    if (typeof initCompass === "function") initCompass();
    const p = userMarker.getLatLng();
    if (p.lat !== 0) updateGuidance(p.lat, p.lng);
});

document.getElementById('manual-in').addEventListener('click', () => {
    if (!closestZone) return;
    console.log("MANUAL: Fading in", closestZone.name);
    closestZone.isInside = true;
    closestZone.howl.off('fade');
    if (!closestZone.howl.playing()) {
        closestZone.howl.volume(0);
        closestZone.howl.play();
    }
    closestZone.howl.fade(closestZone.howl.volume(), 1.0, 3000);
});

document.getElementById('manual-out').addEventListener('click', () => {
    if (!closestZone) return;
    console.log("MANUAL: Fading out", closestZone.name);
    closestZone.isInside = false;
    closestZone.howl.off('fade');
    closestZone.howl.fade(closestZone.howl.volume(), 0, 5000);
    closestZone.howl.once('fade', () => {
        if (!closestZone.isInside) closestZone.howl.pause();
    });
});

// GPS Watcher
navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;
    if (smoothLat === 0) { smoothLat = latitude; smoothLng = longitude; }
    smoothLat += (latitude - smoothLat) * smoothingFactor;
    smoothLng += (longitude - smoothLng) * smoothingFactor;
    userMarker.setLatLng([smoothLat, smoothLng]);
    if (experienceStarted) updateGuidance(smoothLat, smoothLng);
}, err => console.error(err), { enableHighAccuracy: true });

// UI Helpers
document.getElementById('toggle-console').addEventListener('click', () => {
    const consoleDiv = document.getElementById('debug-console');
    consoleDiv.style.display = consoleDiv.style.display === 'none' ? 'flex' : 'none';
});

function clearLog() { logContainer.innerHTML = ''; }

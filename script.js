// --- 0. GLOBALS & VIRTUAL CONSOLE ---
const VERSION = 'v0.115';
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

//
const soundZones = [
    { name: "maliebaan 1", lat: 52.088679, lng: 5.129786, radius: 10, audioFile: 'Nature noise - EMF 1.mp3' },
    { name: "maliebaan 13", lat: 52.089120, lng: 5.130747, radius: 10, audioFile: 'Nature noise - EMF 2.mp3' },
    { name: "electriciteitskast", lat: 52.089430, lng: 5.130836, radius: 7, audioFile: 'Nature noise - EMF 3' },
    { name: "maliebaan 14", lat: 52.090412, lng: 5.131557, radius: 10, audioFile: 'Nature noise - EMF 4 - phones & chips.mp3' },
    { name: "maliebaan 143 charging station", lat: 52.093790, lng: 5.137581, radius: 7, audioFile: 'Nature noise - EMF 4 - phones & chips.mp3' },
    { name: "maliebaan vrijmetselaarsloge", lat: 52.093208, lng: 5.135714, radius: 12, audioFile: 'Nature noise - EMF 6 - headphone conus.mp3' },
    { name: "maliebaan 24 charging station", lat: 52.090992, lng: 5.132597, radius: 10, audioFile: 'Nature noise - EMF 5.mp3' },
    { name: "maliebaan voorbijgaande auto's", lat: 52.089994, lng: 5.131597, radius: 20, audioFile: 'Nature noise - EMF 7 - Autos.mp3' },
    { name: "maliebaan duif", lat: 52.090535, lng: 5.132390, radius: 20, audioFile: 'Nature noise - Vogel - Duif.mp3' },
    { name: "maliebaan mus", lat: 52.089168, lng: 5.129830, radius: 20, audioFile: 'Nature noise - Vogel - mus.mp3' },
    { name: "maliebaan brom", lat: 52.092592, lng: 5.135620, radius: 18, audioFile: 'Nature noise - EMF 8 - fan noise.mp3' },
    { name: "maliebaan 50", lat: 52.092397, lng: 5.134868, radius: 9, audioFile: 'Nature noise - EMF 9 - phone IR.mp3' },
    { name: "maliebaan music 1", lat: 52.094434, lng: 5.137989, radius: 45, audioFile: 'Nature noise - Music - EMF 1.mp3' },
    { name: "maliebaan music 2", lat: 52.093232, lng: 5.136602, radius: 27, audioFile: 'Nature noise - Music - EMF 2.mp3' },
    { name: "loop audio", lat: 52.091539, lng: 5.133758, radius: 60, audioFile: 'Nature noise - EMF 11 - phone loop.mp3' },
    { name: "loop bass", lat: 52.091723, lng: 5.133800, radius: 36, audioFile: 'Nature noise - EMF 13 - Bass loop.mp3' },
    { name: "loop chord", lat: 52.091454, lng: 5.133863, radius: 36, audioFile: 'Nature noise - EMF 12 - car synth loop.mp3' },
    { name: "loop arp", lat: 52.091784, lng: 5.134224, radius: 36, audioFile: 'Nature noise - EMF 14 - arp loop 1.mp3' },

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
//<!-- License: CC Attribution. Made by game-icons.net: https://game-icons.net --> <!-- License: PD. Made by linea-io: https://github.com/linea-io/Linea-Iconset -->
const satelliteIcon = ` <svg viewBox="0 0 512 512" width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="currentColor"><path d="M314.125 45.125l-36.28 10.97 26.717 38.874L340.844 84l-26.72-38.875zM260.47 61.313l-43 13 26.686 38.874 41.625-12.562-26.467-38.5 1.156-.813zm91.467 38.874l-36.28 10.938 27.374 39.813L379.314 140l-27.375-39.813zM120.47 107.78l-36.282 10.94 26.718 38.905 36.28-10.97-26.717-38.874zm176.405 9.032l-41.594 12.563 12.814 18.656c13.59 1.764 26.138 6.878 36.844 14.44l19.312-5.845-27.375-39.813zm-230.03 7.157l-43 12.968 26.718 38.906 41.562-12.563-26.47-38.5 1.19-.81zm323.56 32.155l-36.28 10.97 25.97 37.81 36.28-10.936-25.97-37.845zm-232.092 6.72L122 173.78l27.375 39.814 36.28-10.938-27.343-39.812zm99.125 3.186c-22.736 0-42.626 11.753-53.97 29.532l66.782 97.188c6.682-1.346 12.98-3.725 18.72-6.97l7.874 11.69 15.78-10.033-8.874-13.187c10.95-11.475 17.656-27.028 17.656-44.22 0-35.446-28.52-64-63.97-64zm77.906 6.75l-14.438 4.345c9.396 11.262 15.84 25.07 18.188 40.188l22.22-6.72-25.97-37.812zm-232.125 6.69L61.655 192l27.313 39.813 41.593-12.563-27.344-39.78zm324.28 30.655l-36.28 10.97 27.342 39.81 36.313-10.967-27.375-39.813zm-230.72 8.688l-36.31 10.968 25.968 37.782 36.312-10.968-25.97-37.78zm175.657 7.937l-32.625 9.875c-.35 4.407-1.012 8.72-2.03 12.906l20.312 29.595 41.687-12.563-27.342-39.812zm-230.75 8.688L100.094 248l25.97 37.813 41.592-12.594-25.97-37.783zm324.282 30.656l-36.314 10.97 26 37.81 36.313-10.937-26-37.843zm-232.095 6.687l-36.313 10.97 27.344 39.78 36.313-10.967-27.345-39.782zm177.03 9.94L369.22 295.31l25.967 37.813 41.688-12.563-25.97-37.843zm-232.124 6.686l-41.624 12.563 27.313 39.81 41.655-12.592-27.344-39.782zm152.314 8.47L301.78 316.5l37.314 58.656 29.312-18.625-37.312-58.655zm-58.75 30.874l-36.313 10.97 26 37.81 36.314-10.936-26-37.844zm-55.094 16.625l-41.656 12.594 25.97 37.81 41.655-12.56-25.97-37.845zm178.313 20.875c-36.29.507-64.44 29.054-70.375 64.844L368.5 404l9.72 14.406c-1.222 2.47-1.908 5.245-1.908 8.188 0 10.222 8.278 18.53 18.5 18.53 10.223 0 18.5-8.308 18.5-18.53 0-10.223-8.277-18.5-18.5-18.5-.335 0-.67.045-1 .062l-9.437-14.062 37.438-23.438c-9.068-3.125-17.876-4.523-26.25-4.406z"/></svg>`;
const mapIcon = `<svg viewBox="0 0 64 64" width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-miterlimit="10"><polygon points="1,59 22,51 42,59 63,51 63,5 42,13 22,5 1,13"/><line x1="22" y1="5" x2="22" y2="51"/><line x1="42" y1="13" x2="42" y2="59"/></svg>`;
document.getElementById('toggle-satellite').innerHTML = satelliteIcon;

// Sattelite view toggle
// document.getElementById('toggle-satellite').addEventListener('click', () => {
//     if (isSatellite) {
//         map.removeLayer(satelliteLayer);
//         map.addLayer(osmLayer);
//     } else {
//         map.removeLayer(osmLayer);
//         map.addLayer(satelliteLayer);
//     }
//     isSatellite = !isSatellite;
// });
document.getElementById('toggle-satellite').addEventListener('click', () => {
    if (isSatellite) {
        map.removeLayer(satelliteLayer);
        map.addLayer(osmLayer);
        document.getElementById('toggle-satellite').innerHTML = satelliteIcon;
    } else {
        map.removeLayer(osmLayer);
        map.addLayer(satelliteLayer);
        document.getElementById('toggle-satellite').innerHTML = mapIcon;
    }
    isSatellite = !isSatellite;
});

// HEADER & VERSION
document.getElementById('header-h1').innerText = `Ghosts of the Maliebaan (${VERSION})`;

//document.getElementById('center-coords').innerText = `Coordinates: ${map.getCenter().lat.toFixed(6)}, ${map.getCenter().lng.toFixed(6)}`;

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

const draggablePanels = document.querySelectorAll('#right-panel, #header-title');

draggablePanels.forEach(panel => {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    // TOUCH
    panel.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startLeft = panel.offsetLeft;
        startTop = panel.offsetTop;
    }, { passive: false });

    panel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        panel.style.left = startLeft + dx + 'px';
        panel.style.top = startTop + dy + 'px';
        panel.style.right = 'auto';
    }, { passive: false });

    panel.addEventListener('touchend', (e) => {
        e.stopPropagation();
        isDragging = false;
    }, { passive: false });

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
// document.getElementById('start-btn').addEventListener('click', function () {
//     this.style.display = 'none';
//     experienceStarted = true;
document.getElementById('start-btn').addEventListener('click', function () {
    document.getElementById('safety-message').style.display = 'flex';
});

document.getElementById('safety-confirm-btn').addEventListener('click', function () {
    document.getElementById('safety-message').style.display = 'none';
    document.getElementById('start-btn').style.display = 'none';
    experienceStarted = true;

    if (Howler.ctx.state === 'suspended') Howler.ctx.resume();
    initCompass();

    const p = userMarker.getLatLng();
    if (p.lat !== 0) {
        updateGuidance(p.lat, p.lng);
    } else {
        closestZone = soundZones[0];
        console.log("Waiting for GPS... Defaulting to Spot 1");
    }
});

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

    // Test Audio Button

    document.getElementById('test-audio-btn').addEventListener('click', () => {
    const center = map.getCenter();
    const centerPoint = turf.point([center.lng, center.lat]);

    soundZones.forEach(zone => {
        const zonePoint = turf.point([zone.lng, zone.lat]);
        const d = turf.distance(centerPoint, zonePoint, { units: 'meters' });
        if (d <= zone.radius) {
            zone.howl.off('fade');
            zone.howl.volume(0);
            if (!zone.howl.playing()) zone.howl.play();
            zone.howl.fade(0, 1.0, 1000);
            setTimeout(() => {
                zone.howl.fade(zone.howl.volume(), 0, 1500);
                zone.howl.once('fade', () => {
                    if (!zone.isInside) {
                        zone.howl.pause();
                        zone.howl.volume(0);
                    }
                });
            }, 3000);
            console.log("Test audio:", zone.name);
        }
    });
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
    document.getElementById('center-coords').innerText = `Coordinates: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;

    const centerPoint = turf.point([center.lng, center.lat]);
    const insideZones = [];

    soundZones.forEach(zone => {
        const zonePoint = turf.point([zone.lng, zone.lat]);
        const d = turf.distance(centerPoint, zonePoint, { units: 'meters' });
        if (d <= zone.radius) insideZones.push(zone.name);
    });

    document.getElementById('pointing-at').innerText = insideZones.length > 0
        ? `pointing at:
         ${insideZones.join(', ')}`
        : `pointing at:
         nothing`;
});

function clearLog() { logContainer.innerHTML = ''; }

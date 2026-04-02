// --- VIRTUAL CONSOLE LOGIC ---
const logContainer = document.getElementById('log-container');

// Intercept standard console.log
const oldLog = console.log;
console.log = function(...args) {
    oldLog.apply(console, args); // Keep original console behavior
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerText = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : arg
    ).join(' ');
    
    if (logContainer) {
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight; // Auto-scroll to bottom
    }
};

// Toggle Visibility
document.getElementById('toggle-console').addEventListener('click', () => {
    const consoleDiv = document.getElementById('debug-console');
    consoleDiv.style.display = consoleDiv.style.display === 'none' ? 'flex' : 'none';
});

// Clear Log Function
function clearLog() {
    logContainer.innerHTML = '';
}

// 1. DATA
const soundZones = [
    { name: "Spot 1", lat: 52.089268, lng: 5.130624, radius: 20, audioFile: 'Nature noise - Echoes - EMF.mp3' },
    { name: "Spot 2", lat: 52.090111, lng: 5.131919, radius: 20, audioFile: 'Nature noise - Echoes - PIEP.mp3' },
    { name: "Spot 3", lat: 52.090944, lng: 5.133195, radius: 20, audioFile: 'Nature noise - Echoes - WATERLEIDING.mp3' },
    { name: "Spot 4", lat: 51.5841, lng: 4.7753, radius: 10, audioFile: 'Nature noise - Echoes - DUIF.mp3' },
    { name: "Spot 5", lat: 51.5842, lng: 4.7751, radius: 10, audioFile: 'Nature noise - Echoes - EMF.mp3' },

];

let smoothLat = 0;
let smoothLng = 0;
const smoothingFactor = 0.15; // 1.0 is instant, 0.01 is very slow/smooth. 0.15 is a sweet spot.

// 2. MAP SETUP
const map = L.map('map').setView([soundZones[0].lat, soundZones[0].lng], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const userMarker = L.circleMarker([0, 0], { radius: 8, color: 'red' }).addTo(map);

// --- blue radar dot that orbits the user ---
const satelliteMarker = L.divIcon({ className: 'radar-dot', iconSize: [12, 12] });
const radarMarker = L.marker([0, 0], { icon: satelliteMarker, interactive: false }).addTo(map);

// 3. AUDIO PREP (Updated for Web Audio)
soundZones.forEach(zone => {
    L.circle([zone.lat, zone.lng], { radius: zone.radius, color: '#3498db' }).addTo(map);
    zone.howl = new Howl({ 
        src: [zone.audioFile], 
        loop: true, 
        volume: 0, 
        html5: false, // Changed to false for better mobile fading
        preload: true
    });
    zone.isInside = false;
});

// 4. GUIDANCE ENGINE
function updateGuidance(uLat, uLng) {
    if (!uLat || uLat === 0) return;

    // Convert coordinates to Turf point for distance calculations
    const userPoint = turf.point([uLng, uLat]);

    // --- 1. RADAR LOGIC (Triangle) ---
    let closestZone = soundZones[0];
    let minDistance = Infinity;

    // Scan all zones to find the nearest one
    soundZones.forEach(zone => {
        const zonePoint = turf.point([zone.lng, zone.lat]);
        const d = turf.distance(userPoint, zonePoint, {units: 'meters'});
        if (d < minDistance) {
            minDistance = d;
            closestZone = zone;
        }
    });

    // Move the radar marker to the user's current position
    radarMarker.setLatLng([uLat, uLng]);

    // Calculate angle to the closest zone and rotate the CSS triangle
    const angleToZone = turf.bearing(userPoint, turf.point([closestZone.lng, closestZone.lat]));
    const triangleElement = document.querySelector('.radar-triangle');
    if (triangleElement) {
        // Rotates the triangle and keeps it offset slightly from the red dot
        triangleElement.style.transform = `rotate(${angleToZone}deg) translateY(-25px)`;
    }

    // --- 2. AUDIO TRIGGER LOGIC (Accurate Fades) ---
    let activeName = "No zone detected...";

    soundZones.forEach(zone => {
        const poiPoint = turf.point([zone.lng, zone.lat]);
        const zDist = turf.distance(userPoint, poiPoint, {units: 'meters'});

        if (zDist <= zone.radius) {
            // --- USER IS INSIDE THE ZONE ---
            activeName = `Playing: ${zone.name}`;
            
            // GATEKEEPER: Only trigger if we weren't already inside (prevents jitter resets)
            if (!zone.isInside) {
                zone.isInside = true; // LOCK the state
                
                // 1. Cancel any pending fade-outs
                zone.howl.off('fade'); 
                
                // 2. Start playing if it's currently stopped/paused
                if (!zone.howl.playing()) zone.howl.play();
                
                // 3. Fade from current volume to 1.0 over 2 seconds
                zone.howl.fade(zone.howl.volume(), 1.0, 2000);
                console.log("Fade In Triggered for:", zone.name);
            }
        } else {
            // --- USER IS OUTSIDE THE ZONE ---
            
            // GATEKEEPER: Only trigger if we were previously inside
            if (zone.isInside) {
                zone.isInside = false; // UNLOCK the state
                
                // 1. Cancel any pending fade-ins
                zone.howl.off('fade'); 
                
                // 2. Fade from current volume down to 0 over 2 seconds
                zone.howl.fade(zone.howl.volume(), 0, 2000);
                console.log("Fade Out Triggered for:", zone.name);

                // 3. Cleanup: Once the fade hits zero, pause audio to save device resources
                zone.howl.once('fade', () => {
                    // Check volume again to ensure we don't pause if user ran back in during fade
                    if (!zone.isInside && zone.howl.volume() === 0) {
                        zone.howl.pause();
                        console.log("Audio Paused:", zone.name);
                    }
                });
            }
        }
    });

    // Update the UI status text
    document.getElementById('status').innerText = activeName;
}

// 5. COMPASS LOGIC
let targetHeading = 0;
let currentHeading = 0;

function initCompass() {
    const needleElement = document.getElementById('compass-needle');

    if (!needleElement) {
        console.error("Compass needle element missing!");
        return;
    }

    // 1. Setup the Listener
    const handleMotion = (e) => {
        // --- Try iOS property first, then Android absolute, then standard alpha ---
        let heading = e.webkitCompassHeading || e.alpha;

        if (e.absolute === false && e.webkitCompassHeading === undefined) {
            // --- If it's not absolute and not iOS, alpha might be relative (less useful) ---
            // --- but we'll use it as a last resort. ---
        }

        if (heading !== null && heading !== undefined) {
            // --- Android alpha is counter-clockwise, so we flip it ---
            targetHeading = e.webkitCompassHeading ? heading : 360 - heading;
        }
    };

    // 2. Request Sensor Access (iOS)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(state => {
                if (state === 'granted') {
                    window.addEventListener('deviceorientation', handleMotion, true);
                }
            })
            .catch(console.error);
    } else {
        // --- Android / Desktop ---
        window.addEventListener('deviceorientationabsolute', handleMotion, true);
        // --- Fallback for older devices ---
        window.addEventListener('deviceorientation', handleMotion, true);
    }

    // 3. The Animation Loop
    function animate() {
        let diff = targetHeading - currentHeading;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        currentHeading += diff * 0.15;

        // --- Apply rotation ---
        needleElement.style.transform = `translate(-50%, -50%) rotate(${currentHeading}deg)`;

        requestAnimationFrame(animate);
    }
    animate();
}
// 6. HELPERS & EVENTS
function getCompassDirection(b) {
    if (b >= -22.5 && b < 22.5) return 'North';
    if (b >= 22.5 && b < 67.5) return 'Northeast';
    if (b >= 67.5 && b < 112.5) return 'East';
    if (b >= 112.5 && b < 157.5) return 'Southeast';
    if (b >= 157.5 || b < -157.5) return 'South';
    if (b >= -157.5 && b < -112.5) return 'Southwest';
    if (b >= -112.5 && b < -67.5) return 'West';
    return 'Northwest';
}

// --- Global variable to check if experience started ---
let experienceStarted = false;

// --- Start GPS watching with Smoothing ---
const watchId = navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;

    // If this is the first time we get a signal, jump there immediately
    if (smoothLat === 0) {
        smoothLat = latitude;
        smoothLng = longitude;
    }

    // Instead of jumping, we "drift" toward the new coordinate
    // New Position = Old Position + (Difference * SmoothingFactor)
    smoothLat += (latitude - smoothLat) * smoothingFactor;
    smoothLng += (longitude - smoothLng) * smoothingFactor;

    userMarker.setLatLng([smoothLat, smoothLng]);

    if (experienceStarted) {
        updateGuidance(smoothLat, smoothLng);
    }
}, err => console.error(err), {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 5000
});
document.getElementById('start-btn').addEventListener('click', function () {
    this.style.display = 'none';
    experienceStarted = true;
    if (Howler.ctx.state === 'suspended') Howler.ctx.resume();
    initCompass();

    // --- Trigger one update immediately so it doesn't wait for next GPS move ---
    const p = userMarker.getLatLng();
    if (p.lat !== 0) updateGuidance(p.lat, p.lng);
});

map.on('move', () => {
    const p = userMarker.getLatLng();
    if (experienceStarted) updateGuidance(p.lat, p.lng);

    const c = map.getCenter();
    document.getElementById('center-coords').innerText = `Center: ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`;
});

// 7. LOCATE USER LOGIC 
document.getElementById('locate-btn').addEventListener('click', () => {
    const userPos = userMarker.getLatLng();

    // --- Log to console so you can debug on your phone (if using remote tools) ---
    console.log("Locate button pressed. Current marker pos:", userPos);

    // --- Check if the marker is actually valid ---
    if (userPos && (userPos.lat !== 0 || userPos.lng !== 0)) {
        // --- Use a simpler view jump if flyTo is being finicky ---
        map.setView([userPos.lat, userPos.lng], 18, {
            animate: true,
            pan: {
                duration: 1.2
            }
        });
    } else {
        // --- If the marker is still at 0,0, try one last direct GPS pull ---
        navigator.geolocation.getCurrentPosition(pos => {
            const freshPos = [pos.coords.latitude, pos.coords.longitude];
            userMarker.setLatLng(freshPos);
            map.setView(freshPos, 18, { animate: true });
        }, (err) => {
            alert("Location not found. Please ensure GPS is enabled and you've allowed permissions.");
        }, { enableHighAccuracy: true });
    }
});

// 1. DATA
const soundZones = [
    { name: "Spot 1", lat: 52.089268, lng: 5.130624, radius: 20, audioFile: 'Nature noise - Echoes - EMF.mp3' },
    { name: "Spot 2", lat: 52.090111, lng: 5.131919, radius: 20, audioFile: 'Nature noise - Echoes - PIEP.mp3' },
    { name: "Spot 3", lat: 52.090944, lng: 5.133195, radius: 20, audioFile: 'Nature noise - Echoes - WATERLEIDING.mp3' }
];

// 2. MAP SETUP
const map = L.map('map').setView([soundZones[0].lat, soundZones[0].lng], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const userMarker = L.circleMarker([0, 0], { radius: 8, color: 'red' }).addTo(map);

// 3. AUDIO PREP
soundZones.forEach(zone => {
    L.circle([zone.lat, zone.lng], { radius: zone.radius, color: '#3498db' }).addTo(map);
    zone.howl = new Howl({ src: [zone.audioFile], loop: true, volume: 0, html5: true });
});

// 4. GUIDANCE ENGINE
function updateGuidance(uLat, uLng) {
    const center = map.getCenter();
    const directionDisplay = document.getElementById('direction-hint');
    
    if (!uLat || uLat === 0) return;

    const userPoint = turf.point([uLng, uLat]);
    const centerPoint = turf.point([center.lng, center.lat]);

    // Distance & Direction to Crosshair
    const dist = turf.distance(userPoint, centerPoint, {units: 'meters'});
    const bearing = turf.rhumbBearing(userPoint, centerPoint);
    const dir = getCompassDirection(bearing);

    directionDisplay.innerText = `Crosshair is ${dir} (${Math.round(dist)}m)`;

    // Check Audio Zones
    let activeName = "No zone detected...";
    soundZones.forEach(zone => {
        const poiPoint = turf.point([zone.lng, zone.lat]);
        const zDist = turf.distance(userPoint, poiPoint, {units: 'meters'});
        if (zDist <= zone.radius) {
            if (!zone.howl.playing()) zone.howl.play();
            zone.howl.fade(zone.howl.volume(), 1.0, 1000);
            activeName = `Playing: ${zone.name}`;
        } else {
            zone.howl.fade(zone.howl.volume(), 0, 1000);
        }
    });
    document.getElementById('status').innerText = activeName;
}

// 5. COMPASS LOGIC
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
        // Try iOS property first, then Android absolute, then standard alpha
        let heading = e.webkitCompassHeading || e.alpha;
        
        if (e.absolute === false && e.webkitCompassHeading === undefined) {
            // If it's not absolute and not iOS, alpha might be relative (less useful)
            // but we'll use it as a last resort.
        }

        if (heading !== null && heading !== undefined) {
            // Android alpha is counter-clockwise, so we flip it
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
        // Android / Desktop
        window.addEventListener('deviceorientationabsolute', handleMotion, true);
        // Fallback for older devices
        window.addEventListener('deviceorientation', handleMotion, true);
    }

    // 3. The Animation Loop
    function animate() {
        let diff = targetHeading - currentHeading;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        currentHeading += diff * 0.15;

        // Apply rotation
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

document.getElementById('start-btn').addEventListener('click', function() {
    this.style.display = 'none';
    if (Howler.ctx.state === 'suspended') Howler.ctx.resume();
    initCompass();
    navigator.geolocation.watchPosition(pos => {
        userMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
        updateGuidance(pos.coords.latitude, pos.coords.longitude);
    }, null, {enableHighAccuracy: true});
});

map.on('move', () => {
    const p = userMarker.getLatLng();
    updateGuidance(p.lat, p.lng);
});

map.on('move', () => {
    const c = map.getCenter();
    document.getElementById('center-coords').innerText = `Center: ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`;
});

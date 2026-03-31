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
const map = L.map('map').setView([soundZones[0].lat, soundZones[0].lng], 16);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

const centerDisplay = document.getElementById('center-coords');
const pointer = document.getElementById('compass-pointer'); // For the visual compass

function updateCenterCoords() {
    const center = map.getCenter();
    if (center) {
        centerDisplay.innerText = `Center: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
    }
}

map.on('move', updateCenterCoords);
map.on('moveend', updateCenterCoords);
map.whenReady(updateCenterCoords);

const userMarker = L.circleMarker([0, 0], { radius: 8, color: 'red', zIndexOffset: 1000 }).addTo(map);

// 3. PREPARE ZONES
soundZones.forEach(zone => {
    L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color: '#3498db',
        fillOpacity: 0.2
    }).addTo(map).bindPopup(zone.name);

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
    initCompass(); // Integrated: Starts the magnetometer/gyroscope logic
});

// 5. GPS TRACKING ENGINE
function startTracking() {
    const directionDisplay = document.getElementById('direction-hint');

    navigator.geolocation.watchPosition((pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;

        userMarker.setLatLng([uLat, uLng]);
        const userPoint = turf.point([uLng, uLat]);
        let activeZoneName = "No zone detected...";
        
        let nearestZone = null;
        let shortestDistance = Infinity;

        soundZones.forEach(zone => {
            const poiPoint = turf.point([zone.lng, zone.lat]);
            const distance = turf.distance(userPoint, poiPoint, {units: 'meters'});

            if (distance <= zone.radius) {
                if (!zone.howl.playing()) zone.howl.play();
                zone.howl.fade(zone.howl.volume(), 1.0, 2000); 
                activeZoneName = `Playing: ${zone.name}`;
            } else {
                zone.howl.fade(zone.howl.volume(), 0, 2000);
                if (zone.howl.volume() === 0 && zone.howl.playing()) {
                    zone.howl.pause();
                }
            }

            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestZone = zone;
            }
        });

        if (nearestZone && directionDisplay) {
            if (shortestDistance <= nearestZone.radius) {
                directionDisplay.innerText = "You have arrived!";
            } else {
                const poiPoint = turf.point([nearestZone.lng, nearestZone.lat]);
                const bearing = turf.rhumbBearing(userPoint, poiPoint);
                const compassDir = getCompassDirection(bearing);
                directionDisplay.innerText = `Walk ${compassDir} to ${nearestZone.name} (${Math.round(shortestDistance)}m)`;
            }
        }

        document.getElementById('status').innerText = activeZoneName;

    }, (err) => {
        console.error("GPS Error:", err);
        document.getElementById('status').innerText = "GPS Error. Check your settings.";
    }, { 
        enableHighAccuracy: true, 
        maximumAge: 0 
    });
}

// 6. COMPASS/ORIENTATION LOGIC
function initCompass() {
    // Check for iOS 13+ permissions
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response == 'granted') {
                    window.addEventListener('deviceorientation', compassHandler, true);
                }
            })
            .catch(console.error);
    } else {
        // Android or older iOS
        window.addEventListener('deviceorientationabsolute', compassHandler, true);
        // Fallback for older browsers
        window.addEventListener('deviceorientation', compassHandler, true);
    }
}
let lastHeading = 0;

function compassHandler(e) {
    let heading = 0;
    
    if (e.webkitCompassHeading) {
        heading = e.webkitCompassHeading;
    } else if (e.alpha !== null) {
        heading = 360 - e.alpha;
    }

    // Only update if the change is significant (reduces micro-jitters)
    if (Math.abs(heading - lastHeading) > 0.5) {
        if (pointer) {
            pointer.style.transform = `rotate(${heading}deg)`;
            lastHeading = heading;
        }
    }
}

// 7. COMPASS HELPER FUNCTION (For text-based directions)
function getCompassDirection(bearing) {
    if (bearing >= -22.5 && bearing < 22.5) return 'North';
    if (bearing >= 22.5 && bearing < 67.5) return 'Northeast';
    if (bearing >= 67.5 && bearing < 112.5) return 'East';
    if (bearing >= 112.5 && bearing < 157.5) return 'Southeast';
    if (bearing >= 157.5 || bearing < -157.5) return 'South';
    if (bearing >= -157.5 && bearing < -112.5) return 'Southwest';
    if (bearing >= -112.5 && bearing < -67.5) return 'West';
    if (bearing >= -67.5 && bearing < -22.5) return 'Northwest';
    return 'Toward Target';
}

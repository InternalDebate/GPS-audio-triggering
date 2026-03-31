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

// --- COMPASS ENGINE VARIABLES ---
let targetHeading = 0;      // Where the phone is actually pointing
let currentHeading = 0;     // Where the needle is currently drawn
const lerpFactor = 0.15;    // Smoothness: 0.01 (heavy/slow) to 1.0 (instant/jittery)

const needle = document.getElementById('compass-needle');

// 1. THE PERMISSION BOUNCER
function initCompass() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(state => {
                if (state === 'granted') {
                    window.addEventListener('deviceorientation', updateTarget, true);
                    animateNeedle(); // Start the smooth loop
                }
            });
    } else {
        window.addEventListener('deviceorientationabsolute', updateTarget, true);
        animateNeedle();
    }
}

// 2. SENSOR INPUT
function updateTarget(e) {
    // iOS uses webkitCompassHeading, Android uses alpha
    let raw = e.webkitCompassHeading || (360 - e.alpha);
    if (raw) targetHeading = raw;
}

// 3. THE SMOOTHING LOOP (The "Lerp")
function animateNeedle() {
    // Calculate the shortest distance between angles (avoids the 360-0 spasm)
    let diff = targetHeading - currentHeading;
    
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Move the current heading a fraction of the way to the target
    currentHeading += diff * lerpFactor;

    // Apply the rotation
    needle.style.transform = `rotate(${currentHeading}deg)`;

    // Run this function again on the next screen frame (~60fps)
    requestAnimationFrame(animateNeedle);
}

// --- INTEGRATION WITH YOUR START BUTTON ---
document.getElementById('start-btn').addEventListener('click', function() {
    // ... your existing audio/GPS code ...
    initCompass(); 
});

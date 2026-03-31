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
const pointer = document.getElementById('compass-pointer'); 
const needle = document.getElementById('compass-needle');

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

// 4. AUDIO ENGINE
function checkAudioZones(userPoint) {
    let activeZoneName = "No zone detected...";
    
    soundZones.forEach(zone => {
        const poiPoint = turf.point([zone.lng, zone.lat]);
        const distance = turf.distance(userPoint, poiPoint, {units: 'meters'});

        if (distance <= zone.radius) {
            if (!zone.howl.playing()) zone.howl.play();
            zone.howl.fade(zone.howl.volume(), 1.0, 2000); 
            activeZoneName = `Playing: ${zone.name}`;
        } else {
            zone.howl.fade(zone.howl.volume(), 0, 2000);
            // Pause after fade out to save battery
            if(zone.howl.volume() === 0 && zone.howl.playing()) {
                zone.howl.pause();
            }
        }
    });
    
    document.getElementById('status').innerText = activeZoneName;
}

// 5. START BUTTON LOGIC
document.getElementById('start-btn').addEventListener('click', function() {
    this.style.display = 'none';
    document.getElementById('status').innerText = "Walk into a blue circle...";
    
    if (Howler.ctx.state === 'suspended') {
        Howler.ctx.resume();
    }

    startTracking();
    initCompass(); 
});

// 6. GPS TRACKING & GUIDANCE ENGINE
function startTracking() {
    const directionDisplay = document.getElementById('direction-hint');

    function updateGuidance(uLat, uLng) {
        const center = map.getCenter();
        if (!center || !uLat || uLat === 0) return;

        const userPoint = turf.point([uLng, uLat]);
        const centerPoint = turf.point([center.lng, center.lat]);

        // Calculate Distance to the Crosshair
        const distance = turf.distance(userPoint, centerPoint, {units: 'meters'});

        // Calculate Bearing from User to Crosshair
        const bearing = turf.rhumbBearing(userPoint, centerPoint);
        const compassDir = getCompassDirection(bearing);

        // Update the Direction UI
        directionDisplay.innerText = `The crosshair is ${compassDir} of you (${Math.round(distance)}m)`;
        
        // Trigger Audio Logic based on User Position
        checkAudioZones(userPoint);
    }

    navigator.geolocation.watchPosition((pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        userMarker.setLatLng([uLat, uLng]);
        
        updateGuidance(uLat, uLng);
    }, (err) => {
        console.error("GPS Error:", err);
        document.getElementById('status').innerText = "GPS Error. Check settings.";
    }, { 
        enableHighAccuracy: true,
        maximumAge: 0 
    });

    map.on('move', () => {
        const coords = userMarker.getLatLng();
        updateGuidance(coords.lat, coords.lng);
    });
}

// 7. DIRECTION HELPERS
function getCompassDirection(bearing) {
    if (bearing >= -22.5 && bearing < 22.5) return 'North';
    if (bearing >= 22.5 && bearing < 67.5) return 'Northeast';
    if (bearing >= 67.5 && bearing < 112.5) return 'East';
    if (bearing >= 112.5 && bearing < 157.5) return 'Southeast';
    if (bearing >= 157.5 || bearing < -157.5) return 'South';
    if (bearing >= -157.5 && bearing < -112.5) return 'Southwest';
    if (bearing >= -112.5 && bearing < -67.5) return 'West';
    if (bearing >= -67.5 && bearing < -22.5) return 'Northwest';
    return 'Ahead';
}

// 8. COMPASS ENGINE
let targetHeading = 0;      
let currentHeading = 0;     
const lerpFactor = 0.15;    

function initCompass() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(state => {
                if (state === 'granted') {
                    window.addEventListener('deviceorientation', updateTarget, true);
                    animateNeedle();
                }
            });
    } else {
        window.addEventListener('deviceorientationabsolute', updateTarget, true);
        animateNeedle();
    }
}

function updateTarget(e) {
    let raw = e.webkitCompassHeading || (360 - e.alpha);
    if (raw) targetHeading = raw;
}

function animateNeedle() {
    if (!needle) return;
    
    let diff = targetHeading - currentHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    currentHeading += diff * lerpFactor;
    needle.style.transform = `rotate(${currentHeading}deg)`;

    requestAnimationFrame(animateNeedle);
}

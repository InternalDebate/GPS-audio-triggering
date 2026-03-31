// 1. Initialize the Leaflet Map
const map = L.map('map').setView([51.505, -0.09], 15); // Set to your park coordinates
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 2. Define your Sound Zone (Using Turf and Leaflet)
const zoneCenter = [51.505, -0.09]; // [Lat, Lng]
const zoneRadius = 0.02; // 20 meters in Kilometers

// Draw the zone on the map for the user to see
L.circle(zoneCenter, { radius: 20, color: 'blue' }).addTo(map);
const userMarker = L.marker([0,0]).addTo(map); // A marker for the user

// 3. Set up the Sound with Howler
const sound = new Howler({
  src: ['forest.mp3'],
  loop: true,
  volume: 0 // Start silent
});

// 4. The Geolocation Logic
navigator.geolocation.watchPosition((pos) => {
    const userPoint = turf.point([pos.coords.longitude, pos.coords.latitude]);
    const centerPoint = turf.point([zoneCenter[1], zoneCenter[0]]); // Turf uses [Lng, Lat]

    // Move the marker on the map
    userMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);

    // Calculate distance using Turf
    const distance = turf.distance(userPoint, centerPoint, {units: 'kilometers'});

    if (distance <= zoneRadius) {
        // User is INSIDE: Fade in the sound
        if (!sound.playing()) sound.play();
        sound.fade(sound.volume(), 1.0, 1000); // Smooth fade to full volume over 1 sec
    } else {
        // User is OUTSIDE: Fade out
        sound.fade(sound.volume(), 0, 1000);
    }
}, err => console.error(err), { enableHighAccuracy: true });

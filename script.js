const startBtn = document.getElementById('startBtn');
const status = document.getElementById('status');
const coordsDisplay = document.getElementById('coords');

// 1. Define your Point of Interest (POI)
const myPOI = {
    lat: 51.5074, // Replace with your park's Lat
    lng: -0.1278, // Replace with your park's Lng
    audioFile: 'forest.mp3',
    radius: 20 // meters
};

const sound = new Audio(myPOI.audioFile);

// 2. The distance calculator
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

// 3. Start tracking when button is clicked
startBtn.addEventListener('click', () => {
    status.innerText = "Status: Tracking... Walk to the spot!";
    startBtn.style.display = 'none';

    navigator.geolocation.watchPosition((pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        coordsDisplay.innerText = `Lat: ${userLat.toFixed(4)} | Lng: ${userLng.toFixed(4)}`;

        const dist = getDistance(userLat, userLng, myPOI.lat, myPOI.lng);

        if (dist < myPOI.radius) {
            if (sound.paused) sound.play();
            status.innerText = "Status: You are at the Big Tree!";
        } else {
            sound.pause();
            status.innerText = "Status: Keep walking...";
        }
    }, (err) => console.error(err), { enableHighAccuracy: true });
});
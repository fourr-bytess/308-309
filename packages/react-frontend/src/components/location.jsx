import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function Location() {
  const [locationCoords, setLocationCoords] = useState(null);
  const [zipCode, setZip] = useState("");
  const [radius, setRadius] = useState(5);
  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      setLocationCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  }, []);
  const zoomLevel =
    radius <= 5 ? 14 : radius <= 10 ? 13.5 : radius <= 15 ? 12.5 : 11.5;

  return (
    <section id="location" className="page active">
      <div className="location-card">
        <h3 className="location-title">Adjust Your Search Area!</h3>

        <input
          type="text"
          placeholder="Enter ZIP Code"
          value={zipCode}
          onChange={(e) => setZip(e.target.value)}
        />

        <div className="map-container">
          {locationCoords && (
            <MapContainer
              key={radius}
              center={[locationCoords.lat, locationCoords.lng]}
              zoom={zoomLevel}
              style={{ height: "300px", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[locationCoords.lat, locationCoords.lng]} />
              <Circle
                center={[locationCoords.lat, locationCoords.lng]}
                radius={radius * 1609}
              />
            </MapContainer>
          )}
        </div>

        <p className="radius-label">
          Radius: <strong>{radius} miles</strong>
        </p>

        <input
          type="range"
          min={5}
          max={20}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
        />
      </div>
    </section>
  );
}

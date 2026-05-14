import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";

import { useMap } from "react-leaflet";

function ChangeMapView({ coords, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.setView([coords.lat, coords.lng], zoom);
    }
  }, [map, coords.lat, coords.lng, zoom]);

  return null;
}

export default function Location({ userRole, onSetSearchArea }) {
  const navigate = useNavigate();
  const [locationCoords, setLocationCoords] = useState(null);
  const [zipCode, setZip] = useState("");
  const [radius, setRadius] = useState(5);

  async function handleZipSearch() {
    if (!zipCode) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&postalcode=${zipCode}&country=USA`,
      );
      const data = await res.json();

      if (data.length === 0) {
        alert("ZIP code not found");
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      setLocationCoords({ lat, lng });
    } catch (err) {
      console.error(err);
      alert("Error fetching location");
    }
  }

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      setLocationCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  }, []);
  const zoomLevel =
    radius <= 5 ? 10.5 : radius <= 10 ? 9.5 : radius <= 15 ? 9 : 8.5;

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
        <button className="zip-btn" onClick={handleZipSearch}>
          {" "}
          &gt;
        </button>

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
                radius={radius * 1609.34}
              />
              <ChangeMapView coords={locationCoords} zoom={zoomLevel} />
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
        <button
          className="primary-btn"
          onClick={() => {
            const area = {
              coords: locationCoords,
              radius: radius,
              zip: zipCode,
            };

            onSetSearchArea?.(area);

            const targetPath = userRole === "Artist" ? "/gigs" : "/bands";

            navigate(targetPath, { state: area });
          }}
        >
          Enter
        </button>
      </div>
    </section>
  );
}

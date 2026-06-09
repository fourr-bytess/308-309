import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../leafletIcon.js";
import { useNavigate } from "react-router-dom";

function ChangeMapView({ coords, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (map && coords) {
      map.setView([coords.lat, coords.lng], zoom);
    }
  }, [map, coords, zoom]);

  return null;
}

export default function Location({
  userRole,
  initialSearchArea,
  onSetSearchArea,
}) {
  const navigate = useNavigate();

  const [locationCoords, setLocationCoords] = useState(
    initialSearchArea?.coords ?? null,
  );
  const [zipCode, setZipCode] = useState(initialSearchArea?.zip ?? "");
  const [radius, setRadius] = useState(initialSearchArea?.radius ?? 5);

  useEffect(() => {
    if (initialSearchArea?.coords) {
      setLocationCoords(initialSearchArea.coords);
    }

    if (initialSearchArea?.zip) {
      setZipCode(initialSearchArea.zip);
    }

    if (initialSearchArea?.radius) {
      setRadius(initialSearchArea.radius);
    }
  }, [initialSearchArea]);

  async function getCoordsFromZip(zip) {
    const cleanZip = String(zip || "").trim();

    if (!cleanZip) return null;

    try {
      const res = await fetch(
        `https://api.zippopotam.us/us/${encodeURIComponent(cleanZip)}`,
      );

      if (!res.ok) {
        console.error("ZIP lookup failed:", res.status);
        return null;
      }

      const data = await res.json();
      const place = data.places?.[0];

      if (!place) return null;

      return {
        lat: parseFloat(place.latitude),
        lng: parseFloat(place.longitude),
      };
    } catch (err) {
      console.error("ZIP lookup error:", err);
      return null;
    }
  }

  async function handleZipSearch() {
    const coordinates = await getCoordsFromZip(zipCode);

    if (!coordinates) {
      alert("ZIP code not found");
      return;
    }

    setLocationCoords(coordinates);
  }

  useEffect(() => {
    if (initialSearchArea?.coords) {
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      setLocationCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  }, [initialSearchArea?.coords]);

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
          onChange={(e) => setZipCode(e.target.value)}
        />

        <button className="zip-btn" onClick={handleZipSearch}>
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
          disabled={!locationCoords}
          onClick={() => {
            const area = {
              coords: locationCoords,
              radius,
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
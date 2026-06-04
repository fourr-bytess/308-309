import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";

function getDistanceInMiles(lat1, lng1, lat2, lng2) {
  const earthRadiusMiles = 3958.8;

  const latDifference = ((lat2 - lat1) * Math.PI) / 180;
  const lngDifference = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(latDifference / 2) * Math.sin(latDifference / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(lngDifference / 2) *
      Math.sin(lngDifference / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

async function getCoordsFromZip(zipCode) {
  if (!zipCode) return null;

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&postalcode=${zipCode}&country=USA`,
  );

  const data = await res.json();

  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}

function ChangeMapView({ coords, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (coords) {
      map.setView([coords.lat, coords.lng], zoom);
    }
  }, [coords, zoom, map]);

  return null;
}

export default function Gigs({
  gigs,
  canMessageVenues = false,
  onMessageVenue,
  onRequestGig,
  messageError = "",
}) {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [maxPay, setMaxPay] = useState(4000);
  const [searchText, setSearchText] = useState("");

  const [locationCoords, setLocationCoords] = useState(null);
  const [zipCode, setZip] = useState("");
  const [radius, setRadius] = useState(5);
  const [gigCoords, setGigCoords] = useState({});

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
    async function loadGigCoordinates() {
      const coordsByGigId = {};

      for (const gig of gigs) {
        const gigZip = gig.location;

        if (!gigZip) continue;

        const coordinates = await getCoordsFromZip(gigZip);

        if (coordinates) {
          coordsByGigId[gig._id] = coordinates;
        }
      }

      setGigCoords(coordsByGigId);
    }

    if (gigs.length > 0) {
      loadGigCoordinates();
    }
  }, [gigs]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      setLocationCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  }, []);

  const zoomLevel =
    radius <= 5 ? 10 : radius <= 10 ? 9.5 : radius <= 15 ? 9 : 8;

  const now = new Date();

  const filteredGigs = gigs.filter((gig) => {
    const gigDate = new Date(gig.date);

    if (gigDate < now) {
      return false;
    }

    const search = searchText.toLowerCase();
    const gigName = gig.name?.toLowerCase() || "";
    const gigLocation = gig.location?.toLowerCase() || "";

    if (search && !gigName.includes(search) && !gigLocation.includes(search)) {
      return false;
    }

    if (
      selectedGenre !== "All" &&
      !gig.genres?.includes(selectedGenre.toLowerCase())
    ) {
      return false;
    }

    const minGigPay = gig.price_range?.[0] ?? 0;
    if (minGigPay > maxPay) {
      return false;
    }
    if (locationCoords && gigCoords[gig._id]) {
      const milesAway = getDistanceInMiles(
        locationCoords.lat,
        locationCoords.lng,
        gigCoords[gig._id].lat,
        gigCoords[gig._id].lng,
      );

      if (milesAway > radius) {
        return false;
      }
    }

    return true;
  });

  return (
    <section id="gigs" className="page active">
      <div className="bands-layout">
        <aside className="filters-sidebar">
          <h3>Filters</h3>

          <div className="zip-row">
            <input
              type="text"
              placeholder="ZIP"
              value={zipCode}
              onChange={(e) => setZip(e.target.value)}
            />
            <button className="zip-btn" onClick={handleZipSearch}>
              &gt;
            </button>
          </div>

          <div className="mini-map">
            {locationCoords && (
              <MapContainer
                key={`${locationCoords.lat}-${locationCoords.lng}-${radius}`}
                center={[locationCoords.lat, locationCoords.lng]}
                zoom={zoomLevel}
                style={{ height: "150px", width: "100%" }}
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

          <p className="radius-label">
            Max Pay: <strong>${maxPay}</strong>
          </p>

          <input
            type="range"
            min="100"
            max="4000"
            step="100"
            value={maxPay}
            onChange={(e) => setMaxPay(Number(e.target.value))}
          />
        </aside>

        <div className="bands-content">
          <div className="bands-content-header">
            <h2>Available Gigs This Week</h2>
            {messageError && (
  <p className="upload-message error">{messageError}</p>
)}
          </div>

          <div className="search-row">
            <input
              type="text"
              placeholder="Search gigs..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="card-grid">
            {filteredGigs.length === 0 ? (
              <p className="list-empty-message">
                No gigs match your filters this week.
              </p>
            ) : (
              filteredGigs.map((gig) => (
                <div key={gig._id} className="card band-card">
                  <h3 style={{ textTransform: "capitalize", marginBottom: "8px" }}>
                      <Link 
                        to={`/gig/${gig._id}/public`} 
                        style={{ color: "#5a0f2e", textDecoration: "underline", cursor: "pointer" }}
                      >
                        {gig.name}
                      </Link>
                    </h3>
                    <p>{gig.location || "No location"}</p>
                  <p>
                    {gig.date
                      ? new Date(gig.date).toLocaleDateString()
                      : "No date"}
                  </p>
                  <p>
                    ${gig.price_range?.[0] ?? 0} - ${gig.price_range?.[1] ?? 0}
                  </p>
                  <p>
                    {gig.genres?.length ? gig.genres.join(", ") : "No genre"}
                  </p>

                  {canMessageVenues && (
                    <>
                      <button
                        type="button"
                        className="view-public-btn"
                        onClick={() => onRequestGig?.(gig)}
                      >
                        Request Gig
                      </button>
                      <button
                        type="button"
                        className="view-public-btn"
                        onClick={() => onMessageVenue?.(gig)}
                      >
                        Message venue
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

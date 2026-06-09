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
  const cleanZip = String(zipCode || "").trim();

  if (!cleanZip) return null;

  try {
    const res = await fetch(
      `https://api.zippopotam.us/us/${encodeURIComponent(cleanZip)}`,
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const place = data.places?.[0];

    if (!place) return null;

    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
    };
  } catch {
    return null;
  }
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
  locationCoords: initialCoords = null,
  userZip = "",
  userRadius = 5,
}) {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [maxPay, setMaxPay] = useState(4000);
  const [searchText, setSearchText] = useState("");
  const [mapMessage, setMapMessage] = useState("");

  const [locationCoords, setLocationCoords] = useState(initialCoords);
  const [zipCode, setZip] = useState(userZip);
  const [radius, setRadius] = useState(userRadius);
  const [gigCoords, setGigCoords] = useState({});

  useEffect(() => {
    setZip(userZip || "");
  }, [userZip]);

  useEffect(() => {
    setLocationCoords(initialCoords || null);
  }, [initialCoords]);

  useEffect(() => {
    if (userRadius) {
      setRadius(userRadius);
    }
  }, [userRadius]);

  useEffect(() => {
    if (locationCoords || !zipCode) {
      return;
    }

    getCoordsFromZip(zipCode).then((coordinates) => {
      if (coordinates) {
        setLocationCoords(coordinates);
        setMapMessage("");
      }
    });
  }, [zipCode, locationCoords]);

  useEffect(() => {
    if (locationCoords) {
      return;
    }

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setMapMessage("");
      },
      () => {},
    );
  }, [locationCoords]);

  async function handleZipSearch() {
    if (!zipCode.trim()) {
      setMapMessage("Enter a ZIP code to search.");
      return;
    }

    const coordinates = await getCoordsFromZip(zipCode);

    if (!coordinates) {
      setMapMessage("ZIP code not found. Try a 5-digit US ZIP.");
      return;
    }

    setLocationCoords(coordinates);
    setMapMessage("");
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
    const venueName =
      typeof gig.host === "object" ? gig.host?.name?.toLowerCase() || "" : "";

    if (
      search &&
      !gigName.includes(search) &&
      !gigLocation.includes(search) &&
      !venueName.includes(search)
    ) {
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleZipSearch();
                }
              }}
            />
            <button type="button" className="zip-btn" onClick={handleZipSearch}>
              &gt;
            </button>
          </div>

          {mapMessage && (
            <p className="upload-message error" style={{ marginTop: "8px" }}>
              {mapMessage}
            </p>
          )}

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
              placeholder="Search gigs or venues..."
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
                  <h3
                    style={{ textTransform: "capitalize", marginBottom: "8px" }}
                  >
                    <Link
                      to={`/gig/${gig._id}/public`}
                      style={{
                        color: "#5a0f2e",
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      {gig.name}
                    </Link>
                  </h3>
                  <p>{gig.location || "No location"}</p>
                  <p>
                    <strong>Venue:</strong>{" "}
                    {typeof gig.host === "object"
                      ? gig.host?.name || "Unknown venue"
                      : "Unknown venue"}
                  </p>
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

                  <div className="band-card-buttons">
                    <Link
                      to={`/gig/${gig._id}/public`}
                      className="view-public-btn"
                    >
                      View Details
                    </Link>
                    {canMessageVenues && (
                      <>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => onRequestGig?.(gig)}
                        >
                          Request Gig
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => onMessageVenue?.(gig)}
                        >
                          Message venue
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

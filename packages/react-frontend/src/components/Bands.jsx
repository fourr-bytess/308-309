import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";

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

export default function BandsPage({
  bands,
  navigate,
  locationCoords,
  userZip,
  userRadius,
}) {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [maxPrice, setMaxPrice] = useState(4000);
  const [distance, setDistance] = useState(userRadius || 5);
  const [searchText, setSearchText] = useState("");
  const [zipCode, setZipCode] = useState(userZip || "");
  const [coords, setCoords] = useState(locationCoords || null);
  const [bandCoords, setBandCoords] = useState({});

  useEffect(() => {
    setZipCode(userZip || "");
  }, [userZip]);

  useEffect(() => {
    setCoords(locationCoords || null);
  }, [locationCoords]);

  useEffect(() => {
    if (userRadius) {
      setDistance(userRadius);
    }
  }, [userRadius]);
  useEffect(() => {
    async function loadBandCoordinates() {
      const coordsByBandId = {};

      for (const band of bands) {
        const bandZip = band.locations?.[0] || band.location;

        if (!bandZip) continue;

        const coordinates = await getCoordsFromZip(bandZip);

        if (coordinates) {
          coordsByBandId[band._id] = coordinates;
        }
      }

      setBandCoords(coordsByBandId);
    }

    if (bands.length > 0) {
      loadBandCoordinates();
    }
  }, [bands]);

  const zoomLevel =
    distance <= 5 ? 10 : distance <= 10 ? 9.5 : distance <= 15 ? 9 : 8;

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

      setCoords({ lat, lng });
    } catch (err) {
      console.error(err);
      alert("Error fetching location");
    }
  }

  const filteredBands = bands.filter((band) => {
    const search = searchText.toLowerCase();

    const bandName = band.name?.toLowerCase() || "";

    const bandLocation =
      band.locations?.[0]?.toLowerCase() || band.location?.toLowerCase() || "";

    if (
      search &&
      !bandName.includes(search) &&
      !bandLocation.includes(search)
    ) {
      return false;
    }

    if (
      selectedGenre !== "All" &&
      !band.genres?.includes(selectedGenre.toLowerCase())
    ) {
      return false;
    }

    const bandRate = band.price_range?.[1] ?? band.price_range?.[0] ?? 0;

    if (bandRate > maxPrice) {
      return false;
    }
    if (coords && bandCoords[band._id]) {
      const milesAway = getDistanceInMiles(
        coords.lat,
        coords.lng,
        bandCoords[band._id].lat,
        bandCoords[band._id].lng,
      );

      if (milesAway > distance) {
        return false;
      }
    }

    return true;
  });

  return (
    <section id="bands" className="page active">
      <div className="bands-layout">
        <aside className="filters-sidebar">
          <h3>Filters</h3>

          <div className="zip-row">
            <input
              type="text"
              placeholder="ZIP"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
            />
            <button className="zip-btn" onClick={handleZipSearch}>
              &gt;
            </button>
          </div>

          <div className="mini-map">
            {coords && (
              <MapContainer
                key={`${coords.lat}-${coords.lng}-${distance}`}
                center={[coords.lat, coords.lng]}
                zoom={zoomLevel}
                style={{ height: "150px", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[coords.lat, coords.lng]} />
                <Circle
                  center={[coords.lat, coords.lng]}
                  radius={distance * 1609.34}
                />
              </MapContainer>
            )}
          </div>

          <p className="radius-label">
            Radius: <strong>{distance} miles</strong>
          </p>

          <input
            type="range"
            min="5"
            max="20"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
          />

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            <option value="All">All Genres</option>
            <option>Rock</option>
            <option>Jazz</option>
            <option>Pop</option>
            <option>Country</option>
            <option>Hip-Hop</option>
          </select>

          <p className="radius-label">
            Max Price: <strong>${maxPrice}</strong>
          </p>

          <input
            type="range"
            min="100"
            max="4000"
            step="100"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          />
        </aside>

        <div className="bands-content">
          <div className="bands-content-header">
            <h2>Featured Bands</h2>
          </div>

          <div className="search-row">
            <input
              type="text"
              placeholder="Search bands..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="card-grid">
            {filteredBands.length === 0 ? (
              <p className="list-empty-message">No bands match your filters.</p>
            ) : (
              filteredBands.map((band) => (
                <div key={band._id} className="card band-card">
                  <h3>{band.name}</h3>

                  <p>{band.locations?.[0] || band.location || "No location"}</p>

                  <p>
                    {band.genres?.length ? band.genres.join(", ") : "No genre"}
                  </p>

                  <p>
                    Fixed Rate: $
                    {band.price_range?.[1] ?? band.price_range?.[0] ?? 0}
                  </p>

                  <button
                    className="secondary-btn"
                    onClick={() => navigate(`/band/${band._id}/public`)}
                  >
                    Open Profile
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";

export default function BandsPage({ bands, navigate, locationCoords, userZip, userRadius }) {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [priceRange, setPriceRange] = useState([100, 4000]);
  const [distance, setDistance] = useState(25);

  const filteredBands = bands.filter((band) => {
    if (
      selectedGenre !== "All" &&
      !band.genres?.includes(selectedGenre.toLowerCase())
    ) {
      return false;
    }

    const [min, max] = band.price_range || [0, 0];
    if (max < priceRange[0] || min > priceRange[1]) {
      return false;
    }

    return true;
  });

  return (
    <section id="bands" className="page active">
      <div className="bands-layout">
        {/* SIDEBAR */}
        <div className="filters-sidebar">
          <h3>Filters</h3>

          <label>Genre</label>
          <select onChange={(e) => setSelectedGenre(e.target.value)}>
            <option>All</option>
            <option>Rock</option>
            <option>Jazz</option>
            <option>Pop</option>
          </select>

          <label>
            Price (${priceRange[0]} - ${priceRange[1]})
          </label>
          <input
            type="range"
            min="100"
            max="5000"
            step="100"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([100, Number(e.target.value)])}
          />

          <label>Distance ({distance} miles)</label>
          <input
            type="range"
            min="1"
            max="50"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
          />

          <div className="mini-map">
            {locationCoords && (
              <MapContainer
                center={[locationCoords.lat, locationCoords.lng]}
                zoom={10}
                style={{ height: "150px", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[locationCoords.lat, locationCoords.lng]} />
                <Circle
                  center={[locationCoords.lat, locationCoords.lng]}
                  radius={distance * 1609}
                />
              </MapContainer>
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="bands-content">
          <h2>Featured Bands</h2>
          <p style={{ color: "white" }}>
            ZIP: {userZip} | Radius: {userRadius}
          </p>

          <div className="search-row">
            <input placeholder="Search for bands near you..." />
          </div>

          <div className="card-grid">
            {filteredBands.length === 0 ? (
              <p className="list-empty-message">No bands match your filters.</p>
            ) : (
              filteredBands.map((band) => (
                <div key={band._id} className="card band-card">
                  <h3>{band.name}</h3>
                  <p>{band.locations?.[0] || "No location"}</p>

                  <button
                    className="secondary-btn"
                    onClick={() => navigate(`/bands/${band._id}`)}
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

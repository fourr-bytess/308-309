import { useState, useEffect } from "react";
import "./App.css";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  Navigate,
  useLocation,
  useNavigate,
  Routes,
  Route,
  Link,
} from "react-router-dom";

function ProtectedRoute({ isLoggedIn, children }) {
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
export default function App() {
  // Checks if user is logged in...
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(true); // Set to true to bypass for testing - Jose

  // Store the genre the user clicks
  const [selectedGenre, setSelectedGenre] = useState("");
  //Store coordinates
  const [locationCoords, setLocationCoords] = useState(null);
  //Store zip
  const [zipCode, setZip] = useState("");
  //store radius
  const [radius, setRadius] = useState(5);

  const genres = [
    "Mariachi",
    "Blues",
    "Jazz",
    "Rock",
    "Hip-Hop",
    "Country",
    "Pop",
    "Classical",
  ];

  // Controls if the profile is currently in editing mode...

  const [isEditing, setIsEditing] = useState(false);

  // Login input state...

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [profile, setProfile] = useState({
    first: "First Name",
    last: "Last Name",
    email: "hello@email.com",
    password: "12345",
    role: "Artist",
  });

  const [bands, setBands] = useState([]);

  const [venues, setVenues] = useState([]);

  const [gigs] = useState([]);

  function requireLogin(targetPath) {
    if (!isLoggedIn) {
      alert("Please login or sign up before continuing.");

      navigate("/login");

      return false;
    }

    navigate(targetPath);

    return true;
  }

  function handleChange(e) {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  }

  function handleBandLogin() {
    setProfile({
      ...profile,
      email: loginEmail,
      password: loginPassword,
      role: "Artist",
    });

    setIsLoggedIn(true);

    const from = location.state?.from?.pathname;

    navigate(from || "/profile", { replace: true });
  }

  function handleVenueLogin() {
    setProfile({
      ...profile,
      email: loginEmail,
      password: loginPassword,
      role: "Venue",
    });

    setIsLoggedIn(true);

    const from = location.state?.from?.pathname;

    navigate(from || "/dashboard", { replace: true });
  }

  useEffect(() => {
    if (location.pathname === "/bands") {
      fetch("http://localhost:3001/bands")
        .then((res) => res.json())
        .then((data) => {
          setBands(data.data);
        })
        .catch((err) => console.error("Failed to load bands:", err));
    }

    if (location.pathname === "/dashboard") {
      fetch("http://localhost:3001/venues")
        .then((res) => res.json())
        .then((data) => {
          setVenues(data.data);
        })
        .catch((err) => console.error("Failed to load venues:", err));
    }
  }, [location.pathname]);
  const zoomLevel =
    radius <= 5 ? 14 : radius <= 10 ? 13.5 : radius <= 15 ? 12.5 : 11.5;

  return (
    <>
      <header className="navbar">
        <Link to="/" className="logo" id="homeLogo">
          🎵 Giggly 🎵
        </Link>

        <div className="nav-buttons">
          <button
            type="button"
            id="loginBtn"
            onClick={() => navigate("/login")}
          >
            Login
          </button>

          <button
            type="button"
            id="signupBtn"
            onClick={() => navigate("/login")}
          >
            Sign Up
          </button>
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <section id="landing" className="page active">
              <div className="center-card">
                <h1>Welcome to Giggly</h1>

                <p>Connecting Bands and Venues Seamlessly</p>

                <button
                  type="button"
                  id="hireBandBtn"
                  onClick={() => {
                    requireLogin("/genres");
                  }}
                >
                  Hire a Band
                </button>

                <button
                  type="button"
                  id="findGigBtn"
                  onClick={() => {
                    requireLogin("/gigs");
                  }}
                >
                  Find a Gig
                </button>
              </div>
            </section>
          }
        />

        <Route
          path="/genres"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <section id="genres" className="page active">
                <h2>Choose Your Genre</h2>

                <div className="genre-grid">
                  {genres.map((genre, index) => (
                    <div
                      key={index}
                      className={`genre-box ${
                        selectedGenre === genre ? "selected" : ""
                      }`}
                      onClick={() => setSelectedGenre(genre)}
                    >
                      {genre}
                    </div>
                  ))}
                </div>

                <button
                  className="primary-btn"
                  onClick={() => {
                    if (!selectedGenre) {
                      alert("Please select a genre");
                      return;
                    }
                    // Collect user coordinates and store them, then naviagte to location page for desired distance
                    navigator.geolocation.getCurrentPosition((position) => {
                      const lat = position.coords.latitude;
                      const lng = position.coords.longitude;

                      setLocationCoords({ lat, lng });
                      //Send API request to OpenStreetMap
                      fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                      )
                        .then((res) => res.json())
                        .then((data) => {
                          const zip = data.address?.postcode;
                          //If ZIP acquired, fill it in input tab
                          if (zip) {
                            setZip(zip);
                          }
                        });

                      navigate("/location");
                    });
                  }}
                >
                  Continue
                </button>
              </section>
            </ProtectedRoute>
          }
        />

        <Route
          path="/location"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <section id="location" className="page active">
                <div className="location-card">
                  <h3 className="location-title">Adjust Your Search Area!</h3>
                  {/* Store ZIP in input box */}
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

                        <Marker
                          position={[locationCoords.lat, locationCoords.lng]}
                        />

                        <Circle
                          key={radius}
                          center={[locationCoords.lat, locationCoords.lng]}
                          radius={radius * 100}
                        />
                      </MapContainer>
                    )}
                  </div>

                  <p className="radius-label">
                    Radius: <strong>{radius} miles</strong>
                  </p>
                  {/* Radius Slider */}
                  <input
                    type="range"
                    min={5}
                    max={20}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                  />
                  {/* Go to bands when entered */}
                  <button onClick={() => navigate("/bands")}>Enter</button>
                </div>
              </section>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bands"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <section id="bands" className="page active">
                <h2>Featured Bands</h2>

                <div className="search-row">
                  <input
                    type="text"
                    placeholder="Search for bands near you..."
                  />

                  <select>
                    <option>Filter by</option>
                    <option>Genre</option>
                    <option>Price</option>
                    <option>Distance</option>
                  </select>
                </div>

                <div className="card-grid">
                  {bands.map((band, index) => (
                    <div key={index} className="card">
                      <h3>{band.name}</h3>

                      <p>{band.location}</p>
                    </div>
                  ))}
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        <Route
          path="/gigs"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <section id="gigs" className="page active">
                <h2>Available Gigs</h2>

                <div className="search-row">
                  <input
                    type="text"
                    placeholder="Search for gigs near you..."
                  />

                  <select>
                    <option>Filter by</option>
                    <option>Genre</option>
                    <option>Pay</option>
                    <option>Distance</option>
                  </select>
                </div>

                <div className="card-grid">
                  {gigs.length === 0 ? (
                    <p style={{ color: "white" }}>No gigs available yet.</p>
                  ) : (
                    gigs.map((gig, index) => (
                      <div key={index} className="card">
                        <h3>{gig.title}</h3>

                        <p>{gig.location}</p>

                        <p>${gig.pay}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        <Route
          path="/login"
          element={
            <section id="login" className="page active">
              <div className="form-card">
                <h2>Sign In</h2>

                <input
                  type="email"
                  placeholder="Email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />

                <input
                  type="password"
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />

                <div className="login-buttons">
                  <button
                    type="button"
                    id="loginBandBtn"
                    onClick={handleBandLogin}
                  >
                    Log In As Band
                  </button>

                  <button
                    type="button"
                    id="loginVenueBtn"
                    onClick={handleVenueLogin}
                  >
                    Log In As Venue
                  </button>
                </div>
              </div>
            </section>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <section id="profile" className="page active">
                <div className="profile-popup">
                  <h2>User Profile</h2>

                  {isEditing ? (
                    <>
                      <div className="profile-row">
                        <span className="label">First Name</span>
                        <input
                          className="edit-input"
                          name="first"
                          value={profile.first}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="profile-row">
                        <span className="label">Last Name</span>
                        <input
                          className="edit-input"
                          name="last"
                          value={profile.last}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="profile-row">
                        <span className="label">Email</span>
                        <input
                          className="edit-input"
                          name="email"
                          value={profile.email}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="profile-row">
                        <span className="label">Password</span>
                        <input
                          className="edit-input"
                          type="password"
                          name="password"
                          value={profile.password}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="profile-row">
                        <span className="label">Role</span>
                        <select
                          className="edit-input"
                          name="role"
                          value={profile.role}
                          onChange={handleChange}
                        >
                          <option>Artist</option>
                          <option>Venue</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => setIsEditing(false)}
                      >
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="profile-row">
                        <span className="label">First Name</span>
                        <span className="value">{profile.first}</span>
                      </div>

                      <div className="profile-row">
                        <span className="label">Last Name</span>
                        <span className="value">{profile.last}</span>
                      </div>

                      <div className="profile-row">
                        <span className="label">Email</span>
                        <span className="value">{profile.email}</span>
                      </div>

                      <div className="profile-row">
                        <span className="label">Password</span>
                        <span className="value">
                          {"•".repeat(profile.password.length)}
                        </span>
                      </div>

                      <div className="profile-row">
                        <span className="label">Role</span>
                        <span className="value">{profile.role}</span>
                      </div>

                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <section id="dashboard" className="page active">
                <div className="dashboard-card">
                  <h2>Venue Dashboard</h2>

                  <p>Your registered venues</p>

                  <div className="dashboard-grid">
                    {venues.map((venue, index) => (
                      <div key={index} className="venue-gig-card">
                        <h3>{venue.name}</h3>

                        <p>
                          <strong>City:</strong> {venue.city}
                        </p>

                        <p>
                          <strong>Capacity:</strong> {venue.capacity}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

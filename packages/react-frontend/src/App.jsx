import { useState, useEffect } from "react";
import "./App.css";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function App() {
  // Checks if user is logged in...

  const [isLoggedIn, setIsLoggedIn] = useState(true); // Set to true to bypass for testing - Jose

  // Store the genre the user clicks
  const [selectedGenre, setSelectedGenre] = useState("");

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

  // Page switching system... displays what we want it to...

  const [page, setPage] = useState("landing");

  // Controls if the profile is currently in editing mode...

  const [isEditing, setIsEditing] = useState(false);

  // Login input state...

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Profile state...

  const [profile, setProfile] = useState({
    first: "First Name",
    last: "Last Name",
    email: "hello@email.com",
    password: "12345",
    role: "Artist",
  });

  // Stores bands coming from backend database...

  const [bands, setBands] = useState([]);

  // Stores venues for the venue dashboard...

  const [venues, setVenues] = useState([]);

  const [gigs, setGigs] = useState([]);

  // store location for bands nearby by latitude and longitude
  const [location, setLocation] = useState(null);

  // store ZIP code as string
  const [zipCode, setZip] = useState("");

  // Store radius

  const [radius, setRadius] = useState(5);

  function showPage(pageId) {
    setPage(pageId);
  }

  function requireLogin(targetPage) {
    if (!isLoggedIn) {
      alert("Please login or sign up before continuing.");

      showPage("login");

      return false;
    }

    showPage(targetPage);

    return true;
  }

  // Handles any profile input changes when editing...

  function handleChange(e) {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  }

  // Backend Connections...

  useEffect(() => {
    // Loads bands when the bands page opens...

    if (page === "bands") {
      fetch("http://localhost:3001/bands")
        .then((res) => res.json())
        .then((data) => {
          setBands(data.data);
        })
        .catch((err) => console.error("Failed to load bands:", err));
    }

    // Loads venues when dashboard opens...

    if (page === "dashboard") {
      fetch("http://localhost:3001/venues")
        .then((res) => res.json())
        .then((data) => {
          setVenues(data.data);
        })
        .catch((err) => console.error("Failed to load venues:", err));
    }
  }, [page]);

  // If no genre is selected, show all the bands, else filter the correct genre
  const filteredBands = selectedGenre
    ? bands.filter((band) => band.genre === selectedGenre)
    : bands;

  let zoomLevel;
  let radiusCircle = radius * 1609;
  if (radius <= 5) {
    zoomLevel = 15;
  } else if (radius <= 10) {
    zoomLevel = 13;
  } else if (radius <= 20) {
    zoomLevel = 12;
  } else {
    zoomLevel = 5;
  }

  return (
    <>
      {/* Navigation Bar... */}

      <header className="navbar">
        <div className="logo" id="homeLogo" onClick={() => showPage("landing")}>
          🎵 Giggly 🎵
        </div>

        <div className="nav-buttons">
          <button id="loginBtn" onClick={() => showPage("login")}>
            Login
          </button>

          <button id="signupBtn" onClick={() => showPage("login")}>
            Sign Up
          </button>
        </div>
      </header>

      {/* Landing Page... */}

      {page === "landing" && (
        <section id="landing" className="page active">
          <div className="center-card">
            <h1>Welcome to Giggly</h1>

            <p>Connecting Bands and Venues Seamlessly</p>

            <button
              id="hireBandBtn"
              onClick={() => {
                if (requireLogin("genres")) {
                }
              }}
            >
              Hire a Band
            </button>

            <button
              id="findGigBtn"
              onClick={() => {
                if (requireLogin("gigs")) {
                }
              }}
            >
              Find a Gig
            </button>
          </div>
        </section>
      )}

      {/* Location Page... */}

      {page === "location" && (
        <section id="location" className="page active">
          <div className="location-card">
            <h2>Choose your location</h2>

            <div className="search-row">
              <input
                type="text"
                placeholder="Enter ZIP Code"
                value={zipCode}
                onChange={(e) => setZip(e.target.value)}
              />

              <div className="map-container">
                {location && (
                  <MapContainer
                    key = {radius}
                    center={[location.lat, location.lng]}
                    zoom={zoomLevel}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    <Marker position={[location.lat, location.lng]} />

                    <Circle
                      key = {radius}
                      center={[location.lat, location.lng]}
                      radius={radiusCircle}
                    />
                  </MapContainer>
                )}
              </div>

              <p>Radius: {radius} miles</p>

              <input
                type="range"
                min={5}
                max={20}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />

              <button className="enter-btn">Enter</button>
            </div>
          </div>
        </section>
      )}

      {/* Gigs Page... */}

      {page === "gigs" && (
        <section id="gigs" className="page active">
          <h2>Available Gigs</h2>

          <div className="search-row">
            <input type="text" placeholder="Search for gigs near you..." />

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
      )}
      {/* Genres Page */}
      {page === "genres" && (
        <section id="genres" className="page active">
          <h2>Choose Your Genre!</h2>

          {/* Grid Container */}
          <div className="genre-grid">
            {/* Loop through each genre */}
            {genres.map((genre, index) => (
              <div
                key={index} //give each block a unique label
                //display the chosen block and save the genre you picked
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
            // Continue button with logic
            className="primary-btn"
            onClick={() => {
              if (selectedGenre) {
                // acquire coordinates
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    // store latitude and longitude
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    setLocation({ lat, lng });
                    // fetch OpenStreetMap Nominatim API
                    fetch(
                      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                    )
                      .then((res) => res.json())
                      .then((data) => {
                        const zip = data.address.postcode;
                        setZip(zip); //updates input to ZIP code
                        showPage("location");
                      })
                      .catch(() => {
                        alert("Could not acquire ZIP Code");
                        showPage("bands");
                      });
                  },
                  (error) => {
                    alert("Location access denied.");
                    showPage("location");
                  },
                );
              } else {
                alert("Please select a genre first");
              }
            }}
          >
            Continue
          </button>
        </section>
      )}

      {/* Login Page... */}

      {page === "login" && (
        <section id="login" className="page active">
          <div className="form-card">
            <h2>Sign In</h2>

            {/* Email input now stores user input... */}

            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />

            {/* Password input now stores user input... */}

            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />

            <div className="login-buttons">
              {/* Band login updates profile... */}

              <button
                id="loginBandBtn"
                onClick={() => {
                  setProfile({
                    ...profile,
                    email: loginEmail,
                    password: loginPassword,
                    role: "Artist",
                  });

                  setIsLoggedIn(true);

                  showPage("genres");
                }}
              >
                Log In As Band
              </button>

              {/* Venue login updates profile... */}

              <button
                id="loginVenueBtn"
                onClick={() => {
                  setProfile({
                    ...profile,
                    email: loginEmail,
                    password: loginPassword,
                    role: "Venue",
                  });

                  setIsLoggedIn(true);

                  showPage("genres");
                }}
              >
                Log In As Venue
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Profile Page... */}

      {page === "profile" && (
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
                  className="primary-btn"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {/* Venue Dashboard Page... */}

      {page === "dashboard" && (
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
      )}
    </>
  );
}

import { useState } from "react"
import "./App.css"

export default function App() {

  // Checks if user is logged in...

  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Page switching system... displays what we want it to...

  const [page, setPage] = useState("landing")

  // Stores profile information...

  const [profile, setProfile] = useState({
    first: "hello",
    last: "hello",
    email: "hello@email.com",
    password: "12345",
    role: "Artist"
})

  function showPage(pageId) {
    setPage(pageId)
  }

  function requireLogin(targetPage) {

    if (!isLoggedIn) {

      alert("Please login or sign up before continuing.")

      showPage("login")

      return false
    }

    showPage(targetPage)

    return true
  }

  // Card generators...

  function generateBands() {

    const bands = []

    for (let i = 1; i <= 12; i++) {

      bands.push("Band " + i)

    }

    return bands
  }

  function generateGigs() {

    const gigs = []

    for (let i = 1; i <= 12; i++) {

      gigs.push("Gig " + i)

    }

    return gigs
  }

  return (

    <>

      {/* Navigation Bar... */}

      <header className="navbar">

        <div
          className="logo"
          id="homeLogo"
          onClick={() => showPage("landing")}
        >
          🎵 Giggly 🎵
        </div>

        <div className="nav-buttons">

          <button
            id="loginBtn"
            onClick={() => showPage("login")}
          >
            Login
          </button>

          <button
            id="signupBtn"
            onClick={() => showPage("login")}
          >
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

                if (requireLogin("bands")) {}

              }}
            >
              Hire a Band
            </button>

            <button
              id="findGigBtn"
              onClick={() => {

                if (requireLogin("gigs")) {}

              }}
            >
              Find a Gig
            </button>

          </div>

        </section>

      )}


      {/* Bands Page... */}

      {page === "bands" && (

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

            {generateBands().map((band, index) => (

              <div key={index} className="card">

                {band}

              </div>

            ))}

          </div>

        </section>

      )}


      {/* Gigs Page... */}

      {page === "gigs" && (

        <section id="gigs" className="page active">

          <h2>Gigs !</h2>

          <div className="search-row">

            <input
              type="text"
              placeholder="Search for gigs near you..."
            />

            <select>

              <option>Filter by</option>
              <option>Genre</option>
              <option>Price</option>
              <option>Distance</option>

            </select>

          </div>

          <div className="card-grid">

            {generateGigs().map((gig, index) => (

              <div key={index} className="card">

                {gig}

              </div>

            ))}

          </div>

        </section>

      )}


      {/* Login Page... */}

      {page === "login" && (

        <section id="login" className="page active">

          <div className="form-card">

            <h2>Sign In</h2>

            <input
              type="email"
              placeholder="Email"
            />

            <input
              type="password"
              placeholder="Password"
            />

            <div className="login-buttons">

              <button
                id="loginBandBtn"
                onClick={() => {

                  setIsLoggedIn(true)

                  showPage("profile")

                }}
              >
                Log In As Band
              </button>

              <button
                id="loginVenueBtn"
                onClick={() => {

                  setIsLoggedIn(true)

                  showPage("dashboard")

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

  {/* Main popup card that holds profile information */}

  <div className="profile-popup">

    <h2>User Profile</h2>

    {/* First Name */}

    <div className="profile-row">
      <span className="label">First Name</span>
      <span className="value">{profile.first}</span>
    </div>

    {/* Last Name */}

    <div className="profile-row">
      <span className="label">Last Name</span>
      <span className="value">{profile.last}</span>
    </div>

    {/* Email */}

    <div className="profile-row">
      <span className="label">Email</span>
      <span className="value">{profile.email}</span>
    </div>

    {/* Password */}

    <div className="profile-row">
      <span className="label">Password</span>
      <span className="value">
        {"•".repeat(profile.password.length)}
      </span>
    </div>

    {/* Role */}

    <div className="profile-row">
      <span className="label">Role</span>
      <span className="value">{profile.role}</span>
    </div>

    {/* Edit Button */}

    <button
      className="primary-btn"
      onClick={() => showPage("login")}
    >
      Edit
    </button>

  </div>

</section>

)}


      {/* Dashboard Page... */}

      {page === "dashboard" && (

        <section id="dashboard" className="page active">

          <h2>Venue Dashboard</h2>

          <p>This is your dashboard page.</p>

        </section>

      )}

    </>

  )

}
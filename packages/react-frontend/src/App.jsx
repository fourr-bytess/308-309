import { useState, useEffect } from "react"
import {
  Navigate,
  useLocation,
  useNavigate,
  Routes,
  Route,
  Link,
} from "react-router-dom"
import "./App.css"
import BandPublicProfile from "./components/BandPublicProfile.jsx";

const API_BASE_URL = "http://localhost:3001"
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const DEFAULT_PLACEHOLDER_IMAGE = "https://placehold.co/240x240/png?text=No+Photo"

function ProtectedRoute({ isLoggedIn, children }) {
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function getBandIdFromPath(pathname) {
  const match = pathname.match(/^\/bands\/([^/]+)$/)
  return match ? match[1] : null
}

function validateImageFile(file) {
  if (!file) {
    return "Please choose an image file."
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "Only JPG, PNG, WEBP, and GIF files are allowed."
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Image must be 5MB or smaller."
  }
  return null
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const [isEditing, setIsEditing] = useState(false)

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  const [musicianId, setMusicianId] = useState("")
  const [venueId, setVenueId] = useState("")

  const [profile, setProfile] = useState({
    first: "First Name",
    last: "Last Name",
    email: "hello@email.com",
    password: "12345",
    role: "Artist",
    profilePictureUrl: "",
  })

  const [bands, setBands] = useState([])

  const [venues, setVenues] = useState([])

  const [gigs, setGigs] = useState([])

  const [bandDetails, setBandDetails] = useState(null)
  const [bandDetailsError, setBandDetailsError] = useState("")
  const [createBandMessage, setCreateBandMessage] = useState("")
  const [createBandForm, setCreateBandForm] = useState({
    name: "",
    genre: "",
    location: "",
    minPrice: "",
    maxPrice: "",
  })

  const [musicianUploadMessage, setMusicianUploadMessage] = useState("")
  const [bandUploadMessage, setBandUploadMessage] = useState("")
  const [createGigMessage, setCreateGigMessage] = useState("")
  const [createGigForm, setCreateGigForm] = useState({
    name: "",
    description: "",
    genre: "",
    location: "",
    minPrice: "",
    maxPrice: "",
    date: "",
  })

  function requireLogin(targetPath, expectedRole) {
    if (!isLoggedIn) {
      alert("Please login or sign up before continuing.")

      navigate("/login", {
        state: {
          from: { pathname: targetPath },
          expectedRole,
        },
      })

      return false
    }

    navigate(targetPath)

    return true
  }

  function handleChange(e) {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    })
  }

  function getPreferredLoginRole() {
    if (location.pathname !== "/login") {
      return null
    }

    const expectedRole = location.state?.expectedRole
    if (expectedRole) {
      return expectedRole
    }

    const fromPath = location.state?.from?.pathname
    if (fromPath === "/dashboard") {
      return "Venue"
    }
    if (fromPath === "/gigs") {
      return "Artist"
    }
    if (fromPath === "/bands" || fromPath?.startsWith("/bands/")) {
      return "Venue"
    }

    return null
  }

  async function createOrLoadMusicianProfile(email) {
    const normalizedName = (email.split("@")[0] || "artist").trim().toLowerCase()
    const lookupResponse = await fetch(`${API_BASE_URL}/musicians?name=${encodeURIComponent(normalizedName)}&limit=1`)
    const lookupPayload = await lookupResponse.json()

    if (lookupResponse.ok && lookupPayload.data?.length) {
      return lookupPayload.data[0]
    }

    const createResponse = await fetch(`${API_BASE_URL}/musicians`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: normalizedName,
        band_affiliations: [],
        instruments: [],
        bio: "",
      }),
    })
    const createPayload = await createResponse.json()

    if (!createResponse.ok || !createPayload.data) {
      throw new Error("Could not create musician profile")
    }

    return createPayload.data
  }

  async function createOrLoadVenueProfile(email) {
    const venueName = (email.split("@")[0] || "venue").trim().toLowerCase()
    const lookupResponse = await fetch(`${API_BASE_URL}/venues?name=${encodeURIComponent(venueName)}`)
    const lookupPayload = await lookupResponse.json()

    if (lookupResponse.ok && lookupPayload.data?.length) {
      return lookupPayload.data[0]
    }

    const createResponse = await fetch(`${API_BASE_URL}/venues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: venueName,
        address: "unknown",
        city: "unknown",
        state: "na",
        zip: "00000",
        capacity: 0,
        contact_email: email || "venue@example.com",
        description: "",
      }),
    })
    const createPayload = await createResponse.json()
    if (!createResponse.ok || !createPayload.data) {
      throw new Error("Could not create venue profile")
    }
    return createPayload.data
  }

  async function handleBandLogin() {
    setProfile({
      ...profile,
      email: loginEmail,
      password: loginPassword,
      role: "Artist",
    })

    setIsLoggedIn(true)

    try {
      const musicianRecord = await createOrLoadMusicianProfile(loginEmail)
      setMusicianId(musicianRecord._id)
      setProfile((prev) => ({
        ...prev,
        profilePictureUrl: musicianRecord.profile_picture_url || "",
      }))
    } catch (error) {
      console.error("Failed to initialize musician profile:", error)
    }

    const from = location.state?.from?.pathname

    navigate(from || "/gigs", { replace: true })
  }

  function handleVenueLogin() {
    setProfile({
      ...profile,
      email: loginEmail,
      password: loginPassword,
      role: "Venue",
    })

    setIsLoggedIn(true)

    createOrLoadVenueProfile(loginEmail)
      .then((venueRecord) => {
        setVenueId(venueRecord._id || "")
      })
      .catch((error) => {
        console.error("Failed to initialize venue profile:", error)
      })

    const from = location.state?.from?.pathname

    navigate(from || "/dashboard", { replace: true })
  }

  function handleLogout() {
    setIsLoggedIn(false)
    setMusicianId("")
    setVenueId("")
    setBandDetails(null)
    setBandDetailsError("")
    setCreateBandMessage("")
    setMusicianUploadMessage("")
    setBandUploadMessage("")
    navigate("/", { replace: true })
  }

  const preferredLoginRole = getPreferredLoginRole()
  const showMusicianLogin = !preferredLoginRole || preferredLoginRole === "Artist"
  const showVenueLogin = !preferredLoginRole || preferredLoginRole === "Venue"

  const [musicianDetails, setMusicianDetails] = useState(null);
  const pathMusicianId = location.pathname.match(/^\/musicians\/([^/]+)$/)?.[1];
  
  async function uploadMusicianProfilePicture(file) {
    const validationMessage = validateImageFile(file)
    if (validationMessage) {
      setMusicianUploadMessage(validationMessage)
      return
    }

    if (!musicianId) {
      setMusicianUploadMessage("Please sign in as a musician first.")
      return
    }

    const body = new FormData()
    body.append("image", file)

    const response = await fetch(`${API_BASE_URL}/musicians/${musicianId}/profile-picture`, {
      method: "POST",
      body,
    })
    const payload = await response.json()

    if (!response.ok) {
      setMusicianUploadMessage(payload.error || "Failed to upload musician profile picture.")
      return
    }

    setProfile((prev) => ({
      ...prev,
      profilePictureUrl: payload.data.profile_picture_url || "",
    }))
    setMusicianUploadMessage("Profile picture uploaded.")
  }
  
  async function handleMusicianGalleryUpload(file) {
    const validationMessage = validateImageFile(file)
    if (validationMessage) {
      setMusicianUploadMessage(validationMessage)
      return
    }
    if(!pathMusicianId) {
      setMusicianUploadMessage("No musician selected")
      return
    }
    const body = new FormData()
    body.append("image", file)

    const response = await fetch(`${API_BASE_URL}/musicians/${pathMusicianId}/gallery`, {
      method: "POST",
      body,
  })
  const payload = await response.json()
  if (!response.ok) {
    setMusicianUploadMessage(payload.error || "Failed to upload photos")
    return
  }

  setMusicianDetails(payload.data)
}

  const [musicianVideoLink, setMusicianVideoLink] = useState("");  
  async function addMusicianVideo() {
    const response = await fetch(`${API_BASE_URL}/musicians/${musicianId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ musicianVideoUrl: musicianVideoLink }),
    });
    const payload = await response.json();
    if (response.ok) {
      setProfile(prev => ({ ...prev, video_urls: payload.data.video_urls }));
      setMusicianVideoLink("");
    }
  }

  async function removeMusicianVideo(videoId) {
    const response = await fetch(`${API_BASE_URL}/musicians/${musicianId}/videos/${videoId}`, {
      method: "DELETE"
    });
    const payload = await response.json();
    if (response.ok) setProfile(prev => ({ ...prev, video_urls: payload.data.video_urls }));
  }

  async function uploadBandProfilePicture(file) {
    const validationMessage = validateImageFile(file)
    if (validationMessage) {
      setBandUploadMessage(validationMessage)
      return
    }

    if (!bandDetails?._id) {
      setBandUploadMessage("No band selected.")
      return
    }

    const body = new FormData()
    body.append("image", file)

    const response = await fetch(`${API_BASE_URL}/bands/${bandDetails._id}/profile-picture`, {
      method: "POST",
      body,
    })
    const payload = await response.json()

    if (!response.ok) {
      setBandUploadMessage(payload.error || "Failed to upload band profile picture.")
      return
    }

    setBandDetails(payload.data)
    setBandUploadMessage("Band profile picture uploaded.")
  }

  async function uploadBandGalleryImage(file) {
    const validationMessage = validateImageFile(file)
    if (validationMessage) {
      setBandUploadMessage(validationMessage)
      return
    }

    if (!bandDetails?._id) {
      setBandUploadMessage("No band selected.")
      return
    }

    const body = new FormData()
    body.append("image", file)

    const response = await fetch(`${API_BASE_URL}/bands/${bandDetails._id}/gallery`, {
      method: "POST",
      body,
    })
    const payload = await response.json()

    if (!response.ok) {
      setBandUploadMessage(payload.error || "Failed to upload gallery image.")
      return
    }

    setBandDetails(payload.data)
    setBandUploadMessage("Gallery image uploaded.")
  }

  async function removeBandGalleryImage(imageUrl) {
    if (!bandDetails?._id) {
      return
    }

    const response = await fetch(`${API_BASE_URL}/bands/${bandDetails._id}/gallery`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    })
    const payload = await response.json()

    if (!response.ok) {
      setBandUploadMessage(payload.error || "Failed to remove gallery image.")
      return
    }

    setBandDetails(payload.data)
    setBandUploadMessage("Gallery image removed.")
  }

  const [bandVideoLink, setBandVideoLink] = useState("");
  async function addBandVideo() {
    const response = await fetch(`${API_BASE_URL}/bands/${bandDetails._id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl: bandVideoLink }),
    });
    const payload = await response.json();
    if (response.ok) {
      setBandDetails(payload.data);
      setBandVideoLink("");
    }
  }

  async function removeBandVideo(videoId) {
    const response = await fetch(`${API_BASE_URL}/bands/${bandDetails._id}/videos/${videoId}`, {
      method: "DELETE"
    });
    const payload = await response.json();
    if (response.ok) setBandDetails(payload.data);
  }

  async function createBandFromForm(event) {
    event.preventDefault()
    setCreateBandMessage("")

    if (!createBandForm.name.trim()) {
      setCreateBandMessage("Band name is required.")
      return
    }

    if (!musicianId) {
      setCreateBandMessage("Sign in as a musician first so we can attach you as a member.")
      return
    }

    const minPrice = Number(createBandForm.minPrice || 0)
    const maxPrice = Number(createBandForm.maxPrice || 0)
    if (Number.isNaN(minPrice) || Number.isNaN(maxPrice) || minPrice < 0 || maxPrice < minPrice) {
      setCreateBandMessage("Enter a valid price range.")
      return
    }

    const payload = {
      name: createBandForm.name.trim().toLowerCase(),
      members: [musicianId],
      genres: createBandForm.genre.trim() ? [createBandForm.genre.trim().toLowerCase()] : [],
      locations: createBandForm.location.trim() ? [createBandForm.location.trim().toLowerCase()] : [],
      price_range: [minPrice, maxPrice],
    }

    const response = await fetch(`${API_BASE_URL}/bands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await response.json()

    if (!response.ok) {
      setCreateBandMessage(data.error || "Failed to create band.")
      return
    }

    if (!data.data?._id) {
      setCreateBandMessage("Band API returned an unexpected response.")
      return
    }

    setCreateBandMessage("Band created.")
    setBands((prev) => [data.data, ...prev.filter((band) => band._id !== data.data._id)])
    setCreateBandForm({
      name: "",
      genre: "",
      location: "",
      minPrice: "",
      maxPrice: "",
    })
    navigate("/my-band")
  }

  async function createGigFromForm(event) {
    event.preventDefault()
    setCreateGigMessage("")

    if (!createGigForm.name.trim()) {
      setCreateGigMessage("Gig title is required.")
      return
    }
    if (!venueId) {
      setCreateGigMessage("Please log in as a venue first.")
      return
    }

    const minPrice = Number(createGigForm.minPrice || 0)
    const maxPrice = Number(createGigForm.maxPrice || 0)
    if (Number.isNaN(minPrice) || Number.isNaN(maxPrice) || minPrice < 0 || maxPrice < minPrice) {
      setCreateGigMessage("Enter a valid price range.")
      return
    }

    const payload = {
      name: createGigForm.name.trim().toLowerCase(),
      description: createGigForm.description.trim(),
      genres: createGigForm.genre.trim() ? [createGigForm.genre.trim().toLowerCase()] : [],
      location: createGigForm.location.trim().toLowerCase(),
      price_range: [minPrice, maxPrice],
      date: createGigForm.date ? new Date(createGigForm.date).toISOString() : new Date().toISOString(),
      time: [],
      host: venueId,
      booked: false,
      bands_hired: [],
    }

    const response = await fetch(`${API_BASE_URL}/gigs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok || !data.data?._id) {
      setCreateGigMessage(data.error || "Failed to create gig.")
      return
    }

    setCreateGigMessage("Gig created.")
    setGigs((prev) => [data.data, ...prev.filter((gig) => gig._id !== data.data._id)])
    setCreateGigForm({
      name: "",
      description: "",
      genre: "",
      location: "",
      minPrice: "",
      maxPrice: "",
      date: "",
    })
  }

  useEffect(() => {
    if (location.pathname === "/bands" || location.pathname === "/my-band") {
      fetch(`${API_BASE_URL}/bands`)
        .then((res) => res.json())
        .then((data) => {
          setBands(data.data)
        })
        .catch((err) => console.error("Failed to load bands:", err))
    }

    if (location.pathname === "/dashboard") {
      fetch(`${API_BASE_URL}/venues`)
        .then((res) => res.json())
        .then((data) => {
          setVenues(data.data)
        })
        .catch((err) => console.error("Failed to load venues:", err))
    }

    if (location.pathname === "/gigs") {
      fetch(`${API_BASE_URL}/gigs`)
        .then((res) => res.json())
        .then((data) => {
          setGigs(data.data || [])
        })
        .catch((err) => console.error("Failed to load gigs:", err))
    }

    const bandId = getBandIdFromPath(location.pathname)
    if (bandId) {
      fetch(`${API_BASE_URL}/bands/${bandId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Band not found")
          }
          return res.json()
        })
        .then((data) => {
          setBandDetails(data.data)
          setBandDetailsError("")
        })
        .catch(() => {
          setBandDetails(null)
          setBandDetailsError("Could not load this band.")
        })
    }

    if (pathMusicianId) {
    fetch(`${API_BASE_URL}/musicians/${pathMusicianId}`)
      .then(res => res.json())
      .then(data => setMusicianDetails(data.data));
    }
  }, [location.pathname, pathMusicianId])

  return (
    <>
      <header className="navbar">
        <Link to="/" className="logo" id="homeLogo">
          ?? Giggly ??
        </Link>

        <div className="nav-buttons">
          {!isLoggedIn && (
            <>
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
            </>
          )}

          {isLoggedIn && profile.role === "Artist" && (
            <>
              <button
                type="button"
                onClick={() => navigate("/gigs")}
              >
                Find a Gig
              </button>
              <button
                type="button"
                onClick={() => navigate("/my-band")}
              >
                My Band
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
              >

                My Page
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/musicians/${musicianId}`)}
                >

                Profile
              </button>
              <button
                type="button"
                onClick={handleLogout}
              >

                Log Out
              </button>
            </>
          )}

          {isLoggedIn && profile.role === "Venue" && (
            <>
              <button
                type="button"
                onClick={() => navigate("/bands")}
              >
                Hire a Band
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </>
          )}
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
                    requireLogin("/bands", "Venue")
                  }}
                >
                  Hire a Band
                </button>

                <button
                  type="button"
                  id="findGigBtn"
                  onClick={() => {
                    requireLogin("/gigs", "Artist")
                  }}
                >
                  Find a Gig
                </button>
              </div>
            </section>
          }
        />

        <Route
          path="/bands"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <section id="bands" className="page active">
                <h2>Featured Bands</h2>

                <div className="search-row">
                  <input type="text" placeholder="Search for bands near you..." />

                  <select>
                    <option>Filter by</option>
                    <option>Genre</option>
                    <option>Price</option>
                    <option>Distance</option>
                  </select>
                </div>

                <div className="card-grid">
                  {bands.map((band, index) => (
                    <div key={index} className="card band-card">
                      <h3>{band.name}</h3>

                      <p>{band.location}</p>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => navigate(`/bands/${band._id}`)}
                      >
                        Open Profile
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-band"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              {profile.role !== "Artist" ? (
                <Navigate to="/bands" replace />
              ) : (
                <section id="bands" className="page active">
                  <h2>My Band</h2>

                  <button
                    type="button"
                    className="create-band-tile"
                    onClick={() => navigate("/bands/create")}
                  >
                    <span className="create-band-tile-title">Create Band</span>
                    <span className="create-band-tile-subtitle">
                      Create your band profile, then add photos in its profile page
                    </span>
                  </button>

                  <div className="card-grid">
                    {bands
                      .filter((band) => (band.members || []).includes(musicianId))
                      .map((band) => (
                        <div key={band._id} className="card band-card">
                          <h3>{band.name}</h3>
                          <p>{band.locations?.[0] || "No location yet"}</p>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => navigate(`/bands/${band._id}`)}
                          >
                            Manage Band
                          </button>
                        </div>
                      ))}
                  </div>
                </section>
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/bands/create"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              {profile.role !== "Artist" ? (
                <Navigate to="/bands" replace />
              ) : (
                <section id="bands" className="page active">
                  <div className="create-band-form-page">
                    <form className="create-band-form" onSubmit={createBandFromForm}>
                      <h3>Create Band</h3>
                      <input
                        type="text"
                        placeholder="Band name"
                        value={createBandForm.name}
                        onChange={(event) =>
                          setCreateBandForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Genre (optional)"
                        value={createBandForm.genre}
                        onChange={(event) =>
                          setCreateBandForm((prev) => ({ ...prev, genre: event.target.value }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Location (optional)"
                        value={createBandForm.location}
                        onChange={(event) =>
                          setCreateBandForm((prev) => ({ ...prev, location: event.target.value }))
                        }
                      />
                      <div className="create-band-price-row">
                        <input
                          type="number"
                          min="0"
                          placeholder="Min price"
                          value={createBandForm.minPrice}
                          onChange={(event) =>
                            setCreateBandForm((prev) => ({ ...prev, minPrice: event.target.value }))
                          }
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="Max price"
                          value={createBandForm.maxPrice}
                          onChange={(event) =>
                            setCreateBandForm((prev) => ({ ...prev, maxPrice: event.target.value }))
                          }
                        />
                      </div>
                      <button type="submit" className="primary-btn create-band-btn">
                        Create Band
                      </button>
                      {createBandMessage && <p className="upload-message">{createBandMessage}</p>}
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => navigate("/my-band")}
                      >
                        Back to My Band
                      </button>
                    </form>
                  </div>
                </section>
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/bands/:id"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <section id="bands" className="page active">
                <div className="profile-popup band-profile-popup">
                  {bandDetailsError && <p className="upload-message error">{bandDetailsError}</p>}

                  {!bandDetails && !bandDetailsError && <p>Loading band profile...</p>}

                  {bandDetails && (
                    <>
                      <h2>{bandDetails.name}</h2>

                      <img
                        className="profile-image"
                        src={bandDetails.profile_picture_url || DEFAULT_PLACEHOLDER_IMAGE}
                        alt="Band profile"
                      />

                      <div className="profile-row upload-row">
                        <span className="label">Band Profile Picture</span>
                        <input
                          className="edit-input"
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) {
                              uploadBandProfilePicture(file)
                            }
                          }}
                        />
                      </div>

                      <div className="profile-row upload-row">
                        <span className="label">Add Gallery Photo</span>
                        <input
                          className="edit-input"
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) {
                              uploadBandGalleryImage(file)
                            }
                          }}
                        />
                      </div>

                      <h3 className="gallery-title">Gallery</h3>

                      <div className="gallery-grid">
                        {(bandDetails.gallery_images || []).length === 0 && (
                          <p className="gallery-empty">No gallery images yet.</p>
                        )}

                        {(bandDetails.gallery_images || []).map((imageUrl) => (
                          <div className="gallery-item" key={imageUrl}>
                            <img src={imageUrl} alt="Band gallery" />
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => removeBandGalleryImage(imageUrl)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className = "profile-row upload-row">
                        <span className="label">Upload YouTube Video</span>
                        <input
                          className="edit-input"
                          placeholder="Paste YouTube link here"
                          value={bandVideoLink}
                          onChange={(e) => setBandVideoLink(e.target.value)}
                          />
                          <button onClick={addBandVideo} className="secondary-btn" style={{width: 'auto', marginTop: 0}}>Add</button>
                      </div>

                      <div className="video-grid">
                        {bandDetails.video_urls?.map(vidId => (
                          <div key={vidId} className="video-item">
                            <iframe
                              width="100%"
                              height="200"
                              src={`https://www.youtube.com/embed/${vidId}`}
                              frameBorder="0"
                              allowFullScreen
                              ></iframe>
                              <button className="secondary-btn" onClick={() => removeBandVideo(vidId)}>Remove Video</button>
                              </div>
                        ))}
                      </div>
                      
                      {bandUploadMessage && <p className="upload-message">{bandUploadMessage}</p>}

                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => navigate("/bands")}
                      >
                        Back to Bands
                      </button>
                    </>
                  )}
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        <Route path="/bands/:id/public" element={<BandPublicProfile />} />

        <Route path="/musicians/:id" element={
          // <ProtectedRoute isLoggedIn={isLoggedIn}>
            <section id="profile" className="page active">
              <div className="profile-popup band-profile-popup">
                {musicianDetails && (
                  <>
                  <img className="profile-image" src={musicianDetails.profile_picture_url || DEFAULT_PLACEHOLDER_IMAGE} />
                  <h2>{musicianDetails.name}</h2>
                  <p className="bio-text">{musicianDetails.bio || "No bio yet."}</p>
                  
                  {/* editing tools to be shown only if logged in as ownder*/}
                  {/* {musicianId === pathMusicianId && ( */}
                    <div className="management-box" style={{border: '1px dashed" #667eea', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                      <h4 style={{marginBottom: '10px'}}>Manage your page</h4>
                      <div className = "profile-row upload-row">
                        <span className="label">Upload YouTube Video</span>
                        <input
                          className="edit-input"
                          placeholder="Paste YouTube link here"
                          value={musicianVideoLink}
                          onChange={(e) => setMusicianVideoLink(e.target.value)}
                          />
                          <button className="secondary-btn" onClick={addMusicianVideo}>Add</button>
                      </div>
                      <div className="profile-row upload-row">
                        <span className="label">Add photo</span>
                        <input className="edit-input" type="file" onChange={(e) => handleMusicianGalleryUpload(e.target.files[0])} />
                      </div>
                    </div>
                  {/* )} */}

                  <h3>Videos</h3>
                  <div className="video-grid">
                        {musicianDetails.video_urls?.map(vidId => (
                          <div key={vidId} className="video-item">
                            <iframe src={`https://www.youtube.com/embed/${vidId}`} frameBorder="0" allowFullScreen></iframe>
                            {musicianId === pathMusicianId && (
                                <button className="secondary-btn" onClick={() => removeMusicianVideo(vidId)}>Remove Video</button>
                            )}  
                            </div>
                      ))}
                    </div>

                  <h3>Photos</h3>
                  <div className="gallery-grid">
                    {musicianDetails.gallery_images?.map(url => (
                      <div className="gallery-item" key={url}><img src={url} /></div>
                    ))}
                  </div>
                  </>
                )}
              </div>
            </section>
          // </ProtectedRoute>
        } />

        <Route
          path="/gigs"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
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
                        <h3>{gig.name}</h3>
                        <p>{gig.description}</p>
                        <p>{gig.location}</p>
                        <p>
                          ${gig.price_range?.[0] ?? 0} - ${gig.price_range?.[1] ?? 0}
                        </p>
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
                  {showMusicianLogin && (
                    <button
                      type="button"
                      id="loginBandBtn"
                      className={`login-role-btn ${preferredLoginRole === "Artist" ? "recommended-role" : ""}`}
                      onClick={handleBandLogin}
                    >
                      Log In As Musician
                    </button>
                  )}

                  {showVenueLogin && (
                    <button
                      type="button"
                      id="loginVenueBtn"
                      className={`login-role-btn ${preferredLoginRole === "Venue" ? "recommended-role" : ""}`}
                      onClick={handleVenueLogin}
                    >
                      Log In As Venue
                    </button>
                  )}
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

                  <img
                    className="profile-image"
                    src={profile.profilePictureUrl || DEFAULT_PLACEHOLDER_IMAGE}
                    alt="Musician profile"
                  />

                  <div className="profile-row upload-row">
                    <span className="label">Profile Picture</span>
                    <input
                      className="edit-input"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          uploadMusicianProfilePicture(file)
                        }
                      }}
                    />
                  </div>

                  {musicianUploadMessage && <p className="upload-message">{musicianUploadMessage}</p>}

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
                          {"�".repeat(profile.password.length)}
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

                  <form className="create-band-form" onSubmit={createGigFromForm}>
                    <h3>Create Gig</h3>
                    <input
                      type="text"
                      placeholder="Gig title"
                      value={createGigForm.name}
                      onChange={(event) =>
                        setCreateGigForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={createGigForm.description}
                      onChange={(event) =>
                        setCreateGigForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Genre"
                      value={createGigForm.genre}
                      onChange={(event) =>
                        setCreateGigForm((prev) => ({ ...prev, genre: event.target.value }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Location"
                      value={createGigForm.location}
                      onChange={(event) =>
                        setCreateGigForm((prev) => ({ ...prev, location: event.target.value }))
                      }
                    />
                    <input
                      type="date"
                      value={createGigForm.date}
                      onChange={(event) =>
                        setCreateGigForm((prev) => ({ ...prev, date: event.target.value }))
                      }
                    />
                    <div className="create-band-price-row">
                      <input
                        type="number"
                        min="0"
                        placeholder="Min price"
                        value={createGigForm.minPrice}
                        onChange={(event) =>
                          setCreateGigForm((prev) => ({ ...prev, minPrice: event.target.value }))
                        }
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Max price"
                        value={createGigForm.maxPrice}
                        onChange={(event) =>
                          setCreateGigForm((prev) => ({ ...prev, maxPrice: event.target.value }))
                        }
                      />
                    </div>
                    <button type="submit" className="primary-btn create-band-btn">
                      Post Gig
                    </button>
                    {createGigMessage && <p className="upload-message">{createGigMessage}</p>}
                  </form>

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
  )
}

import { useState, useEffect } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  Routes,
  Route,
  Link,
} from "react-router-dom";
import Gigs from "./components/Gigs.jsx";
import logoG from "./assets/giggly_g_logo-removebg-preview.png";
import {
  API_URL,
  authFetch,
  clearAuthToken,
  getAuthToken,
  loadSearchArea,
  login as apiLogin,
  register as apiRegister,
  saveSearchArea,
  verifyAuth as apiVerifyAuth,
  updateBand,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getConversations,
  createConversation,
  getConversationMessages,
  sendConversationMessage,
  markConversationAsRead,
} from "./api/api.js";
import "./App.css";
import BandPublicProfile from "./components/BandPublicProfile.jsx";
import Location from "./components/location.jsx";
import BandsPage from "./components/Bands.jsx";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const DEFAULT_PLACEHOLDER_IMAGE =
  "https://placehold.co/240x240/png?text=No+Photo";

function ProtectedRoute({
  isLoggedIn,
  userRole,
  allowedRoles = [],
  redirectTo = "/",
  children,
}) {
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

function getBandIdFromPath(pathname) {
  const match = pathname.match(/^\/bands\/([^/]+)$/);
  return match ? match[1] : null;
}

function validateImageFile(file) {
  if (!file) {
    return "Please choose an image file.";
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "Only JPG, PNG, WEBP, and GIF files are allowed.";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Image must be 5MB or smaller.";
  }
  return null;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authTokenChecked, setAuthTokenChecked] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authUser, setAuthUser] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [messageError, setMessageError] = useState("");

  const [isEditing, setIsEditing] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginDisplayName, setLoginDisplayName] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  const [musicianId, setMusicianId] = useState("");
  const [venueId, setVenueId] = useState("");

  const [profile, setProfile] = useState({
    first: "First Name",
    last: "Last Name",
    email: "hello@email.com",
    password: "12345",
    role: "Artist",
    profilePictureUrl: "",
  });

  const [bands, setBands] = useState([]);

  const [venues, setVenues] = useState([]);

  const [gigs, setGigs] = useState([]);

  const [searchArea, setSearchArea] = useState(loadSearchArea);

  function updateSearchArea(area) {
    setSearchArea(area);
    saveSearchArea(area);
  }

  const [bandDetails, setBandDetails] = useState(null);
  const [bandDetailsError, setBandDetailsError] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [createBandMessage, setCreateBandMessage] = useState("");
  const [createBandForm, setCreateBandForm] = useState({
    name: "",
    genre: "",
    location: "",
    rate: "",
    bio: "",
  });

  const [musicianUploadMessage, setMusicianUploadMessage] = useState("");
  const [bandUploadMessage, setBandUploadMessage] = useState("");
  const [createGigMessage, setCreateGigMessage] = useState("");
  const [createGigForm, setCreateGigForm] = useState({
    name: "",
    description: "",
    genre: "",
    zip: "",
    address: "",
    capacity: "",
    minPrice: "",
    maxPrice: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  function requireLogin(targetPath, expectedRole) {
    if (!isLoggedIn) {
      alert("Please login or sign up before continuing.");

      navigate("/login", {
        state: {
          from: { pathname: targetPath },
          expectedRole,
        },
      });

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

  function getPreferredLoginRole() {
    if (location.pathname !== "/login") {
      return null;
    }

    const expectedRole = location.state?.expectedRole;
    if (expectedRole) {
      return expectedRole;
    }

    const fromPath = location.state?.from?.pathname;
    if (fromPath === "/dashboard") {
      return "Venue";
    }
    if (fromPath === "/gigs") {
      return "Artist";
    }
    if (fromPath === "/bands" || fromPath?.startsWith("/bands/")) {
      return "Venue";
    }

    return null;
  }

  function toFrontendRole(role) {
    if (role === "musician" || role === "band") return "Artist";
    if (role === "venue") return "Venue";
    return "Artist";
  }

  function toBackendRole(frontendRole) {
    if (frontendRole === "Venue") return "venue";
    return "musician";
  }

  async function createOrLoadMusicianProfile(email) {
    const normalizedName = (email.split("@")[0] || "artist")
      .trim()
      .toLowerCase();
    const lookupResponse = await fetch(
      `${API_URL}/musicians?name=${encodeURIComponent(normalizedName)}&limit=1`,
    );
    const lookupPayload = await lookupResponse.json();

    if (lookupResponse.ok && lookupPayload.data?.length) {
      return lookupPayload.data[0];
    }

    const createResponse = await authFetch(`/musicians`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: normalizedName,
        band_affiliations: [],
        instruments: [],
        bio: "",
      }),
    });
    const createPayload = await createResponse.json();

    if (!createResponse.ok || !createPayload.data) {
      throw new Error("Could not create musician profile");
    }

    return createPayload.data;
  }

  async function createOrLoadVenueProfile(email) {
    const venueName = (email.split("@")[0] || "venue").trim().toLowerCase();
    const lookupResponse = await fetch(
      `${API_URL}/venues?contact_email=${encodeURIComponent(email)}`,
    );
    const lookupPayload = await lookupResponse.json();

    if (lookupResponse.ok && lookupPayload.data?.length) {
      return lookupPayload.data[0];
    }

    const createResponse = await authFetch(`/venues`, {
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
    });
    const createPayload = await createResponse.json();
    if (!createResponse.ok || !createPayload.data) {
      throw new Error("Could not create venue profile");
    }
    return createPayload.data;
  }

  async function handleAuthSubmit(desiredFrontendRole) {
    setAuthError("");
    const email = String(loginEmail || "")
      .trim()
      .toLowerCase();
    const password = String(loginPassword || "");
    if (!email || !password) {
      setAuthError("Please enter an email and password.");
      return;
    }

    try {
      if (isSigningUp) {
        const displayName = String(loginDisplayName || "").trim();
        if (!displayName) {
          setAuthError("Please enter a display name to sign up.");
          return;
        }
        await apiRegister({
          email,
          password,
          display_name: displayName,
          role: toBackendRole(desiredFrontendRole),
        });
      }

      const data = await apiLogin({ email, password });
      const backendRole = data?.user?.role;
      const frontendRole = toFrontendRole(backendRole);
      setAuthUser({
        id: String(data?.user?.id || data?.user?._id || ""),
        email: data?.user?.email || email,
        displayName: data?.user?.display_name || "",
      });

      setProfile((prev) => ({
        ...prev,
        email,
        password,
        role: frontendRole,
      }));

      setIsNotificationMenuOpen(false);
      setIsNotificationModalOpen(false);
      setIsLoggedIn(true);

      if (frontendRole === "Artist") {
        const musicianRecord = await createOrLoadMusicianProfile(email);
        setMusicianId(musicianRecord._id);
        setProfile((prev) => ({
          ...prev,
          profilePictureUrl: musicianRecord.profile_picture_url || "",
        }));
      } else {
        const venueRecord = await createOrLoadVenueProfile(email);
        setVenueId(venueRecord._id || "");
      }

      const from = location.state?.from?.pathname;
      if (frontendRole === "Venue") {
        navigate(from || "/dashboard", { replace: true });
      } else {
        navigate("/gigs", { replace: true });
      }
    } catch (err) {
      setIsLoggedIn(false);
      setMusicianId("");
      setVenueId("");
      setAuthError(err?.message || "Authentication failed.");
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setAuthUser(null);
    setNotifications([]);
    setUnreadCount(0);
    setNotificationError("");
    setIsNotificationMenuOpen(false);
    setIsNotificationModalOpen(false);
    setMusicianId("");
    setVenueId("");
    setBandDetails(null);
    setBandDetailsError("");
    setCreateBandMessage("");
    setMusicianUploadMessage("");
    setBandUploadMessage("");
    setAuthError("");
    clearAuthToken();
    navigate("/", { replace: true });
  }

  const preferredLoginRole = getPreferredLoginRole();
  const showMusicianLogin =
    !preferredLoginRole || preferredLoginRole === "Artist";
  const showVenueLogin = !preferredLoginRole || preferredLoginRole === "Venue";

  const [musicianDetails, setMusicianDetails] = useState(null);
  const pathMusicianId = location.pathname.match(/^\/musicians\/([^/]+)$/)?.[1];
  const currentUserId = authUser?.id || "";
  const canManageCurrentBand = Boolean(
    isLoggedIn &&
    profile.role === "Artist" &&
    bandDetails &&
    (String(bandDetails.owner_user || "") === currentUserId ||
      (musicianId &&
        (bandDetails.members || []).some(
          (memberId) => String(memberId) === String(musicianId),
        ))),
  );
  const canManageCurrentMusicianPage = Boolean(
    isLoggedIn &&
    profile.role === "Artist" &&
    musicianDetails &&
    (String(musicianDetails.owner_user || "") === currentUserId ||
      (musicianId && musicianId === pathMusicianId)),
  );

  async function uploadMusicianProfilePicture(file) {
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setMusicianUploadMessage(validationMessage);
      return;
    }

    if (profile.role !== "Artist") {
      setMusicianUploadMessage(
        "Only artist accounts can edit musician profiles.",
      );
      return;
    }

    if (!musicianId) {
      setMusicianUploadMessage("Please sign in as a musician first.");
      return;
    }

    const body = new FormData();
    body.append("image", file);

    const response = await authFetch(
      `/musicians/${musicianId}/profile-picture`,
      { method: "POST", body },
    );
    const payload = await response.json();

    if (!response.ok) {
      setMusicianUploadMessage(
        payload.error || "Failed to upload musician profile picture.",
      );
      return;
    }

    setProfile((prev) => ({
      ...prev,
      profilePictureUrl: payload.data.profile_picture_url || "",
    }));
    setMusicianUploadMessage("Profile picture uploaded.");
  }

  async function handleMusicianGalleryUpload(file) {
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setMusicianUploadMessage(validationMessage);
      return;
    }
    if (!pathMusicianId) {
      setMusicianUploadMessage("No musician selected");
      return;
    }
    if (!canManageCurrentMusicianPage) {
      setMusicianUploadMessage("You can only manage your own musician page.");
      return;
    }
    const body = new FormData();
    body.append("image", file);

    const response = await authFetch(`/musicians/${pathMusicianId}/gallery`, {
      method: "POST",
      body,
    });
    const payload = await response.json();
    if (!response.ok) {
      setMusicianUploadMessage(payload.error || "Failed to upload photos");
      return;
    }

    setMusicianDetails(payload.data);
  }

  const [musicianVideoLink, setMusicianVideoLink] = useState("");
  async function addMusicianVideo() {
    if (!canManageCurrentMusicianPage || !pathMusicianId) {
      setMusicianUploadMessage("You can only manage your own musician page.");
      return;
    }

    const response = await authFetch(`/musicians/${pathMusicianId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl: musicianVideoLink }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMusicianUploadMessage(payload.error || "Failed to add video.");
      return;
    }

    if (response.ok) {
      setMusicianDetails(payload.data);
      setMusicianVideoLink("");
    }
  }

  async function removeMusicianVideo(videoId) {
    if (!canManageCurrentMusicianPage || !pathMusicianId) {
      setMusicianUploadMessage("You can only manage your own musician page.");
      return;
    }

    const response = await authFetch(
      `/musicians/${pathMusicianId}/videos/${videoId}`,
      {
        method: "DELETE",
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      setMusicianUploadMessage(payload.error || "Failed to remove video.");
      return;
    }

    if (response.ok) {
      setMusicianDetails(payload.data);
    }
  }

  async function uploadBandProfilePicture(file) {
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setBandUploadMessage(validationMessage);
      return;
    }

    if (!bandDetails?._id) {
      setBandUploadMessage("No band selected.");
      return;
    }
    if (!canManageCurrentBand) {
      setBandUploadMessage("You can only manage bands you belong to.");
      return;
    }

    const body = new FormData();
    body.append("image", file);

    const response = await authFetch(
      `/bands/${bandDetails._id}/profile-picture`,
      {
        method: "POST",
        body,
      },
    );
    const payload = await response.json();

    if (!response.ok) {
      setBandUploadMessage(
        payload.error || "Failed to upload band profile picture.",
      );
      return;
    }

    setBandDetails(payload.data);
    setBandUploadMessage("Band profile picture uploaded.");
  }

  async function uploadBandGalleryImage(file) {
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setBandUploadMessage(validationMessage);
      return;
    }

    if (!bandDetails?._id) {
      setBandUploadMessage("No band selected.");
      return;
    }
    if (!canManageCurrentBand) {
      setBandUploadMessage("You can only manage bands you belong to.");
      return;
    }

    const body = new FormData();
    body.append("image", file);

    const response = await authFetch(`/bands/${bandDetails._id}/gallery`, {
      method: "POST",
      body,
    });
    const payload = await response.json();

    if (!response.ok) {
      setBandUploadMessage(payload.error || "Failed to upload gallery image.");
      return;
    }

    setBandDetails(payload.data);
    setBandUploadMessage("Gallery image uploaded.");
  }

  async function removeBandGalleryImage(imageUrl) {
    if (!bandDetails?._id) {
      return;
    }
    if (!canManageCurrentBand) {
      setBandUploadMessage("You can only manage bands you belong to.");
      return;
    }

    const response = await authFetch(`/bands/${bandDetails._id}/gallery`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setBandUploadMessage(payload.error || "Failed to remove gallery image.");
      return;
    }

    setBandDetails(payload.data);
    setBandUploadMessage("Gallery image removed.");
  }

  const [bandVideoLink, setBandVideoLink] = useState("");
  async function addBandVideo() {
    if (!bandDetails?._id || !canManageCurrentBand) {
      setBandUploadMessage("You can only manage bands you belong to.");
      return;
    }

    try {
      const response = await authFetch(`/bands/${bandDetails._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: bandVideoLink }),
      });

      if (response.status === 401) {
        setBandUploadMessage("Session expired. Please log out and back in.");
        return;
      }

      const payload = await response.json();

      if (response.ok) {
        setBandDetails(payload.data);
        setBandVideoLink("");
        setBandUploadMessage("Video added!");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }

  async function removeBandVideo(videoId) {
    if (!bandDetails?._id || !canManageCurrentBand) {
      setBandUploadMessage("You can only manage bands you belong to.");
      return;
    }

    const response = await authFetch(
      `/bands/${bandDetails._id}/videos/${videoId}`,
      {
        method: "DELETE",
      },
    );
    const payload = await response.json();
    if (response.ok) setBandDetails(payload.data);
  }

  async function createBandFromForm(event) {
    event.preventDefault();
    setCreateBandMessage("");

    if (profile.role !== "Artist") {
      setCreateBandMessage("Only artist accounts can create bands.");
      return;
    }

    if (!createBandForm.name.trim()) {
      setCreateBandMessage("Band name is required.");
      return;
    }
    if (!/^\d{5}$/.test(createBandForm.location.trim())) {
      setCreateBandMessage("Enter a valid 5-digit ZIP code.");
      return;
    }

    if (!musicianId) {
      setCreateBandMessage(
        "Sign in as a musician first so we can attach you as a member.",
      );
      return;
    }

    const rate = Number(createBandForm.rate || 0);

    if (Number.isNaN(rate) || rate < 0) {
      setCreateBandMessage("Enter a valid band rate.");
      return;
    }

    const payload = {
      name: createBandForm.name.trim().toLowerCase(),
      members: [musicianId],
      genres: createBandForm.genre.trim()
        ? [createBandForm.genre.trim().toLowerCase()]
        : [],
      locations: createBandForm.location.trim()
        ? [createBandForm.location.trim()]
        : [],
      price_range: [rate, rate],
      bio: createBandForm.bio,
    };

    const response = await authFetch(`/bands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      setCreateBandMessage(data.error || "Failed to create band.");
      return;
    }

    if (!data.data?._id) {
      setCreateBandMessage("Band API returned an unexpected response.");
      return;
    }

    setCreateBandMessage("Band created.");
    setBands((prev) => [
      data.data,
      ...prev.filter((band) => band._id !== data.data._id),
    ]);
    setCreateBandForm({
      name: "",
      genre: "",
      location: "",
      rate: "",
      bio: "",
    });
    navigate("/my-band");
  }

  async function createGigFromForm(event) {
    event.preventDefault();
    setCreateGigMessage("");

    if (profile.role !== "Venue") {
      setCreateGigMessage("Only venue accounts can create gigs.");
      return;
    }

    if (!createGigForm.name.trim()) {
      setCreateGigMessage("Gig title is required.");
      return;
    }
    if (!venueId) {
      setCreateGigMessage("Please log in as a venue first.");
      return;
    }

    if (!/^\d{5}$/.test(createGigForm.zip.trim())) {
      setCreateGigMessage("Enter a valid 5-digit ZIP code.");
      return;
    }

    const capacity = Number(createGigForm.capacity || 0);

    if (Number.isNaN(capacity) || capacity <= 0) {
      setCreateGigMessage("Enter a valid venue capacity.");
      return;
    }

    const minPrice = Number(createGigForm.minPrice || 0);
    const maxPrice = Number(createGigForm.maxPrice || 0);

    if (
      Number.isNaN(minPrice) ||
      Number.isNaN(maxPrice) ||
      minPrice <= 0 ||
      maxPrice <= 0 ||
      maxPrice < minPrice
    ) {
      setCreateGigMessage("Enter a valid pay range.");
      return;
    }

    if (!createGigForm.startTime || !createGigForm.endTime) {
      setCreateGigMessage("Enter a start and finish time.");
      return;
    }

    if (createGigForm.endTime <= createGigForm.startTime) {
      setCreateGigMessage("Finish time must be after start time.");
      return;
    }

    const payload = {
      name: createGigForm.name.trim().toLowerCase(),
      description: createGigForm.description.trim(),
      genres: createGigForm.genre.trim()
        ? [createGigForm.genre.trim().toLowerCase()]
        : [],
      location: createGigForm.zip.trim(),
      address: createGigForm.address.trim(),
      capacity,
      price_range: [minPrice, maxPrice],
      date: createGigForm.date
        ? new Date(createGigForm.date).toISOString()
        : new Date().toISOString(),
      time: [createGigForm.startTime, createGigForm.endTime],
      host: venueId,
      booked: false,
      bands_hired: [],
    };

    const response = await authFetch(`/gigs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok || !data.data?._id) {
      setCreateGigMessage(data.error || "Failed to create gig.");
      return;
    }

    setCreateGigMessage("Gig created.");
    setGigs((prev) => [
      data.data,
      ...prev.filter((gig) => gig._id !== data.data._id),
    ]);
    setCreateGigForm({
      name: "",
      description: "",
      genre: "",
      zip: "",
      address: "",
      capacity: "",
      minPrice: "",
      maxPrice: "",
      date: "",
      startTime: "",
      endTime: "",
    });
  }

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      Promise.resolve().then(() =>
        setAuthTokenChecked((prev) => (prev === false ? true : prev)),
      );
      return;
    }

    apiVerifyAuth()
      .then(async (data) => {
        const verifiedUser = data?.user || {};
        const backendRole = verifiedUser.role;
        const frontendRole = toFrontendRole(backendRole);
        setAuthUser({
          id: String(verifiedUser.id || verifiedUser._id || ""),
          email: verifiedUser.email || "",
          displayName: verifiedUser.display_name || "",
        });
        setProfile((prev) => ({
          ...prev,
          email: verifiedUser.email || prev.email,
          role: frontendRole,
        }));
        setIsLoggedIn(true);

        if (frontendRole === "Artist" && verifiedUser.email) {
          const musicianRecord = await createOrLoadMusicianProfile(
            verifiedUser.email,
          );
          setMusicianId(data?.profiles?.musicianId || musicianRecord._id || "");
          setVenueId("");
          setProfile((prev) => ({
            ...prev,
            profilePictureUrl: musicianRecord.profile_picture_url || "",
          }));
        }

        if (frontendRole === "Venue" && verifiedUser.email) {
          const venueRecord = await createOrLoadVenueProfile(
            verifiedUser.email,
          );
          setVenueId(data?.profiles?.venueId || venueRecord._id || "");
          setMusicianId("");
        }
      })
      .catch(() => {
        clearAuthToken();
        setIsLoggedIn(false);
        setAuthUser(null);
      })
      .finally(() => setAuthTokenChecked(true));
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    async function loadNotifications() {
      try {
        setNotificationError("");

        const items = await getNotifications(currentUserId);
        const count = await getUnreadNotificationCount(currentUserId);

        setNotifications(items || []);
        setUnreadCount(count || 0);
      } catch (err) {
        setNotificationError(err?.message || "Failed to load notifications.");
      }
    }

    loadNotifications();
  }, [currentUserId]);

  async function handleMarkNotificationRead(id) {
    await markNotificationAsRead(id);

    setNotifications((prev) =>
      prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)),
    );

    setUnreadCount((prev) => Math.max(prev - 1, 0));
  }

  async function handleMarkAllNotificationsRead() {
    if (!currentUserId) return;

    await markAllNotificationsAsRead(currentUserId);

    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));

    setUnreadCount(0);
  }

  async function handleDeleteNotification(id) {
    await deleteNotification(id);

    setNotifications((prev) => {
      const deleted = prev.find((item) => item._id === id);
      if (deleted && !deleted.isRead) {
        setUnreadCount((count) => Math.max(count - 1, 0));
      }

      return prev.filter((item) => item._id !== id);
    });
  }

  useEffect(() => {
    if (!currentUserId) {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    async function loadConversations() {
      try {
        setMessageError("");
        const items = await getConversations(currentUserId);
        setConversations(items || []);
      } catch (err) {
        setMessageError(err?.message || "Failed to load conversations.");
      }
    }

    loadConversations();
  }, [currentUserId]);

  async function handleOpenConversation(conversation) {
    try {
      setMessageError("");
      setActiveConversation(conversation);

      const items = await getConversationMessages(conversation._id);
      setMessages(items || []);

      await markConversationAsRead(conversation._id, currentUserId);
    } catch (err) {
      setMessageError(err?.message || "Failed to open conversation.");
    }
  }

  async function handleStartBandConversation(band) {
    if (!currentUserId || !venueId || !band?._id) {
      setMessageError("Please log in as a venue to message this band.");
      return;
    }

    const bandUserId = band.owner_user || band.ownerUserId;

    if (!bandUserId) {
      setMessageError("This band does not have an owner to message yet.");
      return;
    }

    try {
      setMessageError("");

      const conversation = await createConversation({
        bandId: band._id,
        venueId,
        bandUserId: String(bandUserId),
        venueUserId: currentUserId,
      });

      const conversationWithName = {
        ...conversation,
        otherUserDisplayName: band.name,
      };

      setActiveConversation(conversation);

      const items = await getConversationMessages(conversation._id);
      setMessages(items || []);

      setConversations((prev) => [
        conversationWithName,
        ...prev.filter((item) => item._id !== conversation._id),
      ]);

      navigate("/messages");
    } catch (err) {
      setMessageError(err?.message || "Failed to start conversation.");
    }
  }

  async function handleStartGigConversation(gig) {
    if (!currentUserId || profile.role !== "Artist") {
      setMessageError("Please log in as an artist to message this venue.");
      return;
    }

    const band = bands.find((item) =>
      (item.members || []).some(
        (memberId) => String(memberId) === String(musicianId),
      ),
    );

    if (!band) {
      setMessageError("Create or join a band before messaging venues.");
      return;
    }

    if (!gig.host || !gig.owner_user) {
      setMessageError("This gig is missing venue contact information.");
      return;
    }

    try {
      setMessageError("");

      const conversation = await createConversation({
        gigId: gig._id,
        bandId: band._id,
        venueId: gig.host,
        bandUserId: currentUserId,
        venueUserId: String(gig.owner_user),
      });

      const conversationWithName = {
        ...conversation,
        otherUserDisplayName: `Venue - ${gig.name}`,
      };

      setActiveConversation(conversationWithName);

      const items = await getConversationMessages(conversation._id);
      setMessages(items || []);

      setConversations((prev) => [
        conversationWithName,
        ...prev.filter((item) => item._id !== conversation._id),
      ]);

      navigate("/messages");
    } catch (err) {
      setMessageError(err?.message || "Failed to start conversation.");
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!activeConversation || !currentUserId || !messageText.trim()) {
      return;
    }

    try {
      setMessageError("");

      const senderRole =
        String(activeConversation.bandUserId) === String(currentUserId)
          ? "band"
          : "venue";

      const created = await sendConversationMessage(activeConversation._id, {
        senderUserId: currentUserId,
        senderRole,
        text: messageText.trim(),
      });

      setMessages((prev) => [...prev, created]);
      setMessageText("");

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation._id === activeConversation._id
            ? {
                ...conversation,
                lastMessage: created.text,
                lastMessageTime: created.createdAt,
              }
            : conversation,
        ),
      );
    } catch (err) {
      setMessageError(err?.message || "Failed to send message.");
    }
  }

  useEffect(() => {
    if (
      location.pathname === "/bands" ||
      location.pathname === "/my-band" ||
      (location.pathname === "/gigs" && profile.role === "Artist")
    ) {
      fetch(`${API_URL}/bands`)
        .then((res) => res.json())
        .then((data) => {
          setBands(data.data);
        })
        .catch((err) => console.error("Failed to load bands:", err));
    }

    if (location.pathname === "/dashboard") {
      if (venueId) {
        fetch(`${API_URL}/venues/${venueId}`)
          .then((res) => res.json())
          .then((data) => {
            setVenues(data.data ? [data.data] : []);
          })
          .catch((err) => console.error("Failed to load venue:", err));
      } else {
        setVenues([]);
      }
    }

    if (location.pathname === "/gigs") {
      fetch(`${API_URL}/gigs`)
        .then((res) => res.json())
        .then((data) => {
          setGigs(data.data || []);
        })
        .catch((err) => console.error("Failed to load gigs:", err));
    }

    const bandId = getBandIdFromPath(location.pathname);
    if (bandId) {
      fetch(`${API_URL}/bands/${bandId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Band not found");
          }
          return res.json();
        })
        .then((data) => {
          setBandDetails(data.data);
          setBandDetailsError("");
        })
        .catch(() => {
          setBandDetails(null);
          setBandDetailsError("Could not load this band.");
        });
    }

    if (pathMusicianId) {
      fetch(`${API_URL}/musicians/${pathMusicianId}`)
        .then((res) => res.json())
        .then((data) => setMusicianDetails(data.data));
    }
  }, [location.pathname, pathMusicianId, venueId, profile.role]);

  const saveBio = async () => {
    try {
      const result = await updateBand(bandDetails._id, { bio: tempBio });

      if (result) {
        setBandDetails({ ...bandDetails, bio: tempBio });
        setEditingBio(false);
        setBandUploadMessage("Bio updated successfully!");
      }
    } catch (err) {
      console.error("Update failed:", err);
      setBandUploadMessage("Update failed.");
    }
  };

  if (!authTokenChecked) {
    return (
      <div style={{ color: "white", textAlign: "center", marginTop: "50px" }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <header className="navbar">
        <Link to="/" className="logo-brand" id="homeLogo">
          <img src={logoG} alt="G" className="logo-img" />
          <span className="logo-text">iggly</span>
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
                onClick={() =>
                  searchArea?.coords
                    ? navigate("/bands", { state: searchArea })
                    : navigate("/location")
                }
              >
                Browse Bands
              </button>
              <button type="button" onClick={() => navigate("/gigs")}>
                Find a Gig
              </button>
              <button type="button" onClick={() => navigate("/my-band")}>
                My Band
              </button>
              <button type="button" onClick={() => navigate("/profile")}>
                My Page
              </button>
              <button
                type="button"
                onClick={() => navigate(`/musicians/${musicianId}`)}
              >
                Profile
              </button>

              <button type="button" onClick={() => navigate("/messages")}>
                Messages
              </button>

              <div className="notification-menu">
                <button
                  type="button"
                  className="notification-button"
                  onClick={() => setIsNotificationMenuOpen((open) => !open)}
                >
                  Notifications
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </button>

                {isNotificationMenuOpen && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <h3>Notifications</h3>

                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsRead}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {notificationError && (
                      <p className="notification-error">{notificationError}</p>
                    )}

                    <div className="notification-list">
                      {notifications.slice(0, 5).length === 0 ? (
                        <p className="notification-empty">
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.slice(0, 5).map((notification) => (
                          <div
                            key={notification._id}
                            className={`notification-item ${
                              notification.isRead ? "" : "unread"
                            }`}
                          >
                            <div>
                              <strong>{notification.title}</strong>
                              <p>{notification.body}</p>
                            </div>

                            <div className="notification-actions">
                              {!notification.isRead && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMarkNotificationRead(notification._id)
                                  }
                                >
                                  Read
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteNotification(notification._id)
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      className="notification-view-all"
                      onClick={() => {
                        setIsNotificationModalOpen(true);
                        setIsNotificationMenuOpen(false);
                      }}
                    >
                      View all
                    </button>
                  </div>
                )}
              </div>

              <button type="button" onClick={handleLogout}>
                Log Out
              </button>
            </>
          )}

          {isLoggedIn && profile.role === "Venue" && (
            <>
              <button type="button" onClick={() => navigate("/bands")}>
                Hire a Band
              </button>
              <button type="button" onClick={() => navigate("/dashboard")}>
                Dashboard
              </button>

              <button type="button" onClick={() => navigate("/messages")}>
                Messages
              </button>

              <div className="notification-menu">
                <button
                  type="button"
                  className="notification-button"
                  onClick={() => setIsNotificationMenuOpen((open) => !open)}
                >
                  Notifications
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </button>

                {isNotificationMenuOpen && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <h3>Notifications</h3>

                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsRead}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {notificationError && (
                      <p className="notification-error">{notificationError}</p>
                    )}

                    <div className="notification-list">
                      {notifications.slice(0, 5).length === 0 ? (
                        <p className="notification-empty">
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.slice(0, 5).map((notification) => (
                          <div
                            key={notification._id}
                            className={`notification-item ${
                              notification.isRead ? "" : "unread"
                            }`}
                          >
                            <div>
                              <strong>{notification.title}</strong>
                              <p>{notification.body}</p>
                            </div>

                            <div className="notification-actions">
                              {!notification.isRead && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMarkNotificationRead(notification._id)
                                  }
                                >
                                  Read
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteNotification(notification._id)
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      className="notification-view-all"
                      onClick={() => {
                        setIsNotificationModalOpen(true);
                        setIsNotificationMenuOpen(false);
                      }}
                    >
                      View all
                    </button>
                  </div>
                )}
              </div>

              <button type="button" onClick={handleLogout}>
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
                    requireLogin("/location", "Venue");
                  }}
                >
                  Hire a Band
                </button>

                <button
                  type="button"
                  id="findGigBtn"
                  onClick={() => {
                    requireLogin("/gigs", "Artist");
                  }}
                >
                  Find a Gig
                </button>
              </div>
            </section>
          }
        />
        <Route
          path="/location"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn} userRole={profile.role}>
              <Location
                userRole={profile.role}
                initialSearchArea={searchArea}
                onSetSearchArea={updateSearchArea}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bands"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn} userRole={profile.role}>
              <BandsPage
                bands={bands}
                navigate={navigate}
                locationCoords={location.state?.coords || searchArea?.coords}
                userZip={location.state?.zip || searchArea?.zip}
                userRadius={location.state?.radius || searchArea?.radius}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-band"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              allowedRoles={["Artist"]}
              redirectTo="/bands"
            >
              <section id="bands" className="page active">
                <h2>My Band</h2>

                <button
                  type="button"
                  className="create-band-tile"
                  onClick={() => navigate("/bands/create")}
                >
                  <span className="create-band-tile-title">Create Band</span>
                  <span className="create-band-tile-subtitle">
                    Create your band profile, then add photos in its profile
                    page
                  </span>
                </button>

                <div className="card-grid">
                  {bands
                    .filter((band) => (band.members || []).includes(musicianId))
                    .map((band) => (
                      <div key={band._id} className="card band-card">
                        <h3>{band.name}</h3>
                        <p>{band.locations?.[0] || "No location yet"}</p>
                        <div className="band-card-buttons">
                          <Link
                            to={`/band/${band._id}/public`}
                            className="view-public-btn"
                          >
                            View Public Page
                          </Link>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => navigate(`/bands/${band._id}`)}
                          >
                            Manage Band
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        <Route
          path="/bands/create"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              allowedRoles={["Artist"]}
              redirectTo="/bands"
            >
              <section id="bands" className="page active">
                <div className="create-band-form-page">
                  <form
                    className="create-band-form"
                    onSubmit={createBandFromForm}
                  >
                    <h3>Create Band</h3>
                    <input
                      type="text"
                      placeholder="Band name"
                      value={createBandForm.name}
                      onChange={(event) =>
                        setCreateBandForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Genre (optional)"
                      value={createBandForm.genre}
                      onChange={(event) =>
                        setCreateBandForm((prev) => ({
                          ...prev,
                          genre: event.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="ZIP Code, ex: 93401"
                      value={createBandForm.location}
                      maxLength={5}
                      required
                      inputMode="numeric"
                      pattern="[0-9]{5}"
                      onChange={(event) => {
                        const onlyNumbers = event.target.value.replace(
                          /\D/g,
                          "",
                        );

                        setCreateBandForm((prev) => ({
                          ...prev,
                          location: onlyNumbers.slice(0, 5),
                        }));
                      }}
                    />
                    <div className="create-band-price-row">
                      <input
                        type="number"
                        min="0"
                        placeholder="Fixed rate, ex: 400"
                        value={createBandForm.rate}
                        onChange={(event) =>
                          setCreateBandForm((prev) => ({
                            ...prev,
                            rate: event.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Add a bio for your band"
                        value={createBandForm.bio}
                        className="create-band-textarea"
                        onChange={(event) =>
                          setCreateBandForm((prev) => ({
                            ...prev,
                            bio: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <button
                      type="submit"
                      className="primary-btn create-band-btn"
                    >
                      Create Band
                    </button>
                    {createBandMessage && (
                      <p className="upload-message">{createBandMessage}</p>
                    )}
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
            </ProtectedRoute>
          }
        />

        <Route
          path="/bands/:id"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              allowedRoles={["Artist"]}
              redirectTo="/bands"
            >
              <section id="bands" className="page active">
                <div className="profile-popup band-profile-popup">
                  {bandDetailsError && (
                    <p className="upload-message error">{bandDetailsError}</p>
                  )}

                  {!bandDetails && !bandDetailsError && (
                    <p>Loading band profile...</p>
                  )}

                  {bandDetails && !canManageCurrentBand && (
                    <Navigate to={`/band/${bandDetails._id}/public`} replace />
                  )}

                  {bandDetails && canManageCurrentBand && (
                    <>
                      <h2>{bandDetails.name}</h2>

                      <img
                        className="profile-image"
                        src={
                          bandDetails.profile_picture_url ||
                          DEFAULT_PLACEHOLDER_IMAGE
                        }
                        alt="Band profile"
                      />

                      <div className="profile-row upload-row">
                        <span className="label">Band Profile Picture</span>
                        <input
                          className="edit-input"
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              uploadBandProfilePicture(file);
                            }
                          }}
                        />
                      </div>

                      <div className="profile-section">
                        <h3>Band Bio</h3>
                        {editingBio ? (
                          <>
                            <textarea
                              className="create-band-textarea"
                              value={tempBio}
                              onChange={(e) => setTempBio(e.target.value)}
                            />
                            <div className="button-group">
                              <button className="primary-btn" onClick={saveBio}>
                                Save Bio
                              </button>
                              <button
                                className="secondary-btn"
                                onClick={() => setEditingBio(false)}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="current-bio">
                              {bandDetails.bio || "No bio added yet."}
                            </p>
                            <button
                              className="secondary-btn"
                              onClick={() => {
                                setTempBio(bandDetails.bio || "");
                                setEditingBio(true);
                              }}
                            >
                              Edit Bio
                            </button>
                          </>
                        )}
                      </div>

                      <div className="profile-row upload-row">
                        <span className="label">Add Gallery Photo</span>
                        <input
                          className="edit-input"
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              uploadBandGalleryImage(file);
                            }
                          }}
                        />
                      </div>

                      <h3 className="gallery-title">Gallery</h3>

                      <div className="gallery-grid">
                        {(bandDetails.gallery_images || []).length === 0 && (
                          <p className="gallery-empty">
                            No gallery images yet.
                          </p>
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

                      <div className="profile-row upload-row">
                        <span className="label">Upload YouTube Video</span>
                        <input
                          className="edit-input"
                          placeholder="Paste YouTube link here"
                          value={bandVideoLink}
                          onChange={(e) => setBandVideoLink(e.target.value)}
                        />
                        <button
                          onClick={addBandVideo}
                          className="secondary-btn"
                          style={{ width: "auto", marginTop: 0 }}
                        >
                          Add
                        </button>
                      </div>

                      <div className="video-grid">
                        {bandDetails.video_urls?.map((vidId) => (
                          <div key={vidId} className="video-item">
                            <iframe
                              width="100%"
                              height="200"
                              src={`https://www.youtube.com/embed/${vidId}`}
                              frameBorder="0"
                              allowFullScreen
                            ></iframe>
                            <button
                              className="secondary-btn"
                              onClick={() => removeBandVideo(vidId)}
                            >
                              Remove Video
                            </button>
                          </div>
                        ))}
                      </div>

                      {bandUploadMessage && (
                        <p className="upload-message">{bandUploadMessage}</p>
                      )}

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

        <Route
          path="/band/:id/public"
          element={
            <BandPublicProfile
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              venueId={venueId}
              onStartConversation={handleStartBandConversation}
            />
          }
        />

        <Route
          path="/musicians/:id"
          element={
            <section id="profile" className="page active">
              <div className="profile-popup band-profile-popup">
                {musicianDetails && (
                  <>
                    <img
                      className="profile-image"
                      src={
                        musicianDetails.profile_picture_url ||
                        DEFAULT_PLACEHOLDER_IMAGE
                      }
                    />
                    <h2>{musicianDetails.name}</h2>
                    <p className="bio-text">
                      {musicianDetails.bio || "No bio yet."}
                    </p>

                    {canManageCurrentMusicianPage && (
                      <div
                        className="management-box"
                        style={{
                          border: "1px dashed #667eea",
                          padding: "15px",
                          borderRadius: "8px",
                          marginBottom: "20px",
                        }}
                      >
                        <h4 style={{ marginBottom: "10px" }}>
                          Manage your page
                        </h4>
                        <div className="profile-row upload-row">
                          <span className="label">Upload YouTube Video</span>
                          <input
                            className="edit-input"
                            placeholder="Paste YouTube link here"
                            value={musicianVideoLink}
                            onChange={(e) =>
                              setMusicianVideoLink(e.target.value)
                            }
                          />
                          <button
                            className="secondary-btn"
                            onClick={addMusicianVideo}
                          >
                            Add
                          </button>
                        </div>
                        <div className="profile-row upload-row">
                          <span className="label">Add photo</span>
                          <input
                            className="edit-input"
                            type="file"
                            onChange={(e) =>
                              handleMusicianGalleryUpload(e.target.files[0])
                            }
                          />
                        </div>
                      </div>
                    )}

                    <h3>Videos</h3>
                    <div className="video-grid">
                      {musicianDetails.video_urls?.map((vidId) => (
                        <div key={vidId} className="video-item">
                          <iframe
                            src={`https://www.youtube.com/embed/${vidId}`}
                            frameBorder="0"
                            allowFullScreen
                          ></iframe>
                          {musicianId === pathMusicianId && (
                            <button
                              className="secondary-btn"
                              onClick={() => removeMusicianVideo(vidId)}
                            >
                              Remove Video
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <h3>Photos</h3>
                    <div className="gallery-grid">
                      {musicianDetails.gallery_images?.map((url) => (
                        <div className="gallery-item" key={url}>
                          <img src={url} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          }
        />

        <Route
          path="/gigs"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              allowedRoles={["Artist", "Venue"]}
              redirectTo="/dashboard"
            >
              <Gigs
                gigs={gigs}
                canMessageVenues={profile.role === "Artist"}
                onMessageVenue={handleStartGigConversation}
                messageError={messageError}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/login"
          element={
            <section id="login" className="page active">
              <div className="form-card">
                <h2>{isSigningUp ? "Sign Up" : "Sign In"}</h2>

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

                {isSigningUp && (
                  <input
                    type="text"
                    placeholder="Display name"
                    value={loginDisplayName}
                    onChange={(e) => setLoginDisplayName(e.target.value)}
                  />
                )}

                <div className="login-buttons">
                  {showMusicianLogin && (
                    <button
                      type="button"
                      id="loginBandBtn"
                      className={`login-role-btn ${preferredLoginRole === "Artist" ? "recommended-role" : ""}`}
                      onClick={() => handleAuthSubmit("Artist")}
                    >
                      {isSigningUp
                        ? "Sign Up as Musician"
                        : "Log In As Musician"}
                    </button>
                  )}

                  {showVenueLogin && (
                    <button
                      type="button"
                      id="loginVenueBtn"
                      className={`login-role-btn ${preferredLoginRole === "Venue" ? "recommended-role" : ""}`}
                      onClick={() => handleAuthSubmit("Venue")}
                    >
                      {isSigningUp ? "Sign Up as Venue" : "Log In As Venue"}
                    </button>
                  )}
                </div>

                {authError && (
                  <p className="upload-message error">{authError}</p>
                )}

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setAuthError("");
                    setIsSigningUp((prev) => !prev);
                  }}
                >
                  {isSigningUp
                    ? "Have an account? Sign in"
                    : "New here? Create an account"}
                </button>
              </div>
            </section>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              allowedRoles={["Artist"]}
              redirectTo="/dashboard"
            >
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
                        const file = event.target.files?.[0];
                        if (file) {
                          uploadMusicianProfilePicture(file);
                        }
                      }}
                    />
                  </div>

                  {musicianUploadMessage && (
                    <p className="upload-message">{musicianUploadMessage}</p>
                  )}

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
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              allowedRoles={["Venue"]}
              redirectTo="/gigs"
            >
              <section id="dashboard" className="page active">
                <div className="dashboard-card">
                  <h2>Venue Dashboard</h2>

                  <p>Your registered venues</p>

                  <form
                    className="create-band-form"
                    onSubmit={createGigFromForm}
                  >
                    <h3>Create Gig</h3>
                    <input
                      type="text"
                      placeholder="Gig title"
                      value={createGigForm.name}
                      onChange={(event) =>
                        setCreateGigForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={createGigForm.description}
                      onChange={(event) =>
                        setCreateGigForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Genre"
                      value={createGigForm.genre}
                      onChange={(event) =>
                        setCreateGigForm((prev) => ({
                          ...prev,
                          genre: event.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="ZIP Code, ex: 93401"
                      value={createGigForm.zip}
                      maxLength={5}
                      required
                      inputMode="numeric"
                      pattern="[0-9]{5}"
                      onChange={(event) => {
                        const onlyNumbers = event.target.value.replace(
                          /\D/g,
                          "",
                        );

                        setCreateGigForm((prev) => ({
                          ...prev,
                          zip: onlyNumbers.slice(0, 5),
                        }));
                      }}
                    />

                    <input
                      type="text"
                      placeholder="Address optional, ex: 123 Main St"
                      value={createGigForm.address}
                      onChange={(event) =>
                        setCreateGigForm((prev) => ({
                          ...prev,
                          address: event.target.value,
                        }))
                      }
                    />

                    <input
                      type="number"
                      min="1"
                      placeholder="Capacity, ex: 150"
                      value={createGigForm.capacity}
                      required
                      onChange={(event) =>
                        setCreateGigForm((prev) => ({
                          ...prev,
                          capacity: event.target.value,
                        }))
                      }
                    />
                    <input
                      type="date"
                      value={createGigForm.date}
                      required
                      onChange={(event) =>
                        setCreateGigForm((prev) => ({
                          ...prev,
                          date: event.target.value,
                        }))
                      }
                    />

                    <div className="create-band-price-row">
                      <input
                        type="time"
                        value={createGigForm.startTime}
                        required
                        onChange={(event) =>
                          setCreateGigForm((prev) => ({
                            ...prev,
                            startTime: event.target.value,
                          }))
                        }
                      />

                      <input
                        type="time"
                        value={createGigForm.endTime}
                        required
                        onChange={(event) =>
                          setCreateGigForm((prev) => ({
                            ...prev,
                            endTime: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="create-band-price-row">
                      <div className="create-band-price-row">
                        <input
                          type="number"
                          min="0"
                          placeholder="Min price"
                          value={createGigForm.minPrice}
                          required
                          onChange={(event) =>
                            setCreateGigForm((prev) => ({
                              ...prev,
                              minPrice: event.target.value,
                            }))
                          }
                        />

                        <input
                          type="number"
                          min="0"
                          placeholder="Max price"
                          value={createGigForm.maxPrice}
                          required
                          onChange={(event) =>
                            setCreateGigForm((prev) => ({
                              ...prev,
                              maxPrice: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="primary-btn create-band-btn"
                    >
                      Post Gig
                    </button>
                    {createGigMessage && (
                      <p className="upload-message">{createGigMessage}</p>
                    )}
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

        <Route
          path="/messages"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn} userRole={profile.role}>
              <section id="messages" className="page active">
                <div className="messages-shell">
                  <aside className="conversation-list">
                    <h2>Messages</h2>

                    {messageError && (
                      <p className="upload-message error">{messageError}</p>
                    )}

                    {conversations.length === 0 ? (
                      <p className="list-empty-message">
                        No conversations yet.
                      </p>
                    ) : (
                      conversations.map((conversation) => (
                        <button
                          type="button"
                          key={conversation._id}
                          className={`conversation-item ${
                            activeConversation?._id === conversation._id
                              ? "active"
                              : ""
                          }`}
                          onClick={() => handleOpenConversation(conversation)}
                        >
                          <strong>
                            {conversation.otherUserDisplayName ||
                              "Unknown User"}
                          </strong>
                          {conversation.gigName && (
                            <span className="conversation-gig-name">
                              {conversation.gigName}
                            </span>
                          )}
                          <span className="conversation-preview">
                            {conversation.lastMessage || "New conversation"}
                          </span>
                          {conversation.lastMessageTime && (
                            <span>
                              {new Date(
                                conversation.lastMessageTime,
                              ).toLocaleString()}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </aside>

                  <main className="message-panel">
                    {activeConversation ? (
                      <>
                        <div className="message-list">
                          {messages.map((message) => (
                            <div
                              key={message._id}
                              className={`message-bubble ${
                                String(message.senderUserId) ===
                                String(currentUserId)
                                  ? "mine"
                                  : "theirs"
                              }`}
                            >
                              <p>{message.text}</p>
                            </div>
                          ))}
                        </div>

                        <form
                          className="message-form"
                          onSubmit={handleSendMessage}
                        >
                          <input
                            type="text"
                            value={messageText}
                            onChange={(event) =>
                              setMessageText(event.target.value)
                            }
                            placeholder="Write a message..."
                          />
                          <button type="submit">Send</button>
                        </form>
                      </>
                    ) : (
                      <p className="message-placeholder">
                        Select a conversation.
                      </p>
                    )}
                  </main>
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isNotificationModalOpen && (
        <div className="notification-modal-backdrop">
          <div className="notification-modal">
            <div className="notification-modal-header">
              <h2>Notifications</h2>

              <button
                type="button"
                onClick={() => setIsNotificationModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="notification-modal-actions">
              <button type="button" onClick={handleMarkAllNotificationsRead}>
                Mark all read
              </button>
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <p className="notification-empty">No notifications yet.</p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`notification-item ${
                      notification.isRead ? "" : "unread"
                    }`}
                  >
                    <div>
                      <strong>{notification.title}</strong>
                      <p>{notification.body}</p>

                      {notification.createdAt && (
                        <span className="notification-date">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="notification-actions">
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() =>
                            handleMarkNotificationRead(notification._id)
                          }
                        >
                          Read
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteNotification(notification._id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
  setAuthToken,
  loadSearchArea,
  login as apiLogin,
  register as apiRegister,
  saveSearchArea,
  verifyAuth as apiVerifyAuth,
  sendEmailVerificationCode,
  verifyEmailCode,
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
  getGigRequests,
  createGigRequest,
  createVenueBandRequest,
  acceptGigRequest,
  declineGigRequest,
} from "./api/api.js";
import "./App.css";
import BandPublicProfile from "./components/BandPublicProfile.jsx";
import GigPublicProfile from "./components/GigPublicProfile.jsx";
import Location from "./components/location.jsx";
import BandsPage from "./components/Bands.jsx";
import BandManager from "./components/BandManager.jsx";
import ManageGig from "./components/ManageGig.jsx";
import AvailabilityCalendar from "./components/AvailabilityCalendar.jsx";

function getGigHostId(gig) {
  return String(gig?.host?._id ?? gig?.host ?? "");
}

function isVenueOwnedGig(gig, venueId, userId) {
  if (userId && gig?.owner_user && String(gig.owner_user) === String(userId)) {
    return true;
  }
  return Boolean(venueId) && getGigHostId(gig) === String(venueId);
}

function getVenueGigsQuery(venueId, userId) {
  if (userId) {
    return `${API_URL}/gigs?owner_user=${encodeURIComponent(userId)}&limit=50`;
  }
  if (venueId) {
    return `${API_URL}/gigs?host=${encodeURIComponent(venueId)}&limit=50`;
  }
  return null;
}

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
  needsEmailVerification = false,
  allowedRoles = [],
  redirectTo = "/",
  children,
}) {
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (needsEmailVerification && location.pathname !== "/verify-email") {
    return <Navigate to="/verify-email" replace />;
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
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifySending, setVerifySending] = useState(false);

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
  const [gigRequests, setGigRequests] = useState([]);
  const [gigRequestMessage, setGigRequestMessage] = useState("");

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
      const isEmailVerified = Boolean(data?.user?.email_verified);
      setAuthUser({
        id: String(data?.user?.id || data?.user?._id || ""),
        email: data?.user?.email || email,
        displayName: data?.user?.display_name || "",
        emailVerified: isEmailVerified,
      });
      setNeedsEmailVerification(!isEmailVerified);

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
        const resolvedVenueId =
          data?.profiles?.venueId || venueRecord._id || "";
        setVenueId(resolvedVenueId);
        setVenues([venueRecord]);
        setProfile((prev) => ({
          ...prev,
          profilePictureUrl: venueRecord.profile_picture_url || "",
        }));
      }

      if (!isEmailVerified) {
        navigate("/verify-email", { replace: true });
        return;
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
    setNeedsEmailVerification(false);
    setVerifyCode("");
    setVerifyMessage("");
    setVerifySending(false);
    setNotifications([]);
    setUnreadCount(0);
    setGigRequests([]);
    setGigRequestMessage("");
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
    setProfile({
      first: "First Name",
      last: "Last Name",
      email: "hello@email.com",
      password: "12345",
      role: "Artist",
      profilePictureUrl: "",
    });
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
  const canManageCurrentMusicianPage =
    isLoggedIn &&
    profile.role === "Artist" &&
    String(musicianId || "") === String(pathMusicianId || "");

  async function uploadUserProfilePicture(file) {
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setMusicianUploadMessage(validationMessage);
      return;
    }

    const body = new FormData();
    body.append("image", file);

    try {
      if (profile.role === "Venue") {
        if (!venueId) {
          setMusicianUploadMessage("Please sign in as a venue first.");
          return;
        }

        const response = await authFetch(`/venues/${venueId}/profile-picture`, {
          method: "POST",
          body,
        });
        const payload = await response.json();

        if (!response.ok) {
          setMusicianUploadMessage(payload.error || "Failed to upload venue photo.");
          return;
        }

        setProfile((prev) => ({
          ...prev,
          profilePictureUrl: payload.data.profile_picture_url || "",
        }));
        setVenues((prev) =>
          prev.map((v) => (v._id === venueId ? { ...v, profile_picture_url: payload.data.profile_picture_url } : v))
        );
        setMusicianUploadMessage("Venue profile picture updated!");
      } 
      
      else if (profile.role === "Artist") {
        if (!musicianId) {
          setMusicianUploadMessage("Please sign in as a musician first.");
          return;
        }

        const response = await authFetch(`/musicians/${musicianId}/profile-picture`, {
          method: "POST",
          body,
        });
        const payload = await response.json();

        if (!response.ok) {
          setMusicianUploadMessage(payload.error || "Failed to upload musician photo.");
          return;
        }

        const newUrl = payload.data.profile_picture_url || "";

        setProfile((prev) => ({
          ...prev,
          profilePictureUrl: newUrl,
        }));

        setMusicianDetails((prev) => {
          if (prev && String(prev._id) === String(musicianId)) {
            return { ...prev, profile_picture_url: newUrl };
          }
          return prev;
        });

        setMusicianUploadMessage("Musician profile picture updated successfully!");
      }
    } catch (err) {
      console.error("Profile picture upload error:", err);
      setMusicianUploadMessage("An unexpected error occurred during upload.");
    }
  }

  async function handleMusicianGalleryUpload(file) {
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setMusicianUploadMessage(validationMessage);
      return;
    }
    if (!musicianId) {
      setMusicianUploadMessage("No musician selected");
      return;
    }
    
    const body = new FormData();
    body.append("image", file);

    try {
      const response = await authFetch(`/musicians/${musicianId}/gallery`, {
        method: "POST",
        body,
      });
      
      const payload = await response.json();
      if (!response.ok) {
        setMusicianUploadMessage(payload.error || "Failed to upload photos");
        return;
      }

      setMusicianDetails(payload.data);
      setMusicianUploadMessage("Photo uploaded successfully!");
    } catch (err) {
      console.error(err);
      setMusicianUploadMessage("Network connection error saving gallery image.");
    }
  }

  async function removeMusicianGalleryImage(imageUrl) {
    if (!musicianId) return;
    try {
      const response = await authFetch(`/musicians/${musicianId}/gallery`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (response.ok) {
        const payload = await response.json();
        setMusicianDetails(payload.data);
      }
    } catch (err) {
      console.error("Failed to delete gallery image:", err);
    }
  }

  const [musicianVideoLink, setMusicianVideoLink] = useState("");
  async function addMusicianVideo() {
    if (!musicianId) {
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
      setMusicianUploadMessage("Video added successfully")
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

  const uploadGigGalleryImage = async (gigId, file) => {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await authFetch(`/gigs/${gigId}/gallery`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to upload image");

    setGigs((prevGigs) =>
      prevGigs.map((g) => (String(g._id) === String(gigId) ? result.data : g))
    );

    return result.data;
  } catch (err) {
    console.error("Error uploading gig image:", err);
  }
};

const removeGigGalleryImage = async (gigId, imageUrl) => {
  try {
    const response = await authFetch(`/gigs/${gigId}/gallery`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to remove image");

    setGigs((prevGigs) =>
      prevGigs.map((g) => (String(g._id) === String(gigId) ? result.data : g))
    );

    return result.data;
  } catch (err) {
    console.error("Error removing gig image:", err);
  }
};

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

    try {
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
    } catch (err) {
      const message = err?.message || "Failed to create band.";
      setCreateBandMessage(message);
      if (message.toLowerCase().includes("log in")) {
        setIsLoggedIn(false);
        clearAuthToken();
        navigate("/login", { replace: true });
      }
    }
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
    const createdHostId = getGigHostId(data.data);
    if (createdHostId) {
      setVenueId(createdHostId);
    }
    setGigs((prev) => [
      data.data,
      ...prev.filter((gig) => gig._id !== data.data._id),
    ]);
    const venueGigsQuery = getVenueGigsQuery(createdHostId, currentUserId);
    if (venueGigsQuery) {
      fetch(venueGigsQuery)
        .then((res) => res.json())
        .then((payload) => {
          setGigs(payload.data || []);
        })
        .catch((err) => console.error("Failed to refresh venue gigs:", err));
    }
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
        const isEmailVerified = Boolean(verifiedUser.email_verified);
        setAuthUser({
          id: String(verifiedUser.id || verifiedUser._id || ""),
          email: verifiedUser.email || "",
          displayName: verifiedUser.display_name || "",
          emailVerified: isEmailVerified,
        });
        setNeedsEmailVerification(!isEmailVerified);
        setProfile((prev) => ({
          ...prev,
          email: verifiedUser.email || prev.email,
          role: frontendRole,
        }));
        setIsLoggedIn(true);

        if (!isEmailVerified && location.pathname !== "/verify-email") {
          navigate("/verify-email", { replace: true });
          return;
        }

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
          setVenues([venueRecord]);
          setMusicianId("");
          setProfile((prev) => ({
            ...prev,
            profilePictureUrl: venueRecord.profile_picture_url || "",
          }));
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

  useEffect(() => {
    if (!currentUserId) {
      setGigRequests([]);
      return;
    }

    async function loadGigRequests() {
      try {
        const requests = await getGigRequests();
        setGigRequests(requests || []);
      } catch (err) {
        setGigRequestMessage(err?.message || "Failed to load gig requests.");
      }
    }

    loadGigRequests();
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
        venueId: getGigHostId(gig),
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

  async function handleRequestGig(gig) {
    if (!currentUserId || profile.role !== "Artist") {
      setMessageError("Please log in as an artist to request this gig.");
      return;
    }

    const band = bands.find((item) =>
      (item.members || []).some(
        (memberId) => String(memberId) === String(musicianId),
      ),
    );

    if (!band) {
      setMessageError("Create or join a band before requesting gigs.");
      return;
    }

    if (!gig.host || !gig.owner_user) {
      setMessageError("This gig is missing venue contact information.");
      return;
    }

    try {
      setMessageError("");
      setGigRequestMessage("");

      await createGigRequest({
        gigId: gig._id,
        bandId: band._id,
        venueId: getGigHostId(gig),
        venueUserId: String(gig.owner_user),
      });

      const requests = await getGigRequests();
      setGigRequests(requests || []);
      setGigRequestMessage("Gig request sent.");
    } catch (err) {
      setMessageError(err?.message || "Failed to request gig.");
    }
  }

  async function handleInviteBandToGig(band, gigId) {
    if (!currentUserId || profile.role !== "Venue") {
      setMessageError("Please log in as a venue to book this band.");
      return;
    }

    if (!band?._id || !gigId) {
      setMessageError("Missing band or gig information.");
      return;
    }

    try {
      setMessageError("");
      setGigRequestMessage("");

      await createVenueBandRequest({ gigId, bandId: band._id });

      const requests = await getGigRequests();
      setGigRequests(requests || []);
      setGigRequestMessage(`Booking request sent to ${band.name}.`);
    } catch (err) {
      setMessageError(err?.message || "Failed to send booking request.");
    }
  }

  async function handleAcceptGigRequest(id) {
    try {
      setGigRequestMessage("");
      const updated = await acceptGigRequest(id);
      setGigRequests((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item)),
      );
      const requests = await getGigRequests();
      setGigRequests(requests || []);
      const gigQuery =
        profile.role === "Venue"
          ? getVenueGigsQuery(venueId, currentUserId) ||
            `${API_URL}/gigs?limit=50`
          : `${API_URL}/gigs?limit=50`;
      const refreshedGigs = await fetch(gigQuery)
        .then((res) => res.json())
        .then((data) => data.data || []);
      setGigs(refreshedGigs);
      setGigRequestMessage("Gig request accepted.");
    } catch (err) {
      setGigRequestMessage(err?.message || "Failed to accept request.");
    }
  }

  async function handleDeclineGigRequest(id) {
    try {
      setGigRequestMessage("");
      const updated = await declineGigRequest(id);
      setGigRequests((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item)),
      );
      setGigRequestMessage("Gig request declined.");
    } catch (err) {
      setGigRequestMessage(err?.message || "Failed to decline request.");
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
      location.pathname === "/calendar" ||
      (location.pathname === "/gigs" && profile.role === "Artist")
    ) {
      fetch(`${API_URL}/bands`)
        .then((res) => res.json())
        .then((data) => {
          setBands(data.data);
        })
        .catch((err) => console.error("Failed to load bands:", err));
    }

    if (
      location.pathname === "/dashboard" ||
      location.pathname === "/calendar" ||
      location.pathname === "/manage-gigs" ||
      location.pathname.startsWith("/manage-gigs/")
    ) {
      if (profile.role === "Venue") {
        if (venueId) {
          fetch(`${API_URL}/venues/${venueId}`)
            .then((res) => res.json())
            .then((data) => {
              setVenues(data.data ? [data.data] : []);
            })
            .catch((err) => console.error("Failed to load venue:", err));
        } else if (location.pathname === "/dashboard") {
          setVenues([]);
        }

        const venueGigsQuery = getVenueGigsQuery(venueId, currentUserId);
        if (venueGigsQuery) {
          fetch(venueGigsQuery)
            .then((res) => res.json())
            .then((data) => {
              setGigs(data.data || []);
            })
            .catch((err) => console.error("Failed to load venue gigs:", err));
        } else if (location.pathname === "/dashboard") {
          setGigs([]);
        }
      }
    }

    if (
      location.pathname.startsWith("/band/") &&
      location.pathname.endsWith("/public") &&
      profile.role === "Venue"
    ) {
      const venueGigsQuery = getVenueGigsQuery(venueId, currentUserId);
      if (venueGigsQuery) {
        fetch(venueGigsQuery)
          .then((res) => res.json())
          .then((data) => {
            setGigs(data.data || []);
          })
          .catch((err) => console.error("Failed to load venue gigs:", err));
      }
    }

    if (
      location.pathname === "/gigs" ||
      (location.pathname === "/calendar" && profile.role === "Artist")
    ) {
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
  }, [location.pathname, pathMusicianId, venueId, profile.role, currentUserId]);

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

  const managedBandIds = bands
    .filter((band) =>
      (band.members || []).some(
        (memberId) => String(memberId) === String(musicianId),
      ),
    )
    .map((band) => String(band._id));

  const calendarOwnerType = profile.role === "Venue" ? "venue" : "musician";
  const calendarOwnerId = profile.role === "Venue" ? venueId : musicianId;
  const calendarGigs =
    profile.role === "Venue"
      ? gigs.filter((gig) => isVenueOwnedGig(gig, venueId, currentUserId))
      : gigs.filter((gig) =>
          (gig.bands_hired || []).some((bandId) =>
            managedBandIds.includes(String(bandId)),
          ),
        );
  const calendarGigRequests =
    profile.role === "Venue"
      ? gigRequests.filter(
          (request) =>
            String(request.venueId?._id || request.venueId) ===
              String(venueId) && request.status === "pending",
        )
      : gigRequests.filter(
          (request) =>
            managedBandIds.includes(
              String(request.bandId?._id || request.bandId),
            ) && request.status === "pending",
        );
  const pendingVenueRequests = gigRequests.filter(
    (request) =>
      String(request.venueId?._id || request.venueId) === String(venueId) &&
      request.status === "pending" &&
      (request.initiatedBy || "band") === "band",
  );
  const pendingBandInvitations = gigRequests.filter(
    (request) =>
      request.status === "pending" &&
      request.initiatedBy === "venue" &&
      String(request.bandUserId) === String(currentUserId),
  );
  const pendingVenueSentInvitations = gigRequests.filter(
    (request) =>
      String(request.venueId?._id || request.venueId) === String(venueId) &&
      request.status === "pending" &&
      request.initiatedBy === "venue",
  );
  const venueOpenGigs = gigs.filter(
    (gig) =>
      !gig.booked && isVenueOwnedGig(gig, venueId, currentUserId),
  );

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
              <button type="button" onClick={() => navigate("/calendar")}>
                Calendar
              </button>
              <button type="button" onClick={() => navigate(`/musicians/${musicianId}`)}>
                My Profile Page
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
              >
                Edit User Info
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
              <button type="button" onClick={() => navigate("/manage-gigs")}>
                Manage Gigs
              </button>
              <button type="button" onClick={() => navigate("/calendar")}>
                Calendar
              </button>
              <button type="button" onClick={() => navigate("/profile")}>
                Edit User Info
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
          path="/verify-email"
          element={
            <section id="verify-email" className="page active">
              <div className="form-card">
                <h2>Verify your email</h2>
                <p style={{ marginTop: 0 }}>
                  Enter the 6-digit code we sent to{" "}
                  <strong>{authUser?.email || loginEmail}</strong>.
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Verification code"
                  value={verifyCode}
                  onChange={(e) =>
                    setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                />

                {verifyMessage && (
                  <p className={`upload-message ${verifyMessage.includes("Success") ? "" : "error"}`}>
                    {verifyMessage}
                  </p>
                )}

                <button
                  type="button"
                  className="primary-btn"
                  disabled={verifySending || verifyCode.length !== 6}
                  onClick={async () => {
                    const email = String(authUser?.email || loginEmail || "")
                      .trim()
                      .toLowerCase();
                    if (!email) {
                      setVerifyMessage("Missing email. Please log in again.");
                      return;
                    }
                    try {
                      setVerifySending(true);
                      setVerifyMessage("");
                      const verifyResult = await verifyEmailCode({
                        email,
                        code: verifyCode,
                      });
                      if (verifyResult?.token) {
                        setAuthToken(verifyResult.token);
                      }
                      setVerifyMessage("Success! Email verified.");
                      setNeedsEmailVerification(false);

                      const refreshed = await apiVerifyAuth();
                      const verifiedUser = refreshed?.user || {};
                      setAuthUser((prev) => ({
                        ...(prev || {}),
                        emailVerified: Boolean(verifiedUser.email_verified),
                      }));

                      const backendRole = verifiedUser.role;
                      const frontendRole = toFrontendRole(backendRole);
                      const verifiedEmail =
                        verifiedUser.email || authUser?.email || loginEmail;
                      if (frontendRole === "Artist" && verifiedEmail) {
                        const musicianRecord =
                          await createOrLoadMusicianProfile(verifiedEmail);
                        setMusicianId(musicianRecord._id || "");
                      }
                      if (frontendRole === "Venue") {
                        navigate("/dashboard", { replace: true });
                      } else {
                        navigate("/gigs", { replace: true });
                      }
                    } catch (err) {
                      setVerifyMessage(err?.message || "Invalid code.");
                    } finally {
                      setVerifySending(false);
                    }
                  }}
                >
                  Verify
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  disabled={verifySending}
                  onClick={async () => {
                    const email = String(authUser?.email || loginEmail || "")
                      .trim()
                      .toLowerCase();
                    if (!email) {
                      setVerifyMessage("Missing email. Please log in again.");
                      return;
                    }
                    try {
                      setVerifySending(true);
                      setVerifyMessage("");
                      await sendEmailVerificationCode({ email });
                      setVerifyMessage("Code sent. Check your inbox.");
                    } catch (err) {
                      setVerifyMessage(err?.message || "Failed to resend code.");
                    } finally {
                      setVerifySending(false);
                    }
                  }}
                >
                  Resend code
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  disabled={verifySending}
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            </section>
          }
        />
        <Route
          path="/location"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              needsEmailVerification={needsEmailVerification}
            >
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
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              needsEmailVerification={needsEmailVerification}
            >
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
              needsEmailVerification={needsEmailVerification}
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
              needsEmailVerification={needsEmailVerification}
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
              needsEmailVerification={needsEmailVerification}
              allowedRoles={["Artist", "Venue"]}
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

                      <BandManager
                        bandDetails={bandDetails}
                        currentUserId={currentUserId}
                        onBandUpdated={setBandDetails}
                      />

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
              venueGigs={venueOpenGigs}
              onStartConversation={handleStartBandConversation}
              onInviteToGig={handleInviteBandToGig}
              inviteMessage={gigRequestMessage}
              inviteError={messageError}
            />
          }
        />

        <Route
          path="/gig/:id/public"
          element={
            <GigPublicProfile
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              venueId={venueId}
              onStartConversation={handleStartGigConversation}
            />
          }
        />

        <Route
          path="/musicians/:id"
          element={
            <section className="band-profile-page" id="musician-public-profile" style={{ minHeight: "100vh" }}>
              {!musicianDetails ? (
                <div className="list-empty-message" style={{ padding: "40px" }}>Loading Musician Profile...</div>
              ) : (
                <>
                  <div className="band-header" id="musician-profile-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
                      <img
                        src={musicianDetails.profile_picture_url || DEFAULT_PLACEHOLDER_IMAGE}
                        alt={musicianDetails.name}
                        style={{ width: "130px", height: "130px", borderRadius: "50%", objectFit: "cover", border: "4px solid #f2e8cf" }}
                      />
                      <div>
                        <h1 className="band-title" id="musician-main-title" style={{ textTransform: "capitalize" }}>
                          {musicianDetails.name}
                        </h1>
                        <p className="band-genre" id="musician-instruments-list" style={{ color: "#ffd447" }}>
                          {musicianDetails.instruments?.join(", ") || "Musician"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {canManageCurrentMusicianPage && (
                    <div 
                      className="band-section" 
                      id="musician-management-panel"
                      style={{
                        background: "rgba(255, 255, 255, 0.1)",
                        padding: "24px",
                        borderRadius: "12px",
                        border: "1px dashed #2a9d8f",
                        backdropFilter: "blur(4px)"
                      }}
                    >
                      <h3 style={{ color: "#ffd447", marginBottom: "15px" }}>Owner Management Panel</h3>
                      
                      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ flex: "1", minWidth: "260px" }}>
                          <label className="label" style={{ color: "#f2e8cf", display: "block", marginBottom: "6px" }}>Add Photo to Media Gallery</label>
                          <input
                            type="file"
                            className="edit-input"
                            style={{ width: "100%" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleMusicianGalleryUpload(file);
                            }}
                          />
                        </div>

                        <div style={{ flex: "1", minWidth: "260px" }}>
                          <label className="label" style={{ color: "#f2e8cf", display: "block", marginBottom: "6px" }}>Embed YouTube Video Link</label>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input
                              type="text"
                              className="edit-input"
                              placeholder="Paste link..."
                              style={{ flex: "1" }}
                              value={musicianVideoLink}
                              onChange={(e) => setMusicianVideoLink(e.target.value)}
                            />
                            <button type="button" className="primary-btn" style={{ margin: 0, width: "auto", padding: "10px 20px" }} onClick={addMusicianVideo}>
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                      {musicianUploadMessage && (
                        <p style={{ marginTop: "12px", color: "#ffd447", fontWeight: "bold" }}>{musicianUploadMessage}</p>
                      )}
                    </div>
                  )}

                  <section className="band-section" id="musician-bio-section">
                    <h3>About the Musician</h3>
                    
                    {canManageCurrentMusicianPage ? (
                      <div>
                        {editingBio ? (
                          <>
                            <textarea
                              className="create-band-textarea"
                              style={{ width: "100%", minHeight: "100px", marginBottom: "12px", background: "#fff", color: "#3a0f3a", padding: "12px", borderRadius: "8px" }}
                              value={tempBio}
                              onChange={(e) => setTempBio(e.target.value)}
                            />
                            <div style={{ display: "flex", gap: "10px" }}>
                              <button 
                                type="button" 
                                className="primary-btn" 
                                style={{ width: "auto", margin: 0 }}
                                onClick={async () => {
                                  try {
                                    const response = await authFetch(`/musicians/${musicianId}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ bio: tempBio })
                                    });
                                    
                                    if (response.ok) {
                                      const payload = await response.json();
                                      setMusicianDetails(payload.data);
                                      setEditingBio(false);
                                      setMusicianUploadMessage("Bio updated successfully!");
                                    } else {
                                      const payload = await response.json();
                                      setMusicianUploadMessage(payload.error || "Failed to save profile changes.");
                                    }
                                  } catch (err) {
                                    setMusicianUploadMessage("Error communicating with database.");
                                  }
                                }}
                              >
                                Save Bio
                              </button>
                              <button type="button" className="secondary-btn" style={{ width: "auto", margin: 0 }} onClick={() => setEditingBio(false)}>
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="band-bio" id="musician-bio-text">
                              {musicianDetails.bio || "No biography added yet."}
                            </p>
                            <button
                              type="button"
                              className="secondary-btn"
                              style={{ width: "auto", marginTop: "10px" }}
                              onClick={() => {
                                setTempBio(musicianDetails.bio || "");
                                setEditingBio(true);
                              }}
                            >
                              Edit Bio
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="band-bio" id="musician-bio-text">
                        {musicianDetails.bio || "No biography added yet."}
                      </p>
                    )}
                  </section>

                  {musicianDetails?._id && (
                    <AvailabilityCalendar
                      ownerType="musician"
                      ownerId={musicianDetails._id}
                      gigs={canManageCurrentMusicianPage ? calendarGigs : []}
                      gigRequests={
                        canManageCurrentMusicianPage ? calendarGigRequests : []
                      }
                      readOnly
                      compact
                      title="Schedule"
                    />
                  )}

                  <section className="band-section" id="musician-photos-section">
                    <h3>Photos</h3>
                    <div className="horizontal-scroll-container">
                      {musicianDetails.gallery_images?.length > 0 ? (
                        musicianDetails.gallery_images.map((url, index) => (
                          <div key={index} style={{ flexShrink: 0, position: "relative" }}>
                            <img src={url} alt="Gallery item" className="scroll-img" />
                            
                            {canManageCurrentMusicianPage && (
                              <button
                                type="button"
                                className="secondary-btn"
                                style={{
                                  position: "absolute",
                                  bottom: "10px",
                                  left: "10px",
                                  width: "calc(100% - 20px)",
                                  background: "rgba(90, 15, 46, 0.9)",
                                  color: "white",
                                  border: "none",
                                  fontWeight: "bold",
                                  margin: 0,
                                  padding: "4px 8px",
                                  fontSize: "12px"
                                }}
                                onClick={() => removeMusicianGalleryImage(url)}
                              >
                                Remove Photo
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p style={{ fontStyle: "italic", opacity: 0.8 }}>No photos uploaded to the gallery yet.</p>
                      )}
                    </div>
                  </section>

                  <section className="band-section" id="musician-videos-section">
                    <h3>Featured Videos</h3>
                    <div className="horizontal-scroll-container">
                      {musicianDetails.video_urls?.length > 0 ? (
                        musicianDetails.video_urls.map((videoUrl, index) => {
                          const videoId = videoUrl.includes("v=") 
                            ? videoUrl.split("v=")[1].split("&")[0] 
                            : videoUrl.split("/").pop();
                            
                          return (
                            <div key={index} className="scroll-video" style={{ position: "relative" }}>
                              <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title="YouTube player"
                                frameBorder="0"
                                allowFullScreen
                              ></iframe>
                              {canManageCurrentMusicianPage && (
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  style={{
                                    position: "absolute",
                                    bottom: "10px",
                                    left: "10px",
                                    width: "calc(100% - 20px)",
                                    background: "rgba(90, 15, 46, 0.9)",
                                    color: "white",
                                    border: "none",
                                    fontWeight: "bold"
                                  }}
                                  onClick={() => removeMusicianVideo(videoUrl)}
                                >
                                  Delete Video
                                </button>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p style={{ fontStyle: "italic", opacity: 0.8 }}>No videos available.</p>
                      )}
                    </div>
                  </section>
                </>
              )}
            </section>
          }
        />

        <Route
          path="/gigs"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              needsEmailVerification={needsEmailVerification}
              allowedRoles={["Artist", "Venue"]}
              redirectTo="/dashboard"
            >
              <Gigs
                gigs={gigs}
                canMessageVenues={profile.role === "Artist"}
                onMessageVenue={handleStartGigConversation}
                onRequestGig={handleRequestGig}
                messageError={messageError || gigRequestMessage}
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
          path="/manage-gigs"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              needsEmailVerification={needsEmailVerification}
              allowedRoles={["Venue"]}
              redirectTo="/gigs"
            >
              <section id="bands" className="page active" style={{ paddingTop: "120px" }}>
                <h2>Manage My Posted Gigs</h2>
                <p style={{ color: "#ffd447", marginBottom: "20px" }}>Select a posted gig listing below to alter logistics, pictures, or videos.</p>
                
                <div className="card-grid">
                  {gigs
                    .filter((gig) =>
                      isVenueOwnedGig(gig, venueId, currentUserId),
                    )
                    .map((gig) => (
                      <div key={gig._id} className="card band-card">
                        <h3 style={{ textTransform: "capitalize" }}>{gig.name}</h3>
                        <p><strong>Date:</strong> {gig.date ? new Date(gig.date).toLocaleDateString() : "TBD"}</p>
                        <p><strong>Location:</strong> {gig.location || "No ZIP"}</p>
                        <div className="band-card-buttons">
                          <Link to={`/gig/${gig._id}/public`} className="view-public-btn">
                            View Public Page
                          </Link>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => navigate(`/manage-gigs/${gig._id}`)}
                          >
                            Manage / Edit Details
                          </button>
                        </div>
                      </div>
                    ))}
                  {gigs.filter((gig) =>
                    isVenueOwnedGig(gig, venueId, currentUserId),
                  ).length === 0 && (
                    <p style={{ fontStyle: "italic", padding: "20px", color: "#f2e8cf" }}>You haven't posted any gigs yet. Create one on your Dashboard!</p>
                  )}
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        <Route
          path="/manage-gigs/:id"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              needsEmailVerification={needsEmailVerification}
              allowedRoles={["Venue"]}
              redirectTo="/gigs"
            >
              <ManageGig 
                venueId={venueId} 
                gigs={gigs}
                navigate={navigate} 
                authFetch={authFetch}
                onUploadGallery={uploadGigGalleryImage}
                onRemoveGallery={removeGigGalleryImage}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              needsEmailVerification={needsEmailVerification}
              allowedRoles={["Artist", "Venue"]}
              redirectTo="/dashboard"
            >
              <section id="profile" className="page active">
                <div className="profile-popup">
                  <h2>Edit User Info</h2>

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
                          uploadUserProfilePicture(file);
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
                        onClick={async () => {
                          setIsEditing(false);
                          const combinedName = `${profile.first} ${profile.last}`.trim();
                          if (profile.role === "Artist" && musicianId) {
                            try {
                              const response = await authFetch(`/musicians/${musicianId}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: combinedName || profile.email }),
                              });

                              if (response.ok) {
                                const payload = await response.json();
                                if (payload.data) {
                                  setMusicianDetails(payload.data);
                                }
                                setMusicianUploadMessage("Name changes synced to public profile!");
                              }
                            } catch (err) {
                              console.error("Failed to sync name changes:", err);
                            }
                          }
                        }}
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
          path="/calendar"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              needsEmailVerification={needsEmailVerification}
            >
              <section id="calendar" className="page active">
                <div className="dashboard-card">
                  {profile.role === "Artist" && (
                    <section className="request-list">
                      <h3>Booking Invitations from Venues</h3>
                      {gigRequestMessage && (
                        <p className="upload-message">{gigRequestMessage}</p>
                      )}
                      {pendingBandInvitations.length === 0 ? (
                        <p>No pending booking invitations.</p>
                      ) : (
                        pendingBandInvitations.map((request) => (
                          <div key={request._id} className="request-card">
                            <h4>{request.gigId?.name || "Gig invitation"}</h4>
                            <p>
                              <strong>Venue:</strong>{" "}
                              {request.venueId?.name || "Unknown venue"}
                            </p>
                            <p>
                              <strong>Date:</strong>{" "}
                              {request.gigId?.date
                                ? new Date(
                                    request.gigId.date,
                                  ).toLocaleDateString()
                                : "No date"}
                            </p>
                            <p>
                              <strong>Status:</strong> {request.status}
                            </p>
                            <div className="request-card-actions">
                              <button
                                type="button"
                                className="primary-btn"
                                onClick={() =>
                                  handleAcceptGigRequest(request._id)
                                }
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="secondary-btn"
                                onClick={() =>
                                  handleDeclineGigRequest(request._id)
                                }
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </section>
                  )}
                  {calendarOwnerId ? (
                    <AvailabilityCalendar
                      ownerType={calendarOwnerType}
                      ownerId={calendarOwnerId}
                      gigs={calendarGigs}
                      gigRequests={calendarGigRequests}
                      title="My Schedule"
                    />
                  ) : (
                    <p className="upload-message">
                      Your profile is still loading. Try again in a moment.
                    </p>
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
              needsEmailVerification={needsEmailVerification}
              allowedRoles={["Venue"]}
              redirectTo="/gigs"
            >
              <section id="dashboard" className="page active">
                <div className="dashboard-card">
                  <h2>Venue Dashboard</h2>

                  <p>Your registered venues</p>
                  <section className="request-list">
                    <h3>Incoming Band Requests</h3>
                    {gigRequestMessage && (
                      <p className="upload-message">{gigRequestMessage}</p>
                    )}
                    {pendingVenueRequests.length === 0 ? (
                      <p>No pending band requests.</p>
                    ) : (
                      pendingVenueRequests.map((request) => (
                        <div key={request._id} className="request-card">
                          <h4>{request.gigId?.name || "Gig request"}</h4>
                          <p>
                            <strong>Band:</strong>{" "}
                            {request.bandId?.name || "Unknown band"}
                          </p>
                          <p>
                            <strong>Date:</strong>{" "}
                            {request.gigId?.date
                              ? new Date(request.gigId.date).toLocaleDateString()
                              : "No date"}
                          </p>
                          <p>
                            <strong>Status:</strong> {request.status}
                          </p>
                          <div className="request-card-actions">
                            <button
                              type="button"
                              className="primary-btn"
                              onClick={() =>
                                handleAcceptGigRequest(request._id)
                              }
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() =>
                                handleDeclineGigRequest(request._id)
                              }
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </section>
                  <section className="request-list">
                    <h3>Sent Booking Invitations</h3>
                    {pendingVenueSentInvitations.length === 0 ? (
                      <p>No pending invitations sent.</p>
                    ) : (
                      pendingVenueSentInvitations.map((request) => (
                        <div key={request._id} className="request-card">
                          <h4>{request.gigId?.name || "Gig invitation"}</h4>
                          <p>
                            <strong>Band:</strong>{" "}
                            {request.bandId?.name || "Unknown band"}
                          </p>
                          <p>
                            <strong>Date:</strong>{" "}
                            {request.gigId?.date
                              ? new Date(request.gigId.date).toLocaleDateString()
                              : "No date"}
                          </p>
                          <p>
                            <strong>Status:</strong> {request.status}
                          </p>
                        </div>
                      ))
                    )}
                  </section>
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
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              userRole={profile.role}
              needsEmailVerification={needsEmailVerification}
            >
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

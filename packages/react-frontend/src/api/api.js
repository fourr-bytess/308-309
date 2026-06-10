const isLocalDevHost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export const API_URL = isLocalDevHost
  ? "http://localhost:3001"
  : "https://giggly-bmdtgwaafaf0hwa4.westus3-01.azurewebsites.net";

const TOKEN_STORAGE_KEY = "giggly_access_token";
const SEARCH_AREA_STORAGE_KEY = "giggly_search_area";

const EMPTY_SEARCH_AREA = { coords: null, radius: null, zip: "" };

export function loadSearchArea() {
  try {
    const raw = localStorage.getItem(SEARCH_AREA_STORAGE_KEY);
    if (!raw) {
      return { ...EMPTY_SEARCH_AREA };
    }
    const parsed = JSON.parse(raw);
    return {
      coords: parsed?.coords ?? null,
      radius: parsed?.radius ?? null,
      zip: parsed?.zip ?? "",
    };
  } catch {
    return { ...EMPTY_SEARCH_AREA };
  }
}

export function saveSearchArea(area) {
  try {
    if (!area?.coords) {
      localStorage.removeItem(SEARCH_AREA_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      SEARCH_AREA_STORAGE_KEY,
      JSON.stringify({
        coords: area.coords,
        radius: area.radius,
        zip: area.zip ?? "",
      }),
    );
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (!token) return;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function authFetch(path, options = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Your session expired. Please log in again.");
  }
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401) {
    clearAuthToken();
    const payload = await response
      .clone()
      .json()
      .catch(() => ({}));
    const message =
      payload?.error === "Invalid or expired token"
        ? "Your session expired. Please log in again."
        : payload?.error || "Please log in again.";
    throw new Error(message);
  }
  return response;
}

export async function login({ email, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error || "Login failed";
    throw new Error(message);
  }
  const token = payload?.data?.token;
  if (token) setAuthToken(token);
  return payload?.data;
}

export async function register({ email, password, display_name, role }) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name, role }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error || "Registration failed";
    throw new Error(message);
  }
  return payload?.data;
}

export async function verifyAuth() {
  const res = await authFetch("/auth/verify");
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error || "Token invalid";
    throw new Error(message);
  }
  return payload?.data;
}

export async function sendEmailVerificationCode({ email }) {
  const res = await fetch(`${API_URL}/auth/email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error || "Failed to send code";
    throw new Error(message);
  }
  return payload?.data;
}

export async function verifyEmailCode({ email, code }) {
  const res = await fetch(`${API_URL}/auth/email/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error || "Invalid code";
    throw new Error(message);
  }
  return payload?.data;
}

/* ---------------- BANDS ---------------- */

export async function getBands({ limit = 50, members } = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (members) {
    params.set("members", members);
  }
  const res = await fetch(`${API_URL}/bands?${params.toString()}`);
  const data = await res.json();
  return data.data;
}

export async function getBandById(id) {
  const res = await fetch(`${API_URL}/bands/${id}`);
  const data = await res.json();
  return data.data;
}

export async function createBand(band) {
  const res = await authFetch(`/bands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(band),
  });

  return res.json();
}

export async function deleteBand(id) {
  const res = await authFetch(`/bands/${id}`, {
    method: "DELETE",
  });

  return res.json();
}

export async function updateBand(id, updateData) {
  const res = await authFetch(`/bands/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });

  if (!res.ok) {
    throw new Error("Failed to update band");
  }

  return res.json();
}

export async function addBandMember(bandId, memberInfo) {
  const res = await authFetch(`/bands/${bandId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(memberInfo),
  });

  return res.json();
}

export async function removeBandMember(bandId, musicianId) {
  const res = await authFetch(`/bands/${bandId}/members/${musicianId}`, {
    method: "DELETE",
  });

  return res.json();
}

/* ---------------- VENUES ---------------- */

export async function getVenues() {
  const res = await fetch(`${API_URL}/venues`);
  const data = await res.json();
  return data.data;
}

export async function createVenue(venue) {
  const res = await authFetch(`/venues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(venue),
  });

  return res.json();
}

export async function deleteVenue(id) {
  const res = await authFetch(`/venues/${id}`, {
    method: "DELETE",
  });

  return res.json();
}

/* ---------------- MUSICIANS ---------------- */

export async function getMusicians() {
  const res = await fetch(`${API_URL}/musicians`);
  const data = await res.json();
  return data.data;
}

export async function createMusician(musician) {
  const res = await authFetch(`/musicians`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(musician),
  });

  return res.json();
}

/* ---------------- REVIEWS ---------------- */

export async function getReviews() {
  const res = await fetch(`${API_URL}/reviews`);
  const data = await res.json();
  return data.data;
}

export async function createReview(review) {
  const res = await authFetch(`/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(review),
  });

  return res.json();
}

export async function getNotifications(userId) {
  const res = await authFetch(
    `/notifications?userId=${encodeURIComponent(userId)}`,
  );
  const payload = await res.json();

  if (!res.ok) {
    throw new Error(payload?.error || "Failed to fetch notifications");
  }

  return payload.data;
}

export async function getUnreadNotificationCount(userId) {
  const res = await authFetch(
    `/notifications/unread-count?userId=${encodeURIComponent(userId)}`,
  );
  const payload = await res.json();

  if (!res.ok) {
    throw new Error(payload?.error || "Failed to fetch unread count");
  }

  return payload.data.count;
}

export async function createNotification(notification) {
  const res = await authFetch("/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notification),
  });

  return res.json();
}

export async function markNotificationAsRead(id) {
  const res = await authFetch(`/notifications/${id}/read`, {
    method: "PUT",
  });

  return res.json();
}

export async function markAllNotificationsAsRead(userId) {
  const res = await authFetch("/notifications/read-all", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  return res.json();
}

export async function deleteNotification(id) {
  const res = await authFetch(`/notifications/${id}`, {
    method: "DELETE",
  });

  return res.json();
}

export async function getConversations(userId) {
  const res = await authFetch(
    `/conversations?userId=${encodeURIComponent(userId)}`,
  );
  const payload = await res.json();

  if (!res.ok) {
    throw new Error(payload?.error || "Failed to fetch conversations");
  }

  return payload.data;
}

export async function createConversation(conversation) {
  const res = await authFetch("/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(conversation),
  });
  const payload = await res.json();

  if (!res.ok) {
    throw new Error(payload?.error || "Failed to create conversation");
  }

  return payload.data;
}

export async function getConversationMessages(conversationId) {
  const res = await authFetch(`/conversations/${conversationId}/messages`);
  const payload = await res.json();

  if (!res.ok) {
    throw new Error(payload?.error || "Failed to fetch messages");
  }

  return payload.data;
}

export async function sendConversationMessage(conversationId, message) {
  const res = await authFetch(`/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  const payload = await res.json();

  if (!res.ok) {
    throw new Error(payload?.error || "Failed to send message");
  }

  return payload.data;
}

export async function markConversationAsRead(conversationId, userId) {
  const res = await authFetch(`/conversations/${conversationId}/read`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  return res.json();
}

export async function deleteConversation(id) {
  const res = await authFetch(`/conversations/${id}`, {
    method: "DELETE",
  });

  return res.json();
}

export async function getAvailability(ownerType, ownerId) {
  const response = await authFetch(
    `/availability?ownerType=${ownerType}&ownerId=${ownerId}`,
  );

  if (!response.ok) {
    throw new Error("Failed to load availability");
  }

  return response.json();
}

export async function createAvailability(slot) {
  const response = await authFetch("/availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slot),
  });

  if (!response.ok) {
    throw new Error("Failed to create availability");
  }

  return response.json();
}

export async function deleteAvailability(id) {
  const response = await authFetch(`/availability/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete availability");
  }

  return response.json();
}

export async function getGigRequests(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });

  const response = await authFetch(`/gig-requests?${search.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load gig requests");
  }

  const payload = await response.json();
  return payload.data || [];
}

export async function createVenueBandRequest({ gigId, bandId }) {
  const response = await authFetch("/gig-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gigId, bandId }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Failed to send booking request");
  }

  return payload.data;
}

export async function createGigRequest(request) {
  const response = await authFetch("/gig-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Failed to request gig");
  }

  return payload.data;
}

export async function acceptGigRequest(id) {
  const response = await authFetch(`/gig-requests/${id}/accept`, {
    method: "PUT",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Failed to accept gig request");
  }

  return payload.data;
}

export async function declineGigRequest(id) {
  const response = await authFetch(`/gig-requests/${id}/decline`, {
    method: "PUT",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Failed to decline gig request");
  }

  return payload.data;
}

export async function cancelGigRequest(id) {
  const response = await authFetch(`/gig-requests/${id}`, {
    method: "DELETE",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Failed to cancel gig request");
  }

  return payload.data;
}
export async function addBandCoAdmin(bandId, musicianId) {
  const res = await authFetch(`/bands/${bandId}/co-admins/${musicianId}`, {
    method: "PUT",
  });

  return res.json();
}

export async function removeBandCoAdmin(bandId, musicianId) {
  const res = await authFetch(`/bands/${bandId}/co-admins/${musicianId}`, {
    method: "DELETE",
  });

  return res.json();
}

export async function transferBandAdmin(bandId, musicianId) {
  const res = await authFetch(`/bands/${bandId}/admin/${musicianId}`, {
    method: "PUT",
  });

  return res.json();
}

export async function getBandMembers(bandId) {
  const res = await fetch(`${API_URL}/bands/${bandId}/members`);
  const payload = await res.json();

  if (!res.ok) {
    throw new Error(payload?.error || "Failed to fetch band members");
  }

  return payload.data;
}

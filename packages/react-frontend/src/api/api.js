export const API_URL =
  window.location.hostname === "localhost"
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
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(`${API_URL}${path}`, { ...options, headers });
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

export async function getBands() {
  const res = await fetch(`${API_URL}/bands`);
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

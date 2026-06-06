/**
 * @jest-environment jsdom
 */
/* global describe, beforeEach, test, expect, localStorage, Headers */
import { jest } from "@jest/globals";

import {
  API_URL,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  authFetch,
  login,
  register,
  verifyAuth,
  sendEmailVerificationCode,
  verifyEmailCode,
  updateBand,
  addBandMember,
  removeBandMember,
  getNotifications,
  getUnreadNotificationCount,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getConversations,
  createConversation,
  getConversationMessages,
  sendConversationMessage,
  markConversationAsRead,
  deleteConversation,
  getAvailability,
  createAvailability,
  deleteAvailability,
  getGigRequests,
  createVenueBandRequest,
  createGigRequest,
  acceptGigRequest,
  declineGigRequest,
  cancelGigRequest,
  loadSearchArea,
  saveSearchArea,
} from "./api.js";

globalThis.fetch = jest.fn();

const TOKEN_STORAGE_KEY = "giggly_access_token";
const SEARCH_AREA_STORAGE_KEY = "giggly_search_area";

function mockJsonResponse(payload, extra = {}) {
  return {
    ok: true,
    status: 200,
    json: jest.fn(() => Promise.resolve(payload)),
    clone: jest.fn(() => ({
      json: jest.fn(() => Promise.resolve(payload)),
    })),
    ...extra,
  };
}

function mockBadJsonResponse(extra = {}) {
  return {
    ok: true,
    status: 200,
    json: jest.fn(() => Promise.reject(new Error("bad json"))),
    clone: jest.fn(() => ({
      json: jest.fn(() => Promise.reject(new Error("bad json"))),
    })),
    ...extra,
  };
}

function setTestToken() {
  localStorage.setItem(TOKEN_STORAGE_KEY, "test-token");
}

function expectAuthHeaderWasSent(callIndex = 0) {
  const options = fetch.mock.calls[callIndex][1];
  expect(options.headers).toBeInstanceOf(Headers);
  expect(options.headers.get("Authorization")).toBe("Bearer test-token");
}

describe("extra search area coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
  });

  test("loadSearchArea returns defaults when saved JSON is broken", () => {
    localStorage.setItem(SEARCH_AREA_STORAGE_KEY, "{bad json");

    expect(loadSearchArea()).toEqual({
      coords: null,
      radius: null,
      zip: "",
    });
  });

  test("loadSearchArea fills missing radius and zip with defaults", () => {
    localStorage.setItem(
      SEARCH_AREA_STORAGE_KEY,
      JSON.stringify({ coords: { lat: 35.3, lng: -120.7 } })
    );

    expect(loadSearchArea()).toEqual({
      coords: { lat: 35.3, lng: -120.7 },
      radius: null,
      zip: "",
    });
  });

  test("saveSearchArea stores empty zip when zip is missing", () => {
    saveSearchArea({
      coords: { lat: 35.3, lng: -120.7 },
      radius: 10,
    });

    expect(loadSearchArea()).toEqual({
      coords: { lat: 35.3, lng: -120.7 },
      radius: 10,
      zip: "",
    });
  });
});

describe("auth token helpers and authFetch", () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
  });

  test("getAuthToken returns null when no token exists", () => {
    expect(getAuthToken()).toBeNull();
  });

  test("setAuthToken saves token and clearAuthToken removes token", () => {
    setAuthToken("abc123");

    expect(getAuthToken()).toBe("abc123");

    clearAuthToken();

    expect(getAuthToken()).toBeNull();
  });

  test("setAuthToken ignores empty token", () => {
    setAuthToken("");

    expect(getAuthToken()).toBeNull();
  });

  test("authFetch throws when no token exists", async () => {
    await expect(authFetch("/private")).rejects.toThrow(
      "Your session expired. Please log in again."
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  test("authFetch sends Authorization header and keeps custom headers", async () => {
    setTestToken();

    fetch.mockResolvedValue(mockJsonResponse({ data: { ok: true } }));

    const response = await authFetch("/private", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });

    expect(response.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/private`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      })
    );

    expectAuthHeaderWasSent();
    expect(fetch.mock.calls[0][1].headers.get("Content-Type")).toBe(
      "application/json"
    );
  });

  test("authFetch clears token and throws expired-session message for expired token", async () => {
    setTestToken();

    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Invalid or expired token" },
        {
          ok: false,
          status: 401,
        }
      )
    );

    await expect(authFetch("/private")).rejects.toThrow(
      "Your session expired. Please log in again."
    );

    expect(getAuthToken()).toBeNull();
  });

  test("authFetch throws backend 401 error when provided", async () => {
    setTestToken();

    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Please verify your email" },
        {
          ok: false,
          status: 401,
        }
      )
    );

    await expect(authFetch("/private")).rejects.toThrow(
      "Please verify your email"
    );
  });

  test("authFetch throws generic login error when 401 response is not JSON", async () => {
    setTestToken();

    fetch.mockResolvedValue(
      mockBadJsonResponse({
        ok: false,
        status: 401,
      })
    );

    await expect(authFetch("/private")).rejects.toThrow(
      "Please log in again."
    );
  });
});

describe("auth API functions", () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
  });

  test("login sends credentials, stores token, and returns data", async () => {
    const payload = {
      data: {
        token: "login-token",
        user: { email: "person@test.com" },
      },
    };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await login({
      email: "person@test.com",
      password: "password123",
    });

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "person@test.com",
        password: "password123",
      }),
    });

    expect(result).toEqual(payload.data);
    expect(getAuthToken()).toBe("login-token");
  });

  test("login returns data without storing token when token is missing", async () => {
    const payload = {
      data: {
        user: { email: "person@test.com" },
      },
    };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await login({
      email: "person@test.com",
      password: "password123",
    });

    expect(result).toEqual(payload.data);
    expect(getAuthToken()).toBeNull();
  });

  test("login throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Invalid credentials" },
        {
          ok: false,
          status: 401,
        }
      )
    );

    await expect(
      login({ email: "person@test.com", password: "wrong" })
    ).rejects.toThrow("Invalid credentials");
  });

  test("login throws default error when response JSON fails", async () => {
    fetch.mockResolvedValue(
      mockBadJsonResponse({
        ok: false,
        status: 500,
      })
    );

    await expect(
      login({ email: "person@test.com", password: "wrong" })
    ).rejects.toThrow("Login failed");
  });

  test("register sends POST request and returns data", async () => {
    const payload = {
      data: {
        id: "u1",
        email: "person@test.com",
      },
    };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await register({
      email: "person@test.com",
      password: "password123",
      display_name: "Person",
      role: "musician",
    });

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "person@test.com",
        password: "password123",
        display_name: "Person",
        role: "musician",
      }),
    });

    expect(result).toEqual(payload.data);
  });

  test("register throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Email already registered" },
        {
          ok: false,
          status: 409,
        }
      )
    );

    await expect(
      register({
        email: "person@test.com",
        password: "password123",
        display_name: "Person",
        role: "musician",
      })
    ).rejects.toThrow("Email already registered");
  });

  test("register throws default error when response JSON fails", async () => {
    fetch.mockResolvedValue(
      mockBadJsonResponse({
        ok: false,
        status: 500,
      })
    );

    await expect(
      register({
        email: "person@test.com",
        password: "password123",
        display_name: "Person",
        role: "musician",
      })
    ).rejects.toThrow("Registration failed");
  });

  test("verifyAuth returns data", async () => {
    setTestToken();

    const payload = {
      data: {
        valid: true,
        user: { email: "person@test.com" },
      },
    };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await verifyAuth();

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/verify`,
      expect.any(Object)
    );

    expectAuthHeaderWasSent();
    expect(result).toEqual(payload.data);
  });

  test("verifyAuth throws backend error when response is not ok", async () => {
    setTestToken();

    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Token invalid" },
        {
          ok: false,
          status: 403,
        }
      )
    );

    await expect(verifyAuth()).rejects.toThrow("Token invalid");
  });

  test("verifyAuth throws default error when response JSON fails", async () => {
    setTestToken();

    fetch.mockResolvedValue(
      mockBadJsonResponse({
        ok: false,
        status: 403,
      })
    );

    await expect(verifyAuth()).rejects.toThrow("Token invalid");
  });

  test("sendEmailVerificationCode sends email and returns data", async () => {
    const payload = { data: { ok: true } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await sendEmailVerificationCode({
      email: "person@test.com",
    });

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/auth/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "person@test.com" }),
    });

    expect(result).toEqual(payload.data);
  });

  test("sendEmailVerificationCode throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Bad email" },
        {
          ok: false,
          status: 400,
        }
      )
    );

    await expect(
      sendEmailVerificationCode({ email: "bad" })
    ).rejects.toThrow("Bad email");
  });

  test("sendEmailVerificationCode throws default error when response JSON fails", async () => {
    fetch.mockResolvedValue(
      mockBadJsonResponse({
        ok: false,
        status: 500,
      })
    );

    await expect(
      sendEmailVerificationCode({ email: "bad" })
    ).rejects.toThrow("Failed to send code");
  });

  test("verifyEmailCode sends code and returns data", async () => {
    const payload = { data: { ok: true, token: "new-token" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await verifyEmailCode({
      email: "person@test.com",
      code: "123456",
    });

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "person@test.com",
        code: "123456",
      }),
    });

    expect(result).toEqual(payload.data);
  });

  test("verifyEmailCode throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Invalid code" },
        {
          ok: false,
          status: 400,
        }
      )
    );

    await expect(
      verifyEmailCode({ email: "person@test.com", code: "000000" })
    ).rejects.toThrow("Invalid code");
  });

  test("verifyEmailCode throws default error when response JSON fails", async () => {
    fetch.mockResolvedValue(
      mockBadJsonResponse({
        ok: false,
        status: 500,
      })
    );

    await expect(
      verifyEmailCode({ email: "person@test.com", code: "000000" })
    ).rejects.toThrow("Invalid code");
  });
});

describe("extra band API functions", () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
    setTestToken();
  });

  test("updateBand sends authenticated PUT request", async () => {
    const payload = { data: { id: "b1", name: "Updated" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await updateBand("b1", { name: "Updated" });

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/bands/b1`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      })
    );

    expectAuthHeaderWasSent();
    expect(result).toEqual(payload);
  });

  test("updateBand throws when response is not ok", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "bad" },
        {
          ok: false,
          status: 400,
        }
      )
    );

    await expect(updateBand("b1", { name: "Bad" })).rejects.toThrow(
      "Failed to update band"
    );
  });

  test("addBandMember sends authenticated POST request", async () => {
    const payload = { data: { id: "b1" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await addBandMember("b1", { musicianId: "m1" });

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/bands/b1/members`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ musicianId: "m1" }),
      })
    );

    expectAuthHeaderWasSent();
    expect(result).toEqual(payload);
  });

  test("removeBandMember sends authenticated DELETE request", async () => {
    const payload = { data: { id: "b1" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await removeBandMember("b1", "m1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/bands/b1/members/m1`,
      expect.objectContaining({
        method: "DELETE",
      })
    );

    expectAuthHeaderWasSent();
    expect(result).toEqual(payload);
  });
});

describe("notification API functions", () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
    setTestToken();
  });

  test("getNotifications returns data", async () => {
    const payload = { data: [{ id: "n1" }] };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await getNotifications("user 1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/notifications?userId=user%201`,
      expect.any(Object)
    );

    expectAuthHeaderWasSent();
    expect(result).toEqual(payload.data);
  });

  test("getNotifications throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Failed from backend" },
        {
          ok: false,
          status: 500,
        }
      )
    );

    await expect(getNotifications("user1")).rejects.toThrow(
      "Failed from backend"
    );
  });

  test("getUnreadNotificationCount returns count", async () => {
    fetch.mockResolvedValue(mockJsonResponse({ data: { count: 4 } }));

    const result = await getUnreadNotificationCount("user 1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/notifications/unread-count?userId=user%201`,
      expect.any(Object)
    );

    expect(result).toBe(4);
  });

  test("getUnreadNotificationCount throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "No count" },
        {
          ok: false,
          status: 500,
        }
      )
    );

    await expect(getUnreadNotificationCount("user1")).rejects.toThrow(
      "No count"
    );
  });

  test("createNotification sends POST request", async () => {
    const notification = {
      userId: "u1",
      type: "welcome",
      title: "Hi",
      body: "Welcome",
    };

    const payload = { data: notification };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await createNotification(notification);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/notifications`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(notification),
      })
    );

    expect(result).toEqual(payload);
  });

  test("markNotificationAsRead sends PUT request", async () => {
    const payload = { data: { id: "n1", read: true } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await markNotificationAsRead("n1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/notifications/n1/read`,
      expect.objectContaining({
        method: "PUT",
      })
    );

    expect(result).toEqual(payload);
  });

  test("markAllNotificationsAsRead sends PUT request", async () => {
    const payload = { data: { success: true } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await markAllNotificationsAsRead("u1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/notifications/read-all`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ userId: "u1" }),
      })
    );

    expect(result).toEqual(payload);
  });

  test("deleteNotification sends DELETE request", async () => {
    const payload = { data: { id: "n1" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await deleteNotification("n1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/notifications/n1`,
      expect.objectContaining({
        method: "DELETE",
      })
    );

    expect(result).toEqual(payload);
  });
});

describe("conversation API functions", () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
    setTestToken();
  });

  test("getConversations returns data", async () => {
    const payload = { data: [{ id: "c1" }] };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await getConversations("user 1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/conversations?userId=user%201`,
      expect.any(Object)
    );

    expect(result).toEqual(payload.data);
  });

  test("getConversations throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "No conversations" },
        {
          ok: false,
          status: 500,
        }
      )
    );

    await expect(getConversations("user1")).rejects.toThrow(
      "No conversations"
    );
  });

  test("createConversation returns data", async () => {
    const conversation = {
      bandId: "b1",
      venueId: "v1",
      bandUserId: "bu1",
      venueUserId: "vu1",
    };

    const payload = { data: { id: "c1" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await createConversation(conversation);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/conversations`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(conversation),
      })
    );

    expect(result).toEqual(payload.data);
  });

  test("createConversation throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Could not create" },
        {
          ok: false,
          status: 400,
        }
      )
    );

    await expect(createConversation({})).rejects.toThrow("Could not create");
  });

  test("getConversationMessages returns data", async () => {
    const payload = { data: [{ id: "m1", text: "hello" }] };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await getConversationMessages("c1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/conversations/c1/messages`,
      expect.any(Object)
    );

    expect(result).toEqual(payload.data);
  });

  test("getConversationMessages throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "No messages" },
        {
          ok: false,
          status: 500,
        }
      )
    );

    await expect(getConversationMessages("c1")).rejects.toThrow("No messages");
  });

  test("sendConversationMessage returns data", async () => {
    const message = { text: "hello" };
    const payload = { data: { id: "m1", text: "hello" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await sendConversationMessage("c1", message);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/conversations/c1/messages`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(message),
      })
    );

    expect(result).toEqual(payload.data);
  });

  test("sendConversationMessage throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Message too long" },
        {
          ok: false,
          status: 400,
        }
      )
    );

    await expect(
      sendConversationMessage("c1", { text: "bad" })
    ).rejects.toThrow("Message too long");
  });

  test("markConversationAsRead sends PUT request", async () => {
    const payload = { data: { success: true } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await markConversationAsRead("c1", "u1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/conversations/c1/read`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ userId: "u1" }),
      })
    );

    expect(result).toEqual(payload);
  });

  test("deleteConversation sends DELETE request", async () => {
    const payload = { data: { id: "c1" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await deleteConversation("c1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/conversations/c1`,
      expect.objectContaining({
        method: "DELETE",
      })
    );

    expect(result).toEqual(payload);
  });
});

describe("availability API functions", () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
    setTestToken();
  });

  test("getAvailability returns response JSON", async () => {
    const payload = { data: [{ id: "slot1" }] };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await getAvailability("band", "b1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/availability?ownerType=band&ownerId=b1`,
      expect.any(Object)
    );

    expect(result).toEqual(payload);
  });

  test("getAvailability throws when response is not ok", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "bad" },
        {
          ok: false,
          status: 500,
        }
      )
    );

    await expect(getAvailability("band", "b1")).rejects.toThrow(
      "Failed to load availability"
    );
  });

  test("createAvailability sends POST request", async () => {
    const slot = {
      ownerType: "band",
      ownerId: "b1",
      start: "2026-06-01T10:00:00Z",
      end: "2026-06-01T11:00:00Z",
    };

    const payload = { data: slot };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await createAvailability(slot);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/availability`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(slot),
      })
    );

    expect(result).toEqual(payload);
  });

  test("createAvailability throws when response is not ok", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "bad" },
        {
          ok: false,
          status: 400,
        }
      )
    );

    await expect(createAvailability({})).rejects.toThrow(
      "Failed to create availability"
    );
  });

  test("deleteAvailability sends DELETE request", async () => {
    const payload = { data: { id: "slot1" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await deleteAvailability("slot1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/availability/slot1`,
      expect.objectContaining({
        method: "DELETE",
      })
    );

    expect(result).toEqual(payload);
  });

  test("deleteAvailability throws when response is not ok", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "bad" },
        {
          ok: false,
          status: 500,
        }
      )
    );

    await expect(deleteAvailability("slot1")).rejects.toThrow(
      "Failed to delete availability"
    );
  });
});

describe("gig request API functions", () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
    setTestToken();
  });

  test("getGigRequests builds query params and returns data", async () => {
    const payload = { data: [{ id: "request1" }] };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await getGigRequests({
      gigId: "g1",
      bandId: "b1",
      empty: "",
      ignoredNull: null,
      ignoredUndefined: undefined,
      status: "pending",
    });

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/gig-requests?gigId=g1&bandId=b1&status=pending`,
      expect.any(Object)
    );

    expect(result).toEqual(payload.data);
  });

  test("getGigRequests returns empty array when data is missing", async () => {
    fetch.mockResolvedValue(mockJsonResponse({}));

    const result = await getGigRequests();

    expect(result).toEqual([]);
  });

  test("getGigRequests throws when response is not ok", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "bad" },
        {
          ok: false,
          status: 500,
        }
      )
    );

    await expect(getGigRequests()).rejects.toThrow(
      "Failed to load gig requests"
    );
  });

  test("createVenueBandRequest sends POST request and returns data", async () => {
    const payload = { data: { id: "request1" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await createVenueBandRequest({
      gigId: "g1",
      bandId: "b1",
    });

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/gig-requests`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ gigId: "g1", bandId: "b1" }),
      })
    );

    expect(result).toEqual(payload.data);
  });

  test("createVenueBandRequest throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Already requested" },
        {
          ok: false,
          status: 409,
        }
      )
    );

    await expect(
      createVenueBandRequest({ gigId: "g1", bandId: "b1" })
    ).rejects.toThrow("Already requested");
  });

  test("createGigRequest sends POST request and returns data", async () => {
    const request = { gigId: "g1", bandId: "b1" };
    const payload = { data: { id: "request1" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await createGigRequest(request);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/gig-requests`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(request),
      })
    );

    expect(result).toEqual(payload.data);
  });

  test("createGigRequest throws default error when response body is bad JSON", async () => {
    fetch.mockResolvedValue(
      mockBadJsonResponse({
        ok: false,
        status: 400,
      })
    );

    await expect(createGigRequest({})).rejects.toThrow(
      "Failed to request gig"
    );
  });

  test("acceptGigRequest sends PUT request and returns data", async () => {
    const payload = { data: { id: "request1", status: "accepted" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await acceptGigRequest("request1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/gig-requests/request1/accept`,
      expect.objectContaining({
        method: "PUT",
      })
    );

    expect(result).toEqual(payload.data);
  });

  test("acceptGigRequest throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Cannot accept" },
        {
          ok: false,
          status: 400,
        }
      )
    );

    await expect(acceptGigRequest("request1")).rejects.toThrow(
      "Cannot accept"
    );
  });

  test("declineGigRequest sends PUT request and returns data", async () => {
    const payload = { data: { id: "request1", status: "declined" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await declineGigRequest("request1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/gig-requests/request1/decline`,
      expect.objectContaining({
        method: "PUT",
      })
    );

    expect(result).toEqual(payload.data);
  });

  test("declineGigRequest throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Cannot decline" },
        {
          ok: false,
          status: 400,
        }
      )
    );

    await expect(declineGigRequest("request1")).rejects.toThrow(
      "Cannot decline"
    );
  });

  test("cancelGigRequest sends DELETE request and returns data", async () => {
    const payload = { data: { id: "request1", status: "canceled" } };

    fetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await cancelGigRequest("request1");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/gig-requests/request1`,
      expect.objectContaining({
        method: "DELETE",
      })
    );

    expect(result).toEqual(payload.data);
  });

  test("cancelGigRequest throws backend error", async () => {
    fetch.mockResolvedValue(
      mockJsonResponse(
        { error: "Cannot cancel" },
        {
          ok: false,
          status: 400,
        }
      )
    );

    await expect(cancelGigRequest("request1")).rejects.toThrow(
      "Cannot cancel"
    );
  });
});

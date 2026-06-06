import { jest } from "@jest/globals";

let routes;
let mockApp;
let mockBandServices;
let mockVenueServices;
let mockMusicianServices;
let mockReviewServices;
let mockGigServices;
let mockAuthServices;
let mockConnect;
let mockNotificationServices;
let mockConversationServices;
let mockMessageServices;
let mockEmailVerificationServices;
let mockAvailabilityService;
let mockGigRequestServices;

const ORIGINAL_EMAIL_VERIFICATION_BYPASS = process.env.EMAIL_VERIFICATION_BYPASS;

beforeAll(() => {
  // Ensure local developer .env doesn't change test behavior.
  process.env.EMAIL_VERIFICATION_BYPASS = "false";
});

afterAll(() => {
  if (ORIGINAL_EMAIL_VERIFICATION_BYPASS === undefined) {
    delete process.env.EMAIL_VERIFICATION_BYPASS;
  } else {
    process.env.EMAIL_VERIFICATION_BYPASS = ORIGINAL_EMAIL_VERIFICATION_BYPASS;
  }
});

mockNotificationServices = {
    getNotificationsByUser: jest.fn().mockResolvedValue([]),
    getUnreadCount: jest.fn().mockResolvedValue(0),
    createNotification: jest.fn().mockResolvedValue({}),
    markNotificationAsRead: jest.fn().mockResolvedValue({}),
    markAllNotificationsAsRead: jest.fn().mockResolvedValue(),
    deleteNotification: jest.fn().mockResolvedValue({}),
  };

mockConversationServices = {
    getConversationsByUser: jest.fn().mockResolvedValue([]),
    findConversationByParticipants: jest.fn().mockResolvedValue(null),
    addConversation: jest.fn().mockResolvedValue({}),
    findConversationById: jest.fn().mockResolvedValue({ bandUserId: "b1", venueUserId: "v1" }),
    updateConversationLastMessage: jest.fn().mockResolvedValue(),
    findConversationByIdAndDelete: jest.fn().mockResolvedValue({}),
  };

mockMessageServices = {
    getMessages: jest.fn().mockResolvedValue([]),
    addMessage: jest.fn().mockResolvedValue({}),
    markMessagesRead: jest.fn().mockResolvedValue(),
  };

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    headersSent: false,

    status: jest.fn(function (code) {
      this.statusCode = code;
      return this;
    }),

    json: jest.fn(function (body) {
      this.body = body;
      this.headersSent = true;
      return this;
    }),

    send: jest.fn(function (body) {
      this.body = body;
      this.headersSent = true;
      return this;
    }),
  };
}

function findRoute(method, path) {
  const route = routes.find((r) => r.method === method && r.path === path);
  if (!route) {
    throw new Error(`Route not found: ${method} ${path}`);
  }
  return route.handler;
}

function composeHandlers(handlers) {
  const list = handlers.flat().filter(Boolean);
  return async (req, res) => {
    let idx = 0;
    const run = async () => {
      const handler = list[idx];
      idx += 1;
      if (!handler) return;

      // Middleware signature: (req, res, next)
      if (handler.length >= 3) {
        await new Promise((resolve, reject) => {
          try {
            const maybePromise = handler(req, res, (err) => {
              if (err) reject(err);
              else resolve();
            });

            if (res.headersSent) {
              resolve();
            }

            if (maybePromise && typeof maybePromise.then === "function") {
              maybePromise.then(resolve).catch(reject);
            }
          } catch (e) {
            reject(e);
          }
        });

        if (res.headersSent) return;
        return run();
      }

      await handler(req, res);
      if (res.headersSent) return;
      return run();
    };

    return run();
  };
}

async function loadBackend({ connectShouldReject = false } = {}) {
  jest.resetModules();

  routes = [];

  mockBandServices = {
    getBandsCount: jest.fn(),
    getBandsPaginated: jest.fn(),
    findBandById: jest.fn(),
    addBand: jest.fn(),
    findBandByIdAndDelete: jest.fn(),
    addBandMember: jest.fn(),
    removeBandMember: jest.fn(),
    updateBandProfilePicture: jest.fn(),
    addBandGalleryImage: jest.fn(),
    removeBandGalleryImage: jest.fn(),
    addBandVideo: jest.fn(),
    removeBandVideo: jest.fn(),
  };

  mockVenueServices = {
    getVenue: jest.fn(),
    addVenue: jest.fn(),
    findVenueById: jest.fn(),
    findOwnedVenueByUserId: jest.fn(),
    findVenueByContactEmail: jest.fn(),
    findVenueByName: jest.fn(),
    claimVenueOwnership: jest.fn(),
    findVenueByIdAndDelete: jest.fn(),
  };

  mockMusicianServices = {
    getMusiciansCount: jest.fn(),
    getMusiciansPaginated: jest.fn(),
    findMusicianById: jest.fn(),
    findOwnedMusicianByUserId: jest.fn(),
    findMusicianByName: jest.fn(),
    claimMusicianOwnership: jest.fn(),
    addMusician: jest.fn(),
    findMusicianByIdAndDelete: jest.fn(),
    updateMusicianProfilePicture: jest.fn(),
    addMusicianVideo: jest.fn(),
    removeMusicianVideo: jest.fn(),
  };

  mockReviewServices = {
    getReviewsCount: jest.fn(),
    getReviewsPaginated: jest.fn(),
    addReview: jest.fn(),
  };

  mockGigServices = {
    getGigsCount: jest.fn(),
    getGigsPaginated: jest.fn(),
    findGigById: jest.fn(),
    addGig: jest.fn(),
    findGigByIdAndDelete: jest.fn(),
    updateGigProfile: jest.fn(),
    addGigGalleryImage: jest.fn(),
    removeGigGalleryImage: jest.fn(),
    addGigVideo: jest.fn(),
    removeGigVideo: jest.fn(),
  };

  mockGigServices.updateGigProfile = jest.fn();
  mockGigServices.addGigGalleryImage = jest.fn();
  mockGigServices.removeGigGalleryImage = jest.fn();
  mockGigServices.addGigVideo = jest.fn();
  mockGigServices.removeGigVideo = jest.fn();

  mockAvailabilityService = {
    getSlots: jest.fn().mockResolvedValue([]),
    createAvailability: jest.fn().mockResolvedValue({}),
    deleteAvailability: jest.fn().mockResolvedValue({}),
  };

  mockGigRequestServices = {
    getGigRequests: jest.fn().mockResolvedValue([]),
    createGigRequest: jest.fn().mockResolvedValue({ _id: "request1" }),
    findGigRequestById: jest.fn().mockResolvedValue(null),
    acceptGigRequest: jest.fn().mockResolvedValue({ _id: "request1" }),
    declineGigRequest: jest.fn().mockResolvedValue({ _id: "request1" }),
    cancelGigRequest: jest.fn().mockResolvedValue({ _id: "request1" }),
  };

  mockAuthServices = {
    registerUser: jest.fn(),
    authenticateUser: jest.fn(),
    createAccessToken: jest.fn(() => "test-token"),
    verifyAccessToken: jest.fn(),
    findUserByEmail: jest.fn().mockResolvedValue({
      _id: "u1",
      email: "person@test.com",
      display_name: "Person",
      role: "musician",
      email_verified: true,
    }),
    findUserById: jest.fn().mockResolvedValue(null),
  };

  mockEmailVerificationServices = {
    sendVerificationForUser: jest.fn().mockResolvedValue({ ok: true }),
    sendVerificationForEmail: jest.fn().mockResolvedValue({ ok: true }),
    verifyCodeForEmail: jest.fn().mockResolvedValue({ ok: true }),
    devBypassVerifyEmail: jest.fn().mockResolvedValue({ ok: true }),
  };

  mockApp = {
    use: jest.fn(),
  
    get: jest.fn((path, ...handlers) => {
      routes.push({ method: "get", path, handler: composeHandlers(handlers) });
    }),
  
    post: jest.fn((path, ...handlers) => {
      routes.push({ method: "post", path, handler: composeHandlers(handlers) });
    }),
  
    put: jest.fn((path, ...handlers) => {
      routes.push({ method: "put", path, handler: composeHandlers(handlers) });
    }),
  
    delete: jest.fn((path, ...handlers) => {
      routes.push({ method: "delete", path, handler: composeHandlers(handlers) });
    }),
  
    listen: jest.fn(),
  };

  mockConnect = jest.fn(() =>
    connectShouldReject
      ? Promise.reject(new Error("connect fail"))
      : Promise.resolve()
  );

  await jest.unstable_mockModule("express", () => {
    const expressFn = () => mockApp;
    expressFn.json = jest.fn(() => jest.fn());
    expressFn.static = jest.fn(() => jest.fn());
    return { default: expressFn };
  });

  await jest.unstable_mockModule("mongoose", () => {
    class MockSchema {
      constructor(_definition, _options) {}

      index() {
        return this;
      }

      pre() {
        return this;
      }
    }

    MockSchema.Types = { ObjectId: class MockObjectId {} };

    return {
      default: {
        connect: mockConnect,
        Schema: MockSchema,
        model: jest.fn(() => ({})),
      },
    };
  });

  await jest.unstable_mockModule("./band-services.js", () => ({
    default: mockBandServices,
  }));

  await jest.unstable_mockModule("./venue-services.js", () => ({
    default: mockVenueServices,
  }));

  await jest.unstable_mockModule("./musician-services.js", () => ({
    default: mockMusicianServices,
  }));

  await jest.unstable_mockModule("./review-services.js", () => ({
    default: mockReviewServices,
  }));

  await jest.unstable_mockModule("./gig-services.js", () => ({
    default: mockGigServices,
  }));

  await jest.unstable_mockModule("./auth-services.js", () => ({
    default: mockAuthServices,
  }));

  await jest.unstable_mockModule("./user.js", () => ({
    VALID_ROLES: ["musician", "band", "venue"],
  }));

  await jest.unstable_mockModule("./notification-services.js", () => ({
    default: mockNotificationServices,
  }));

  await jest.unstable_mockModule("./conversation-services.js", () => ({
    default: mockConversationServices,
  }));

  await jest.unstable_mockModule("./message-services.js", () => ({
    default: mockMessageServices,
  }));

  await jest.unstable_mockModule("./email-verification-services.js", () => ({
    default: mockEmailVerificationServices,
  }));

  await jest.unstable_mockModule("./availability-service.js", () => ({
    default: mockAvailabilityService,
  }));

  await jest.unstable_mockModule("./gig-request-services.js", () => ({
    default: mockGigRequestServices,
  }));

  const backend = await import("./backend.js");
  await Promise.resolve();
  return backend;
}

async function invokeAuthenticatedHandler(handler, req, authPayload) {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  mockAuthServices.verifyAccessToken.mockReturnValue(authPayload);

  req.headers = {
    authorization: "Bearer test-token",
    ...(req.headers || {}),
  };
  req.get = jest.fn((headerName) => req.headers?.[headerName]);

  const res = createMockRes();

  try {
    await handler(req, res);
    return res;
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
}

async function invokeUnauthenticatedHandler(handler, req) {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";

  const res = createMockRes();
  try {
    req.headers = { ...(req.headers || {}) };
    req.get = jest.fn((headerName) => req.headers?.[headerName]);
    await handler(req, res);
    return res;
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
}

describe("backend initialization", () => {
  test("connects to MongoDB and starts server successfully", async () => {
    await loadBackend({ connectShouldReject: false });
    expect(mockConnect).toHaveBeenCalled();
    expect(mockApp.listen).toHaveBeenCalled();
    const listenCallback = mockApp.listen.mock.calls[0][1];
    expect(listenCallback).toBeDefined();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    listenCallback();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Server running on")
    );
    logSpy.mockRestore();
  });

  test("logs connection error when MongoDB connect fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await loadBackend({ connectShouldReject: true });

    expect(mockConnect).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  test("uses default Mongo URI when MONGODB_URI is missing", async () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    await loadBackend({ connectShouldReject: false });

    const expectedUri =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giggly";
    expect(mockConnect).toHaveBeenCalledWith(expectedUri);

    if (originalUri !== undefined) {
      process.env.MONGODB_URI = originalUri;
    }
  });

  test("uses MONGODB_URI from env when set", async () => {
    const originalUri = process.env.MONGODB_URI;
    const customUri = "mongodb://env-set:27017/mydb";
    process.env.MONGODB_URI = customUri;

    await loadBackend({ connectShouldReject: false });

    expect(mockConnect).toHaveBeenCalledWith(customUri);

    if (originalUri !== undefined) {
      process.env.MONGODB_URI = originalUri;
    } else {
      delete process.env.MONGODB_URI;
    }
  });

  test("uses default Mongo URI when MONGODB_URI is empty string", async () => {
    const originalUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = "";

    await loadBackend({ connectShouldReject: false });

    expect(mockConnect).toHaveBeenCalledWith(
      "mongodb://127.0.0.1:27017/giggly"
    );

    if (originalUri !== undefined) {
      process.env.MONGODB_URI = originalUri;
    } else {
      delete process.env.MONGODB_URI;
    }
  });
});

describe("band routes", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test("GET /bands success", async () => {
    const handler = findRoute("get", "/bands");
    mockBandServices.getBandsCount.mockResolvedValue(42);
    mockBandServices.getBandsPaginated.mockResolvedValue({
      bands: [{ id: "b1" }],
    });

    const req = {
      query: {
        limit: "10",
        offset: "5",
        name: "test",
        member_names: "m1,m2",
        genres: "rock,jazz",
        locations: "city1,city2",
        min_price: "100",
        max_price: "200",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ id: "b1" }],
        meta: expect.objectContaining({
          limit: 10,
          offset: 5,
          total: 42,
        }),
      })
    );
  });

  test("GET /bands handles service error", async () => {
    const handler = findRoute("get", "/bands");
    mockBandServices.getBandsCount.mockRejectedValue(new Error("fail"));

    const req = { query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });

  test("GET /bands/:id success", async () => {
    const handler = findRoute("get", "/bands/:id");
    mockBandServices.findBandById.mockResolvedValue({
      id: "b1",
    });

    const req = { params: { id: "b1" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: { id: "b1" } })
    );
  });

  test("GET /bands/:id returns 404 when not found", async () => {
    const handler = findRoute("get", "/bands/:id");
    mockBandServices.findBandById.mockResolvedValue(null);

    const req = { params: { id: "missing" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test("GET /bands/:id returns 400 on error", async () => {
    const handler = findRoute("get", "/bands/:id");
    mockBandServices.findBandById.mockRejectedValue(new Error("bad"));

    const req = { params: { id: "bad" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("POST /bands success", async () => {
    const handler = findRoute("post", "/bands");
    const created = { id: "b1" };
    mockBandServices.addBand.mockResolvedValue(created);

    const req = { body: { name: "Band" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.json).toHaveBeenCalledWith({ data: created });
  });

  test("POST /bands returns 400 on error", async () => {
    const handler = findRoute("post", "/bands");
    mockBandServices.addBand.mockRejectedValue(new Error("bad"));

    const req = { body: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("DELETE /bands/:id success", async () => {
    const handler = findRoute("delete", "/bands/:id");
    const deleted = { id: "b1" };
    mockBandServices.findBandByIdAndDelete.mockResolvedValue(deleted);

    const req = { params: { id: "b1" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ data: deleted });
  });

  test("DELETE /bands/:id returns 404 when not found", async () => {
    const handler = findRoute("delete", "/bands/:id");
    mockBandServices.findBandByIdAndDelete.mockResolvedValue(null);

    const req = { params: { id: "missing" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test("DELETE /bands/:id returns 404 on error", async () => {
    const handler = findRoute("delete", "/bands/:id");
    mockBandServices.findBandByIdAndDelete.mockRejectedValue(new Error("bad"));

    const req = { params: { id: "bad" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });
});

describe("venue routes", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test("GET /venues success", async () => {
    const handler = findRoute("get", "/venues");
    mockVenueServices.getVenue.mockResolvedValue([{ id: "v1" }]);

    const req = {
      query: {
        name: "Venue",
        city: "City",
        state: "CA",
        zip: "12345",
        minCap: "100",
        maxCap: "500",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [{ id: "v1" }],
    });
  });

  test("GET /venues returns 500 on error", async () => {
    const handler = findRoute("get", "/venues");
    mockVenueServices.getVenue.mockRejectedValue(new Error("fail"));

    const req = { query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });

  test("POST /venues success", async () => {
    const handler = findRoute("post", "/venues");
    const created = { id: "v1" };
    mockVenueServices.addVenue.mockResolvedValue(created);

    const req = { body: { name: "Venue" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.json).toHaveBeenCalledWith({ data: created });
  });

  test("POST /venues returns 400 on error", async () => {
    const handler = findRoute("post", "/venues");
    mockVenueServices.addVenue.mockRejectedValue(new Error("bad"));

    const req = { body: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("GET /venues/:id success", async () => {
    const handler = findRoute("get", "/venues/:id");
    const venue = { id: "v1" };
    mockVenueServices.findVenueById.mockResolvedValue(venue);

    const req = { params: { id: "v1" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ data: venue });
  });

  test("GET /venues/:id returns 404 when not found", async () => {
    const handler = findRoute("get", "/venues/:id");
    mockVenueServices.findVenueById.mockResolvedValue(null);

    const req = { params: { id: "missing" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test("GET /venues/:id returns 400 on error", async () => {
    const handler = findRoute("get", "/venues/:id");
    mockVenueServices.findVenueById.mockRejectedValue(new Error("bad"));

    const req = { params: { id: "bad" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("DELETE /venues/:id success", async () => {
    const handler = findRoute("delete", "/venues/:id");
    const deleted = { id: "v1" };
    mockVenueServices.findVenueByIdAndDelete.mockResolvedValue(deleted);

    const req = { params: { id: "v1" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ data: deleted });
  });

  test("DELETE /venues/:id returns 404 when not found", async () => {
    const handler = findRoute("delete", "/venues/:id");
    mockVenueServices.findVenueByIdAndDelete.mockResolvedValue(null);

    const req = { params: { id: "missing" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test("DELETE /venues/:id returns 400 on error", async () => {
    const handler = findRoute("delete", "/venues/:id");
    mockVenueServices.findVenueByIdAndDelete.mockRejectedValue(
      new Error("bad")
    );

    const req = { params: { id: "bad" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });
});

describe("musician routes and reviews", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test("GET /musicians success", async () => {
    const handler = findRoute("get", "/musicians");
    mockMusicianServices.getMusiciansCount.mockResolvedValue(5);
    mockMusicianServices.getMusiciansPaginated.mockResolvedValue({
      musicians: [{ id: "m1" }],
    });

    const req = {
      query: {
        limit: "10",
        offset: "0",
        name: "Name",
        instruments: "guitar,drums",
        band_affiliations: "b1,b2",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ id: "m1" }],
        meta: expect.objectContaining({ total: 5 }),
      })
    );
  });

  test("GET /musicians returns 500 on error", async () => {
    const handler = findRoute("get", "/musicians");
    mockMusicianServices.getMusiciansCount.mockRejectedValue(new Error("fail"));

    const req = { query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });

  test("GET /musicians/:id success", async () => {
    const handler = findRoute("get", "/musicians/:id");
    const musician = { id: "m1" };
    mockMusicianServices.findMusicianById.mockResolvedValue(musician);

    const req = { params: { id: "m1" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ data: musician });
  });

  test("GET /musicians/:id returns 404 when not found", async () => {
    const handler = findRoute("get", "/musicians/:id");
    mockMusicianServices.findMusicianById.mockResolvedValue(null);

    const req = { params: { id: "missing" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test("GET /musicians/:id returns 400 on error", async () => {
    const handler = findRoute("get", "/musicians/:id");
    mockMusicianServices.findMusicianById.mockRejectedValue(new Error("bad"));

    const req = { params: { id: "bad" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("POST /musicians success", async () => {
    const handler = findRoute("post", "/musicians");
    const created = { id: "m1" };
    mockMusicianServices.addMusician.mockResolvedValue(created);

    const req = { body: { name: "Name" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.json).toHaveBeenCalledWith({ data: created });
  });

  test("POST /musicians returns 400 on error", async () => {
    const handler = findRoute("post", "/musicians");
    mockMusicianServices.addMusician.mockRejectedValue(new Error("bad"));

    const req = { body: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("DELETE /musicians/:id success", async () => {
    const handler = findRoute("delete", "/musicians/:id");
    const deleted = { id: "m1" };
    mockMusicianServices.findMusicianByIdAndDelete.mockResolvedValue(deleted);

    const req = { params: { id: "m1" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ data: deleted });
  });

  test("DELETE /musicians/:id returns 404 when not found", async () => {
    const handler = findRoute("delete", "/musicians/:id");
    mockMusicianServices.findMusicianByIdAndDelete.mockResolvedValue(null);

    const req = { params: { id: "missing" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test("DELETE /musicians/:id returns 400 on error", async () => {
    const handler = findRoute("delete", "/musicians/:id");
    mockMusicianServices.findMusicianByIdAndDelete.mockRejectedValue(
      new Error("bad")
    );

    const req = { params: { id: "bad" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("GET /musicians/:id/reviews success", async () => {
    const handler = findRoute("get", "/musicians/:id/reviews");
    mockReviewServices.getReviewsCount.mockResolvedValue(3);
    mockReviewServices.getReviewsPaginated.mockResolvedValue({
      reviews: [{ id: "r1" }],
    });

    const req = {
      params: { id: "m1" },
      query: { limit: "5", offset: "0" },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ id: "r1" }],
        meta: expect.objectContaining({ total: 3 }),
      })
    );
  });

  test("GET /musicians/:id/reviews returns 500 on error", async () => {
    const handler = findRoute("get", "/musicians/:id/reviews");
    mockReviewServices.getReviewsCount.mockRejectedValue(new Error("fail"));

    const req = {
      params: { id: "m1" },
      query: {},
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });
});

describe("review routes", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test("GET /reviews success", async () => {
    const handler = findRoute("get", "/reviews");
    mockReviewServices.getReviewsCount.mockResolvedValue(2);
    mockReviewServices.getReviewsPaginated.mockResolvedValue({
      reviews: [{ id: "r1" }],
    });

    const req = {
      query: {
        limit: "10",
        offset: "0",
        reviewee: "id1",
        reviewer: "id2",
        revieweeType: "Musician",
        rating: "5",
        header: "Great",
        body: "Text",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ id: "r1" }],
        meta: expect.objectContaining({ total: 2 }),
      })
    );
  });

  test("GET /reviews returns 500 on error", async () => {
    const handler = findRoute("get", "/reviews");
    mockReviewServices.getReviewsCount.mockRejectedValue(new Error("fail"));

    const req = { query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });

  test("POST /reviews returns 400 when required fields missing", async () => {
    const handler = findRoute("post", "/reviews");

    const req = {
      body: {
        reviewer: "r",
        reviewee: null,
        revieweeType: "Musician",
        rating: 5,
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("POST /reviews returns 400 when rating invalid", async () => {
    const handler = findRoute("post", "/reviews");

    const req = {
      body: {
        reviewer: "r",
        reviewee: "e",
        revieweeType: "Musician",
        rating: 10,
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("POST /reviews returns 400 when revieweeType invalid", async () => {
    const handler = findRoute("post", "/reviews");

    const req = {
      body: {
        reviewer: "r",
        reviewee: "e",
        revieweeType: "Other",
        rating: 4,
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("POST /reviews success", async () => {
    const handler = findRoute("post", "/reviews");
    const created = { id: "r1" };
    mockReviewServices.addReview.mockResolvedValue(created);

    const req = {
      body: {
        reviewer: "r",
        reviewee: "e",
        revieweeType: "Band",
        rating: 4,
        header: "H",
        body: "B",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.json).toHaveBeenCalledWith({ data: created });
  });

  test("POST /reviews returns 400 on service error", async () => {
    const handler = findRoute("post", "/reviews");
    mockReviewServices.addReview.mockRejectedValue(new Error("bad"));

    const req = {
      body: {
        reviewer: "r",
        reviewee: "e",
        revieweeType: "Band",
        rating: 4,
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });
});

describe("auth routes", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test("POST /auth/register success", async () => {
    const handler = findRoute("post", "/auth/register");
    const created = {
      _id: "u1",
      email: "person@test.com",
      display_name: "Person",
      role: "musician",
      email_verified: false,
      createdAt: new Date().toISOString(),
    };
    mockAuthServices.registerUser.mockResolvedValue(created);

    const req = {
      body: {
        email: "person@test.com",
        password: "password123",
        display_name: "Person",
        role: "musician",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(mockAuthServices.registerUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "person@test.com",
        password: "password123",
        display_name: "Person",
        role: "musician",
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: "u1",
          email: "person@test.com",
          display_name: "Person",
          role: "musician",
          email_verified: false,
        }),
      })
    );
    expect(mockEmailVerificationServices.sendVerificationForUser).toHaveBeenCalled();
  });

  test("POST /auth/register returns 400 when required fields missing", async () => {
    const handler = findRoute("post", "/auth/register");
    const req = {
      body: {
        email: "person@test.com",
        password: "password123",
        role: "musician",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("POST /auth/register returns 400 on invalid email", async () => {
    const handler = findRoute("post", "/auth/register");
    const req = {
      body: {
        email: "bad-email",
        password: "password123",
        display_name: "Person",
        role: "musician",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("POST /auth/register returns 400 on short password", async () => {
    const handler = findRoute("post", "/auth/register");
    const req = {
      body: {
        email: "person@test.com",
        password: "short",
        display_name: "Person",
        role: "musician",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("POST /auth/register returns 400 on invalid role", async () => {
    const handler = findRoute("post", "/auth/register");
    const req = {
      body: {
        email: "person@test.com",
        password: "password123",
        display_name: "Person",
        role: "admin",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("POST /auth/register returns 409 when email exists", async () => {
    const handler = findRoute("post", "/auth/register");
    const duplicateError = new Error("duplicate");
    duplicateError.code = 11000;
    mockAuthServices.registerUser.mockRejectedValue(duplicateError);

    const req = {
      body: {
        email: "person@test.com",
        password: "password123",
        display_name: "Person",
        role: "musician",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(409);
  });

  test("POST /auth/email/send success", async () => {
    const handler = findRoute("post", "/auth/email/send");
    mockEmailVerificationServices.sendVerificationForEmail.mockResolvedValue({
      ok: true,
    });

    const req = { body: { email: "person@test.com" } };
    const res = createMockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockEmailVerificationServices.sendVerificationForEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "person@test.com" })
    );
  });

  test("POST /auth/email/send returns 400 on invalid email", async () => {
    const handler = findRoute("post", "/auth/email/send");
    const req = { body: { email: "bad-email" } };
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test("POST /auth/email/verify success", async () => {
    const handler = findRoute("post", "/auth/email/verify");
    mockEmailVerificationServices.verifyCodeForEmail.mockResolvedValue({ ok: true });

    const req = { body: { email: "person@test.com", code: "123456" } };
    const res = createMockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockEmailVerificationServices.verifyCodeForEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "person@test.com", code: "123456" })
    );
  });

  test("POST /auth/email/verify returns 400 on invalid code", async () => {
    const handler = findRoute("post", "/auth/email/verify");
    mockEmailVerificationServices.verifyCodeForEmail.mockResolvedValue({
      ok: false,
      error: "Invalid code",
    });

    const req = { body: { email: "person@test.com", code: "000000" } };
    const res = createMockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("POST /auth/email/verify supports dev bypass code", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalBypass = process.env.EMAIL_VERIFICATION_BYPASS;
    process.env.NODE_ENV = "development";
    process.env.EMAIL_VERIFICATION_BYPASS = "true";

    const handler = findRoute("post", "/auth/email/verify");
    const req = { body: { email: "person@test.com", code: "000000" } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockEmailVerificationServices.devBypassVerifyEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "person@test.com" })
    );

    process.env.NODE_ENV = originalNodeEnv;
    process.env.EMAIL_VERIFICATION_BYPASS = originalBypass;
  });
});

describe("messaging routes auth + access control", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test("GET /conversations returns 401 when unauthenticated", async () => {
    const handler = findRoute("get", "/conversations");
    const res = await invokeUnauthenticatedHandler(handler, { query: { userId: "u1" } });
    expect(res.statusCode).toBe(401);
  });

  test("GET /conversations returns 403 when userId does not match token", async () => {
    const handler = findRoute("get", "/conversations");
    const res = await invokeAuthenticatedHandler(
      handler,
      { query: { userId: "other" } },
      { sub: "u1", email: "x@test.com", role: "musician" },
    );
    expect(res.statusCode).toBe(403);
  });

  test("GET /conversations uses token user id", async () => {
    const handler = findRoute("get", "/conversations");
    await invokeAuthenticatedHandler(
      handler,
      { query: { userId: "u1" } },
      { sub: "u1", email: "x@test.com", role: "musician" },
    );
    expect(mockConversationServices.getConversationsByUser).toHaveBeenCalledWith("u1");
  });

  test("GET /conversations/:id/messages returns 403 for non-participant", async () => {
    const handler = findRoute("get", "/conversations/:id/messages");
    mockConversationServices.findConversationById.mockResolvedValue({
      bandUserId: "b1",
      venueUserId: "v1",
    });
    const res = await invokeAuthenticatedHandler(
      handler,
      { params: { id: "c1" } },
      { sub: "u-not-in-thread", email: "x@test.com", role: "musician" },
    );
    expect(res.statusCode).toBe(403);
  });

  test("POST /conversations/:id/messages ignores senderUserId and uses token", async () => {
    const handler = findRoute("post", "/conversations/:id/messages");
    mockConversationServices.findConversationById.mockResolvedValue({
      _id: "c1",
      bandUserId: "u1",
      venueUserId: "u2",
    });
    mockMessageServices.addMessage.mockResolvedValue({ _id: "m1", text: "hi" });

    const res = await invokeAuthenticatedHandler(
      handler,
      {
        params: { id: "c1" },
        body: { senderUserId: "attacker", senderRole: "venue", text: "hi" },
      },
      { sub: "u1", email: "x@test.com", role: "musician" },
    );

    expect(res.statusCode).toBe(201);
    expect(mockMessageServices.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "c1",
        senderUserId: "u1",
        senderRole: "band",
        text: "hi",
      }),
    );
  });
});

describe("rate limiting", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test("POST /auth/login rate limits after too many requests", async () => {
    const handler = findRoute("post", "/auth/login");
    const req = { body: { email: "a@test.com", password: "password123" } };
    mockAuthServices.authenticateUser.mockResolvedValue(null);

    let lastRes;
    for (let i = 0; i < 20; i += 1) {
      lastRes = await invokeUnauthenticatedHandler(handler, { ...req, body: req.body });
    }

    expect(lastRes.statusCode).toBe(429);
  });
});

describe("role guards", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test("POST /bands injects owner and creator musician membership", async () => {
    const handler = findRoute("post", "/bands");
    const created = { id: "b1" };
    mockMusicianServices.findOwnedMusicianByUserId.mockResolvedValue({
      _id: "m-owner",
    });
    mockBandServices.addBand.mockResolvedValue(created);

    const res = await invokeAuthenticatedHandler(
      handler,
      {
        body: {
          name: "Band",
          members: ["m-other"],
        },
      },
      {
        sub: "u1",
        email: "artist@test.com",
        role: "musician",
      }
    );

    expect(res.statusCode).toBe(201);
    expect(mockBandServices.addBand).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Band",
        owner_user: "u1",
        members: expect.arrayContaining(["m-owner", "m-other"]),
      })
    );
  });

  test("POST /gigs returns 403 for non-venue users", async () => {
    const handler = findRoute("post", "/gigs");

    const res = await invokeAuthenticatedHandler(
      handler,
      {
        body: {
          name: "Gig",
        },
      },
      {
        sub: "u1",
        email: "artist@test.com",
        role: "musician",
      }
    );

    expect(res.statusCode).toBe(403);
    expect(mockGigServices.addGig).not.toHaveBeenCalled();
  });

  test("DELETE /musicians/:id/videos/:videoId returns 403 for non-owners", async () => {
    const handler = findRoute("delete", "/musicians/:id/videos/:videoId");
    mockMusicianServices.findMusicianById.mockResolvedValue({
      _id: "m2",
      owner_user: "someone-else",
    });

    const res = await invokeAuthenticatedHandler(
      handler,
      {
        params: {
          id: "m2",
          videoId: "vid1",
        },
      },
      {
        sub: "u1",
        email: "artist@test.com",
        role: "musician",
      }
    );

    expect(res.statusCode).toBe(403);
    expect(mockMusicianServices.removeMusicianVideo).not.toHaveBeenCalled();
  });
});


describe("extra backend route coverage", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("availability routes", () => {
    test("GET /availability success", async () => {
      const handler = findRoute("get", "/availability");
      mockAvailabilityService.getSlots.mockResolvedValue([{ id: "slot1" }]);

      const req = {
        query: {
          ownerType: "band",
          ownerId: "band1",
          start: "2026-06-01",
          end: "2026-06-02",
          status: "available",
        },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockAvailabilityService.getSlots).toHaveBeenCalledWith({
        ownerType: "band",
        ownerId: "band1",
        start: "2026-06-01",
        end: "2026-06-02",
        status: "available",
      });
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: "slot1" }] });
    });

    test("GET /availability returns 400 when ownerType or ownerId is missing", async () => {
      const handler = findRoute("get", "/availability");

      const req = { query: { ownerType: "band" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(mockAvailabilityService.getSlots).not.toHaveBeenCalled();
    });

    test("POST /availability success", async () => {
      const handler = findRoute("post", "/availability");
      const slot = { id: "slot1", ownerType: "band" };
      mockAvailabilityService.createAvailability.mockResolvedValue(slot);

      const req = {
        body: {
          ownerType: "band",
          ownerId: "band1",
          start: "2026-06-01T10:00:00Z",
          end: "2026-06-01T11:00:00Z",
          status: "available",
          notes: "Practice",
        },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
      expect(mockAvailabilityService.createAvailability).toHaveBeenCalledWith({
        ownerType: "band",
        ownerId: "band1",
        start: "2026-06-01T10:00:00Z",
        end: "2026-06-01T11:00:00Z",
        status: "available",
        notes: "Practice",
      });
      expect(res.json).toHaveBeenCalledWith({ data: slot });
    });

    test("POST /availability returns 400 when required fields are missing", async () => {
      const handler = findRoute("post", "/availability");

      const req = {
        body: {
          ownerType: "band",
          ownerId: "band1",
        },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(mockAvailabilityService.createAvailability).not.toHaveBeenCalled();
    });

    test("DELETE /availability/:id success", async () => {
      const handler = findRoute("delete", "/availability/:id");
      const deleted = { id: "slot1" };
      mockAvailabilityService.deleteAvailability.mockResolvedValue(deleted);

      const req = { params: { id: "slot1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockAvailabilityService.deleteAvailability).toHaveBeenCalledWith("slot1");
      expect(res.json).toHaveBeenCalledWith({ data: deleted });
    });

    test("DELETE /availability/:id returns 404 when slot is missing", async () => {
      const handler = findRoute("delete", "/availability/:id");
      mockAvailabilityService.deleteAvailability.mockResolvedValue(null);

      const req = { params: { id: "missing" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("notification routes", () => {
    test("GET /notifications success", async () => {
      const handler = findRoute("get", "/notifications");
      mockNotificationServices.getNotificationsByUser.mockResolvedValue([
        { id: "n1" },
      ]);

      const req = { query: { userId: "user1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockNotificationServices.getNotificationsByUser).toHaveBeenCalledWith(
        "user1"
      );
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: "n1" }] });
    });

    test("GET /notifications returns 400 when userId is missing", async () => {
      const handler = findRoute("get", "/notifications");

      const req = { query: {} };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(mockNotificationServices.getNotificationsByUser).not.toHaveBeenCalled();
    });

    test("GET /notifications/unread-count success", async () => {
      const handler = findRoute("get", "/notifications/unread-count");
      mockNotificationServices.getUnreadCount.mockResolvedValue(7);

      const req = { query: { userId: "user1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.json).toHaveBeenCalledWith({ data: { count: 7 } });
    });

    test("POST /notifications success", async () => {
      const handler = findRoute("post", "/notifications");
      const notification = { id: "n1" };
      mockNotificationServices.createNotification.mockResolvedValue(notification);

      const req = {
        body: {
          userId: "user1",
          type: "welcome",
          title: "Welcome",
          body: "Hello",
          relatedId: "rel1",
        },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
      expect(mockNotificationServices.createNotification).toHaveBeenCalledWith({
        userId: "user1",
        type: "welcome",
        title: "Welcome",
        body: "Hello",
        relatedId: "rel1",
      });
      expect(res.json).toHaveBeenCalledWith({ data: notification });
    });

    test("POST /notifications returns 400 when required fields are missing", async () => {
      const handler = findRoute("post", "/notifications");

      const req = { body: { userId: "user1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(mockNotificationServices.createNotification).not.toHaveBeenCalled();
    });

    test("PUT /notifications/:id/read success", async () => {
      const handler = findRoute("put", "/notifications/:id/read");
      const notification = { id: "n1", read: true };
      mockNotificationServices.markNotificationAsRead.mockResolvedValue(notification);

      const req = { params: { id: "n1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockNotificationServices.markNotificationAsRead).toHaveBeenCalledWith(
        "n1"
      );
    });

    test("DELETE /notifications/:id success", async () => {
      const handler = findRoute("delete", "/notifications/:id");
      const deleted = { id: "n1" };
      mockNotificationServices.deleteNotification.mockResolvedValue(deleted);

      const req = { params: { id: "n1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockNotificationServices.deleteNotification).toHaveBeenCalledWith(
        "n1"
      );
    });
  });

  describe("extra gig routes", () => {
    test("GET /gigs success", async () => {
      const handler = findRoute("get", "/gigs");
      mockGigServices.getGigsCount.mockResolvedValue(1);
      mockGigServices.getGigsPaginated.mockResolvedValue({
        gigs: [{ id: "g1" }],
      });

      const req = {
        query: {
          limit: "10",
          offset: "0",
          name: "Show",
          genres: "rock,jazz",
          booked: "false",
          min_price: "100",
          max_price: "200",
        },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ id: "g1" }],
          meta: expect.objectContaining({ total: 1 }),
        })
      );
    });

    test("GET /gigs/:id success", async () => {
      const handler = findRoute("get", "/gigs/:id");
      const gig = { id: "g1" };
      mockGigServices.findGigById.mockResolvedValue(gig);

      const req = { params: { id: "g1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.json).toHaveBeenCalledWith({ data: gig });
    });

    test("GET /gigs/:id returns 404 when missing", async () => {
      const handler = findRoute("get", "/gigs/:id");
      mockGigServices.findGigById.mockResolvedValue(null);

      const req = { params: { id: "missing" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    test("PUT /gigs/:id lowercases name and updates gig", async () => {
      const handler = findRoute("put", "/gigs/:id");
      const updated = { id: "g1", name: "rock night" };
      mockGigServices.updateGigProfile.mockResolvedValue(updated);

      const req = {
        params: { id: "g1" },
        body: { name: "Rock Night", location: "SLO" },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockGigServices.updateGigProfile).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({
          name: "rock night",
          location: "SLO",
        })
      );
      expect(res.json).toHaveBeenCalledWith({ data: updated });
    });

    test("PUT /gigs/:id returns 404 when gig is missing", async () => {
      const handler = findRoute("put", "/gigs/:id");
      mockGigServices.updateGigProfile.mockResolvedValue(null);

      const req = { params: { id: "missing" }, body: { name: "Missing" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("gig request routes", () => {
    test("GET /gig-requests uses venueUserId for venue user", async () => {
      const handler = findRoute("get", "/gig-requests");
      mockGigRequestServices.getGigRequests.mockResolvedValue([{ id: "r1" }]);

      const res = await invokeAuthenticatedHandler(
        handler,
        { query: {} },
        { sub: "venueUser1", role: "venue" }
      );

      expect(res.statusCode).toBe(200);
      expect(mockGigRequestServices.getGigRequests).toHaveBeenCalledWith(
        expect.objectContaining({
          venueUserId: "venueUser1",
        })
      );
    });

    test("GET /gig-requests uses bandUserId for band user", async () => {
      const handler = findRoute("get", "/gig-requests");
      mockGigRequestServices.getGigRequests.mockResolvedValue([{ id: "r1" }]);

      const res = await invokeAuthenticatedHandler(
        handler,
        { query: {} },
        { sub: "bandUser1", role: "band" }
      );

      expect(res.statusCode).toBe(200);
      expect(mockGigRequestServices.getGigRequests).toHaveBeenCalledWith(
        expect.objectContaining({
          bandUserId: "bandUser1",
        })
      );
    });

    test("POST /gig-requests returns 400 for missing band request fields", async () => {
      const handler = findRoute("post", "/gig-requests");

      const res = await invokeAuthenticatedHandler(
        handler,
        { body: { gigId: "g1" } },
        { sub: "bandUser1", role: "band" }
      );

      expect(res.statusCode).toBe(400);
      expect(mockGigRequestServices.createGigRequest).not.toHaveBeenCalled();
    });

    test("POST /gig-requests returns 403 for unsupported role", async () => {
      const handler = findRoute("post", "/gig-requests");

      const res = await invokeAuthenticatedHandler(
        handler,
        { body: {} },
        { sub: "admin1", role: "admin" }
      );

      expect(res.statusCode).toBe(403);
    });

    test("PUT /gig-requests/:id/accept returns 404 when request is missing", async () => {
      const handler = findRoute("put", "/gig-requests/:id/accept");
      mockGigRequestServices.findGigRequestById.mockResolvedValue(null);

      const res = await invokeAuthenticatedHandler(
        handler,
        { params: { id: "missing" } },
        { sub: "venueUser1", role: "venue" }
      );

      expect(res.statusCode).toBe(404);
    });

    test("PUT /gig-requests/:id/accept success for venue accepting band request", async () => {
      const handler = findRoute("put", "/gig-requests/:id/accept");

      mockGigRequestServices.findGigRequestById.mockResolvedValue({
        _id: "request1",
        initiatedBy: "band",
        bandUserId: "bandUser1",
        venueUserId: "venueUser1",
      });

      mockGigRequestServices.acceptGigRequest.mockResolvedValue({
        _id: "request1",
        initiatedBy: "band",
        bandUserId: "bandUser1",
        venueUserId: "venueUser1",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        { params: { id: "request1" } },
        { sub: "venueUser1", role: "venue" }
      );

      expect(res.statusCode).toBe(200);
      expect(mockGigRequestServices.acceptGigRequest).toHaveBeenCalledWith(
        "request1"
      );
    });

    test("PUT /gig-requests/:id/decline returns 403 for wrong user", async () => {
      const handler = findRoute("put", "/gig-requests/:id/decline");

      mockGigRequestServices.findGigRequestById.mockResolvedValue({
        _id: "request1",
        initiatedBy: "band",
        bandUserId: "bandUser1",
        venueUserId: "venueUser1",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        { params: { id: "request1" } },
        { sub: "otherVenue", role: "venue" }
      );

      expect(res.statusCode).toBe(403);
      expect(mockGigRequestServices.declineGigRequest).not.toHaveBeenCalled();
    });
  });
});


describe("deeper backend route coverage", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("more notification route branches", () => {
    test("PUT /notifications/read-all success", async () => {
      const handler = findRoute("put", "/notifications/read-all");
      mockNotificationServices.markAllNotificationsAsRead.mockResolvedValue({
        modifiedCount: 2,
      });

      const req = { body: { userId: "user1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockNotificationServices.markAllNotificationsAsRead).toHaveBeenCalledWith(
        "user1"
      );
      expect(res.json).toHaveBeenCalledWith({
        data: { success: true },
      });
    });

    test("PUT /notifications/read-all returns 400 when userId is missing", async () => {
      const handler = findRoute("put", "/notifications/read-all");

      const req = { body: {} };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(mockNotificationServices.markAllNotificationsAsRead).not.toHaveBeenCalled();
    });

    test("PUT /notifications/:id/read returns 404 when notification is missing", async () => {
      const handler = findRoute("put", "/notifications/:id/read");
      mockNotificationServices.markNotificationAsRead.mockResolvedValue(null);

      const req = { params: { id: "missing" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    test("DELETE /notifications/:id returns 404 when notification is missing", async () => {
      const handler = findRoute("delete", "/notifications/:id");
      mockNotificationServices.deleteNotification.mockResolvedValue(null);

      const req = { params: { id: "missing" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("more conversation route branches", () => {
    test("POST /conversations returns 400 when required fields are missing", async () => {
      const handler = findRoute("post", "/conversations");

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          body: {
            bandId: "band1",
            venueId: "venue1",
          },
        },
        {
          sub: "bandUser1",
          email: "band@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(400);
      expect(mockConversationServices.findConversationByParticipants).not.toHaveBeenCalled();
    });

    test("POST /conversations returns 403 when auth user is not a participant", async () => {
      const handler = findRoute("post", "/conversations");

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          body: {
            gigId: "gig1",
            bandId: "band1",
            venueId: "venue1",
            bandUserId: "bandUser1",
            venueUserId: "venueUser1",
          },
        },
        {
          sub: "randomUser",
          email: "random@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(403);
      expect(mockConversationServices.findConversationByParticipants).not.toHaveBeenCalled();
    });

    test("POST /conversations returns existing conversation when found", async () => {
      const handler = findRoute("post", "/conversations");
      const existing = { _id: "conversation1" };

      mockConversationServices.findConversationByParticipants.mockResolvedValue(existing);

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          body: {
            gigId: "gig1",
            bandId: "band1",
            venueId: "venue1",
            bandUserId: "bandUser1",
            venueUserId: "venueUser1",
          },
        },
        {
          sub: "bandUser1",
          email: "band@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(200);
      expect(res.json).toHaveBeenCalledWith({ data: existing });
    });

    test("POST /conversations creates conversation when no existing conversation exists", async () => {
      const handler = findRoute("post", "/conversations");
      const created = { _id: "conversation2" };

      mockConversationServices.findConversationByParticipants.mockResolvedValue(null);
      mockConversationServices.addConversation.mockResolvedValue(created);

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          body: {
            gigId: "gig1",
            bandId: "band1",
            venueId: "venue1",
            bandUserId: "bandUser1",
            venueUserId: "venueUser1",
          },
        },
        {
          sub: "venueUser1",
          email: "venue@test.com",
          role: "venue",
        }
      );

      expect(res.statusCode).toBe(201);
      expect(mockConversationServices.addConversation).toHaveBeenCalledWith({
        gigId: "gig1",
        bandId: "band1",
        venueId: "venue1",
        bandUserId: "bandUser1",
        venueUserId: "venueUser1",
      });
      expect(res.json).toHaveBeenCalledWith({ data: created });
    });

    test("GET /conversations/:id/messages returns 404 when conversation is missing", async () => {
      const handler = findRoute("get", "/conversations/:id/messages");

      mockConversationServices.findConversationById.mockResolvedValue(null);

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "missingConversation" },
        },
        {
          sub: "bandUser1",
          email: "band@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(404);
      expect(mockMessageServices.getMessages).not.toHaveBeenCalled();
    });

    test("GET /conversations/:id/messages success for participant", async () => {
      const handler = findRoute("get", "/conversations/:id/messages");

      mockConversationServices.findConversationById.mockResolvedValue({
        _id: "conversation1",
        bandUserId: "bandUser1",
        venueUserId: "venueUser1",
      });

      mockMessageServices.getMessages.mockResolvedValue([
        { _id: "message1", text: "hello" },
      ]);

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "conversation1" },
        },
        {
          sub: "bandUser1",
          email: "band@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(200);
      expect(mockMessageServices.getMessages).toHaveBeenCalledWith("conversation1");
      expect(res.json).toHaveBeenCalledWith({
        data: [{ _id: "message1", text: "hello" }],
      });
    });

    test("POST /conversations/:id/messages returns 404 when conversation is missing", async () => {
      const handler = findRoute("post", "/conversations/:id/messages");

      mockConversationServices.findConversationById.mockResolvedValue(null);

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "missingConversation" },
          body: { text: "hello" },
        },
        {
          sub: "bandUser1",
          email: "band@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(404);
      expect(mockMessageServices.addMessage).not.toHaveBeenCalled();
    });

    test("POST /conversations/:id/messages returns 400 when text is missing", async () => {
      const handler = findRoute("post", "/conversations/:id/messages");

      mockConversationServices.findConversationById.mockResolvedValue({
        _id: "conversation1",
        bandUserId: "bandUser1",
        venueUserId: "venueUser1",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "conversation1" },
          body: {},
        },
        {
          sub: "bandUser1",
          email: "band@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(400);
      expect(mockMessageServices.addMessage).not.toHaveBeenCalled();
    });
  });

  describe("more gig request route branches", () => {
    test("PUT /gig-requests/:id/decline success for venue declining band request", async () => {
      const handler = findRoute("put", "/gig-requests/:id/decline");

      mockGigRequestServices.findGigRequestById.mockResolvedValue({
        _id: "request1",
        initiatedBy: "band",
        bandUserId: "bandUser1",
        venueUserId: "venueUser1",
      });

      mockGigRequestServices.declineGigRequest.mockResolvedValue({
        _id: "request1",
        status: "declined",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "request1" },
        },
        {
          sub: "venueUser1",
          email: "venue@test.com",
          role: "venue",
        }
      );

      expect(res.statusCode).toBe(200);
      expect(mockGigRequestServices.declineGigRequest).toHaveBeenCalledWith(
        "request1"
      );
    });

    test("PUT /gig-requests/:id/decline success for band declining venue invitation", async () => {
      const handler = findRoute("put", "/gig-requests/:id/decline");

      mockGigRequestServices.findGigRequestById.mockResolvedValue({
        _id: "request2",
        initiatedBy: "venue",
        bandUserId: "bandUser1",
        venueUserId: "venueUser1",
      });

      mockGigRequestServices.declineGigRequest.mockResolvedValue({
        _id: "request2",
        status: "declined",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "request2" },
        },
        {
          sub: "bandUser1",
          email: "band@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(200);
      expect(mockGigRequestServices.declineGigRequest).toHaveBeenCalledWith(
        "request2"
      );
    });

    test("PUT /gig-requests/:id/decline returns 404 when request is missing", async () => {
      const handler = findRoute("put", "/gig-requests/:id/decline");

      mockGigRequestServices.findGigRequestById.mockResolvedValue(null);

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "missingRequest" },
        },
        {
          sub: "venueUser1",
          email: "venue@test.com",
          role: "venue",
        }
      );

      expect(res.statusCode).toBe(404);
    });

    test("DELETE /gig-requests/:id success when band user owns request", async () => {
      const handler = findRoute("delete", "/gig-requests/:id");

      mockGigRequestServices.cancelGigRequest.mockResolvedValue({
        _id: "request1",
        bandUserId: "bandUser1",
        venueUserId: "venueUser1",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "request1" },
        },
        {
          sub: "bandUser1",
          email: "band@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(200);
      expect(mockGigRequestServices.cancelGigRequest).toHaveBeenCalledWith(
        "request1"
      );
    });

    test("DELETE /gig-requests/:id returns 404 when request is missing", async () => {
      const handler = findRoute("delete", "/gig-requests/:id");

      mockGigRequestServices.cancelGigRequest.mockResolvedValue(null);

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "missingRequest" },
        },
        {
          sub: "bandUser1",
          email: "band@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(404);
    });

    test("DELETE /gig-requests/:id returns 403 when user is not related to request", async () => {
      const handler = findRoute("delete", "/gig-requests/:id");

      mockGigRequestServices.cancelGigRequest.mockResolvedValue({
        _id: "request1",
        bandUserId: "bandUser1",
        venueUserId: "venueUser1",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "request1" },
        },
        {
          sub: "randomUser",
          email: "random@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(403);
    });
  });
});


describe("backend branch coverage boost", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extra auth branches", () => {
    test("POST /auth/login returns 400 when email is missing", async () => {
      const handler = findRoute("post", "/auth/login");
      const req = { body: { password: "password123" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(mockAuthServices.authenticateUser).not.toHaveBeenCalled();
    });

    test("POST /auth/login returns 401 for invalid credentials", async () => {
      const handler = findRoute("post", "/auth/login");
      mockAuthServices.authenticateUser.mockResolvedValue(null);

      const req = {
        body: {
          email: "person@test.com",
          password: "password123",
        },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials" });
    });

    test("POST /auth/login success returns token and user", async () => {
      const handler = findRoute("post", "/auth/login");

      mockAuthServices.authenticateUser.mockResolvedValue({
        _id: "u1",
        email: "person@test.com",
        display_name: "Person",
        role: "musician",
        email_verified: true,
      });

      mockMusicianServices.findOwnedMusicianByUserId.mockResolvedValue({
        _id: "musician1",
      });

      const req = {
        body: {
          email: "person@test.com",
          password: "password123",
        },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockAuthServices.createAccessToken).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token: "test-token",
            user: expect.objectContaining({
              email: "person@test.com",
              role: "musician",
              email_verified: true,
            }),
            profiles: expect.objectContaining({
              musicianId: "musician1",
            }),
          }),
        })
      );
    });

    test("POST /auth/login returns 500 on service error", async () => {
      const handler = findRoute("post", "/auth/login");
      mockAuthServices.authenticateUser.mockRejectedValue(new Error("boom"));

      const req = {
        body: {
          email: "person@test.com",
          password: "password123",
        },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
    });

    test("GET /auth/verify success", async () => {
      const handler = findRoute("get", "/auth/verify");

      mockAuthServices.findUserById.mockResolvedValue({
        _id: "u1",
        email: "person@test.com",
        display_name: "Person",
        role: "venue",
        email_verified: true,
      });

      mockVenueServices.findOwnedVenueByUserId.mockResolvedValue({
        _id: "venue1",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {},
        {
          sub: "u1",
          email: "person@test.com",
          display_name: "Person",
          role: "venue",
          email_verified: true,
        }
      );

      expect(res.statusCode).toBe(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valid: true,
            user: expect.objectContaining({
              email: "person@test.com",
              role: "venue",
            }),
            profiles: expect.objectContaining({
              venueId: "venue1",
            }),
          }),
        })
      );
    });
  });

  describe("extra notification error branches", () => {
    test("GET /notifications returns 500 on service error", async () => {
      const handler = findRoute("get", "/notifications");
      mockNotificationServices.getNotificationsByUser.mockRejectedValue(
        new Error("boom")
      );

      const req = { query: { userId: "user1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
    });

    test("GET /notifications/unread-count returns 400 when userId is missing", async () => {
      const handler = findRoute("get", "/notifications/unread-count");

      const req = { query: {} };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(mockNotificationServices.getUnreadCount).not.toHaveBeenCalled();
    });

    test("GET /notifications/unread-count returns 500 on service error", async () => {
      const handler = findRoute("get", "/notifications/unread-count");
      mockNotificationServices.getUnreadCount.mockRejectedValue(
        new Error("boom")
      );

      const req = { query: { userId: "user1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
    });

    test("POST /notifications returns 400 on service error", async () => {
      const handler = findRoute("post", "/notifications");
      mockNotificationServices.createNotification.mockRejectedValue(
        new Error("boom")
      );

      const req = {
        body: {
          userId: "user1",
          type: "welcome",
          title: "Welcome",
          body: "Hello",
          relatedId: "rel1",
        },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test("PUT /notifications/:id/read returns 400 on service error", async () => {
      const handler = findRoute("put", "/notifications/:id/read");
      mockNotificationServices.markNotificationAsRead.mockRejectedValue(
        new Error("boom")
      );

      const req = { params: { id: "n1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test("PUT /notifications/read-all returns 400 on service error", async () => {
      const handler = findRoute("put", "/notifications/read-all");
      mockNotificationServices.markAllNotificationsAsRead.mockRejectedValue(
        new Error("boom")
      );

      const req = { body: { userId: "user1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test("DELETE /notifications/:id returns 400 on service error", async () => {
      const handler = findRoute("delete", "/notifications/:id");
      mockNotificationServices.deleteNotification.mockRejectedValue(
        new Error("boom")
      );

      const req = { params: { id: "n1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe("extra availability error branches", () => {
    test("GET /availability returns 500 on service error", async () => {
      const handler = findRoute("get", "/availability");
      mockAvailabilityService.getSlots.mockRejectedValue(new Error("boom"));

      const req = {
        query: {
          ownerType: "band",
          ownerId: "band1",
        },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
    });

    test("POST /availability returns service error message", async () => {
      const handler = findRoute("post", "/availability");
      mockAvailabilityService.createAvailability.mockRejectedValue(
        new Error("Availability overlaps existing time slot")
      );

      const req = {
        body: {
          ownerType: "band",
          ownerId: "band1",
          start: "2026-06-01T10:00:00Z",
          end: "2026-06-01T11:00:00Z",
        },
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Availability overlaps existing time slot",
      });
    });

    test("DELETE /availability/:id returns 500 on service error", async () => {
      const handler = findRoute("delete", "/availability/:id");
      mockAvailabilityService.deleteAvailability.mockRejectedValue(
        new Error("boom")
      );

      const req = { params: { id: "slot1" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});


describe("final backend route coverage boost", () => {
  beforeAll(async () => {
    await loadBackend();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("root and middleware branches", () => {
    test("GET / returns API running message", async () => {
      const handler = findRoute("get", "/");
      const req = {};
      const res = createMockRes();

      await handler(req, res);

      expect(res.send).toHaveBeenCalledWith("Giggly API is running !!");
    });


  });

  describe("auth guard branches", () => {
    test("GET /auth/verify returns 401 when authorization header is missing", async () => {
      const handler = findRoute("get", "/auth/verify");

      const res = await invokeUnauthenticatedHandler(handler, {});

      expect(res.statusCode).toBe(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Missing or invalid Authorization header",
      });
    });

    test("GET /auth/verify returns 401 when token verification throws", async () => {
      const handler = findRoute("get", "/auth/verify");
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      mockAuthServices.verifyAccessToken.mockImplementation(() => {
        throw new Error("bad token");
      });

      const req = {
        headers: {
          authorization: "Bearer bad-token",
        },
        get: jest.fn((headerName) => {
          if (headerName === "authorization") return "Bearer bad-token";
          return undefined;
        }),
      };
      const res = createMockRes();

      try {
        await handler(req, res);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }

      expect(res.statusCode).toBe(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid or expired token",
      });
    });
  });

  describe("band member route branches", () => {
    test("POST /bands/:id/members success with musicianId", async () => {
      const handler = findRoute("post", "/bands/:id/members");

      mockBandServices.findBandById.mockResolvedValue({
        _id: "band1",
        owner_user: "owner1",
      });

      mockBandServices.addBandMember.mockResolvedValue({
        _id: "band1",
        members: ["musician1"],
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "band1" },
          body: { musicianId: "musician1" },
        },
        {
          sub: "owner1",
          email: "owner@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(200);
      expect(mockBandServices.addBandMember).toHaveBeenCalledWith(
        "band1",
        "musician1"
      );
    });

    test("POST /bands/:id/members returns 404 when band is missing", async () => {
      const handler = findRoute("post", "/bands/:id/members");

      mockBandServices.findBandById.mockResolvedValue(null);

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "missing" },
          body: { musicianId: "musician1" },
        },
        {
          sub: "owner1",
          email: "owner@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(404);
    });

    test("POST /bands/:id/members returns 403 when user is not band admin", async () => {
      const handler = findRoute("post", "/bands/:id/members");

      mockBandServices.findBandById.mockResolvedValue({
        _id: "band1",
        owner_user: "owner1",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "band1" },
          body: { musicianId: "musician1" },
        },
        {
          sub: "otherUser",
          email: "other@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(403);
      expect(mockBandServices.addBandMember).not.toHaveBeenCalled();
    });

    test("POST /bands/:id/members returns 400 when musicianId and email are missing", async () => {
      const handler = findRoute("post", "/bands/:id/members");

      mockBandServices.findBandById.mockResolvedValue({
        _id: "band1",
        owner_user: "owner1",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "band1" },
          body: {},
        },
        {
          sub: "owner1",
          email: "owner@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(400);
      expect(mockBandServices.addBandMember).not.toHaveBeenCalled();
    });

    test("DELETE /bands/:id/members/:musicianId returns 400 when admin removes themselves", async () => {
      const handler = findRoute("delete", "/bands/:id/members/:musicianId");

      mockBandServices.findBandById.mockResolvedValue({
        _id: "band1",
        owner_user: "owner1",
      });

      mockMusicianServices.findOwnedMusicianByUserId.mockResolvedValue({
        _id: "adminMusician",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: {
            id: "band1",
            musicianId: "adminMusician",
          },
        },
        {
          sub: "owner1",
          email: "owner@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(400);
      expect(mockBandServices.removeBandMember).not.toHaveBeenCalled();
    });

    test("DELETE /bands/:id/members/:musicianId success", async () => {
      const handler = findRoute("delete", "/bands/:id/members/:musicianId");

      mockBandServices.findBandById.mockResolvedValue({
        _id: "band1",
        owner_user: "owner1",
      });

      mockMusicianServices.findOwnedMusicianByUserId.mockResolvedValue({
        _id: "adminMusician",
      });

      mockBandServices.removeBandMember.mockResolvedValue({
        _id: "band1",
        members: [],
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: {
            id: "band1",
            musicianId: "memberToRemove",
          },
        },
        {
          sub: "owner1",
          email: "owner@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(200);
      expect(mockBandServices.removeBandMember).toHaveBeenCalledWith(
        "band1",
        "memberToRemove"
      );
    });
  });

  describe("more gig route branches", () => {
    test("GET /gigs returns 500 on service error", async () => {
      const handler = findRoute("get", "/gigs");

      mockGigServices.getGigsCount.mockRejectedValue(new Error("boom"));

      const req = { query: {} };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
    });

    test("GET /gigs/:id returns 400 on service error", async () => {
      const handler = findRoute("get", "/gigs/:id");

      mockGigServices.findGigById.mockRejectedValue(new Error("boom"));

      const req = { params: { id: "bad" } };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    test("POST /gigs success for venue owner", async () => {
      const handler = findRoute("post", "/gigs");

      mockVenueServices.findOwnedVenueByUserId.mockResolvedValue({
        _id: "venue1",
      });

      mockGigServices.addGig.mockResolvedValue({
        _id: "gig1",
        name: "Rock Night",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          body: {
            name: "Rock Night",
            location: "SLO",
          },
        },
        {
          sub: "venueUser1",
          email: "venue@test.com",
          role: "venue",
        }
      );

      expect(res.statusCode).toBe(201);
      expect(mockGigServices.addGig).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Rock Night",
          location: "SLO",
          host: "venue1",
          owner_user: "venueUser1",
        })
      );
    });

    test("POST /gigs returns 403 when venue profile is missing", async () => {
      const handler = findRoute("post", "/gigs");

      mockVenueServices.findOwnedVenueByUserId.mockResolvedValue(null);
      mockVenueServices.findVenueByContactEmail.mockResolvedValue(null);
      mockVenueServices.findVenueByName.mockResolvedValue(null);

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          body: {
            name: "Rock Night",
          },
        },
        {
          sub: "venueUser1",
          email: "venue@test.com",
          role: "venue",
        }
      );

      expect(res.statusCode).toBe(403);
      expect(mockGigServices.addGig).not.toHaveBeenCalled();
    });

    test("DELETE /gigs/:id success for owner", async () => {
      const handler = findRoute("delete", "/gigs/:id");

      mockGigServices.findGigById.mockResolvedValue({
        _id: "gig1",
        owner_user: "venueUser1",
        host: "venue1",
      });

      mockGigServices.findGigByIdAndDelete.mockResolvedValue({
        _id: "gig1",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "gig1" },
        },
        {
          sub: "venueUser1",
          email: "venue@test.com",
          role: "venue",
        }
      );

      expect(res.statusCode).toBe(200);
      expect(mockGigServices.findGigByIdAndDelete).toHaveBeenCalledWith("gig1");
    });

    test("DELETE /gigs/:id returns 404 when gig is missing", async () => {
      const handler = findRoute("delete", "/gigs/:id");

      mockGigServices.findGigById.mockResolvedValue(null);

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "missingGig" },
        },
        {
          sub: "venueUser1",
          email: "venue@test.com",
          role: "venue",
        }
      );

      expect(res.statusCode).toBe(404);
      expect(mockGigServices.findGigByIdAndDelete).not.toHaveBeenCalled();
    });

    test("DELETE /gigs/:id returns 403 when user does not own gig", async () => {
      const handler = findRoute("delete", "/gigs/:id");

      mockGigServices.findGigById.mockResolvedValue({
        _id: "gig1",
        owner_user: "otherUser",
        host: "venue1",
      });

      mockVenueServices.findOwnedVenueByUserId.mockResolvedValue(null);
      mockVenueServices.findVenueByContactEmail.mockResolvedValue(null);
      mockVenueServices.findVenueByName.mockResolvedValue(null);

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "gig1" },
        },
        {
          sub: "venueUser1",
          email: "venue@test.com",
          role: "venue",
        }
      );

      expect(res.statusCode).toBe(403);
      expect(mockGigServices.findGigByIdAndDelete).not.toHaveBeenCalled();
    });
  });

  describe("message spam branches", () => {
    test("POST /conversations/:id/messages returns 400 when message is too long", async () => {
      const handler = findRoute("post", "/conversations/:id/messages");

      mockConversationServices.findConversationById.mockResolvedValue({
        _id: "conversation-long-message",
        bandUserId: "bandUser1",
        venueUserId: "venueUser1",
      });

      const res = await invokeAuthenticatedHandler(
        handler,
        {
          params: { id: "conversation-long-message" },
          body: { text: "a".repeat(2001) },
        },
        {
          sub: "bandUser1",
          email: "band@test.com",
          role: "band",
        }
      );

      expect(res.statusCode).toBe(400);
      expect(mockMessageServices.addMessage).not.toHaveBeenCalled();
    });

  });
});

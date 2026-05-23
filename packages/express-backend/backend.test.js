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

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status: jest.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (body) {
      this.body = body;
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

async function loadBackend({ connectShouldReject = false } = {}) {
  jest.resetModules();

  routes = [];

  mockBandServices = {
    getBandsCount: jest.fn(),
    getBandsPaginated: jest.fn(),
    findBandById: jest.fn(),
    addBand: jest.fn(),
    findBandByIdAndDelete: jest.fn(),
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
  };

  mockAuthServices = {
    registerUser: jest.fn(),
    authenticateUser: jest.fn(),
    createAccessToken: jest.fn(),
    verifyAccessToken: jest.fn(),
  };

  mockApp = {
    use: jest.fn(),
  
    get: jest.fn((path, handler) => {
      routes.push({ method: "get", path, handler });
    }),
  
    post: jest.fn((path, handler) => {
      routes.push({ method: "post", path, handler });
    }),
  
    put: jest.fn((path, handler) => {
      routes.push({ method: "put", path, handler });
    }),
  
    delete: jest.fn((path, handler) => {
      routes.push({ method: "delete", path, handler });
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
      index() {}
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
        }),
      })
    );
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

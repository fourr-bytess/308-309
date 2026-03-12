import { jest } from '@jest/globals';

let routes;
let mockApp;
let mockBandServices;
let mockVenueServices;
let mockMusicianServices;
let mockReviewServices;
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
  const route = routes.find(
    (r) => r.method === method && r.path === path,
  );
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
  };

  mockVenueServices = {
    getVenue: jest.fn(),
    addVenue: jest.fn(),
    findVenueById: jest.fn(),
    findVenueByIdAndDelete: jest.fn(),
  };

  mockMusicianServices = {
    getMusiciansCount: jest.fn(),
    getMusiciansPaginated: jest.fn(),
    findMusicianById: jest.fn(),
    addMusician: jest.fn(),
    findMusicianByIdAndDelete: jest.fn(),
  };

  mockReviewServices = {
    getReviewsCount: jest.fn(),
    getReviewsPaginated: jest.fn(),
    addReview: jest.fn(),
  };

  mockApp = {
    use: jest.fn(),
    get: jest.fn((path, handler) => {
      routes.push({ method: 'get', path, handler });
    }),
    post: jest.fn((path, handler) => {
      routes.push({ method: 'post', path, handler });
    }),
    delete: jest.fn((path, handler) => {
      routes.push({ method: 'delete', path, handler });
    }),
    listen: jest.fn(),
  };

  mockConnect = jest.fn(() =>
    connectShouldReject
      ? Promise.reject(new Error('connect fail'))
      : Promise.resolve(),
  );

  await jest.unstable_mockModule('express', () => {
    const expressFn = () => mockApp;
    // Provide a json middleware function so app.use(express.json()) works
    expressFn.json = jest.fn(() => jest.fn());
    return { default: expressFn };
  });

  await jest.unstable_mockModule('mongoose', () => ({
    default: { connect: mockConnect },
  }));

  await jest.unstable_mockModule('./band-services.js', () => ({
    default: mockBandServices,
  }));

  await jest.unstable_mockModule('./venue-services.js', () => ({
    default: mockVenueServices,
  }));

  await jest.unstable_mockModule('./musician-services.js', () => ({
    default: mockMusicianServices,
  }));

  await jest.unstable_mockModule('./review-services.js', () => ({
    default: mockReviewServices,
  }));

  const backend = await import('./backend.js');
  // Allow any pending promises (like mongoose.connect then/catch) to settle
  await Promise.resolve();
  return backend;
}

describe('backend initialization', () => {
  test('connects to MongoDB and starts server successfully', async () => {
    await loadBackend({ connectShouldReject: false });
    expect(mockConnect).toHaveBeenCalled();
    expect(mockApp.listen).toHaveBeenCalled();
  });

  test('logs connection error when MongoDB connect fails', async () => {
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await loadBackend({ connectShouldReject: true });

    expect(mockConnect).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  test('uses default Mongo URI when MONGODB_URI is missing', async () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    await loadBackend({ connectShouldReject: false });

    expect(mockConnect).toHaveBeenCalledWith(
      'mongodb://127.0.0.1:27017/bands',
    );

    if (originalUri !== undefined) {
      process.env.MONGODB_URI = originalUri;
    }
  });
});

describe('band routes', () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test('GET /bands success', async () => {
    const handler = findRoute('get', '/bands');
    mockBandServices.getBandsCount.mockResolvedValue(42);
    mockBandServices.getBandsPaginated.mockResolvedValue({
      bands: [{ id: 'b1' }],
    });

    const req = {
      query: {
        limit: '10',
        offset: '5',
        name: 'test',
        member_names: 'm1,m2',
        genres: 'rock,jazz',
        locations: 'city1,city2',
        min_price: '100',
        max_price: '200',
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ id: 'b1' }],
        meta: expect.objectContaining({
          limit: 10,
          offset: 5,
          total: 42,
        }),
      }),
    );
  });

  test('GET /bands handles service error', async () => {
    const handler = findRoute('get', '/bands');
    mockBandServices.getBandsCount.mockRejectedValue(
      new Error('fail'),
    );

    const req = { query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });

  test('GET /bands/:id success', async () => {
    const handler = findRoute('get', '/bands/:id');
    mockBandServices.findBandById.mockResolvedValue({
      id: 'b1',
    });

    const req = { params: { id: 'b1' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: { id: 'b1' } }),
    );
  });

  test('GET /bands/:id returns 404 when not found', async () => {
    const handler = findRoute('get', '/bands/:id');
    mockBandServices.findBandById.mockResolvedValue(null);

    const req = { params: { id: 'missing' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test('GET /bands/:id returns 400 on error', async () => {
    const handler = findRoute('get', '/bands/:id');
    mockBandServices.findBandById.mockRejectedValue(
      new Error('bad'),
    );

    const req = { params: { id: 'bad' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('POST /bands success', async () => {
    const handler = findRoute('post', '/bands');
    const created = { id: 'b1' };
    mockBandServices.addBand.mockResolvedValue(created);

    const req = { body: { name: 'Band' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.json).toHaveBeenCalledWith({ data: created });
  });

  test('POST /bands returns 400 on error', async () => {
    const handler = findRoute('post', '/bands');
    mockBandServices.addBand.mockRejectedValue(new Error('bad'));

    const req = { body: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('DELETE /bands/:id success', async () => {
    const handler = findRoute('delete', '/bands/:id');
    const deleted = { id: 'b1' };
    mockBandServices.findBandByIdAndDelete.mockResolvedValue(
      deleted,
    );

    const req = { params: { id: 'b1' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ data: deleted });
  });

  test('DELETE /bands/:id returns 404 when not found', async () => {
    const handler = findRoute('delete', '/bands/:id');
    mockBandServices.findBandByIdAndDelete.mockResolvedValue(
      null,
    );

    const req = { params: { id: 'missing' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test('DELETE /bands/:id returns 404 on error', async () => {
    const handler = findRoute('delete', '/bands/:id');
    mockBandServices.findBandByIdAndDelete.mockRejectedValue(
      new Error('bad'),
    );

    const req = { params: { id: 'bad' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });
});

describe('venue routes', () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test('GET /venues success', async () => {
    const handler = findRoute('get', '/venues');
    mockVenueServices.getVenue.mockResolvedValue([{ id: 'v1' }]);

    const req = {
      query: {
        name: 'Venue',
        city: 'City',
        state: 'CA',
        zip: '12345',
        minCap: '100',
        maxCap: '500',
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [{ id: 'v1' }],
    });
  });

  test('GET /venues returns 500 on error', async () => {
    const handler = findRoute('get', '/venues');
    mockVenueServices.getVenue.mockRejectedValue(new Error('fail'));

    const req = { query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });

  test('POST /venues success', async () => {
    const handler = findRoute('post', '/venues');
    const created = { id: 'v1' };
    mockVenueServices.addVenue.mockResolvedValue(created);

    const req = { body: { name: 'Venue' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.json).toHaveBeenCalledWith({ data: created });
  });

  test('POST /venues returns 400 on error', async () => {
    const handler = findRoute('post', '/venues');
    mockVenueServices.addVenue.mockRejectedValue(new Error('bad'));

    const req = { body: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('GET /venues/:id success', async () => {
    const handler = findRoute('get', '/venues/:id');
    const venue = { id: 'v1' };
    mockVenueServices.findVenueById.mockResolvedValue(venue);

    const req = { params: { id: 'v1' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ data: venue });
  });

  test('GET /venues/:id returns 404 when not found', async () => {
    const handler = findRoute('get', '/venues/:id');
    mockVenueServices.findVenueById.mockResolvedValue(null);

    const req = { params: { id: 'missing' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test('GET /venues/:id returns 400 on error', async () => {
    const handler = findRoute('get', '/venues/:id');
    mockVenueServices.findVenueById.mockRejectedValue(
      new Error('bad'),
    );

    const req = { params: { id: 'bad' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('DELETE /venues/:id success', async () => {
    const handler = findRoute('delete', '/venues/:id');
    const deleted = { id: 'v1' };
    mockVenueServices.findVenueByIdAndDelete.mockResolvedValue(
      deleted,
    );

    const req = { params: { id: 'v1' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ data: deleted });
  });

  test('DELETE /venues/:id returns 404 when not found', async () => {
    const handler = findRoute('delete', '/venues/:id');
    mockVenueServices.findVenueByIdAndDelete.mockResolvedValue(
      null,
    );

    const req = { params: { id: 'missing' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test('DELETE /venues/:id returns 400 on error', async () => {
    const handler = findRoute('delete', '/venues/:id');
    mockVenueServices.findVenueByIdAndDelete.mockRejectedValue(
      new Error('bad'),
    );

    const req = { params: { id: 'bad' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });
});

describe('musician routes and reviews', () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test('GET /musicians success', async () => {
    const handler = findRoute('get', '/musicians');
    mockMusicianServices.getMusiciansCount.mockResolvedValue(5);
    mockMusicianServices.getMusiciansPaginated.mockResolvedValue({
      musicians: [{ id: 'm1' }],
    });

    const req = {
      query: {
        limit: '10',
        offset: '0',
        name: 'Name',
        instruments: 'guitar,drums',
        band_affiliations: 'b1,b2',
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ id: 'm1' }],
        meta: expect.objectContaining({ total: 5 }),
      }),
    );
  });

  test('GET /musicians returns 500 on error', async () => {
    const handler = findRoute('get', '/musicians');
    mockMusicianServices.getMusiciansCount.mockRejectedValue(
      new Error('fail'),
    );

    const req = { query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });

  test('GET /musicians/:id success', async () => {
    const handler = findRoute('get', '/musicians/:id');
    const musician = { id: 'm1' };
    mockMusicianServices.findMusicianById.mockResolvedValue(
      musician,
    );

    const req = { params: { id: 'm1' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ data: musician });
  });

  test('GET /musicians/:id returns 404 when not found', async () => {
    const handler = findRoute('get', '/musicians/:id');
    mockMusicianServices.findMusicianById.mockResolvedValue(null);

    const req = { params: { id: 'missing' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test('GET /musicians/:id returns 400 on error', async () => {
    const handler = findRoute('get', '/musicians/:id');
    mockMusicianServices.findMusicianById.mockRejectedValue(
      new Error('bad'),
    );

    const req = { params: { id: 'bad' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('POST /musicians success', async () => {
    const handler = findRoute('post', '/musicians');
    const created = { id: 'm1' };
    mockMusicianServices.addMusician.mockResolvedValue(created);

    const req = { body: { name: 'Name' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.json).toHaveBeenCalledWith({ data: created });
  });

  test('POST /musicians returns 400 on error', async () => {
    const handler = findRoute('post', '/musicians');
    mockMusicianServices.addMusician.mockRejectedValue(
      new Error('bad'),
    );

    const req = { body: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('DELETE /musicians/:id success', async () => {
    const handler = findRoute('delete', '/musicians/:id');
    const deleted = { id: 'm1' };
    mockMusicianServices.findMusicianByIdAndDelete.mockResolvedValue(
      deleted,
    );

    const req = { params: { id: 'm1' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ data: deleted });
  });

  test('DELETE /musicians/:id returns 404 when not found', async () => {
    const handler = findRoute('delete', '/musicians/:id');
    mockMusicianServices.findMusicianByIdAndDelete.mockResolvedValue(
      null,
    );

    const req = { params: { id: 'missing' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test('DELETE /musicians/:id returns 400 on error', async () => {
    const handler = findRoute('delete', '/musicians/:id');
    mockMusicianServices.findMusicianByIdAndDelete.mockRejectedValue(
      new Error('bad'),
    );

    const req = { params: { id: 'bad' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('GET /musicians/:id/reviews success', async () => {
    const handler = findRoute('get', '/musicians/:id/reviews');
    mockReviewServices.getReviewsCount.mockResolvedValue(3);
    mockReviewServices.getReviewsPaginated.mockResolvedValue({
      reviews: [{ id: 'r1' }],
    });

    const req = {
      params: { id: 'm1' },
      query: { limit: '5', offset: '0' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ id: 'r1' }],
        meta: expect.objectContaining({ total: 3 }),
      }),
    );
  });

  test('GET /musicians/:id/reviews returns 500 on error', async () => {
    const handler = findRoute('get', '/musicians/:id/reviews');
    mockReviewServices.getReviewsCount.mockRejectedValue(
      new Error('fail'),
    );

    const req = {
      params: { id: 'm1' },
      query: {},
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });
});

describe('review routes', () => {
  beforeAll(async () => {
    await loadBackend();
  });

  test('GET /reviews success', async () => {
    const handler = findRoute('get', '/reviews');
    mockReviewServices.getReviewsCount.mockResolvedValue(2);
    mockReviewServices.getReviewsPaginated.mockResolvedValue({
      reviews: [{ id: 'r1' }],
    });

    const req = {
      query: {
        limit: '10',
        offset: '0',
        reviewee: 'id1',
        reviewer: 'id2',
        revieweeType: 'Musician',
        rating: '5',
        header: 'Great',
        body: 'Text',
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ id: 'r1' }],
        meta: expect.objectContaining({ total: 2 }),
      }),
    );
  });

  test('GET /reviews returns 500 on error', async () => {
    const handler = findRoute('get', '/reviews');
    mockReviewServices.getReviewsCount.mockRejectedValue(
      new Error('fail'),
    );

    const req = { query: {} };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });

  test('POST /reviews returns 400 when required fields missing', async () => {
    const handler = findRoute('post', '/reviews');

    const req = {
      body: {
        reviewer: 'r',
        reviewee: null,
        revieweeType: 'Musician',
        rating: 5,
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('POST /reviews returns 400 when rating invalid', async () => {
    const handler = findRoute('post', '/reviews');

    const req = {
      body: {
        reviewer: 'r',
        reviewee: 'e',
        revieweeType: 'Musician',
        rating: 10,
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('POST /reviews returns 400 when revieweeType invalid', async () => {
    const handler = findRoute('post', '/reviews');

    const req = {
      body: {
        reviewer: 'r',
        reviewee: 'e',
        revieweeType: 'Other',
        rating: 4,
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  test('POST /reviews success', async () => {
    const handler = findRoute('post', '/reviews');
    const created = { id: 'r1' };
    mockReviewServices.addReview.mockResolvedValue(created);

    const req = {
      body: {
        reviewer: 'r',
        reviewee: 'e',
        revieweeType: 'Band',
        rating: 4,
        header: 'H',
        body: 'B',
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.json).toHaveBeenCalledWith({ data: created });
  });

  test('POST /reviews returns 400 on service error', async () => {
    const handler = findRoute('post', '/reviews');
    mockReviewServices.addReview.mockRejectedValue(
      new Error('bad'),
    );

    const req = {
      body: {
        reviewer: 'r',
        reviewee: 'e',
        revieweeType: 'Band',
        rating: 4,
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });
});


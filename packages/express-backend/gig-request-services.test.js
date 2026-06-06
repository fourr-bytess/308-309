import { jest } from "@jest/globals";

const mockGigRequest = {
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  updateMany: jest.fn(),
};

const mockGig = {
  findByIdAndUpdate: jest.fn(),
};

jest.unstable_mockModule("./gig-request.js", () => ({
  default: mockGigRequest,
}));

jest.unstable_mockModule("./gig.js", () => ({
  default: mockGig,
}));

const { default: gigRequestServices } = await import("./gig-request-services.js");

const REQUEST_SELECT =
  "gigId bandId venueId bandUserId venueUserId status initiatedBy createdAt updatedAt";

function createChainableQuery(result = []) {
  return {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue(result),
  };
}

function expectRequestDetailsPopulation(query) {
  expect(query.populate).toHaveBeenCalledWith(
    "gigId",
    "name date time host booked bands_hired"
  );

  expect(query.populate).toHaveBeenCalledWith(
    "bandId",
    "name members owner_user"
  );

  expect(query.populate).toHaveBeenCalledWith("venueId", "name owner_user");

  expect(query.select).toHaveBeenCalledWith(REQUEST_SELECT);
}

describe("Gig Request Services Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createGigRequest", () => {
    const requestData = {
      gigId: "gig123",
      bandId: "band123",
      venueId: "venue123",
      bandUserId: "bandUser123",
      venueUserId: "venueUser123",
    };

    test("returns existing request when pending or accepted request already exists", async () => {
      const existingRequest = {
        _id: "request123",
        ...requestData,
        status: "pending",
      };

      mockGigRequest.findOne.mockResolvedValue(existingRequest);

      const result = await gigRequestServices.createGigRequest(requestData);

      expect(result).toEqual(existingRequest);

      expect(mockGigRequest.findOne).toHaveBeenCalledWith({
        gigId: "gig123",
        bandId: "band123",
        status: { $in: ["pending", "accepted"] },
      });

      expect(mockGigRequest.create).not.toHaveBeenCalled();
    });

    test("creates a new pending request when no existing request is found", async () => {
      const createdRequest = {
        _id: "newRequest123",
        ...requestData,
        status: "pending",
      };

      mockGigRequest.findOne.mockResolvedValue(null);
      mockGigRequest.create.mockResolvedValue(createdRequest);

      const result = await gigRequestServices.createGigRequest(requestData);

      expect(result).toEqual(createdRequest);

      expect(mockGigRequest.findOne).toHaveBeenCalledWith({
        gigId: "gig123",
        bandId: "band123",
        status: { $in: ["pending", "accepted"] },
      });

      expect(mockGigRequest.create).toHaveBeenCalledWith({
        ...requestData,
        status: "pending",
      });
    });
  });

  describe("getGigRequests", () => {
    test("gets gig requests with no filters", async () => {
      const query = createChainableQuery([{ _id: "request1" }]);
      mockGigRequest.find.mockReturnValue(query);

      const result = await gigRequestServices.getGigRequests();

      expect(result).toEqual([{ _id: "request1" }]);
      expect(mockGigRequest.find).toHaveBeenCalledWith({});
      expectRequestDetailsPopulation(query);
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    test("gets gig requests with all filters", async () => {
      const query = createChainableQuery([{ _id: "request2" }]);
      mockGigRequest.find.mockReturnValue(query);

      const filters = {
        gigId: "gig123",
        bandId: "band123",
        venueId: "venue123",
        bandUserId: "bandUser123",
        venueUserId: "venueUser123",
        status: "pending",
      };

      const result = await gigRequestServices.getGigRequests(filters);

      expect(result).toEqual([{ _id: "request2" }]);

      expect(mockGigRequest.find).toHaveBeenCalledWith({
        gigId: "gig123",
        bandId: "band123",
        venueId: "venue123",
        bandUserId: "bandUser123",
        venueUserId: "venueUser123",
        status: "pending",
      });

      expectRequestDetailsPopulation(query);
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    test("gets gig requests with only status filter", async () => {
      const query = createChainableQuery([]);
      mockGigRequest.find.mockReturnValue(query);

      const result = await gigRequestServices.getGigRequests({
        status: "accepted",
      });

      expect(result).toEqual([]);

      expect(mockGigRequest.find).toHaveBeenCalledWith({
        status: "accepted",
      });

      expectRequestDetailsPopulation(query);
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe("findGigRequestById", () => {
    test("finds gig request by id and adds request details", () => {
      const query = createChainableQuery({ _id: "request123" });
      mockGigRequest.findById.mockReturnValue(query);

      const result = gigRequestServices.findGigRequestById("request123");

      expect(result).toBe(query);
      expect(mockGigRequest.findById).toHaveBeenCalledWith("request123");
      expectRequestDetailsPopulation(query);
    });
  });

  describe("acceptGigRequest", () => {
    test("returns null when request is not found", async () => {
      mockGigRequest.findById.mockResolvedValueOnce(null);

      const result = await gigRequestServices.acceptGigRequest("missing123");

      expect(result).toBeNull();
      expect(mockGigRequest.findById).toHaveBeenCalledWith("missing123");
      expect(mockGig.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(mockGigRequest.updateMany).not.toHaveBeenCalled();
    });

    test("accepts request, updates gig, declines other pending requests, and returns populated request", async () => {
      const request = {
        _id: "request123",
        gigId: "gig123",
        bandId: "band123",
        status: "pending",
        save: jest.fn().mockResolvedValue(true),
      };

      const populatedQuery = createChainableQuery({ _id: "request123" });

      mockGigRequest.findById
        .mockResolvedValueOnce(request)
        .mockReturnValueOnce(populatedQuery);

      mockGig.findByIdAndUpdate.mockResolvedValue({
        _id: "gig123",
        booked: true,
      });

      mockGigRequest.updateMany.mockResolvedValue({
        modifiedCount: 2,
      });

      const result = await gigRequestServices.acceptGigRequest("request123");

      expect(request.status).toBe("accepted");
      expect(request.save).toHaveBeenCalled();

      expect(mockGig.findByIdAndUpdate).toHaveBeenCalledWith(
        "gig123",
        {
          booked: true,
          $addToSet: { bands_hired: "band123" },
        },
        { new: true }
      );

      expect(mockGigRequest.updateMany).toHaveBeenCalledWith(
        {
          _id: { $ne: "request123" },
          gigId: "gig123",
          status: "pending",
        },
        { status: "declined" }
      );

      expect(mockGigRequest.findById).toHaveBeenLastCalledWith("request123");
      expectRequestDetailsPopulation(populatedQuery);
      expect(result).toBe(populatedQuery);
    });
  });

  describe("declineGigRequest", () => {
    test("declines a gig request and adds request details", () => {
      const query = createChainableQuery({ _id: "request123", status: "declined" });
      mockGigRequest.findByIdAndUpdate.mockReturnValue(query);

      const result = gigRequestServices.declineGigRequest("request123");

      expect(result).toBe(query);

      expect(mockGigRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        "request123",
        { status: "declined" },
        { new: true }
      );

      expectRequestDetailsPopulation(query);
    });
  });

  describe("cancelGigRequest", () => {
    test("cancels a gig request and adds request details", () => {
      const query = createChainableQuery({ _id: "request123", status: "canceled" });
      mockGigRequest.findByIdAndUpdate.mockReturnValue(query);

      const result = gigRequestServices.cancelGigRequest("request123");

      expect(result).toBe(query);

      expect(mockGigRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        "request123",
        { status: "canceled" },
        { new: true }
      );

      expectRequestDetailsPopulation(query);
    });
  });
});

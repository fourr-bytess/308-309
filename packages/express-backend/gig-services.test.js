import { expect, jest } from "@jest/globals";
import gigModel from "./gig.js";
import gigServices from "./gig-services.js";

describe("Gig Model and Functions Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gigModel.find = jest.fn();
    gigModel.countDocuments = jest.fn();
    gigModel.findById = jest.fn();
    gigModel.findByIdAndDelete = jest.fn();
    jest.spyOn(gigModel.prototype, "save").mockReturnThis();
  });

  describe("getGigs and buildGigsQuery", () => {
    test("Testing filters -- pass", async () => {
      const mockSelect = jest.fn().mockResolvedValue([]);
      gigModel.find.mockReturnValue({ select: mockSelect });

      await gigServices.getGigs(
        "Jazz Show",
        "Jazz music for age 21+",
        ["Jazz"],
        "San Francisco",
        null,
        null,
        null,
        "Venue A",
        true,
        ["Under the Radar"]
      );

      expect(gigModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "jazz show",
          description: "jazz music for age 21+",
          genres: { $in: ["jazz"] },
          location: "san francisco",
          host: "Venue A",
          booked: true,
          bands_hired: { $in: ["Under the Radar"] },
        })
      );
    });

    test("Testing filters -- pass", async () => {
      const mockDate = new Date("2026-02-02T00:00:00.000Z");
      const timeRange = [new Date(), new Date()];

      const filters = {
        price_range: [200, 300],
        date: mockDate,
        time: timeRange,
        booked: true,
      };
      gigModel.countDocuments.mockResolvedValue(5);
      await gigServices.getGigsCount(filters);
      expect(gigModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          price_range: { $gte: 200, $lte: 300 },
          date: mockDate,
          time: { $gte: timeRange[0], $lte: timeRange[1] },
          booked: true,
        })
      );
    });

    test("Testing empty ranges -- pass", async () => {
      const mockSelect = jest.fn().mockResolvedValue([]);
      gigModel.find.mockReturnValue({ select: mockSelect });
      await gigServices.getGigs(null, null, null, null, [50], null, [
        new Date(),
      ]);
      expect(gigModel.find).toHaveBeenCalledWith({});
    });
  });

  describe("getGigsPaginated", () => {
    test("Testing return gigs and count -- pass", async () => {
      const mockGigs = [{ name: "Gig 1" }];
      const mockTotal = 1;
      const mockSelect = jest.fn().mockResolvedValue(mockGigs);
      const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      gigModel.find.mockReturnValue({ skip: mockSkip });
      gigModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await gigServices.getGigsPaginated(10, 0, {});
      expect(result).toEqual({ gigs: mockGigs, total: mockTotal });
      expect(gigModel.countDocuments).toHaveBeenCalled();
    });
  });

  describe("CRUD operations", () => {
    test("Testing addGig -- pass", async () => {
      const gigData = { name: "New Gig" };
      gigModel.prototype.save = jest.fn().mockResolvedValue(gigData);
      const result = await gigServices.addGig(gigData);
      expect(result).toEqual(gigData);
      expect(gigModel.prototype.save).toHaveBeenCalled();
    });

    test("Testing findGigById -- pass", async () => {
      gigModel.findById.mockResolvedValue({ name: "True" });
      await gigServices.findGigById("111");
      expect(gigModel.findById).toHaveBeenCalledWith("111");
    });

    test("Testing findGigByIdAndDelete -- pass", async () => {
      gigModel.findByIdAndDelete.mockResolvedValue({ success: true });
      await gigServices.findGigByIdAndDelete("111");
      expect(gigModel.findByIdAndDelete).toHaveBeenCalledWith("111");
    });
  });

  describe("Gig Schema Validation Rules (gig.js Coverage)", () => {
    test("Testing valid price_range and time arrays -- pass", () => {
      const validGig = new gigModel({
        name: "Acoustic Night",
        location: "The Cave",
        capacity: 50,
        price_range: [20, 100],
        date: new Date(),
        time: ["18:00", "22:00"],
        host: new gigModel.base.Types.ObjectId(),
        booked: false,
      });

      const validationError = validGig.validateSync();
      expect(validationError).toBeUndefined();
    });

    test("Testing invalid price_range validation branches -- pass", () => {
      const invalidGig = new gigModel({
        name: "Broken Price Show",
        location: "The Street",
        capacity: 40,
        // Fails because min > max
        price_range: [150, 50],
        date: new Date(),
        time: ["19:00", "21:00"],
        host: new gigModel.base.Types.ObjectId(),
        booked: false,
      });

      const validationError = invalidGig.validateSync();
      expect(validationError.errors["price_range"]).toBeDefined();
    });

    test("Testing invalid time window schema structures -- pass", () => {
      const invalidTimeGig = new gigModel({
        name: "Timeless Festival",
        location: "The Void",
        capacity: 100,
        price_range: [10, 20],
        date: new Date(),
        // Fails because endTime is earlier than/equal to startTime
        time: ["23:00", "19:00"],
        host: new gigModel.base.Types.ObjectId(),
        booked: true,
      });

      const validationError = invalidTimeGig.validateSync();
      expect(validationError.errors["time"]).toBeDefined();
    });
  });
});

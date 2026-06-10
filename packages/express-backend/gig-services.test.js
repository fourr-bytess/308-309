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
    gigModel.findByIdAndUpdate = jest.fn();

    jest
      .spyOn(gigModel.prototype, "save")
      .mockResolvedValue({ name: "Saved Gig" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

   describe("getGigHostId branch coverage", () => {
    test("returns empty string when gig is undefined", () => {
      expect(gigServices.getGigHostId(undefined)).toBe("");
    });

    test("returns empty string when gig is null", () => {
      expect(gigServices.getGigHostId(null)).toBe("");
    });

    test("returns empty string when gig has no host", () => {
      expect(gigServices.getGigHostId({})).toBe("");
    });

    test("returns empty string when host is null", () => {
      expect(gigServices.getGigHostId({ host: null })).toBe("");
    });

    test("returns host _id when host is object with _id", () => {
      expect(
        gigServices.getGigHostId({
          host: { _id: "venue123" },
        })
      ).toBe("venue123");
    });

    test("returns object string when host is object without _id", () => {
      expect(
        gigServices.getGigHostId({
          host: { name: "Venue Without ID" },
        })
      ).toBe("[object Object]");
    });

    test("returns host string when host is already an id", () => {
      expect(
        gigServices.getGigHostId({
          host: "venue456",
        })
      ).toBe("venue456");
    });

    test("returns host number converted to string", () => {
      expect(
        gigServices.getGigHostId({
          host: 12345,
        })
      ).toBe("12345");
    });
      describe("extra buildGigsQuery branch coverage", () => {
    test("covers all truthy buildGigsQuery filter branches with booked false", async () => {
      const date = new Date("2026-05-01T00:00:00.000Z");
      const startTime = new Date("2026-05-01T18:00:00.000Z");
      const endTime = new Date("2026-05-01T22:00:00.000Z");

      gigModel.countDocuments.mockResolvedValue(11);

      const result = await gigServices.getGigsCount({
        name: "Rock Night",
        description: "Live Music",
        genres: ["Rock", "Indie"],
        location: "San Luis Obispo",
        price_range: [100, 500],
        date,
        time: [startTime, endTime],
        host: "venue1",
        owner_user: "venueUser1",
        booked: false,
        bands_hired: ["band1", "band2"],
      });

      expect(result).toBe(11);
      expect(gigModel.countDocuments).toHaveBeenCalledWith({
        name: "rock night",
        description: "live music",
        genres: { $in: ["rock", "indie"] },
        location: "san luis obispo",
        price_range: { $gte: 100, $lte: 500 },
        date,
        time: { $gte: startTime, $lte: endTime },
        host: "venue1",
        owner_user: "venueUser1",
        booked: false,
        bands_hired: { $in: ["band1", "band2"] },
      });
    });

    test("covers falsy buildGigsQuery filter branches", async () => {
      gigModel.countDocuments.mockResolvedValue(0);

      const result = await gigServices.getGigsCount({
        name: "",
        description: "",
        genres: [],
        location: "",
        price_range: [],
        date: null,
        time: [],
        host: "",
        owner_user: "",
        booked: "false",
        bands_hired: [],
      });

      expect(result).toBe(0);
      expect(gigModel.countDocuments).toHaveBeenCalledWith({});
    });

    test("covers invalid single-item range branches", async () => {
      gigModel.countDocuments.mockResolvedValue(0);

      const result = await gigServices.getGigsCount({
        price_range: [100],
        time: [new Date("2026-05-01T18:00:00.000Z")],
      });

      expect(result).toBe(0);
      expect(gigModel.countDocuments).toHaveBeenCalledWith({});
    });

    test("covers default empty filters argument", async () => {
      gigModel.countDocuments.mockResolvedValue(0);

      const result = await gigServices.getGigsCount();

      expect(result).toBe(0);
      expect(gigModel.countDocuments).toHaveBeenCalledWith({});
    });
  });
  });

  describe("getGigs and buildGigsQuery", () => {
    test("Testing filters -- pass", async () => {
      const mockPopulate = jest.fn().mockResolvedValue([]);
      const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });

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

      expect(mockSelect).toHaveBeenCalled();
      expect(mockPopulate).toHaveBeenCalledWith("host", "name");
    });

    test("Testing getGigsCount with filters -- pass", async () => {
      const mockDate = new Date("2026-02-02T00:00:00.000Z");
      const timeRange = [new Date("2026-02-02T18:00:00.000Z"), new Date("2026-02-02T22:00:00.000Z")];

      const filters = {
        price_range: [200, 300],
        date: mockDate,
        time: timeRange,
        booked: true,
      };

      gigModel.countDocuments.mockResolvedValue(5);

      const result = await gigServices.getGigsCount(filters);

      expect(result).toBe(5);
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
      const mockPopulate = jest.fn().mockResolvedValue([]);
      const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });

      gigModel.find.mockReturnValue({ select: mockSelect });

      const result = await gigServices.getGigs(
        null,
        null,
        null,
        null,
        [50],
        null,
        [new Date()]
      );

      expect(result).toEqual([]);
      expect(gigModel.find).toHaveBeenCalledWith({});
      expect(mockSelect).toHaveBeenCalled();
      expect(mockPopulate).toHaveBeenCalledWith("host", "name");
    });

    test("Testing owner_user filter branch -- pass", async () => {
      gigModel.countDocuments.mockResolvedValue(3);

      const result = await gigServices.getGigsCount({
        owner_user: "venueUser1",
      });

      expect(result).toBe(3);
      expect(gigModel.countDocuments).toHaveBeenCalledWith({
        owner_user: "venueUser1",
      });
    });
  });

  describe("getGigsPaginated", () => {
    test("Testing return gigs and count -- pass", async () => {
      const mockGigs = [{ name: "Gig 1" }];
      const mockTotal = 1;

      const mockPopulate = jest.fn().mockResolvedValue(mockGigs);
      const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
      const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });

      gigModel.find.mockReturnValue({ skip: mockSkip });
      gigModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await gigServices.getGigsPaginated(10, 0, {});

      expect(result).toEqual({
        gigs: mockGigs,
        total: mockTotal,
      });

      expect(gigModel.find).toHaveBeenCalledWith({});
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockPopulate).toHaveBeenCalledWith("host", "name");
      expect(gigModel.countDocuments).toHaveBeenCalledWith({});
    });

    test("Testing getGigsPaginated with owner_user filter -- pass", async () => {
      const mockGigs = [{ name: "Owner Gig" }];

      const mockPopulate = jest.fn().mockResolvedValue(mockGigs);
      const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
      const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });

      gigModel.find.mockReturnValue({ skip: mockSkip });
      gigModel.countDocuments.mockResolvedValue(1);

      const result = await gigServices.getGigsPaginated(10, 0, {
        owner_user: "venueUser2",
      });

      expect(result).toEqual({
        gigs: mockGigs,
        total: 1,
      });

      expect(gigModel.find).toHaveBeenCalledWith({
        owner_user: "venueUser2",
      });

      expect(gigModel.countDocuments).toHaveBeenCalledWith({
        owner_user: "venueUser2",
      });
    });
  });

  describe("CRUD operations", () => {
    test("Testing addGig -- pass", async () => {
      const gigData = { name: "New Gig" };

      gigModel.prototype.save.mockResolvedValue(gigData);

      const result = await gigServices.addGig(gigData);

      expect(result).toEqual(gigData);
      expect(gigModel.prototype.save).toHaveBeenCalled();
    });

    test("Testing findGigById -- pass", async () => {
      const mockGig = { name: "True" };
      const mockPopulate = jest.fn().mockResolvedValue(mockGig);

      gigModel.findById.mockReturnValue({ populate: mockPopulate });

      const result = await gigServices.findGigById("111");

      expect(result).toEqual(mockGig);
      expect(gigModel.findById).toHaveBeenCalledWith("111");
      expect(mockPopulate).toHaveBeenCalledWith("host", "name");
    });

    test("Testing findGigByIdAndDelete -- pass", async () => {
      gigModel.findByIdAndDelete.mockResolvedValue({ success: true });

      const result = await gigServices.findGigByIdAndDelete("111");

      expect(result).toEqual({ success: true });
      expect(gigModel.findByIdAndDelete).toHaveBeenCalledWith("111");
    });
  });

  describe("gallery, video, and profile update operations", () => {
    test("Testing addGigGalleryImage -- pass", async () => {
      const updatedGig = {
        _id: "gig1",
        gallery_images: ["image-url"],
      };

      gigModel.findByIdAndUpdate.mockResolvedValue(updatedGig);

      const result = await gigServices.addGigGalleryImage("gig1", "image-url");

      expect(result).toEqual(updatedGig);
      expect(gigModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "gig1",
        { $push: { gallery_images: "image-url" } },
        { new: true, runValidators: true }
      );
    });

    test("Testing removeGigGalleryImage -- pass", async () => {
      const updatedGig = {
        _id: "gig1",
        gallery_images: [],
      };

      gigModel.findByIdAndUpdate.mockResolvedValue(updatedGig);

      const result = await gigServices.removeGigGalleryImage("gig1", "image-url");

      expect(result).toEqual(updatedGig);
      expect(gigModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "gig1",
        { $pull: { gallery_images: "image-url" } },
        { new: true, runValidators: true }
      );
    });

    test("Testing addGigVideo -- pass", async () => {
      const updatedGig = {
        _id: "gig1",
        video_urls: ["abc123"],
      };

      gigModel.findByIdAndUpdate.mockResolvedValue(updatedGig);

      const result = await gigServices.addGigVideo("gig1", "abc123");

      expect(result).toEqual(updatedGig);
      expect(gigModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "gig1",
        { $push: { video_urls: "abc123" } },
        { new: true }
      );
    });

    test("Testing removeGigVideo -- pass", async () => {
      const updatedGig = {
        _id: "gig1",
        video_urls: [],
      };

      gigModel.findByIdAndUpdate.mockResolvedValue(updatedGig);

      const result = await gigServices.removeGigVideo("gig1", "abc123");

      expect(result).toEqual(updatedGig);
      expect(gigModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "gig1",
        { $pull: { video_urls: "abc123" } },
        { new: true }
      );
    });

    test("Testing updateGigProfile -- pass", async () => {
      const updatedGig = {
        _id: "gig1",
        name: "Updated Gig",
      };

      const updateData = {
        name: "Updated Gig",
        location: "SLO",
      };

      gigModel.findByIdAndUpdate.mockResolvedValue(updatedGig);

      const result = await gigServices.updateGigProfile("gig1", updateData);

      expect(result).toEqual(updatedGig);
      expect(gigModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "gig1",
        { $set: updateData },
        { new: true, runValidators: true }
      );
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
        time: ["23:00", "19:00"],
        host: new gigModel.base.Types.ObjectId(),
        booked: true,
      });

      const validationError = invalidTimeGig.validateSync();

      expect(validationError.errors["time"]).toBeDefined();
    });
  });
});
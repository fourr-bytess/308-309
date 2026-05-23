import { expect, jest } from "@jest/globals";
import venueModel from "./venue.js";
import venueServices from "./venue-services.js";

describe("Venue Model and Functions Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    venueModel.find = jest.fn();
    venueModel.findById = jest.fn();
    venueModel.findByIdAndDelete = jest.fn();
    jest.spyOn(venueModel.prototype, "save").mockReturnThis();
  });

  describe("getVenue", () => {
    test("Testing filters -- success", async () => {
      const mockSelect = jest.fn().mockResolvedValue([]);
      venueModel.find.mockReturnValue({ select: mockSelect });

      await venueServices.getVenue(
        "The Venue",
        "San Luis Obispo",
        "California",
        "93401",
        [200, 500]
      );

      expect(venueModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "the venue",
          city: "san luis obispo",
          state: "california",
          zip: "93401",
          capacity: { $gte: 200, $lte: 500 },
        })
      );
    });

    test("Testing some empty filters -- success", async () => {
      venueModel.find.mockResolvedValue([]);
      await venueServices.getVenue(null, null, null, null, [100]);
      expect(venueModel.find).toHaveBeenCalledWith({});
    });
  });

  describe("addVenue", () => {
    test("Testing addVenue -- success", async () => {
      const venueData = {
        name: "The Venue",
        address: "123 San Francisco St",
        city: "San Francisco",
        state: "California",
        zip: "94102",
        capacity: 340,
        contact_email: "venue@gmail.com",
        description: "Big room with stage.",
      };

      venueModel.prototype.save = jest.fn().mockResolvedValue(venueData);
      const result = await venueServices.addVenue(venueData);
      expect(result).toEqual(venueData);
      expect(venueModel.prototype.save).toHaveBeenCalled();
    });
  });

  describe("get Id and delete", () => {
    test("Testing findVenueById -- success", async () => {
      venueModel.findById.mockResolvedValue({ name: "true" });
      const result = await venueServices.findVenueById("111");
      expect(result.name).toBe("true");
      expect(venueModel.findById).toHaveBeenCalledWith("111");
    });
    test("Testing findVenueByIdAndDelete -- success", async () => {
      venueModel.findByIdAndDelete = jest.fn().mockResolvedValue(true);
      await venueServices.findVenueByIdAndDelete("111");
      expect(venueModel.findByIdAndDelete).toHaveBeenCalledWith("111");
    });
  });

  describe("Untested Contact Email Filters, Ownership, and Profiles", () => {
    test("Testing getVenue with contact_email parameter -- success", async () => {
      venueModel.find.mockResolvedValue([]);
      await venueServices.getVenue(null, null, null, null, null, "BOOKING@VENUE.COM");
      expect(venueModel.find).toHaveBeenCalledWith({
        contact_email: "booking@venue.com"
      });
    });

    test("Testing findOwnedVenueByUserId -- success", async () => {
      venueModel.findOne = jest.fn().mockResolvedValue({});
      await venueServices.findOwnedVenueByUserId("owner_999");
      expect(venueModel.findOne).toHaveBeenCalledWith({ owner_user: "owner_999" });
    });

    test("Testing findVenueByContactEmail -- success", async () => {
      venueModel.findOne = jest.fn().mockResolvedValue({});
      await venueServices.findVenueByContactEmail("HELLO@VENUE.COM");
      expect(venueModel.findOne).toHaveBeenCalledWith({ contact_email: "hello@venue.com" });
    });

    test("Testing findVenueByContactEmail fallback branch -- success", async () => {
      venueModel.findOne = jest.fn().mockResolvedValue({});
      await venueServices.findVenueByContactEmail(null);
      expect(venueModel.findOne).toHaveBeenCalledWith({ contact_email: "" });
    });

    test("Testing findVenueByName -- success", async () => {
      venueModel.findOne = jest.fn().mockResolvedValue({});
      await venueServices.findVenueByName("The Garage");
      expect(venueModel.findOne).toHaveBeenCalledWith({ name: "the garage" });
    });

    test("Testing findVenueByName fallback branch -- success", async () => {
      venueModel.findOne = jest.fn().mockResolvedValue({});
      await venueServices.findVenueByName(null);
      expect(venueModel.findOne).toHaveBeenCalledWith({ name: "" });
    });

    test("Testing claimVenueOwnership -- success", async () => {
      venueModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});
      await venueServices.claimVenueOwnership("venue_123", "owner_777");
      expect(venueModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "venue_123",
        { owner_user: "owner_777" },
        { new: true, runValidators: true }
      );
    });
  });
});

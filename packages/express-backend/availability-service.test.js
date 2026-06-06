import { jest } from "@jest/globals";
import Availability from "./availability.js";
import availabilityService from "./availability-service.js";

describe("Availability Functions Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Availability.findOne = jest.fn();
    Availability.create = jest.fn();
    Availability.find = jest.fn();
    Availability.findByIdAndDelete = jest.fn();
  });

  describe("createAvailability", () => {
    const mockData = {
      ownerId: "1234",
      ownerType: "band",
      start: "2026-02-02T10:00:00Z",
      end: "2026-02-02T11:00:00Z",
      notes: "Testing",
    };

    test("Testing when conflict is found -- error", async () => {
      Availability.findOne.mockResolvedValue({ _id: "existing123" });

      await expect(
        availabilityService.createAvailability(mockData)
      ).rejects.toThrow("Availability overlaps existing time slot");

      expect(Availability.findOne).toHaveBeenCalled();
      expect(Availability.create).not.toHaveBeenCalled();
    });

    test("Testing when no conflict is found -- pass", async () => {
      Availability.findOne.mockResolvedValue(null);

      Availability.create.mockResolvedValue({
        ...mockData,
        start: new Date(mockData.start),
        end: new Date(mockData.end),
        status: "available",
      });

      const result = await availabilityService.createAvailability(mockData);

      expect(result.status).toBe("available");
      expect(Availability.findOne).toHaveBeenCalled();

      expect(Availability.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: "1234",
          ownerType: "band",
          start: new Date("2026-02-02T10:00:00Z"),
          end: new Date("2026-02-02T11:00:00Z"),
          notes: "Testing",
          status: "available",
        })
      );
    });

    test("Testing create availability with custom status -- pass", async () => {
      const customData = {
        ownerId: "9999",
        ownerType: "venue",
        start: "2026-03-01T18:00:00Z",
        end: "2026-03-01T20:00:00Z",
        notes: "Custom status test",
        status: "booked",
      };

      Availability.findOne.mockResolvedValue(null);

      Availability.create.mockResolvedValue({
        ...customData,
        start: new Date(customData.start),
        end: new Date(customData.end),
      });

      const result = await availabilityService.createAvailability(customData);

      expect(result.status).toBe("booked");

      expect(Availability.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: "9999",
          ownerType: "venue",
          start: new Date("2026-03-01T18:00:00Z"),
          end: new Date("2026-03-01T20:00:00Z"),
          notes: "Custom status test",
          status: "booked",
        })
      );
    });
  });

  describe("getSlots", () => {
    test("Testing query with open status -- pass", async () => {
      const mockSort = jest.fn().mockResolvedValue([{ id: 1 }]);
      Availability.find.mockReturnValue({ sort: mockSort });

      await availabilityService.getSlots({
        ownerId: "23456",
        ownerType: "band",
        status: "open",
      });

      expect(Availability.find).toHaveBeenCalledWith({
        ownerId: "23456",
        ownerType: "band",
        status: "open",
      });

      expect(mockSort).toHaveBeenCalledWith({ start: 1 });
    });

    test("Testing query without status -- pass", async () => {
      const mockSort = jest.fn().mockResolvedValue([]);
      Availability.find.mockReturnValue({ sort: mockSort });

      await availabilityService.getSlots({
        ownerId: "23456",
        ownerType: "band",
      });

      expect(Availability.find).toHaveBeenCalledWith({
        ownerId: "23456",
        ownerType: "band",
      });

      expect(mockSort).toHaveBeenCalledWith({ start: 1 });
    });

    test("Testing query with booked status -- pass", async () => {
      const mockSort = jest.fn().mockResolvedValue([]);
      Availability.find.mockReturnValue({ sort: mockSort });

      await availabilityService.getSlots({
        ownerId: "23456",
        ownerType: "venue",
        status: "booked",
      });

      expect(Availability.find).toHaveBeenCalledWith({
        ownerId: "23456",
        ownerType: "venue",
        status: "booked",
      });

      expect(mockSort).toHaveBeenCalledWith({ start: 1 });
    });

    test("Testing query with start and end filters -- pass", async () => {
      const mockSort = jest.fn().mockResolvedValue([{ id: 1 }]);
      Availability.find.mockReturnValue({ sort: mockSort });

      await availabilityService.getSlots({
        ownerId: "23456",
        ownerType: "band",
        status: "available",
        start: "2026-02-02T10:00:00Z",
        end: "2026-02-02T12:00:00Z",
      });

      expect(Availability.find).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: "23456",
          ownerType: "band",
          status: "available",
        })
      );

      expect(mockSort).toHaveBeenCalledWith({ start: 1 });
    });

    test("Testing query with only start filter -- pass", async () => {
      const mockSort = jest.fn().mockResolvedValue([{ id: 1 }]);
      Availability.find.mockReturnValue({ sort: mockSort });

      await availabilityService.getSlots({
        ownerId: "23456",
        ownerType: "band",
        start: "2026-02-02T10:00:00Z",
      });

      expect(Availability.find).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: "23456",
          ownerType: "band",
        })
      );

      expect(mockSort).toHaveBeenCalledWith({ start: 1 });
    });

    test("Testing query with only end filter -- pass", async () => {
      const mockSort = jest.fn().mockResolvedValue([{ id: 1 }]);
      Availability.find.mockReturnValue({ sort: mockSort });

      await availabilityService.getSlots({
        ownerId: "23456",
        ownerType: "band",
        end: "2026-02-02T12:00:00Z",
      });

      expect(Availability.find).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: "23456",
          ownerType: "band",
        })
      );

      expect(mockSort).toHaveBeenCalledWith({ start: 1 });
    });
  });

  describe("deleteAvailability", () => {
    test("Testing delete when slot exists -- pass", async () => {
      const deletedSlot = {
        _id: "slot123",
      };

      Availability.findByIdAndDelete.mockResolvedValue(deletedSlot);

      const result = await availabilityService.deleteAvailability("slot123");

      expect(result).toEqual(deletedSlot);
      expect(Availability.findByIdAndDelete).toHaveBeenCalledWith("slot123");
    });

    test("Testing delete when slot does not exist -- returns null", async () => {
      Availability.findByIdAndDelete.mockResolvedValue(null);

      const result = await availabilityService.deleteAvailability("missing123");

      expect(result).toBeNull();
      expect(Availability.findByIdAndDelete).toHaveBeenCalledWith("missing123");
    });
  });
});
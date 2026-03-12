import { jest } from '@jest/globals';
import Availability from "./availability.js";
import availabilityService from "./availability-service.js";

describe("Availability Functions Test Suite", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Availability.findOne = jest.fn();
        Availability.create = jest.fn();
        Availability.find = jest.fn();
    });

    describe("createAvailability", () => {
        const mockData = {
            bandId: "1234",
            start: "2026-02-02T10:00:00Z",
            end: "2026-02-02T11:00:00Z",
            notes: "Testing"
        };

        test("Testing when conflict is found -- error", async () => {
            Availability.findOne.mockResolvedValue({_id: "existing123"});
            await expect(availabilityService.createAvailability(mockData))
                .rejects.toThrow("Availability overlaps existing time slot");
            expect(Availability.findOne).toHaveBeenCalled();
            expect(Availability.create).not.toHaveBeenCalled();
        });

        test("Testing when no conflict is found -- success", async () => {
            Availability.findOne.mockResolvedValue(null);
            Availability.create.mockResolvedValue({...mockData, status: "open"});
            const result = await availabilityService.createAvailability(mockData);
            expect(result.status).toBe('open');
            expect(Availability.create).toHaveBeenCalled();
        });
    });

    describe("getSlots", () => {
        test("Testing query with start and end times -- success", async () => {
            const mockSort = jest.fn().mockResolvedValue([{ id: 1}]);
            Availability.find.mockReturnValue({ sort: mockSort });
            const params = {
                bandId: "23456",
                startime: "2026-02-02",
                endtime: "2026-02-02",
                status: "open"
                };
            await availabilityService.getSlots(params);
            expect(Availability.find).toHaveBeenCalledWith({
                bandId: "23456",
                status: "open",
                start: {
                    $gte: new Date("2026-02-02"),
                    $lte: new Date("2026-02-02")
                }
            });
            expect(mockSort).toHaveBeenCalledWith({ start: 1});
        });

        test("Testing query without times -- success", async () => {
            const mockSort = jest.fn().mockResolvedValue([]);
            Availability.find.mockReturnValue({ sort: mockSort });
            await availabilityService.getSlots({ bandId: "23456"});
            expect(Availability.find).toHaveBeenCalledWith({
                bandId: "23456",
                status: "open"
            });
        });
    });
});


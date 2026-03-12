import { expect, jest } from '@jest/globals';
import gigModel from "./gig.js";
import gigServices from "./gig-services.js";

describe("Gig Model and Functions Test Suite", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        gigModel.find = jest.fn();
        gigModel.countDocuments = jest.fn();
        gigModel.findById = jest.fn();
        gigModel.findByIdAndDelete = jest.fn();
        jest.spyOn(gigModel.prototype, 'save').mockReturnThis();
    });

    describe("getGigs and buildGigsQuery", () => {
        test("Testing filters -- success", async () => {
            const mockSelect = jest.fn().mockResolvedValue([]);
            gigModel.find.mockReturnValue({ select: mockSelect });

            await gigServices.getGigs(
                "Jazz Show",
                "Jazz music for age 21+",
                ["Jazz"],
                ["San Francisco"], null, null, null,
                "Venue A", null,
                ["Under the Radar"]
            );

            expect(gigModel.find).toHaveBeenCalledWith(expect.objectContaining({
                name: "jazz show",
                description: "jazz music for age 21+",
                genres: { $in: ["jazz"]},
                locations: { $in: ["san francisco"] },
                host: "venue a",
                bands_hired: { $in: ["under the radar"] }
            }));
        });

        test("Testing filters -- success", async () => {
            const mockDate = new Date("2026-02-02");
            const timeRange = [new Date(), new Date()];

            const filters = {
                price_range: [200, 300],
                date: () => mockDate,
                time: timeRange,
                booked: () => true
            };
            gigModel.countDocuments.mockResolvedValue(5);
            await gigServices.getGigsCount(filters);
            expect(gigModel.countDocuments).toHaveBeenCalledWith(expect.objectContaining({
                price: { $gte: 200, $lte: 300 },
                date: mockDate,
                time: { $gte: timeRange[0], $lte: timeRange[1] },
                booked: true
            }));
        });

        test("Testing empty ranges -- success", async () => {
            const mockSelect = jest.fn().mockResolvedValue([]);
            gigModel.find.mockReturnValue({ select: mockSelect });
            await gigServices.getGigs(null, null, null, null, [50], null, [new Date()]);
            expect(gigModel.find).toHaveBeenCalledWith({});
        });
    });

    describe("getGigsPaginated", () => {
        test("Testing return gigs and count -- success", async () => {
            const mockGigs = [{ name: "Gig 1"}];
            const mockTotal = 1;
            const mockSelect = jest.fn().mockResolvedValue(mockGigs);
            const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
            const mockSkip = jest.fn().mockReturnValue( {limit: mockLimit });
            gigModel.find.mockReturnValue({ skip: mockSkip });
            gigModel.countDocuments.mockResolvedValue(mockTotal);

            const result = await gigServices.getGigsPaginated(10, 0, {});
            expect(result).toEqual({ gigs: mockGigs, total: mockTotal });
            expect(gigModel.countDocuments).toHaveBeenCalled();
        });
    });

    describe("CRUD operations", () => {
        test("Testing addGig -- success", async () => {
            const gigData = { name: "New Gig" };
            gigModel.prototype.save = jest.fn().mockResolvedValue(gigData);
            const result = await gigServices.addGig(gigData);
            expect(result).toEqual(gigData);
            expect(gigModel.prototype.save).toHaveBeenCalled();
        });

        test("Testing findGigById -- success", async () => {
            gigModel.findById.mockResolvedValue({ name: "True" });
            await gigServices.findGigById("111");
            expect(gigModel.findById).toHaveBeenCalledWith("111");
        });

        test("Testing findGigByIdAndDelete -- success", async () => {
            gigModel.findByIdAndDelete.mockResolvedValue({ success: true });
            await gigServices.findGigByIdAndDelete("111");
            expect(gigModel.findByIdAndDelete).toHaveBeenCalledWith("111");
        });
    });
});
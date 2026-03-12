import { jest } from '@jest/globals';
import bandModel from "./band.js";
import bandServices from "./band-services.js";

describe("Band Model and Functions Test Suite", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        bandModel.find = jest.fn();
        bandModel.countDocuments = jest.fn();
        bandModel.findById = jest.fn();
        bandModel.findByIdAndDelete = jest.fn();
        jest.spyOn(bandModel.prototype, 'save').mockReturnThis();
    });

    describe("getBands and buildBandsQuery", () => {
        test("Testing filters -- success", async () => {
            const mockSelect = jest.fn().mockResolvedValue([]);
            bandModel.find.mockReturnValue({ select: mockSelect });

            await bandServices.getBands(
                "Under the Radar",
                ["Amy"],
                ["Rock"],
                ["San Luis Obispo"],
                [100, 450]
            );

            expect(bandModel.find).toHaveBeenCalledWith(expect.objectContaining({
                name: "under the radar",
                members: { $in: ["amy"] },
                genres: { $in: ["rock"]},
                locations: { $in: ["san luis obispo"] },
                price_range: { $gte: 100, $lte: 450}
            }));
        });

        test("Testing handling empty filters -- success", async () => {
            const mockSelect = jest.fn().mockResolvedValue([]);
            bandModel.find.mockReturnValue({ select: mockSelect });
            await bandServices.getBands();
            expect(bandModel.find).toHaveBeenCalledWith({});
        });

        test("Testing only one price to treat as empty -- success", async () => {
            const mockSelect = jest.fn().mockResolvedValue([]);
            bandModel.find.mockReturnValue({ select: mockSelect });
            await bandServices.getBands(null, null, null, null, [100]);
            expect(bandModel.find).toHaveBeenCalledWith({});
        });
    });

    describe("getBandsPaginated", () => {
        test("Testing return bands and count -- success", async () => {
            const mockBands = [{ name: "Band 1"}];
            const mockTotal = 1;
            const mockSelect = jest.fn().mockResolvedValue(mockBands);
            const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
            const mockSkip = jest.fn().mockReturnValue( {limit: mockLimit });
            bandModel.find.mockReturnValue({ skip: mockSkip });
            bandModel.countDocuments.mockResolvedValue(mockTotal);

            const result = await bandServices.getBandsPaginated(10, 0, {});
            expect(result).toEqual({ bands: mockBands, total: mockTotal });
            expect(bandModel.countDocuments).toHaveBeenCalled();
        });
    });

    describe("CRUD operations", () => {
        test("Testing addBand -- success", async () => {
            const bandData = { name: "New Band", members: ["id1"] };
            bandModel.prototype.save = jest.fn().mockResolvedValue(bandData);
            const result = await bandServices.addBand(bandData);
            expect(result).toEqual(bandData);
            expect(bandModel.prototype.save).toHaveBeenCalled();
        });

        test("Testing getBandsCount -- success", async () => {
            bandModel.countDocuments.mockResolvedValue(5);
            const count = await bandServices.getBandsCount({ name: "Test"});
            expect(count).toBe(5);
        });

        test("Testing findBandById -- success", async () => {
            bandModel.findById.mockResolvedValue({ name: "True" });
            await bandServices.findBandById("111");
            expect(bandModel.findById).toHaveBeenCalledWith("111");
        });

        test("Testing findBandByIdAndDelete -- success", async () => {
            bandModel.findByIdAndDelete.mockResolvedValue({ success: true });
            await bandServices.findBandByIdAndDelete("111");
            expect(bandModel.findByIdAndDelete).toHaveBeenCalledWith("111");
        });
    });
});
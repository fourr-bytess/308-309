import { jest } from '@jest/globals';
import musicianModel from "./musician.js";
import musicianServices from "./musician-services.js";

describe("Musician Model and Functions Test Suite", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        musicianModel.find = jest.fn();
        musicianModel.countDocuments = jest.fn();
        musicianModel.findById = jest.fn();
        musicianModel.findByIdAndDelete = jest.fn();
        jest.spyOn(musicianModel.prototype, 'save').mockReturnThis();
    });

    describe("getMusicians and buildMusiciansQuery", () => {
        test("Testing filters -- success", async () => {
            const mockSelect = jest.fn().mockResolvedValue([]);
            musicianModel.find.mockReturnValue({ select: mockSelect });

            await musicianServices.getMusicians(
                "Amy Winehouse",
                ["Under the Radar"],
                ["Piano"]
            );

            expect(musicianModel.find).toHaveBeenCalledWith(expect.objectContaining({
                name: "amy winehouse",
                band_affiliations: { $in: ["under the radar"] },
                instruments: { $in: ["piano"]}
            }));
        });

        test("Testing bio filter -- success", async () => {
            musicianModel.countDocuments.mockResolvedValue(0);
            await musicianServices.getMusiciansCount({ bio: ["Jazz"]});
            expect(musicianModel.countDocuments).toHaveBeenCalledWith({
                bio: { $in: ["jazz"]}
            });
        });

        test("Testing handling empty filters -- success", async () => {
            const mockSelect = jest.fn().mockResolvedValue([]);
            musicianModel.find.mockReturnValue({ select: mockSelect });
            await musicianServices.getMusicians();
            expect(musicianModel.find).toHaveBeenCalledWith({});
        });
    });

    describe("getMusiciansPaginated", () => {
        test("Testing return musicians and count -- success", async () => {
            const mockMusicians = [{ name: "Musician 1"}];
            const mockTotal = 1;
            const mockSelect = jest.fn().mockResolvedValue(mockMusicians);
            const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
            const mockSkip = jest.fn().mockReturnValue( {limit: mockLimit });
            musicianModel.find.mockReturnValue({ skip: mockSkip });
            musicianModel.countDocuments.mockResolvedValue(mockTotal);

            const result = await musicianServices.getMusiciansPaginated(5, 0, {});
            expect(result).toEqual({ musicians: mockMusicians, total: mockTotal });
            expect(musicianModel.countDocuments).toHaveBeenCalled();
        });
    });

    describe("CRUD operations", () => {
        test("Testing addMusician -- success", async () => {
            const musicianData = { name: "New Musician" };
            musicianModel.prototype.save = jest.fn().mockResolvedValue(musicianData);
            const result = await musicianServices.addMusician(musicianData);
            expect(result).toEqual(musicianData);
            expect(musicianModel.prototype.save).toHaveBeenCalled();
        });

        test("Testing findMusicianById -- success", async () => {
            musicianModel.findById.mockResolvedValue({ name: "True" });
            await musicianServices.findMusicianById("111");
            expect(musicianModel.findById).toHaveBeenCalledWith("111");
        });

        test("Testing findMusicianByIdAndDelete -- success", async () => {
            musicianModel.findByIdAndDelete.mockResolvedValue({ success: true });
            await musicianServices.findMusicianByIdAndDelete("111");
            expect(musicianModel.findByIdAndDelete).toHaveBeenCalledWith("111");
        });
    });
});
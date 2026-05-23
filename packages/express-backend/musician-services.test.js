import { jest } from "@jest/globals";
import musicianModel from "./musician.js";
import musicianServices from "./musician-services.js";

describe("Musician Model and Functions Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    musicianModel.find = jest.fn();
    musicianModel.countDocuments = jest.fn();
    musicianModel.findById = jest.fn();
    musicianModel.findByIdAndDelete = jest.fn();
    jest.spyOn(musicianModel.prototype, "save").mockReturnThis();
  });

  describe("getMusicians and buildMusiciansQuery", () => {
    test("Testing filters -- pass", async () => {
      const mockSelect = jest.fn().mockResolvedValue([]);
      musicianModel.find.mockReturnValue({ select: mockSelect });

      await musicianServices.getMusicians(
        "Amy Winehouse",
        ["Under the Radar"],
        ["Piano"]
      );

      expect(musicianModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "amy winehouse",
          band_affiliations: { $in: ["under the radar"] },
          instruments: { $in: ["piano"] },
        })
      );
    });

    test("Testing bio filter -- pass", async () => {
      musicianModel.countDocuments.mockResolvedValue(0);
      await musicianServices.getMusiciansCount({ bio: ["Jazz"] });
      expect(musicianModel.countDocuments).toHaveBeenCalledWith({
        bio: { $in: ["jazz"] },
      });
    });

    test("Testing handling empty filters -- pass", async () => {
      const mockSelect = jest.fn().mockResolvedValue([]);
      musicianModel.find.mockReturnValue({ select: mockSelect });
      await musicianServices.getMusicians();
      expect(musicianModel.find).toHaveBeenCalledWith({});
    });
  });

  describe("getMusiciansPaginated", () => {
    test("Testing return musicians and count -- pass", async () => {
      const mockMusicians = [{ name: "Musician 1" }];
      const mockTotal = 1;
      const mockSelect = jest.fn().mockResolvedValue(mockMusicians);
      const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      musicianModel.find.mockReturnValue({ skip: mockSkip });
      musicianModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await musicianServices.getMusiciansPaginated(5, 0, {});
      expect(result).toEqual({ musicians: mockMusicians, total: mockTotal });
      expect(musicianModel.countDocuments).toHaveBeenCalled();
    });
  });

  describe("CRUD operations", () => {
    test("Testing addMusician -- pass", async () => {
      const musicianData = { name: "New Musician" };
      musicianModel.prototype.save = jest.fn().mockResolvedValue(musicianData);
      const result = await musicianServices.addMusician(musicianData);
      expect(result).toEqual(musicianData);
      expect(musicianModel.prototype.save).toHaveBeenCalled();
    });

    test("Testing findMusicianById -- pass", async () => {
      musicianModel.findById.mockResolvedValue({ name: "True" });
      await musicianServices.findMusicianById("111");
      expect(musicianModel.findById).toHaveBeenCalledWith("111");
    });

    test("Testing findMusicianByIdAndDelete -- pass", async () => {
      musicianModel.findByIdAndDelete.mockResolvedValue({ success: true });
      await musicianServices.findMusicianByIdAndDelete("111");
      expect(musicianModel.findByIdAndDelete).toHaveBeenCalledWith("111");
    });
  });

  describe("Untested Profile Ownership and Media Operations", () => {
    test("Testing findOwnedMusicianByUserId -- pass", async () => {
      musicianModel.findOne = jest.fn().mockResolvedValue({ id: "m1" });
      const result = await musicianServices.findOwnedMusicianByUserId("user_123");
      expect(musicianModel.findOne).toHaveBeenCalledWith({ owner_user: "user_123" });
      expect(result).toEqual({ id: "m1" });
    });

    test("Testing findMusicianByName -- pass", async () => {
      musicianModel.findOne = jest.fn().mockResolvedValue({ name: "john doe" });
      await musicianServices.findMusicianByName("John Doe");
      expect(musicianModel.findOne).toHaveBeenCalledWith({ name: "john doe" });
    });

    test("Testing findMusicianByName with null fallback -- pass", async () => {
      musicianModel.findOne = jest.fn().mockResolvedValue(null);
      await musicianServices.findMusicianByName(null);
      expect(musicianModel.findOne).toHaveBeenCalledWith({ name: "" });
    });

    test("Testing claimMusicianOwnership -- pass", async () => {
      musicianModel.findByIdAndUpdate = jest.fn().mockResolvedValue({ id: "m1" });
      await musicianServices.claimMusicianOwnership("m1", "user_123");
      expect(musicianModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "m1",
        { owner_user: "user_123" },
        { new: true, runValidators: true }
      );
    });

    test("Testing updateMusicianProfilePicture -- pass", async () => {
      musicianModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});
      await musicianServices.updateMusicianProfilePicture("m1", "http://image.png");
      expect(musicianModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "m1",
        { profile_picture_url: "http://image.png" },
        { new: true, runValidators: true }
      );
    });

    test("Testing addMusicianVideo -- pass", async () => {
      musicianModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});
      await musicianServices.addMusicianVideo("m1", "vid_123");
      expect(musicianModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "m1",
        { $push: { video_urls: "vid_123" } },
        { new: true }
      );
    });

    test("Testing removeMusicianVideo -- pass", async () => {
      musicianModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});
      await musicianServices.removeMusicianVideo("m1", "vid_123");
      expect(musicianModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "m1",
        { $pull: { video_urls: "vid_123" } },
        { new: true }
      );
    });
  });

});

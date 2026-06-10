import { expect, jest } from "@jest/globals";
import musicianModel from "./musician.js";
import musicianServices from "./musician-services.js";

const MUSICIAN_SELECT =
  "name band_affiliations instruments bio profile_picture_url gallery_images video_urls";

describe("Musician Model and Functions Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    musicianModel.find = jest.fn();
    musicianModel.countDocuments = jest.fn();
    musicianModel.findById = jest.fn();
    musicianModel.findOne = jest.fn();
    musicianModel.findByIdAndDelete = jest.fn();
    musicianModel.findByIdAndUpdate = jest.fn();

    jest.spyOn(musicianModel.prototype, "save").mockReturnThis();
  });
    describe("extra buildMusiciansQuery branch coverage", () => {
    test("Testing falsy name, null band_affiliations, undefined instruments, and undefined bio -- pass", async () => {
      musicianModel.countDocuments.mockResolvedValue(0);

      const result = await musicianServices.getMusiciansCount({
        name: "",
        band_affiliations: null,
        instruments: undefined,
        bio: undefined,
      });

      expect(result).toBe(0);
      expect(musicianModel.countDocuments).toHaveBeenCalledWith({});
    });

    test("Testing band_affiliations undefined does not add filter -- pass", async () => {
      musicianModel.countDocuments.mockResolvedValue(0);

      const result = await musicianServices.getMusiciansCount({
        band_affiliations: undefined,
      });

      expect(result).toBe(0);
      expect(musicianModel.countDocuments).toHaveBeenCalledWith({});
    });

    test("Testing instruments undefined does not add filter -- pass", async () => {
      musicianModel.countDocuments.mockResolvedValue(0);

      const result = await musicianServices.getMusiciansCount({
        instruments: undefined,
      });

      expect(result).toBe(0);
      expect(musicianModel.countDocuments).toHaveBeenCalledWith({});
    });

    test("Testing bio undefined does not add filter -- pass", async () => {
      musicianModel.countDocuments.mockResolvedValue(0);

      const result = await musicianServices.getMusiciansCount({
        bio: undefined,
      });

      expect(result).toBe(0);
      expect(musicianModel.countDocuments).toHaveBeenCalledWith({});
    });

    test("Testing lowercase mapping with multiple band affiliations, instruments, and bio values -- pass", async () => {
      musicianModel.countDocuments.mockResolvedValue(2);

      const result = await musicianServices.getMusiciansCount({
        name: "Ella Fitzgerald",
        band_affiliations: ["First Band", "Second Band"],
        instruments: ["Voice", "Piano"],
        bio: ["Jazz", "Swing"],
      });

      expect(result).toBe(2);
      expect(musicianModel.countDocuments).toHaveBeenCalledWith({
        name: "ella fitzgerald",
        band_affiliations: { $in: ["first band", "second band"] },
        instruments: { $in: ["voice", "piano"] },
        bio: { $in: ["jazz", "swing"] },
      });
    });

    test("Testing getMusiciansPaginated with falsy filters -- pass", async () => {
      const mockMusicians = [];
      const mockTotal = 0;

      const mockSelect = jest.fn().mockResolvedValue(mockMusicians);
      const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });

      musicianModel.find.mockReturnValue({ skip: mockSkip });
      musicianModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await musicianServices.getMusiciansPaginated(10, 0, {
        name: "",
        band_affiliations: null,
        instruments: [],
        bio: [],
      });

      expect(musicianModel.find).toHaveBeenCalledWith({});
      expect(musicianModel.countDocuments).toHaveBeenCalledWith({});
      expect(result).toEqual({
        musicians: mockMusicians,
        total: mockTotal,
      });
    });
  });
  
  describe("getMusicians and buildMusiciansQuery", () => {
    test("Testing filters -- pass", async () => {
      const mockSelect = jest.fn().mockResolvedValue([]);
      musicianModel.find.mockReturnValue({ select: mockSelect });

      const result = await musicianServices.getMusicians(
        "Amy Winehouse",
        ["Under the Radar"],
        ["Piano"]
      );

      expect(musicianModel.find).toHaveBeenCalledWith({
        name: "amy winehouse",
        band_affiliations: { $in: ["under the radar"] },
        instruments: { $in: ["piano"] },
      });

      expect(mockSelect).toHaveBeenCalledWith(MUSICIAN_SELECT);
      expect(result).toEqual([]);
    });

    test("Testing handling empty filters -- pass", async () => {
      const mockSelect = jest.fn().mockResolvedValue([]);
      musicianModel.find.mockReturnValue({ select: mockSelect });

      const result = await musicianServices.getMusicians();

      expect(musicianModel.find).toHaveBeenCalledWith({});
      expect(mockSelect).toHaveBeenCalledWith(MUSICIAN_SELECT);
      expect(result).toEqual([]);
    });

    test("Testing getMusiciansCount with default filters -- pass", async () => {
      musicianModel.countDocuments.mockResolvedValue(0);

      const result = await musicianServices.getMusiciansCount();

      expect(musicianModel.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(0);
    });

    test("Testing bio filter -- pass", async () => {
      musicianModel.countDocuments.mockResolvedValue(0);

      const result = await musicianServices.getMusiciansCount({
        bio: ["Jazz"],
      });

      expect(musicianModel.countDocuments).toHaveBeenCalledWith({
        bio: { $in: ["jazz"] },
      });

      expect(result).toBe(0);
    });

    test("Testing all count filters together -- pass", async () => {
      musicianModel.countDocuments.mockResolvedValue(4);

      const result = await musicianServices.getMusiciansCount({
        name: "Miles Davis",
        band_affiliations: ["Kind of Blue Band"],
        instruments: ["Trumpet"],
        bio: ["Jazz"],
      });

      expect(musicianModel.countDocuments).toHaveBeenCalledWith({
        name: "miles davis",
        band_affiliations: { $in: ["kind of blue band"] },
        instruments: { $in: ["trumpet"] },
        bio: { $in: ["jazz"] },
      });

      expect(result).toBe(4);
    });

    test("Testing empty instruments and empty bio arrays do not add filters -- pass", async () => {
      musicianModel.countDocuments.mockResolvedValue(0);

      const result = await musicianServices.getMusiciansCount({
        instruments: [],
        bio: [],
      });

      expect(musicianModel.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(0);
    });

    test("Testing empty band affiliations still maps to empty $in array -- pass", async () => {
      musicianModel.countDocuments.mockResolvedValue(0);

      const result = await musicianServices.getMusiciansCount({
        band_affiliations: [],
      });

      expect(musicianModel.countDocuments).toHaveBeenCalledWith({
        band_affiliations: { $in: [] },
      });

      expect(result).toBe(0);
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

      expect(musicianModel.find).toHaveBeenCalledWith({});
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(5);
      expect(mockSelect).toHaveBeenCalledWith(MUSICIAN_SELECT);
      expect(musicianModel.countDocuments).toHaveBeenCalledWith({});
      expect(result).toEqual({ musicians: mockMusicians, total: mockTotal });
    });

    test("Testing getMusiciansPaginated with default filters -- pass", async () => {
      const mockMusicians = [{ name: "Default Musician" }];
      const mockTotal = 1;

      const mockSelect = jest.fn().mockResolvedValue(mockMusicians);
      const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });

      musicianModel.find.mockReturnValue({ skip: mockSkip });
      musicianModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await musicianServices.getMusiciansPaginated(10, 2);

      expect(musicianModel.find).toHaveBeenCalledWith({});
      expect(mockSkip).toHaveBeenCalledWith(2);
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(mockSelect).toHaveBeenCalledWith(MUSICIAN_SELECT);
      expect(musicianModel.countDocuments).toHaveBeenCalledWith({});
      expect(result).toEqual({ musicians: mockMusicians, total: mockTotal });
    });

    test("Testing getMusiciansPaginated with all filters -- pass", async () => {
      const mockMusicians = [{ name: "Filtered Musician" }];
      const mockTotal = 1;

      const expectedQuery = {
        name: "john coltrane",
        band_affiliations: { $in: ["classic quartet"] },
        instruments: { $in: ["saxophone"] },
        bio: { $in: ["jazz"] },
      };

      const mockSelect = jest.fn().mockResolvedValue(mockMusicians);
      const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });

      musicianModel.find.mockReturnValue({ skip: mockSkip });
      musicianModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await musicianServices.getMusiciansPaginated(3, 1, {
        name: "John Coltrane",
        band_affiliations: ["Classic Quartet"],
        instruments: ["Saxophone"],
        bio: ["Jazz"],
      });

      expect(musicianModel.find).toHaveBeenCalledWith(expectedQuery);
      expect(musicianModel.countDocuments).toHaveBeenCalledWith(expectedQuery);
      expect(mockSkip).toHaveBeenCalledWith(1);
      expect(mockLimit).toHaveBeenCalledWith(3);
      expect(mockSelect).toHaveBeenCalledWith(MUSICIAN_SELECT);
      expect(result).toEqual({ musicians: mockMusicians, total: mockTotal });
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
      const mockMusician = { name: "True" };

      musicianModel.findById.mockResolvedValue(mockMusician);

      const result = await musicianServices.findMusicianById("111");

      expect(musicianModel.findById).toHaveBeenCalledWith("111");
      expect(result).toEqual(mockMusician);
    });

    test("Testing findMusicianByIdAndDelete -- pass", async () => {
      const mockDeleted = { success: true };

      musicianModel.findByIdAndDelete.mockResolvedValue(mockDeleted);

      const result = await musicianServices.findMusicianByIdAndDelete("111");

      expect(musicianModel.findByIdAndDelete).toHaveBeenCalledWith("111");
      expect(result).toEqual(mockDeleted);
    });
  });

  describe("Profile Ownership and Media Operations", () => {
    test("Testing findOwnedMusicianByUserId -- pass", async () => {
      const mockMusician = { id: "m1" };

      musicianModel.findOne.mockResolvedValue(mockMusician);

      const result =
        await musicianServices.findOwnedMusicianByUserId("user_123");

      expect(musicianModel.findOne).toHaveBeenCalledWith({
        owner_user: "user_123",
      });

      expect(result).toEqual(mockMusician);
    });

    test("Testing findMusicianByName -- pass", async () => {
      const mockMusician = { name: "john doe" };

      musicianModel.findOne.mockResolvedValue(mockMusician);

      const result = await musicianServices.findMusicianByName("John Doe");

      expect(musicianModel.findOne).toHaveBeenCalledWith({
        name: "john doe",
      });

      expect(result).toEqual(mockMusician);
    });

    test("Testing findMusicianByName with null fallback -- pass", async () => {
      musicianModel.findOne.mockResolvedValue(null);

      const result = await musicianServices.findMusicianByName(null);

      expect(musicianModel.findOne).toHaveBeenCalledWith({
        name: "",
      });

      expect(result).toBeNull();
    });

    test("Testing claimMusicianOwnership -- pass", async () => {
      const updated = { id: "m1", owner_user: "user_123" };

      musicianModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await musicianServices.claimMusicianOwnership(
        "m1",
        "user_123"
      );

      expect(musicianModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "m1",
        { owner_user: "user_123" },
        { new: true, runValidators: true }
      );

      expect(result).toEqual(updated);
    });

    test("Testing updateMusicianProfilePicture -- pass", async () => {
      const updated = {
        _id: "m1",
        profile_picture_url: "http://image.png",
      };

      musicianModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await musicianServices.updateMusicianProfilePicture(
        "m1",
        "http://image.png"
      );

      expect(musicianModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "m1",
        { profile_picture_url: "http://image.png" },
        { new: true, runValidators: true }
      );

      expect(result).toEqual(updated);
    });

    test("Testing updateMusicianProfile -- pass", async () => {
      const updated = {
        _id: "m1",
        name: "updated musician",
        bio: "new bio",
      };

      const updateData = {
        name: "updated musician",
        bio: "new bio",
      };

      musicianModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await musicianServices.updateMusicianProfile(
        "m1",
        updateData
      );

      expect(musicianModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "m1",
        { $set: updateData },
        { new: true, runValidators: true }
      );

      expect(result).toEqual(updated);
    });

    test("Testing addMusicianGalleryImage -- pass", async () => {
      const updated = {
        _id: "m1",
        gallery_images: ["image.jpg"],
      };

      const mockLean = jest.fn().mockResolvedValue(updated);

      musicianModel.findByIdAndUpdate.mockReturnValue({
        lean: mockLean,
      });

      const result = await musicianServices.addMusicianGalleryImage(
        "m1",
        "image.jpg"
      );

      expect(musicianModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "m1",
        { $push: { gallery_images: "image.jpg" } },
        { new: true, runValidators: true }
      );

      expect(mockLean).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    test("Testing removeMusicianGalleryImage -- pass", async () => {
      const updated = {
        _id: "m1",
        gallery_images: [],
      };

      musicianModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await musicianServices.removeMusicianGalleryImage(
        "m1",
        "image.jpg"
      );

      expect(musicianModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "m1",
        { $pull: { gallery_images: "image.jpg" } },
        { new: true, runValidators: true }
      );

      expect(result).toEqual(updated);
    });

    test("Testing addMusicianVideo -- pass", async () => {
      const updated = {
        _id: "m1",
        video_urls: ["vid_123"],
      };

      musicianModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await musicianServices.addMusicianVideo("m1", "vid_123");

      expect(musicianModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "m1",
        { $push: { video_urls: "vid_123" } },
        { new: true }
      );

      expect(result).toEqual(updated);
    });

    test("Testing removeMusicianVideo -- pass", async () => {
      const updated = {
        _id: "m1",
        video_urls: [],
      };

      musicianModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await musicianServices.removeMusicianVideo(
        "m1",
        "vid_123"
      );

      expect(musicianModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "m1",
        { $pull: { video_urls: "vid_123" } },
        { new: true }
      );

      expect(result).toEqual(updated);
    });
  });
});
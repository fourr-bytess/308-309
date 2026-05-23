import { jest } from "@jest/globals";
import bandModel from "./band.js";
import bandServices from "./band-services.js";

describe("Band Services Test Suite", () => {

  beforeEach(() => {

    jest.clearAllMocks();

    bandModel.find = jest.fn();
    bandModel.countDocuments = jest.fn();
    bandModel.findById = jest.fn();
    bandModel.findByIdAndDelete = jest.fn();

    jest.spyOn(bandModel.prototype, "save").mockReturnThis();
  });

  describe("Band Search and Filtering", () => {

    test("Testing filtered local band search results -- pass", async () => {

      const mockSelect = jest.fn().mockResolvedValue([]);

      bandModel.find.mockReturnValue({
        select: mockSelect,
      });

      await bandServices.getBands(
        "Midnight Echo",
        ["Cristian Stewart"],
        ["Indie Rock"],
        ["San Luis Obispo"],
        [300, 1200]
      );

      expect(bandModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "midnight echo",
          members: { $in: ["cristian stewart"] },
          genres: { $in: ["indie rock"] },
          locations: { $in: ["san luis obispo"] },
          price_range: { $gte: 300, $lte: 1200 },
        })
      );
    });

    test("Testing band retrieval with no filters applied -- pass", async () => {

      const mockSelect = jest.fn().mockResolvedValue([]);

      bandModel.find.mockReturnValue({
        select: mockSelect,
      });

      await bandServices.getBands();

      expect(bandModel.find).toHaveBeenCalledWith({});
    });

    test("Testing incomplete price range filter handling -- pass", async () => {

      const mockSelect = jest.fn().mockResolvedValue([]);

      bandModel.find.mockReturnValue({
        select: mockSelect,
      });

      await bandServices.getBands(
        null,
        null,
        null,
        null,
        [300]
      );

      expect(bandModel.find).toHaveBeenCalledWith({});
    });

  });

  describe("Band Pagination and Count", () => {

    test("Testing paginated band search results and total count -- pass", async () => {

      const mockBands = [
        {
          name: "Late Night Rhythm",
        },
      ];

      const mockTotal = 1;

      const mockSelect = jest.fn().mockResolvedValue(mockBands);

      const mockLimit = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockSkip = jest.fn().mockReturnValue({
        limit: mockLimit,
      });

      bandModel.find.mockReturnValue({
        skip: mockSkip,
      });

      bandModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await bandServices.getBandsPaginated(
        10,
        0,
        {}
      );

      expect(result).toEqual({
        bands: mockBands,
        total: mockTotal,
      });

      expect(bandModel.countDocuments).toHaveBeenCalled();
    });

  });

  describe("Band CRUD Operations", () => {

    test("Testing successful band profile creation -- pass", async () => {

      const bandData = {
        name: "Pacific Avenue",
        members: ["member_001"],
      };

      bandModel.prototype.save = jest
        .fn()
        .mockResolvedValue(bandData);

      const result = await bandServices.addBand(bandData);

      expect(result).toEqual(bandData);

      expect(bandModel.prototype.save).toHaveBeenCalled();
    });

    test("Testing total band count retrieval -- pass", async () => {

      bandModel.countDocuments.mockResolvedValue(5);

      const count = await bandServices.getBandsCount({
        name: "Midnight Echo",
      });

      expect(count).toBe(5);
    });

    test("Testing findBandById -- pass", async () => {

      bandModel.findById.mockResolvedValue({
        name: "Golden Hour",
      });

      await bandServices.findBandById("band_111");

      expect(bandModel.findById).toHaveBeenCalledWith(
        "band_111"
      );
    });

    test("Testing successful band deletion -- pass", async () => {

      bandModel.findByIdAndDelete.mockResolvedValue({
        success: true,
      });

      await bandServices.findBandByIdAndDelete("band_111");

      expect(
        bandModel.findByIdAndDelete
      ).toHaveBeenCalledWith("band_111");
    });

  });

  describe("Untested Band Asset Modification Services", () => {
    test("Testing updateBandProfilePicture -- pass", async () => {
      bandModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});
      await bandServices.updateBandProfilePicture("b1", "img_url");
      expect(bandModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "b1",
        { profile_picture_url: "img_url" },
        { new: true, runValidators: true }
      );
    });

    test("Testing addBandGalleryImage -- pass", async () => {
      bandModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});
      await bandServices.addBandGalleryImage("b1", "gallery_url");
      expect(bandModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "b1",
        { $push: { gallery_images: "gallery_url" } },
        { new: true, runValidators: true }
      );
    });

    test("Testing removeBandGalleryImage -- pass", async () => {
      bandModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});
      await bandServices.removeBandGalleryImage("b1", "gallery_url");
      expect(bandModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "b1",
        { $pull: { gallery_images: "gallery_url" } },
        { new: true, runValidators: true }
      );
    });

    test("Testing addBandVideo -- pass", async () => {
      bandModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});
      await bandServices.addBandVideo("b1", "vid_id");
      expect(bandModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "b1",
        { $push: { video_urls: "vid_id" } },
        { new: true }
      );
    });

    test("Testing removeBandVideo -- pass", async () => {
      bandModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});
      await bandServices.removeBandVideo("b1", "vid_id");
      expect(bandModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "b1",
        { $pull: { video_urls: "vid_id" } },
        { new: true }
      );
    });
  });

});
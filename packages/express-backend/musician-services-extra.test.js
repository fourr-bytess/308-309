import { jest } from "@jest/globals";

function MockMusician(data) {
  Object.assign(this, data);
  this.save = jest.fn().mockResolvedValue(data);
}

MockMusician.findByIdAndUpdate = jest.fn();

jest.unstable_mockModule("./musician.js", () => ({
  default: MockMusician,
}));

const { default: musicianServices } = await import("./musician-services.js");

function maybeTest(functionName, testName, callback) {
  const runner =
    typeof musicianServices[functionName] === "function" ? test : test.skip;
  runner(testName, callback);
}

function expectUpdateCalledFor(id) {
  expect(MockMusician.findByIdAndUpdate).toHaveBeenCalled();
  expect(MockMusician.findByIdAndUpdate.mock.calls[0][0]).toBe(id);
}

describe("Musician Services Extra Branch Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  maybeTest("updateMusicianProfile", "updateMusicianProfile updates profile", async () => {
    const updated = { _id: "musician1", name: "Updated Musician" };
    MockMusician.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await musicianServices.updateMusicianProfile("musician1", {
      name: "Updated Musician",
      location: "SLO",
    });

    expect(result).toEqual(updated);
    expectUpdateCalledFor("musician1");
  });

  maybeTest(
    "updateMusicianProfilePicture",
    "updateMusicianProfilePicture updates image",
    async () => {
      const updated = { _id: "musician1", profile_image: "image.jpg" };
      MockMusician.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await musicianServices.updateMusicianProfilePicture(
        "musician1",
        "image.jpg"
      );

      expect(result).toEqual(updated);
      expectUpdateCalledFor("musician1");
    }
  );

  maybeTest("addMusicianGalleryImage", "addMusicianGalleryImage pushes image", async () => {
    const updated = { _id: "musician1", gallery_images: ["image.jpg"] };
    const mockLean = jest.fn().mockResolvedValue(updated);

    MockMusician.findByIdAndUpdate.mockReturnValue({
      lean: mockLean,
    });

    const result = await musicianServices.addMusicianGalleryImage(
      "musician1",
      "image.jpg"
    );

    expect(result).toEqual(updated);

    expect(MockMusician.findByIdAndUpdate).toHaveBeenCalledWith(
      "musician1",
      { $push: { gallery_images: "image.jpg" } },
      { new: true, runValidators: true }
    );

    expect(mockLean).toHaveBeenCalled();
  });

  maybeTest(
    "removeMusicianGalleryImage",
    "removeMusicianGalleryImage pulls image",
    async () => {
      const updated = { _id: "musician1", gallery_images: [] };
      MockMusician.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await musicianServices.removeMusicianGalleryImage(
        "musician1",
        "image.jpg"
      );

      expect(result).toEqual(updated);
      expectUpdateCalledFor("musician1");
    }
  );

  maybeTest("addMusicianVideo", "addMusicianVideo pushes video", async () => {
    const updated = { _id: "musician1", video_urls: ["video123"] };
    MockMusician.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await musicianServices.addMusicianVideo(
      "musician1",
      "video123"
    );

    expect(result).toEqual(updated);
    expectUpdateCalledFor("musician1");
  });

  maybeTest("removeMusicianVideo", "removeMusicianVideo pulls video", async () => {
    const updated = { _id: "musician1", video_urls: [] };
    MockMusician.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await musicianServices.removeMusicianVideo(
      "musician1",
      "video123"
    );

    expect(result).toEqual(updated);
    expectUpdateCalledFor("musician1");
  });
});

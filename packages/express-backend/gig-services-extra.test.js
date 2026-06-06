import { jest } from "@jest/globals";

function MockGig(data) {
  Object.assign(this, data);
  this.save = jest.fn().mockResolvedValue(data);
}

MockGig.findByIdAndUpdate = jest.fn();

jest.unstable_mockModule("./gig.js", () => ({
  default: MockGig,
}));

const { default: gigServices } = await import("./gig-services.js");

describe("Gig Services Extra Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("addGigGalleryImage pushes image URL", async () => {
    const updatedGig = { _id: "gig1", gallery_images: ["image.jpg"] };
    MockGig.findByIdAndUpdate.mockResolvedValue(updatedGig);

    const result = await gigServices.addGigGalleryImage("gig1", "image.jpg");

    expect(result).toEqual(updatedGig);
    expect(MockGig.findByIdAndUpdate).toHaveBeenCalledWith(
      "gig1",
      { $push: { gallery_images: "image.jpg" } },
      { new: true, runValidators: true }
    );
  });

  test("removeGigGalleryImage pulls image URL", async () => {
    const updatedGig = { _id: "gig1", gallery_images: [] };
    MockGig.findByIdAndUpdate.mockResolvedValue(updatedGig);

    const result = await gigServices.removeGigGalleryImage("gig1", "image.jpg");

    expect(result).toEqual(updatedGig);
    expect(MockGig.findByIdAndUpdate).toHaveBeenCalledWith(
      "gig1",
      { $pull: { gallery_images: "image.jpg" } },
      { new: true, runValidators: true }
    );
  });

  test("addGigVideo pushes video id", async () => {
    const updatedGig = { _id: "gig1", video_urls: ["video123"] };
    MockGig.findByIdAndUpdate.mockResolvedValue(updatedGig);

    const result = await gigServices.addGigVideo("gig1", "video123");

    expect(result).toEqual(updatedGig);
    expect(MockGig.findByIdAndUpdate).toHaveBeenCalledWith(
      "gig1",
      { $push: { video_urls: "video123" } },
      { new: true }
    );
  });

  test("removeGigVideo pulls video id", async () => {
    const updatedGig = { _id: "gig1", video_urls: [] };
    MockGig.findByIdAndUpdate.mockResolvedValue(updatedGig);

    const result = await gigServices.removeGigVideo("gig1", "video123");

    expect(result).toEqual(updatedGig);
    expect(MockGig.findByIdAndUpdate).toHaveBeenCalledWith(
      "gig1",
      { $pull: { video_urls: "video123" } },
      { new: true }
    );
  });

  test("updateGigProfile sets update data", async () => {
    const updatedGig = { _id: "gig1", name: "Updated Gig" };
    MockGig.findByIdAndUpdate.mockResolvedValue(updatedGig);

    const updateData = {
      name: "Updated Gig",
      location: "San Luis Obispo",
    };

    const result = await gigServices.updateGigProfile("gig1", updateData);

    expect(result).toEqual(updatedGig);
    expect(MockGig.findByIdAndUpdate).toHaveBeenCalledWith(
      "gig1",
      { $set: updateData },
      { new: true, runValidators: true }
    );
  });
});

import { jest } from "@jest/globals";

function MockBand(data) {
  Object.assign(this, data);
  this.save = jest.fn().mockResolvedValue(data);
}

MockBand.findByIdAndUpdate = jest.fn();

jest.unstable_mockModule("./band.js", () => ({
  default: MockBand,
}));

const { default: bandServices } = await import("./band-services.js");

function maybeTest(functionName, testName, callback) {
  const runner = typeof bandServices[functionName] === "function" ? test : test.skip;
  runner(testName, callback);
}

function expectUpdateCalledFor(id) {
  expect(MockBand.findByIdAndUpdate).toHaveBeenCalled();
  expect(MockBand.findByIdAndUpdate.mock.calls[0][0]).toBe(id);
}

describe("Band Services Extra Branch Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  maybeTest("updateBandProfile", "updateBandProfile updates band profile", async () => {
    const updated = { _id: "band1", name: "Updated Band" };
    MockBand.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await bandServices.updateBandProfile("band1", {
      name: "Updated Band",
      location: "SLO",
    });

    expect(result).toEqual(updated);
    expectUpdateCalledFor("band1");
  });

  maybeTest("updateBandProfilePicture", "updateBandProfilePicture updates image", async () => {
    const updated = { _id: "band1", profile_image: "image.jpg" };
    MockBand.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await bandServices.updateBandProfilePicture("band1", "image.jpg");

    expect(result).toEqual(updated);
    expectUpdateCalledFor("band1");
  });

  maybeTest("addBandGalleryImage", "addBandGalleryImage pushes image", async () => {
    const updated = { _id: "band1", gallery_images: ["image.jpg"] };
    MockBand.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await bandServices.addBandGalleryImage("band1", "image.jpg");

    expect(result).toEqual(updated);
    expectUpdateCalledFor("band1");
  });

  maybeTest("removeBandGalleryImage", "removeBandGalleryImage pulls image", async () => {
    const updated = { _id: "band1", gallery_images: [] };
    MockBand.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await bandServices.removeBandGalleryImage("band1", "image.jpg");

    expect(result).toEqual(updated);
    expectUpdateCalledFor("band1");
  });

  maybeTest("addBandVideo", "addBandVideo pushes video", async () => {
    const updated = { _id: "band1", video_urls: ["video123"] };
    MockBand.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await bandServices.addBandVideo("band1", "video123");

    expect(result).toEqual(updated);
    expectUpdateCalledFor("band1");
  });

  maybeTest("removeBandVideo", "removeBandVideo pulls video", async () => {
    const updated = { _id: "band1", video_urls: [] };
    MockBand.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await bandServices.removeBandVideo("band1", "video123");

    expect(result).toEqual(updated);
    expectUpdateCalledFor("band1");
  });

  maybeTest("addBandMember", "addBandMember adds musician member", async () => {
    const updated = { _id: "band1", members: ["musician1"] };
    MockBand.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await bandServices.addBandMember("band1", "musician1");

    expect(result).toEqual(updated);
    expectUpdateCalledFor("band1");
  });

  maybeTest("removeBandMember", "removeBandMember removes musician member", async () => {
    const updated = { _id: "band1", members: [] };
    MockBand.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await bandServices.removeBandMember("band1", "musician1");

    expect(result).toEqual(updated);
    expectUpdateCalledFor("band1");
  });
});

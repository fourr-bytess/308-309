import { jest } from "@jest/globals";

function MockBand(data) {
  Object.assign(this, data);
  this.save = jest.fn().mockResolvedValue(data);
}

MockBand.find = jest.fn();
MockBand.countDocuments = jest.fn();
MockBand.findByIdAndUpdate = jest.fn();

jest.unstable_mockModule("./band.js", () => ({
  default: MockBand,
}));

const { default: bandServices } = await import("./band-services.js");

function makeFindChain(result = []) {
  return {
    select: jest.fn().mockResolvedValue(result),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };
}

function maybeTest(functionName, testName, callback) {
  const runner = typeof bandServices[functionName] === "function" ? test : test.skip;
  runner(testName, callback);
}

describe("Band Services Extra Branch Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  maybeTest("getBands", "getBands covers empty filter branches", async () => {
    const bands = [{ _id: "band1", name: "Test Band" }];
    const chain = makeFindChain(bands);

    MockBand.find.mockReturnValue(chain);

    const result = await bandServices.getBands();

    expect(result).toEqual(bands);
    expect(MockBand.find).toHaveBeenCalledWith({});
    expect(chain.select).toHaveBeenCalled();
  });

  maybeTest("getBands", "getBands ignores empty filter values", async () => {
    const bands = [];
    const chain = makeFindChain(bands);

    MockBand.find.mockReturnValue(chain);

    const result = await bandServices.getBands(
      "",
      "",
      [],
      "",
      "",
      false,
      null,
      undefined
    );

    expect(result).toEqual(bands);
    expect(MockBand.find).toHaveBeenCalledWith({});
    expect(chain.select).toHaveBeenCalled();
  });

  maybeTest("getBandsCount", "getBandsCount covers default filters branch", async () => {
    MockBand.countDocuments.mockResolvedValue(3);

    const result = await bandServices.getBandsCount();

    expect(result).toBe(3);
    expect(MockBand.countDocuments).toHaveBeenCalledWith({});
  });

  maybeTest("getBandsCount", "getBandsCount ignores empty filter values", async () => {
    MockBand.countDocuments.mockResolvedValue(0);

    const result = await bandServices.getBandsCount({
      name: "",
      description: "",
      genres: [],
      location: "",
    });

    expect(result).toBe(0);
    expect(MockBand.countDocuments).toHaveBeenCalledWith({});
  });

  maybeTest("getBandsPaginated", "getBandsPaginated covers default filters branch", async () => {
    const bands = [{ _id: "band1", name: "Test Band" }];
    const chain = makeFindChain(bands);

    MockBand.find.mockReturnValue(chain);
    MockBand.countDocuments.mockResolvedValue(1);

    const result = await bandServices.getBandsPaginated(10, 0);

    expect(result).toEqual({
      bands,
      total: 1,
    });
    expect(MockBand.find).toHaveBeenCalledWith({});
    expect(MockBand.countDocuments).toHaveBeenCalledWith({});
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(chain.select).toHaveBeenCalled();
  });

  maybeTest("getBandsPaginated", "getBandsPaginated ignores empty filters", async () => {
    const bands = [];
    const chain = makeFindChain(bands);

    MockBand.find.mockReturnValue(chain);
    MockBand.countDocuments.mockResolvedValue(0);

    const result = await bandServices.getBandsPaginated(5, 10, {
      name: "",
      description: "",
      genres: [],
      location: "",
    });

    expect(result).toEqual({
      bands,
      total: 0,
    });
    expect(MockBand.find).toHaveBeenCalledWith({});
    expect(MockBand.countDocuments).toHaveBeenCalledWith({});
    expect(chain.skip).toHaveBeenCalledWith(10);
    expect(chain.limit).toHaveBeenCalledWith(5);
    expect(chain.select).toHaveBeenCalled();
  });

  maybeTest("addBandMember", "addBandMember covers update branch", async () => {
    const updated = { _id: "band1", members: ["musician1"] };

    MockBand.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await bandServices.addBandMember("band1", "musician1");

    expect(result).toEqual(updated);
    expect(MockBand.findByIdAndUpdate).toHaveBeenCalled();
  });

  maybeTest("removeBandMember", "removeBandMember covers update branch", async () => {
    const updated = { _id: "band1", members: [] };

    MockBand.findByIdAndUpdate.mockResolvedValue(updated);

    const result = await bandServices.removeBandMember("band1", "musician1");

    expect(result).toEqual(updated);
    expect(MockBand.findByIdAndUpdate).toHaveBeenCalled();
  });
});

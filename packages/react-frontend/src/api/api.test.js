import {
  getBands,
  getBandById,
  createBand,
  deleteBand,
  getVenues,
  createVenue,
  deleteVenue,
  getMusicians,
  createMusician,
  getReviews,
  createReview
} from "./api.js";

global.fetch = jest.fn();

describe("API Service Tests", () => {

  beforeEach(() => {
    fetch.mockClear();
  });

  /* ---------------- BANDS ---------------- */

  test("getBands fetches band list", async () => {

    const mockData = { data: [{ name: "Test Band" }] };

    fetch.mockResolvedValue({
      json: () => Promise.resolve(mockData)
    });

    const bands = await getBands();

    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/bands");
    expect(bands).toEqual(mockData.data);
  });


  test("getBandById fetches one band", async () => {

    const mockData = { data: { name: "Band 1" } };

    fetch.mockResolvedValue({
      json: () => Promise.resolve(mockData)
    });

    const band = await getBandById("123");

    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/bands/123");
    expect(band).toEqual(mockData.data);
  });


  test("createBand sends POST request", async () => {

    const newBand = { name: "New Band" };

    fetch.mockResolvedValue({
      json: () => Promise.resolve(newBand)
    });

    const result = await createBand(newBand);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/bands",
      expect.objectContaining({
        method: "POST"
      })
    );

    expect(result).toEqual(newBand);
  });


  test("deleteBand sends DELETE request", async () => {

    fetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true })
    });

    await deleteBand("123");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/bands/123",
      expect.objectContaining({
        method: "DELETE"
      })
    );
  });


  /* ---------------- VENUES ---------------- */

  test("getVenues fetches venues", async () => {

    const mockData = { data: [{ name: "Venue A" }] };

    fetch.mockResolvedValue({
      json: () => Promise.resolve(mockData)
    });

    const venues = await getVenues();

    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/venues");
    expect(venues).toEqual(mockData.data);
  });


  test("createVenue sends POST request", async () => {

    const venue = { name: "Venue A" };

    fetch.mockResolvedValue({
      json: () => Promise.resolve(venue)
    });

    const result = await createVenue(venue);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/venues",
      expect.objectContaining({
        method: "POST"
      })
    );

    expect(result).toEqual(venue);
  });


  /* ---------------- MUSICIANS ---------------- */

  test("getMusicians fetches musicians", async () => {

    const mockData = { data: [{ name: "Musician A" }] };

    fetch.mockResolvedValue({
      json: () => Promise.resolve(mockData)
    });

    const musicians = await getMusicians();

    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/musicians");
    expect(musicians).toEqual(mockData.data);
  });


  /* ---------------- REVIEWS ---------------- */

  test("getReviews fetches reviews", async () => {

    const mockData = { data: [{ rating: 5 }] };

    fetch.mockResolvedValue({
      json: () => Promise.resolve(mockData)
    });

    const reviews = await getReviews();

    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/reviews");
    expect(reviews).toEqual(mockData.data);
  });

});


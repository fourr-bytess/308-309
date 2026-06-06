/**
 * @jest-environment jsdom
 */
/* global describe, beforeEach, test, expect, localStorage, Headers */
import { jest } from "@jest/globals";

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
  createReview,
  loadSearchArea,
  saveSearchArea,
} from "./api.js";

globalThis.fetch = jest.fn();

const API_URL = "http://localhost:3001";

function mockJsonResponse(payload, extra = {}) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
    clone: () => ({
      json: () => Promise.resolve(payload),
    }),
    ...extra,
  };
}

function setTestToken() {
  localStorage.setItem("giggly_access_token", "test-token");
}

function expectAuthHeaderWasSent(callIndex = 0) {
  const options = fetch.mock.calls[callIndex][1];

  expect(options.headers).toBeInstanceOf(Headers);
  expect(options.headers.get("Authorization")).toBe("Bearer test-token");
}

describe("search area persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
  });

  test("loadSearchArea returns defaults when nothing is stored", () => {
    expect(loadSearchArea()).toEqual({
      coords: null,
      radius: null,
      zip: "",
    });
  });

  test("saveSearchArea stores and loadSearchArea restores a saved area", () => {
    const area = {
      coords: { lat: 35.3, lng: -120.7 },
      radius: 10,
      zip: "93401",
    };

    saveSearchArea(area);

    expect(loadSearchArea()).toEqual(area);
  });

  test("saveSearchArea clears storage when coords are missing", () => {
    saveSearchArea({
      coords: { lat: 35.3, lng: -120.7 },
      radius: 10,
      zip: "93401",
    });

    saveSearchArea({ coords: null, radius: 10, zip: "" });

    expect(loadSearchArea()).toEqual({
      coords: null,
      radius: null,
      zip: "",
    });
  });
});

describe("API Service Tests", () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
  });

  test("getBands fetches band list", async () => {
    const mockData = { data: [{ name: "Test Band" }] };

    fetch.mockResolvedValue(mockJsonResponse(mockData));

    const bands = await getBands();

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/bands`);
    expect(bands).toEqual(mockData.data);
  });

  test("getBandById fetches one band", async () => {
    const mockData = { data: { name: "Band 1" } };

    fetch.mockResolvedValue(mockJsonResponse(mockData));

    const band = await getBandById("123");

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/bands/123`);
    expect(band).toEqual(mockData.data);
  });

  test("createBand sends authenticated POST request", async () => {
    setTestToken();

    const newBand = { name: "New Band" };
    const mockResponse = { data: newBand };

    fetch.mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await createBand(newBand);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/bands`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(newBand),
      })
    );

    expectAuthHeaderWasSent();
    expect(fetch.mock.calls[0][1].headers.get("Content-Type")).toBe(
      "application/json"
    );
    expect(result).toEqual(mockResponse);
  });

  test("createBand throws when no auth token exists", async () => {
    await expect(createBand({ name: "No Token Band" })).rejects.toThrow(
      "Your session expired. Please log in again."
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  test("deleteBand sends authenticated DELETE request", async () => {
    setTestToken();

    const mockResponse = { success: true };

    fetch.mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await deleteBand("123");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/bands/123`,
      expect.objectContaining({
        method: "DELETE",
      })
    );

    expectAuthHeaderWasSent();
    expect(result).toEqual(mockResponse);
  });

  test("getVenues fetches venues", async () => {
    const mockData = { data: [{ name: "Venue A" }] };

    fetch.mockResolvedValue(mockJsonResponse(mockData));

    const venues = await getVenues();

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/venues`);
    expect(venues).toEqual(mockData.data);
  });

  test("createVenue sends authenticated POST request", async () => {
    setTestToken();

    const venue = { name: "Venue A" };
    const mockResponse = { data: venue };

    fetch.mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await createVenue(venue);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/venues`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(venue),
      })
    );

    expectAuthHeaderWasSent();
    expect(fetch.mock.calls[0][1].headers.get("Content-Type")).toBe(
      "application/json"
    );
    expect(result).toEqual(mockResponse);
  });

  test("deleteVenue sends authenticated DELETE request", async () => {
    setTestToken();

    const mockResponse = { success: true };

    fetch.mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await deleteVenue("123");

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/venues/123`,
      expect.objectContaining({
        method: "DELETE",
      })
    );

    expectAuthHeaderWasSent();
    expect(result).toEqual(mockResponse);
  });

  test("getMusicians fetches musicians", async () => {
    const mockData = { data: [{ name: "Musician A" }] };

    fetch.mockResolvedValue(mockJsonResponse(mockData));

    const musicians = await getMusicians();

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/musicians`);
    expect(musicians).toEqual(mockData.data);
  });

  test("createMusician sends authenticated POST request", async () => {
    setTestToken();

    const musician = { name: "John Guitar" };
    const mockResponse = { data: musician };

    fetch.mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await createMusician(musician);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/musicians`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(musician),
      })
    );

    expectAuthHeaderWasSent();
    expect(fetch.mock.calls[0][1].headers.get("Content-Type")).toBe(
      "application/json"
    );
    expect(result).toEqual(mockResponse);
  });

  test("getReviews fetches reviews", async () => {
    const mockData = { data: [{ rating: 5 }] };

    fetch.mockResolvedValue(mockJsonResponse(mockData));

    const reviews = await getReviews();

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/reviews`);
    expect(reviews).toEqual(mockData.data);
  });

  test("createReview sends authenticated POST request", async () => {
    setTestToken();

    const review = { rating: 5, comment: "Great band!" };
    const mockResponse = { data: review };

    fetch.mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await createReview(review);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/reviews`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(review),
      })
    );

    expectAuthHeaderWasSent();
    expect(fetch.mock.calls[0][1].headers.get("Content-Type")).toBe(
      "application/json"
    );
    expect(result).toEqual(mockResponse);
  });
});

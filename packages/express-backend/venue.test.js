import Venue from "./venue.js";

describe("Venue Model Test Suite", () => {

  test("Testing valid venue creation -- pass", async () => {

    const validVenue = new Venue({
      name: "Venue A",
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      zip: "93401",
      capacity: 500,
      contact_email: "venue@gmail.com",
      description: "Great venue",
    });

    await expect(validVenue.validate()).resolves.not.toThrow();
  });

  test("Testing missing name -- fail", async () => {

    const invalidVenue = new Venue({
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      contact_email: "venue@gmail.com",
    });

    try {
      await invalidVenue.validate();
    } catch (error) {
      expect(error.message).toContain("name");
    }
  });

  test("Testing missing address -- fail", async () => {

    const invalidVenue = new Venue({
      name: "Venue A",
      city: "Los Angeles",
      state: "CA",
      contact_email: "venue@gmail.com",
    });

    try {
      await invalidVenue.validate();
    } catch (error) {
      expect(error.message).toContain("address");
    }
  });

  test("Testing missing city -- fail", async () => {

    const invalidVenue = new Venue({
      name: "Venue A",
      address: "123 Main St",
      state: "CA",
      contact_email: "venue@gmail.com",
    });

    try {
      await invalidVenue.validate();
    } catch (error) {
      expect(error.message).toContain("city");
    }
  });

  test("Testing missing state -- fail", async () => {

    const invalidVenue = new Venue({
      name: "Venue A",
      address: "123 Main St",
      city: "Los Angeles",
      contact_email: "venue@gmail.com",
    });

    try {
      await invalidVenue.validate();
    } catch (error) {
      expect(error.message).toContain("state");
    }
  });

  test("Testing missing contact_email -- fail", async () => {

    const invalidVenue = new Venue({
      name: "Venue A",
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
    });

    try {
      await invalidVenue.validate();
    } catch (error) {
      expect(error.message).toContain("contact_email");
    }
  });

  test("Testing lowercase conversion -- pass", async () => {

    const validVenue = new Venue({
      name: "VENUE A",
      address: "123 Main St",
      city: "LOS ANGELES",
      state: "CA",
      contact_email: "venue@gmail.com",
    });

    await validVenue.validate();

    expect(validVenue.name).toBe("venue a");
    expect(validVenue.city).toBe("los angeles");
    expect(validVenue.state).toBe("ca");
  });

});
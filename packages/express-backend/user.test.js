import User from "./user.js";

describe("User Model Test Suite", () => {

  test("Testing successful musician account creation -- pass", async () => {

    const validUser = new User({
      email: "leadguitarist@gigglymusic.com",
      password_hash: "hashedpassword123",
      display_name: "Midnight Echo",
      role: "musician",
    });

    await expect(validUser.validate()).resolves.not.toThrow();
  });

  test("Testing account creation without email -- fail", async () => {

    const invalidUser = new User({
      password_hash: "hashedpassword123",
      display_name: "The Sunset Riders",
      role: "band",
    });

    try {
      await invalidUser.validate();
    } catch (error) {
      expect(error.message).toContain("email");
    }
  });

  test("Testing invalid account role assignment -- fail", async () => {

    const invalidUser = new User({
      email: "venueowner@gigglymusic.com",
      password_hash: "hashedpassword123",
      display_name: "Downtown Live",
      role: "admin",
    });

    try {
      await invalidUser.validate();
    } catch (error) {
      expect(error.message).toContain("role");
    }
  });

  test("Testing account creation without password hash -- fail", async () => {

    const invalidUser = new User({
      email: "drummer@gigglymusic.com",
      display_name: "Late Night Rhythm",
      role: "musician",
    });

    try {
      await invalidUser.validate();
    } catch (error) {
      expect(error.message).toContain("password_hash");
    }
  });

  test("Testing account creation without display name -- fail", async () => {

    const invalidUser = new User({
      email: "bandmanager@gigglymusic.com",
      password_hash: "hashedpassword123",
      role: "band",
    });

    try {
      await invalidUser.validate();
    } catch (error) {
      expect(error.message).toContain("display_name");
    }
  });

  test("Testing display name exceeding maximum length -- fail", async () => {

    const invalidUser = new User({
      email: "venue@gigglymusic.com",
      password_hash: "hashedpassword123",
      display_name: "a".repeat(81),
      role: "venue",
    });

    try {
      await invalidUser.validate();
    } catch (error) {
      expect(error.message).toContain("display_name");
    }
  });

  test("Testing invalid email length during signup -- fail", async () => {

    const invalidUser = new User({
      email: "a@b",
      password_hash: "hashedpassword123",
      display_name: "SoundWave Collective",
      role: "band",
    });

    try {
      await invalidUser.validate();
    } catch (error) {
      expect(error.message).toContain("email");
    }
  });

  test("Testing automatic lowercase email formatting -- pass", async () => {

    const validUser = new User({
      email: "VENUEOWNER@GIGGLYMUSIC.COM",
      password_hash: "hashedpassword123",
      display_name: "Golden Stage",
      role: "venue",
    });

    await validUser.validate();

    expect(validUser.email).toBe("venueowner@gigglymusic.com");
  });

});
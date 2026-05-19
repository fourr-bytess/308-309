import Notification from "./notifications.js";

describe("Notification Model Test Suite", () => {

  test("Testing successful welcome notification creation -- pass", async () => {

    const validNotification = new Notification({
      userId: "musician_123",
      type: "welcome",
      title: "Welcome to Giggly!",
      body: "Your musician profile has officially been created.",
    });

    await expect(validNotification.validate()).resolves.not.toThrow();
  });

  test("Testing notification without associated user -- fail", async () => {

    const invalidNotification = new Notification({
      type: "gig-booked",
      title: "Your band has been booked!",
    });

    try {
      await invalidNotification.validate();
    } catch (error) {
      expect(error.message).toContain("userId");
    }
  });

  test("Testing notification missing type/category -- fail", async () => {

    const invalidNotification = new Notification({
      userId: "venue_456",
      title: "New booking request received",
    });

    try {
      await invalidNotification.validate();
    } catch (error) {
      expect(error.message).toContain("type");
    }
  });

  test("Testing notification missing title -- fail", async () => {

    const invalidNotification = new Notification({
      userId: "band_789",
      type: "message",
    });

    try {
      await invalidNotification.validate();
    } catch (error) {
      expect(error.message).toContain("title");
    }
  });

  test("Testing unread notification default value -- pass", async () => {

    const validNotification = new Notification({
      userId: "venue_456",
      type: "booking-request",
      title: "New performance inquiry",
    });

    await validNotification.validate();

    expect(validNotification.isRead).toBe(false);
  });

});
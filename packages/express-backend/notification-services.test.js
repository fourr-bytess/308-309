import { jest } from "@jest/globals";
import Notification from "./notifications.js";
import notificationServices from "./notification-services.js";

describe("Notification Services Test Suite", () => {

  beforeEach(() => {

    jest.clearAllMocks();

    Notification.find = jest.fn();
    Notification.countDocuments = jest.fn();
    Notification.findByIdAndUpdate = jest.fn();
    Notification.updateMany = jest.fn();
    Notification.findByIdAndDelete = jest.fn();

    jest.spyOn(Notification.prototype, "save").mockReturnThis();
  });

  test("Testing createNotification -- success", async () => {

    const notificationData = {
      userId: "123",
      type: "welcome",
      title: "Welcome",
    };

    Notification.prototype.save = jest
      .fn()
      .mockResolvedValue(notificationData);

    const result = await notificationServices.createNotification(
      notificationData
    );

    expect(result).toEqual(notificationData);

    expect(Notification.prototype.save).toHaveBeenCalled();
  });

  test("Testing getNotificationsByUser -- success", async () => {

    const mockSort = jest.fn().mockResolvedValue([]);

    Notification.find.mockReturnValue({
      sort: mockSort,
    });

    await notificationServices.getNotificationsByUser("123");

    expect(Notification.find).toHaveBeenCalledWith({
      userId: "123",
    });
  });

  test("Testing getUnreadCount -- success", async () => {

    Notification.countDocuments.mockResolvedValue(5);

    const result = await notificationServices.getUnreadCount("123");

    expect(result).toBe(5);

    expect(Notification.countDocuments).toHaveBeenCalledWith({
      userId: "123",
      isRead: false,
    });
  });

  test("Testing markNotificationAsRead -- success", async () => {

    Notification.findByIdAndUpdate.mockResolvedValue({
      isRead: true,
    });

    await notificationServices.markNotificationAsRead("notif1");

    expect(Notification.findByIdAndUpdate).toHaveBeenCalledWith(
      "notif1",
      { isRead: true },
      { new: true }
    );
  });

  test("Testing markAllNotificationsAsRead -- success", async () => {

    Notification.updateMany.mockResolvedValue({
      modifiedCount: 3,
    });

    await notificationServices.markAllNotificationsAsRead("123");

    expect(Notification.updateMany).toHaveBeenCalledWith(
      { userId: "123" },
      { isRead: true }
    );
  });

  test("Testing deleteNotification -- success", async () => {

    Notification.findByIdAndDelete.mockResolvedValue({
      success: true,
    });

    await notificationServices.deleteNotification("notif1");

    expect(Notification.findByIdAndDelete).toHaveBeenCalledWith(
      "notif1"
    );
  });

});
import mongoose from "mongoose";
import Notification from "./notifications.js";

async function createNotification({
  userId,
  type,
  title,
  body,
  relatedId = null,
}) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Valid userId is required");
  }
  if (!type || !title || !body) {
    throw new Error("type, title, and body are required");
  }

  return Notification.create({
    userId,
    type,
    title,
    body,
    relatedId,
  });
}

async function getNotificationsByUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Valid userId is required");
  }

  return Notification.find({ userId }).sort({ createdAt: -1 });
}

async function getUnreadCount(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Valid userId is required");
  }

  return Notification.countDocuments({ userId, isRead: false });
}

async function markNotificationAsRead(notificationId) {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new Error("Invalid notification id");
  }

  const updated = await Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true },
  );

  if (!updated) throw new Error("Notification not found");
  return updated;
}

async function markAllNotificationsAsRead(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Valid userId is required");
  }

  await Notification.updateMany({ userId, isRead: false }, { isRead: true });

  return { success: true };
}

async function deleteNotification(notificationId) {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new Error("Invalid notification id");
  }

  const deleted = await Notification.findByIdAndDelete(notificationId);
  if (!deleted) throw new Error("Notification not found");
  return deleted;
}

export default {
  createNotification,
  getNotificationsByUser,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};

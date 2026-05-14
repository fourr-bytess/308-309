import Notification from "./notifications.js";

function createNotification(notification) {
  const newNotification = new Notification(notification);
  return newNotification.save();
}

function getNotificationsByUser(userId) {
  return Notification.find({ userId }).sort({ createdAt: -1 });
}

function getUnreadCount(userId) {
  return Notification.countDocuments({ userId, isRead: false });
}

function markNotificationAsRead(notificationId) {
  return Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true }
  );
}

function markAllNotificationsAsRead(userId) {
  return Notification.updateMany({ userId }, { isRead: true });
}

function deleteNotification(notificationId) {
  return Notification.findByIdAndDelete(notificationId);
}

export default {
  createNotification,
  getNotificationsByUser,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};

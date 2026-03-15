import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, paginated, noContent, message } from '../utils/response.js';

// Normalize a notification doc for the client.
// The model stores `isRead`; the client Redux slice reads `n.read`.
const normalize = (doc) => {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  return { ...obj, read: obj.isRead };
};

// GET /api/users/notifications
export const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;
  const filter = { recipient: req.user._id };

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  // With .lean(), docs are already plain objects — just add `read` alias
  const normalized = notifications.map((n) => ({ ...n, read: n.isRead }));
  return paginated(res, normalized, { page, limit, total });
});

// PUT /api/users/notifications/:id/read
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) {
    throw new AppError(ERR.NOT_FOUND, 'Notification not found');
  }

  notification.isRead = true;
  await notification.save();

  return ok(res, { notification: normalize(notification) });
});

// PUT /api/users/notifications/read-all
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true },
  );

  return message(res, 'All notifications marked as read');
});

// GET /api/users/notifications/unread-count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  return ok(res, { count });
});

// DELETE /api/users/notifications/:id — delete a single notification
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) {
    throw new AppError(ERR.NOT_FOUND, 'Notification not found');
  }

  return noContent(res);
});

// DELETE /api/users/notifications — clear all notifications for the user
export const clearAllNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({ recipient: req.user._id });
  return ok(res, { message: 'All notifications cleared', deleted: result.deletedCount });
});

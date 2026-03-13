import Notification from '../models/Notification.js';

// Normalize a Mongoose notification doc for the client.
// The model stores `isRead`; the client Redux slice reads `n.read`.
const normalize = (doc) => {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  return { ...obj, read: obj.isRead };
};

// GET /api/users/notifications
export const getNotifications = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    const filter = { recipient: req.user._id };

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate('sender', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
    ]);

    res.json({
      data: notifications.map(normalize),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/users/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ notification: normalize(notification) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/users/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true },
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/users/notifications/unread-count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/users/notifications/:id — delete a single notification
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/users/notifications — clear all notifications for the user
export const clearAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user._id });
    res.json({ message: 'All notifications cleared', deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

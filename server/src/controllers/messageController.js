import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';
import { uploadToCloudinary } from '../middleware/upload.js';

// ─── Allowed reaction emojis ──────────────────────────────────────────────────

const ALLOWED_REACTIONS = ['❤️', '😂', '👍', '👎', '😮', '😢', '🔥'];

// ─── Conversations ────────────────────────────────────────────────────────────

export const createConversation = asyncHandler(async (req, res) => {
  const { recipientId } = req.body;
  if (!recipientId) throw AppError.badRequest('recipientId is required');
  if (recipientId === req.user._id.toString()) {
    throw AppError.badRequest('Cannot start a conversation with yourself');
  }

  // Verify recipient exists
  const recipient = await User.findById(recipientId).select('name avatar');
  if (!recipient) throw AppError.notFound('User not found');

  // Check for existing conversation between these two users
  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, recipientId], $size: 2 },
  }).populate('participants', 'name avatar isLiveSharing');

  if (conversation) {
    return ok(res, conversation);
  }

  // Create new conversation
  conversation = await Conversation.create({
    participants: [req.user._id, recipientId],
  });

  conversation = await conversation.populate('participants', 'name avatar isLiveSharing');
  return created(res, conversation);
});

export const getConversations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;
  const filter = { participants: req.user._id };

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .populate('participants', 'name avatar isLiveSharing')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  return paginated(res, conversations, { page, limit, total });
});

// ─── Messages ─────────────────────────────────────────────────────────────────

export const getMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  const { page, limit, skip } = req.pagination;
  const filter = { conversation: req.params.conversationId };

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .populate('sender', 'name avatar')
      .populate('reactions.user', 'name avatar')
      .sort({ createdAt: -1 })  // newest first for skip/limit
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments(filter),
  ]);

  return paginated(res, messages.reverse(), { page, limit, total }); // return oldest-first for chat display
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { text, locationPin } = req.body;
  let conversation = await Conversation.findById(req.params.conversationId);

  if (!conversation) {
    // Create new conversation if sending to a user
    const { recipientId } = req.body;
    if (!recipientId) throw AppError.badRequest('Conversation or recipient required');

    conversation = await Conversation.create({
      participants: [req.user._id, recipientId],
    });
  }

  if (!conversation.participants.includes(req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  // Upload images in parallel if present
  let images = [];
  if (req.files && req.files.length > 0) {
    const uploads = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer, 'geoconnect/messages'))
    );
    images = uploads.map((r) => r.secure_url);
  }

  // Must have either text or images
  const hasText = text && text.trim().length > 0;
  const hasImages = images.length > 0;
  const hasLocation = locationPin && locationPin.lat && locationPin.lng;
  if (!hasText && !hasImages && !hasLocation) {
    throw AppError.badRequest('Message must contain text, images, or a location');
  }

  const msg = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    text: hasText ? text : '',
    images,
    locationPin,
    readBy: [req.user._id],
  });

  // Update lastMessage preview
  let previewText = hasText ? text : '';
  if (!previewText && hasImages) previewText = `📷 ${images.length > 1 ? `${images.length} photos` : 'Photo'}`;
  if (!previewText && hasLocation) previewText = '📍 Shared a location';

  conversation.lastMessage = {
    text: previewText,
    sender: req.user._id,
    createdAt: new Date(),
  };
  await conversation.save();

  const populated = await msg.populate('sender', 'name avatar');
  return created(res, populated);
});

// ─── Edit message ─────────────────────────────────────────────────────────────

export const editMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const msg = await Message.findById(req.params.messageId);
  if (!msg) throw AppError.notFound('Message not found');

  // Only sender can edit
  if (msg.sender.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  // Verify participant
  const conversation = await Conversation.findById(msg.conversation);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  msg.text = text;
  msg.isEdited = true;
  await msg.save();

  const populated = await msg.populate([
    { path: 'sender', select: 'name avatar' },
    { path: 'reactions.user', select: 'name avatar' },
  ]);

  return ok(res, populated);
});

// ─── Reactions ────────────────────────────────────────────────────────────────

export const addReaction = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  if (!ALLOWED_REACTIONS.includes(emoji)) {
    throw AppError.badRequest(`Invalid reaction. Allowed: ${ALLOWED_REACTIONS.join(' ')}`);
  }

  const msg = await Message.findById(req.params.messageId);
  if (!msg) throw AppError.notFound('Message not found');

  // Verify participant
  const conversation = await Conversation.findById(msg.conversation);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  // Remove existing reaction from same user (replace with new one)
  msg.reactions = msg.reactions.filter(
    (r) => r.user.toString() !== req.user._id.toString()
  );

  msg.reactions.push({ user: req.user._id, emoji });
  await msg.save();

  const populated = await msg.populate([
    { path: 'sender', select: 'name avatar' },
    { path: 'reactions.user', select: 'name avatar' },
  ]);

  return ok(res, populated);
});

export const removeReaction = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.messageId);
  if (!msg) throw AppError.notFound('Message not found');

  // Verify participant
  const conversation = await Conversation.findById(msg.conversation);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  msg.reactions = msg.reactions.filter(
    (r) => r.user.toString() !== req.user._id.toString()
  );
  await msg.save();

  const populated = await msg.populate([
    { path: 'sender', select: 'name avatar' },
    { path: 'reactions.user', select: 'name avatar' },
  ]);

  return ok(res, populated);
});

// ─── Unread count ─────────────────────────────────────────────────────────────

export const getUnreadCount = asyncHandler(async (req, res) => {
  // Single aggregation: count unread messages across all user's conversations
  const result = await Message.aggregate([
    {
      $lookup: {
        from: 'conversations',
        localField: 'conversation',
        foreignField: '_id',
        as: 'conv',
      },
    },
    { $unwind: '$conv' },
    {
      $match: {
        'conv.participants': req.user._id,
        sender: { $ne: req.user._id },
        readBy: { $nin: [req.user._id] },
      },
    },
    { $count: 'unreadCount' },
  ]);

  return ok(res, { unreadCount: result[0]?.unreadCount ?? 0 });
});

// ─── Delete message ───────────────────────────────────────────────────────────

export const deleteMessage = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.messageId);
  if (!msg) throw AppError.notFound('Message not found');
  if (msg.sender.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  // Verify user is a participant of the conversation
  const conversation = await Conversation.findById(msg.conversation);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  const conversationId = msg.conversation;
  await msg.deleteOne();

  // Update lastMessage if this was the latest message
  const latestMessage = await Message.findOne({ conversation: conversationId })
    .sort({ createdAt: -1 });

  if (latestMessage) {
    conversation.lastMessage = {
      text: latestMessage.text,
      sender: latestMessage.sender,
      createdAt: latestMessage.createdAt,
    };
  } else {
    conversation.lastMessage = undefined;
  }
  await conversation.save();

  return message(res, 'Message deleted');
});

// ─── Mark read ────────────────────────────────────────────────────────────────

export const markConversationRead = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  // Mark all messages in this conversation as read by the current user
  await Message.updateMany(
    {
      conversation: req.params.conversationId,
      readBy: { $nin: [req.user._id] },
    },
    { $addToSet: { readBy: req.user._id } },
  );

  return ok(res, { success: true });
});

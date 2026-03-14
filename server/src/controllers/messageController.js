import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';

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
      .limit(limit),
    Conversation.countDocuments(filter),
  ]);

  return paginated(res, conversations, { page, limit, total });
});

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
      .sort({ createdAt: -1 })  // newest first for skip/limit
      .skip(skip)
      .limit(limit),
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

  const msg = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    text,
    locationPin,
    readBy: [req.user._id],
  });

  conversation.lastMessage = {
    text,
    sender: req.user._id,
    createdAt: new Date(),
  };
  await conversation.save();

  const populated = await msg.populate('sender', 'name avatar');
  return created(res, populated);
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  // Count messages across all user's conversations that they haven't read
  const conversations = await Conversation.find({ participants: req.user._id }).select('_id');
  const conversationIds = conversations.map(c => c._id);

  const count = await Message.countDocuments({
    conversation: { $in: conversationIds },
    sender: { $ne: req.user._id },
    readBy: { $nin: [req.user._id] },
  });

  return ok(res, { unreadCount: count });
});

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

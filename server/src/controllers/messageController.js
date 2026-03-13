import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

export const createConversation = async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId) return res.status(400).json({ message: 'recipientId is required' });
    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot start a conversation with yourself' });
    }

    // Verify recipient exists
    const recipient = await User.findById(recipientId).select('name avatar');
    if (!recipient) return res.status(404).json({ message: 'User not found' });

    // Check for existing conversation between these two users
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId], $size: 2 },
    }).populate('participants', 'name avatar isLiveSharing');

    if (conversation) {
      return res.json(conversation);
    }

    // Create new conversation
    conversation = await Conversation.create({
      participants: [req.user._id, recipientId],
    });

    conversation = await conversation.populate('participants', 'name avatar isLiveSharing');
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name avatar isLiveSharing')
      .sort({ updatedAt: -1 });
    
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const messages = await Message.find({ conversation: req.params.conversationId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, locationPin } = req.body;
    let conversation = await Conversation.findById(req.params.conversationId);
    
    if (!conversation) {
      // Create new conversation if sending to a user
      const { recipientId } = req.body;
      if (!recipientId) return res.status(400).json({ message: 'Conversation or recipient required' });
      
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId],
      });
    }
    
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const message = await Message.create({
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
    
    const populated = await message.populate('sender', 'name avatar');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    // Count messages across all user's conversations that they haven't read
    const conversations = await Conversation.find({ participants: req.user._id }).select('_id');
    const conversationIds = conversations.map(c => c._id);

    const count = await Message.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: req.user._id },
      readBy: { $nin: [req.user._id] },
    });

    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Verify user is a participant of the conversation
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const conversationId = message.conversation;
    await message.deleteOne();

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

    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Mark all messages in this conversation as read by the current user
    await Message.updateMany(
      {
        conversation: req.params.conversationId,
        readBy: { $nin: [req.user._id] },
      },
      { $addToSet: { readBy: req.user._id } },
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

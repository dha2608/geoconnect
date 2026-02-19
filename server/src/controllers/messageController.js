import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

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

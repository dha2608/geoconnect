import { Router } from 'express';
import {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
  markConversationRead,
  deleteMessage,
  editMessage,
  addReaction,
  removeReaction,
} from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  validateSendMessage,
  validateConversationId,
  validateCreateConversation,
  validateEditMessage,
  validateMessageReaction,
  validateMessageId,
} from '../validators/index.js';
import { paginate } from '../middleware/pagination.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// Conversations
router.get('/conversations', authenticate, paginate, getConversations);
router.post('/conversations', authenticate, validateCreateConversation, validate, createConversation);
router.get('/unread-count', authenticate, getUnreadCount);

// Messages
router.get('/:conversationId', authenticate, validateConversationId, validate, paginate, getMessages);
router.post('/:conversationId', authenticate, upload.array('images', 4), validateSendMessage, validate, sendMessage);
router.put('/:conversationId/read', authenticate, validateConversationId, validate, markConversationRead);

// Message actions
router.put('/messages/:messageId', authenticate, validateEditMessage, validate, editMessage);
router.post('/messages/:messageId/reactions', authenticate, validateMessageReaction, validate, addReaction);
router.delete('/messages/:messageId/reactions', authenticate, validateMessageId, validate, removeReaction);
router.delete('/:conversationId/messages/:messageId', authenticate, deleteMessage);

export default router;

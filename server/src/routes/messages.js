import { Router } from 'express';
import { createConversation, getConversations, getMessages, sendMessage, getUnreadCount, markConversationRead, deleteMessage } from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { validateSendMessage, validateConversationId } from '../validators/index.js';
import { paginate } from '../middleware/pagination.js';

const router = Router();

router.get('/conversations', authenticate, paginate, getConversations);
router.post('/conversations', authenticate, createConversation);
router.get('/unread-count', authenticate, getUnreadCount);
router.get('/:conversationId', authenticate, validateConversationId, validate, paginate, getMessages);
router.post('/:conversationId', authenticate, validateSendMessage, validate, sendMessage);
router.put('/:conversationId/read', authenticate, validateConversationId, validate, markConversationRead);
router.delete('/:conversationId/messages/:messageId', authenticate, deleteMessage);

export default router;

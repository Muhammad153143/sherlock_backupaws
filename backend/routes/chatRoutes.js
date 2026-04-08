const express = require('express');
const router = express.Router();
const { sendMessage, getChatHistory, getUnreadCounts } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/unread/counts', protect, getUnreadCounts);
router.post('/send', protect, sendMessage);
router.get('/:itemId', protect, getChatHistory);

module.exports = router;

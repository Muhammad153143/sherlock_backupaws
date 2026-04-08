const Chat = require('../models/Chat');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Send a message
// @route   POST /api/v1/chat/send
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        let { itemId, receiverId, message } = req.body;
        const senderId = req.user.id;

        // If receiverId is a placeholder, find an actual admin
        if (receiverId === 'admin_placeholder') {
            const adminUser = await User.findOne({ role: 'admin' });
            if (!adminUser) {
                return res.status(404).json({ message: 'Admin user not found' });
            }
            receiverId = adminUser._id;
        }

        const chatMessage = await Chat.create({
            itemId,
            senderId,
            receiverId,
            message
        });

        res.status(201).json(chatMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get chat history for an item
// @route   GET /api/v1/chat/:itemId
// @access  Private
exports.getChatHistory = async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.user.id;

        // Mark messages as read where current user is the receiver
        await Chat.updateMany(
            { itemId, receiverId: userId, isRead: false },
            { isRead: true }
        );

        const chatHistory = await Chat.find({ itemId })
            .populate('senderId', 'name')
            .populate('receiverId', 'name')
            .sort({ createdAt: 1 });

        res.status(200).json(chatHistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get unread counts for items
// @route   GET /api/v1/chat/unread/counts
// @access  Private
exports.getUnreadCounts = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const counts = await Chat.aggregate([
            { 
                $match: { 
                    receiverId: new mongoose.Types.ObjectId(userId), 
                    isRead: false 
                } 
            },
            { 
                $group: { 
                    _id: "$itemId", 
                    count: { $sum: 1 } 
                } 
            }
        ]);

        res.status(200).json(counts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

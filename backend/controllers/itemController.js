const Item = require('../models/Item');
const Chat = require('../models/Chat');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { findMatches } = require('../utils/matchService');
const { extractTextFromImage } = require('../utils/ocrHelper');

// AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://sherlock-ai-service.onrender.com';
const { isAIAvailable, buildErrorDetails } = require('../utils/aiService');
let aiEmbedErrorLogged = false;

// @desc    Get all verified items (Public) @route   GET /api/items
// @access  Public
exports.getItems = async (req, res) => {
    try {
        console.log('📋 GET /api/v1/items - Fetching public items');
        const items = await Item.find({ status: { $in: ['verified', 'resolved'] } })
            .select('-contactInfo -studentName -rollNumber -studentEmail -idCardProof -verificationAnswers')
            .populate('user', 'name')
            .sort({ date: -1 });
        console.log(`📋 Found ${items.length} public items`);
        res.status(200).json(items);
    } catch (error) {
        console.error('❌ getItems error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all items (Admin)
// @route   GET /api/items/admin
// @access  Private/Admin
exports.getAllItemsAdmin = async (req, res) => {
    try {
        console.log('🔐 GET /api/v1/items/admin - Admin requesting all items');
        console.log('🔐 User:', req.user?.email, 'Role:', req.user?.role);
        const items = await Item.find()
            .populate('user', 'name email')
            .populate('potentialMatches', 'title type color location date')
            .populate('matchedWith', 'title type color location date')
            .sort({ createdAt: -1 });
        console.log(`🔐 Found ${items.length} total items for admin`);
        res.status(200).json(items);
    } catch (error) {
        console.error('❌ getAllItemsAdmin error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user's items
// @route   GET /api/items/myitems
// @access  Private
exports.getMyItems = async (req, res) => {
    try {
        const items = await Item.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
exports.getItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id).populate('user', 'name email');

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Allow owner or admin
        if (item.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// @desc    Create new item
// @route   POST /api/items
// @access  Private
exports.createItem = async (req, res) => {
    try {
        console.log('📝 POST /api/v1/items - Creating new item');
        console.log('📝 User:', req.user?.id);
        console.log('📝 Body:', JSON.stringify(req.body, null, 2));
        console.log('📝 Files:', req.files ? Object.keys(req.files) : 'No files');
        
       let imageUrl = null;
       let idCardUrl = null;

     if (req.files && req.files.image && req.files.image[0]) {
       imageUrl = req.files.image[0].path;   // Cloudinary gives full URL here
     }
     
     if (req.files && req.files.idCardPhoto && req.files.idCardPhoto[0]) {
         idCardUrl = req.files.idCardPhoto[0].path;
     }
     
     // Validate item image and ID card
     if (!imageUrl) {
         return res.status(400).json({ message: 'Item image is required' });
     }
     if (!idCardUrl) {
         return res.status(400).json({ message: 'Student ID card photo is required' });
     }

        const itemData = {
            ...req.body,
            user: req.user.id
        };

        const parsedDate = new Date(itemData.date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date' });
        }
        if (parsedDate > new Date()) {
            return res.status(400).json({ message: 'Date cannot be in the future' });
        }
        itemData.date = parsedDate;

        if (req.dupMeta && req.dupMeta.normalizedTitle) {
            itemData.normalizedTitle = req.dupMeta.normalizedTitle;
        }
        if (req.dupMeta && req.dupMeta.imageHash) {
            itemData.imageHash = req.dupMeta.imageHash;
        }

        if (imageUrl) {
            itemData.imageUrl = imageUrl;
            
            // AI Integration: Generate Image Embedding
            try {
                const form = new FormData();
                form.append('image', fs.createReadStream(req.files.image[0].path));
                
                const aiResponse = await axios.post(`${AI_SERVICE_URL}/embed`, form, {
                    headers: {
                        ...form.getHeaders()
                    },
                    timeout: 8000
                });
                
                if (aiResponse.data && aiResponse.data.embedding) {
                    itemData.imageEmbedding = aiResponse.data.embedding;
                    console.log('AI Embedding generated successfully');
                }
            } catch (aiError) {
                const details = buildErrorDetails(aiError);
                if (!aiEmbedErrorLogged) {
                    aiEmbedErrorLogged = true;
                    console.error('AI Service Error:', details);
                }
                // We continue without embedding if AI service fails
            }
            
            // OCR FEATURE START: Extract text from item image
            const ocrResult = await extractTextFromImage(req.files.image[0].path);
            itemData.ocrText = ocrResult.ocrText;
            itemData.ocrWords = ocrResult.ocrWords;
            itemData.hasTextInImage = ocrResult.hasTextInImage;
            // Also check if frontend sent OCR data, use that if available
            if (req.body.ocrText) {
                itemData.ocrText = req.body.ocrText;
            }
            if (req.body.ocrWords) {
                try {
                    itemData.ocrWords = typeof req.body.ocrWords === 'string' ? JSON.parse(req.body.ocrWords) : req.body.ocrWords;
                } catch (e) {}
            }
            if (req.body.hasTextInImage !== undefined) {
                itemData.hasTextInImage = req.body.hasTextInImage === 'true' || req.body.hasTextInImage === true;
            }
            // OCR FEATURE END
        }
        
        // ID CARD PROOF FEATURE START
        itemData.idCardProof = {
            imageUrl: idCardUrl,
            uploadedAt: new Date()
        };
        itemData.reporterProofStatus = 'pending';
        // ID CARD PROOF FEATURE END

        let item;
        let usedSession = false;
        try {
            const session = await Item.startSession();
            usedSession = true;
            await session.withTransaction(async () => {
                const dStart = new Date(itemData.date);
                dStart.setDate(dStart.getDate() - 1);
                dStart.setHours(0, 0, 0, 0);
                const dEnd = new Date(itemData.date);
                dEnd.setDate(dEnd.getDate() + 1);
                dEnd.setHours(23, 59, 59, 999);
                const base = {
                    type: itemData.type,
                    date: { $gte: dStart, $lte: dEnd },
                    $expr: { $eq: [ { $toLower: '$location' }, String(itemData.location).toLowerCase() ] }
                };
                let query = base;
                if (itemData.normalizedTitle) {
                    query = { ...base, normalizedTitle: itemData.normalizedTitle };
                } else {
                    query = { 
                        ...base, 
                        $expr: { 
                            $and: [
                                base.$expr, 
                                { $eq: [ { $toLower: '$title' }, String(itemData.title).toLowerCase() ] }
                            ] 
                        }
                    };
                }
                const dup = await Item.findOne(query).session(session);
                if (dup) {
                    throw { code: 'DUP', id: dup._id };
                }
                const created = await Item.create([itemData], { session });
                item = created[0];
            });
            session.endSession();
        } catch (e) {
            if (usedSession && e && e.code === 'DUP') {
                return res.status(409).json({ success: false, message: 'Duplicate report detected', duplicateReportId: e.id });
            }
            if (!usedSession && e && e.code === 'DUP') {
                return res.status(409).json({ success: false, message: 'Duplicate report detected', duplicateReportId: e.id });
            }
            if (!item) {
                item = await Item.create(itemData);
            }
        }

        // Run automatic matching
        const matches = await findMatches(item);
        
        if (matches.length > 0) {
            item.potentialMatches = matches.map(m => m._id);
            await item.save();

            // Also update the matched items to include this new item as potential match
            for (const match of matches) {
                match.potentialMatches.push(item._id);
                await match.save();
            }
        }

        console.log('✅ Item created successfully:', item._id);
        res.status(201).json(item);
    } catch (error) {
        console.error('❌ createItem error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check for duplicate items
// @route   POST /api/items/check-duplicate
// @access  Private
// REMOVED DUPLICATE FUNCTION checkDuplicate

// @desc    Check for duplicate items
// @route   POST /api/items/check-duplicate
// @access  Private
exports.checkDuplicate = async (req, res) => {
    const { type, category, date, location, title } = req.body;

    try {
        // Only check for duplicates within the same type (e.g., preventing multiple "Lost" reports for same item)
        // Or if user is reporting "Lost", check if "Found" exists? 
        // Requirement says: "Detect duplicate LOST reports... Warn users BEFORE submission to avoid redundancy."
        // This implies checking if *someone else* already reported this *same* lost item (maybe a friend?) 
        // OR checking if the item has already been found? 
        // "Duplicate report detection" usually means preventing double posting.
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const query = {
            type,
            category,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            // Simple case-insensitive partial match for location
            location: { $regex: location, $options: 'i' }
        };

        const duplicates = await Item.find(query);

        // Filter by title similarity if needed, or just return these candidates
        const similarItems = duplicates.filter(item => {
             // Simple keyword match
             if (!title || !item.title) return true;
             const t1 = title.toLowerCase();
             const t2 = item.title.toLowerCase();
             return t1.includes(t2) || t2.includes(t1);
        });

        if (similarItems.length > 0) {
             res.status(200).json({ 
                 found: true, 
                 message: '⚠️ Potential duplicate reports found! Please check if your item is already listed.',
                 items: similarItems 
             });
        } else {
            res.status(200).json({ found: false, message: 'No duplicates found.' });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update item status
// @route   PUT /api/items/:id
// @access  Private/Admin
exports.updateItemStatus = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const { status, matchedWithId } = req.body;

        if (status) {
            item.status = status;
        }

        // If verifying a match
        if (matchedWithId) {
            item.matchedWith = matchedWithId;
            item.status = 'resolved'; // Or 'matched'
            
            // Update the other item too
            const matchedItem = await Item.findById(matchedWithId);
            if (matchedItem) {
                matchedItem.matchedWith = item._id;
                matchedItem.status = 'resolved';
                await matchedItem.save();

                // Create Automated Chat Message
                const lostItem = item.type === 'lost' ? item : matchedItem;
                const foundItem = item.type === 'found' ? item : matchedItem;

                const automatedMessage = `🎉 Good News! Your Lost Item Found – SherLock\n\nFound Item: ${foundItem.title}\nLocation Found: ${foundItem.location}\nDate Found: ${new Date(foundItem.date).toLocaleDateString()}\nCategory: ${foundItem.category}\nMatch ID: #${foundItem._id.toString().slice(-6).toUpperCase()}`;

                try {
                    await Chat.create({
                        itemId: lostItem._id,
                        senderId: req.user.id, // Admin
                        receiverId: lostItem.user, // The user who lost the item
                        message: automatedMessage
                    });
                    console.log('✅ Automated match message sent to chat');
                } catch (chatErr) {
                    console.error('❌ Failed to send automated chat message:', chatErr.message);
                }
            }
        } 

        await item.save();

        res.status(200).json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
exports.deleteItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Make sure user owns item or is admin
        if (item.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Item.deleteOne({ _id: req.params.id });
        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get item ID card proof (Admin only)
// @route   GET /api/items/:id/proof
// @access  Private/Admin
exports.getItemProof = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        if (!item.idCardProof || !item.idCardProof.imageUrl) {
            return res.status(200).json({ message: 'ID proof not uploaded for this report' });
        }
        
        res.status(200).json({
            idCardProof: item.idCardProof,
            reporterProofStatus: item.reporterProofStatus
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update item ID proof status (Admin only)
// @route   PATCH /api/items/:id/proof-status
// @access  Private/Admin
exports.updateProofStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['pending', 'verified', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        item.reporterProofStatus = status;
        await item.save();
        
        res.status(200).json({ message: 'Proof status updated', reporterProofStatus: status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const express = require('express');
const router = express.Router();
const { 
    getItems, 
    getAllItemsAdmin,
    getMyItems, 
    getItem,
    createItem, 
    updateItemStatus, 
    deleteItem,
    checkDuplicate,
    getItemProof,
    updateProofStatus
} = require('../controllers/itemController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const duplicateMiddleware = require('../middleware/duplicateMiddleware');

router.get('/', getItems);
router.get('/admin', protect, admin, getAllItemsAdmin);
router.get('/myitems', protect, getMyItems);
router.get('/:id', protect, getItem);
router.post('/check-duplicate', protect, checkDuplicate);
router.post('/', protect, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'idCardPhoto', maxCount: 1 }]), duplicateMiddleware, createItem);
router.put('/:id', protect, admin, updateItemStatus);
router.delete('/:id', protect, deleteItem);
router.get('/:id/proof', protect, admin, getItemProof);
router.patch('/:id/proof-status', protect, admin, updateProofStatus);

module.exports = router;

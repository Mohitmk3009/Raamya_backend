const express = require('express');
const router = express.Router();
const { getCart, addItemToCart, removeItemFromCart } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// GET the user's cart
router.get('/', protect, getCart);

// POST to add/update an item
router.post('/', protect, addItemToCart);

// DELETE an item from the cart
router.delete('/:productId/:size', protect, removeItemFromCart);

module.exports = router;
const express = require('express');
const router = express.Router();
const { 
    addOrderItems, 
    getMyOrders, 
    getOrderById, 
    updateOrderToPaidByAdmin,
    updateOrderToDelivered, 
    getAllOrders ,
    cancelOrder
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// --- User-specific routes ---
router.post('/', protect, addOrderItems);
router.get('/myorders', protect, getMyOrders);
router.route('/:id/cancel').put(protect, cancelOrder);
// --- Admin-specific routes ---
// IMPORTANT: The more specific '/all' route must come BEFORE the dynamic '/:id' route.
router.get('/all', protect, admin, getAllOrders); 
router.put('/:id/pay', protect, admin, updateOrderToPaidByAdmin);
router.put('/:id/deliver', protect, admin, updateOrderToDelivered);
// --- This dynamic route must be last ---
router.get('/:id', protect, getOrderById);

module.exports = router;


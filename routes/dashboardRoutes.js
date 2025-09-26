const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getSalesGraphData,
    getBestSellers,
    getRecentOrders
} = require('../controllers/dashboardController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes are protected and for admin access only
router.route('/stats').get(protect, admin, getDashboardStats);
router.route('/sales-graph').get(protect, admin, getSalesGraphData);
router.route('/best-sellers').get(protect, admin, getBestSellers);
router.route('/recent-orders').get(protect, admin, getRecentOrders);

module.exports = router;

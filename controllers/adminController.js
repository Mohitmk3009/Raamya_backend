const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments({});
        const totalUsers = await User.countDocuments({});
        const totalProducts = await Product.countDocuments({});
        
        const salesData = await Order.aggregate([
            { $match: { isPaid: true } },
            { $group: { _id: null, totalSales: { $sum: '$totalPrice' } } }
        ]);
        
        const totalSales = salesData.length > 0 ? salesData[0].totalSales : 0;

        res.json({
            totalUsers,
            totalOrders,
            totalProducts,
            totalSales
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
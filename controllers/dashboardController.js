const Order = require('../models/Order');
const Product = require('../models/Product');
const ExchangeRequest = require('../models/ExchangeRequest'); // Import the ExchangeRequest model

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private/Admin
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalOrders = await Order.countDocuments({});
        const activeOrders = await Order.countDocuments({ status: { $in: ['Processing', 'Shipped'] } });
        const completedOrders = await Order.countDocuments({ status: 'Delivered' });
        
        // --- CORRECTED LOGIC ---
        // This now correctly counts the documents in the ExchangeRequest collection
        const exchangedOrders = await ExchangeRequest.countDocuments({});

        const totalSales = await Order.aggregate([
            { $match: { isPaid: true } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);

        res.json({
            totalOrders: { count: totalOrders, value: totalSales.length > 0 ? totalSales[0].total : 0 },
            activeOrders: { count: activeOrders },
            completedOrders: { count: completedOrders },
            exchangedOrders: { count: exchangedOrders }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get sales data for graph
 * @route   GET /api/dashboard/sales-graph
 * @access  Private/Admin
 */
exports.getSalesGraphData = async (req, res) => {
    const { period = 'monthly' } = req.query; // Default to monthly
    let groupByFormat;
    let startDate = new Date();

    switch (period) {
        case 'weekly':
            // Last 7 days
            startDate.setDate(startDate.getDate() - 7);
            groupByFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
            break;
        case 'yearly':
            // Last 12 months
            startDate.setMonth(startDate.getMonth() - 12);
            groupByFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
            break;
        case 'monthly':
        default:
            // Last 6 months
            startDate.setMonth(startDate.getMonth() - 6);
            groupByFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
            break;
    }

    try {
        const salesData = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, isPaid: true } },
            {
                $group: {
                    _id: groupByFormat,
                    totalSales: { $sum: '$totalPrice' },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const formattedData = salesData.map(item => ({
            name: item._id,
            sales: item.totalSales,
        }));
        
        res.json(formattedData);

    } catch (error) {
        console.error(`Error fetching ${period} sales data:`, error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get best selling products
 * @route   GET /api/dashboard/best-sellers
 * @access  Private/Admin
 */
exports.getBestSellers = async (req, res) => {
    try {
        const bestSellers = await Order.aggregate([
            { $unwind: '$orderItems' },
            {
                $group: {
                    _id: '$orderItems.product',
                    name: { $first: '$orderItems.name' },
                    totalSold: { $sum: '$orderItems.qty' },
                    totalRevenue: { $sum: { $multiply: ['$orderItems.qty', '$orderItems.price'] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 3 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    image: { $arrayElemAt: ['$productDetails.images', 0] },
                    sales: '$totalSold',
                    price: '$totalRevenue'
                }
            }
        ]);
        
        const formattedBestSellers = bestSellers.map(item => ({
            ...item,
            // FIX: Safely access the first image, providing a fallback if the product was deleted
            // or has no images. This prevents the 'Cannot read properties of undefined' error.
            img: (item.image && item.image[0]) ? item.image[0] : 'https://placehold.co/40x40/1a1a1a/efaf00?text=P',
            price: `₹${item.price.toLocaleString()}`
        }));

        res.json(formattedBestSellers);
    } catch (error) {
        console.error('Error fetching best sellers:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


/**
 * @desc    Get recent orders
 * @route   GET /api/dashboard/recent-orders
 * @access  Private/Admin
 */
exports.getRecentOrders = async (req, res) => {
    try {
        // 1. Fetch the 6 most recent orders
        const recentOrders = await Order.find({})
            .populate('user', 'name')
            .sort({ createdAt: -1 })
            .limit(6);
            
        // 2. For each order, find and attach its corresponding exchange request
        const ordersWithFullDetails = await Promise.all(
            recentOrders.map(async (order) => {
                const exchangeRequest = await ExchangeRequest.findOne({ order: order._id });
                const orderObject = order.toObject(); // Convert from Mongoose doc to plain object
                orderObject.exchangeRequest = exchangeRequest; // Attach the exchange request (or null)
                return orderObject;
            })
        );

        // 3. Send the complete, unformatted order objects to the frontend
        res.json(ordersWithFullDetails);

    } catch (error) {
        console.error('Error fetching recent orders:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

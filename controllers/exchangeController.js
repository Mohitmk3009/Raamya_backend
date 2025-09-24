const ExchangeRequest = require('../models/ExchangeRequest');
const Order = require('../models/Order');

// @desc    Create a new exchange request
// @route   POST /api/exchanges
// @access  Public
exports.createExchangeRequest = async (req, res) => {
    const { orderNumber, email, reason } = req.body;
const imageUrl = req.file ? req.file.path : null;
    if (!orderNumber || !email || !reason) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const order = await Order.findById(orderNumber.replace(/#\s*/, '')).populate('user');

        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        if (order.user.email.toLowerCase() !== email.toLowerCase()) {
            return res.status(403).json({ message: 'The email provided does not match the order details.' });
        }
        
        // --- ⬇️ NEW: Check for an existing exchange request ⬇️ ---
        const existingRequest = await ExchangeRequest.findOne({ order: order._id });
        if (existingRequest) {
            return res.status(400).json({ 
                message: `An exchange request for order #${order._id} is already in process. Status: ${existingRequest.status}` 
            });
        }
        // --- ⬆️ END OF NEW CHECK ⬆️ ---

        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        if (!order.deliveredAt || (new Date() - new Date(order.deliveredAt)) > threeDaysInMs) {
             return res.status(400).json({ message: 'This order is outside the 3-day exchange window.' });
        }
        
        const newRequest = new ExchangeRequest({
            orderNumber: order._id,
            email,
            reason,
            imageUrl,
            order: order._id,
            user: order.user._id,
        });

        await newRequest.save();

        res.status(201).json({ message: 'Exchange request submitted successfully. Our team will contact you shortly.' });

    } catch (error) {
        if (error.kind === 'ObjectId') {
             return res.status(400).json({ message: 'Invalid Order Number format.' });
        }
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// @desc    Update an exchange request status (Admin)
// @route   PUT /api/exchanges/:id
// @access  Private/Admin
exports.updateExchangeRequestStatus = async (req, res) => {
    const { status } = req.body;

    if (!['Approved', 'Rejected', 'Completed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status.' });
    }

    try {
        const request = await ExchangeRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Exchange request not found.' });
        }

        request.status = status;
        const updatedRequest = await request.save();

        res.json(updatedRequest);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};
const ExchangeRequest = require('../models/ExchangeRequest');
const Order = require('../models/Order');
const { sendExchangeRequestEmail, sendExchangeStatusUpdateEmail } = require('../utils/emailService');
// @desc    Create a new exchange request
// @route   POST /api/exchanges
// @access  Public
exports.createExchangeRequest = async (req, res) => {
    const { orderNumber, email, reason } = req.body;
    const imageUrls = req.files ? req.files.map(file => file.path) : [];
    if (!orderNumber || !email || !reason) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    if (imageUrls.length === 0) {
        return res.status(400).json({ message: 'At least one image is required for an exchange request.' });
    }
    try {
        const cleanOrderNumber = orderNumber.replace(/#\s*/, '');
        const order = await Order.findById(cleanOrderNumber).populate('user');

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
            orderNumber: order._id.toString(),   // ✅ store as string for display/search
            email,
            reason,
            imageUrls,
            order: order._id,                    // ✅ keep reference for population
            user: order.user._id,
        });


        await newRequest.save();
order.exchangeRequest = newRequest._id;
await order.save();
        await sendExchangeRequestEmail({
            userEmail: order.user.email,
            userName: order.user.name,
            orderNumber: newRequest.orderNumber,
            reason: newRequest.reason,
            imageUrls: newRequest.imageUrls,
        });

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
        // --- ⬇️ 2. Add .populate('user') to get the user's name and email ⬇️ ---
        const request = await ExchangeRequest.findById(req.params.id).populate('user');

        if (!request) {
            return res.status(404).json({ message: 'Exchange request not found.' });
        }

        // Prevent sending email if status is not actually changing
        if (request.status === status) {
            return res.json(request);
        }

        request.status = status;
        const updatedRequest = await request.save();

        // --- ⬇️ 3. Send the status update email to the user ⬇️ ---
        if (updatedRequest.user) { // Ensure user exists before sending
            await sendExchangeStatusUpdateEmail({
                userEmail: updatedRequest.user.email,
                userName: updatedRequest.user.name,
                orderNumber: updatedRequest.orderNumber,
                status: updatedRequest.status,
            });
        }

        res.json(updatedRequest);

    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};
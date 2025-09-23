const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product'); // 👈 ADD THIS LINE
const sendEmail = require('../utils/sendEmail');
const ExchangeRequest = require('../models/ExchangeRequest');
// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.addOrderItems = async (req, res) => {
    // paymentMethod will now be 'UPI' or 'Cash on Delivery'
    const { orderItems, shippingAddress, paymentMethod, shippingPrice, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
        return res.status(400).json({ message: 'No order items' });
    }

    try {
        const order = new Order({
            user: req.user._id,
            orderItems: orderItems.map(item => ({
                ...item,
                product: item.product, // Ensure product ID is correctly mapped
                _id: undefined
            })),
            shippingAddress,
            paymentMethod,
            shippingPrice,
            totalPrice,
            isPaid: false, // Order is not paid initially
        });

        const createdOrder = await order.save();

        try {
            const itemsHtml = createdOrder.orderItems.map(item => `
        <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
            <strong>${item.name}</strong> (Size: ${item.size}) - ${item.qty} x ₹${item.price}
        </div>
    `).join('');

            await sendEmail({
                to: req.user.email,
                subject: `Your RAAMYA Order Confirmation #${createdOrder._id}`,
                html: `
            <h1>Thank you for your order!</h1>
            <p>Order ID: ${createdOrder._id}</p>
            <h3>Items:</h3>
            ${itemsHtml}
            <h3>Total: ₹${createdOrder.totalPrice.toLocaleString()}</h3>
            <h3>Shipping to:</h3>
            <p>${createdOrder.shippingAddress.fullName}<br>${createdOrder.shippingAddress.address}, ${createdOrder.shippingAddress.city}</p>
        `
            });
        } catch (error) {
            console.error('Order confirmation email failed:', error);
        }


        // Clear the user's cart after creating the order
        await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } });

        res.status(201).json(createdOrder);

    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

        // --- 👇 NEW LOGIC TO ADD EXCHANGE STATUS INFO 👇 ---
        const ordersWithExtraInfo = await Promise.all(orders.map(async (order) => {
            const exchangeRequest = await ExchangeRequest.findOne({ order: order._id });
            const orderObject = order.toObject(); // Convert to plain object to modify
            orderObject.hasExchangeRequest = !!exchangeRequest; // Add true/false flag
            return orderObject;
        }));
        // --- ⬆️ END OF NEW LOGIC ⬆️ ---

        res.json(ordersWithExtraInfo);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all orders (for Admin)
// @route   GET /api/orders/all
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
    const ordersPerPage = 10;
    const page = Number(req.query.pageNumber) || 1;
    const { startDate, endDate, status } = req.query; // Get status from query

    const query = {};

    // Date filtering
    if (startDate && endDate) {
        query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // --- 👇 NEW: Status filtering logic 👇 ---
    if (status && status !== 'All') {
        if (status === 'Exchange Requested') {
            // Special case: Find orders that have an associated exchange request
            const exchangeRequests = await ExchangeRequest.find({}).select('order');
            const orderIdsWithExchange = exchangeRequests.map(req => req.order);
            query._id = { $in: orderIdsWithExchange };
        } else {
            // For all other statuses, filter by the status field directly
            query.status = status;
        }
    }
    // --- ⬆️ END OF NEW LOGIC ⬆️ ---

    try {
        const count = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('user', 'name')
            .sort({ createdAt: -1 })
            .limit(ordersPerPage)
            .skip(ordersPerPage * (page - 1));

        const ordersWithExtraInfo = await Promise.all(orders.map(async (order) => {
            const exchangeRequest = await ExchangeRequest.findOne({ order: order._id });
            const orderObject = order.toObject();
            orderObject.hasExchangeRequest = !!exchangeRequest;
            return orderObject;
        }));

        res.json({ orders: ordersWithExtraInfo, page, pages: Math.ceil(count / ordersPerPage) });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Find any exchange request linked to this order
        const exchangeRequest = await ExchangeRequest.findOne({ order: order._id });

        // Convert mongoose doc to plain object to attach the new property
        const orderObject = order.toObject();
        orderObject.exchangeRequest = exchangeRequest; // This will be null if no request exists

        res.json(orderObject);
        
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update order to paid (by admin)
// @route   PUT /api/orders/:id/pay
// @access  Private/Admin
exports.updateOrderToPaidByAdmin = async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        // You can add payment details if you want, e.g., from a form
        // order.paymentResult = { status: 'COMPLETED BY ADMIN' };

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};


// @desc    Update order to delivered (by admin)
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
exports.updateOrderToDelivered = async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        order.status = 'Delivered'; // 👈 ADD THIS LINE

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};

exports.cancelOrder = async (req, res) => {
    const { reason, details } = req.body;

    if (!reason) {
        return res.status(400).json({ message: 'Cancellation reason is required.' });
    }

    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // --- Business Logic: Check if the order can be cancelled ---
        if (order.status === 'Delivered') {
            return res.status(400).json({ message: 'Cannot cancel an order that has already been delivered.' });
        }
        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'This order has already been cancelled.' });
        }

        // --- Critical Step: Restore Stock Inventory ---
        for (const item of order.orderItems) {
            const product = await Product.findById(item.product);
            if (product) {
                product.countInStock += item.qty;
                await product.save();
            }
        }

        // --- Update the Order Status ---
        order.status = 'Cancelled';
        order.cancelledAt = Date.now();
        order.cancellationReason = { reason, details };

        const updatedOrder = await order.save();

        res.json(updatedOrder);

    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};
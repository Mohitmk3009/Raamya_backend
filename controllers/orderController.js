const Order = require('../models/Order');
const Cart = require('../models/Cart');
const sendEmail = require('../utils/sendEmail');
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
    const orders = await Order.find({ user: req.user._id });
    res.json(orders);
};

// @desc    Get all orders (for Admin)
// @route   GET /api/orders/all
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
    const ordersPerPage = 10; // We'll handle 10 per page as requested
    const page = Number(req.query.pageNumber) || 1;

    // Build the query object for date filtering
    const query = {};
    if (req.query.startDate && req.query.endDate) {
        // Use createdAt for accurate filtering
        query.createdAt = {
            $gte: new Date(req.query.startDate), // Greater than or equal to start date
            $lte: new Date(req.query.endDate),   // Less than or equal to end date
        };
    }

    try {
        const count = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('user', 'name') // Get the customer's name from the User model
            .sort({ createdAt: -1 }) // Sort by newest first
            .limit(ordersPerPage)
            .skip(ordersPerPage * (page - 1));

        res.json({ orders, page, pages: Math.ceil(count / ordersPerPage) });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
        'user',
        'name email'
    );

    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ message: 'Order not found' });
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

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};

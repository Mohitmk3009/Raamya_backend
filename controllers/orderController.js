const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product'); // 👈 ADD THIS LINE
// const sendEmail = require('../utils/sendEmail');
const puppeteer = require('puppeteer');

const { getHtmlForEBill } = require('../lib/htmlForEBill');
const ExchangeRequest = require('../models/ExchangeRequest');

const { sendOrderConfirmationEmail } = require('../utils/emailService');
// @desc    Create new order
// @route   POST /api/orders
// @access  Private
// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.addOrderItems = async (req, res) => {
    const { v4: uuidv4 } = await import('uuid');
    const { orderItems, shippingAddress, paymentMethod, shippingPrice, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
        return res.status(400).json({ message: 'No order items' });
    }
    let createdOrder;
    try {
        const itemsWithSku = await Promise.all(orderItems.map(async (item) => {
            // ... (rest of the itemsWithSku logic is unchanged)
            if (!item.product || !item.size) {
                throw new Error(`Item "${item.name}" from your cart is missing critical data.`);
            }

            const product = await Product.findById(item.product);
            if (!product) {
                throw new Error(`A product from your cart with ID ${item.product} could not be found in the database.`);
            }
            const variant = product.variants.find(v => v.size === item.size);
            if (!variant) {
                throw new Error(`The size "${item.size}" for product "${product.name}" is no longer available.`);
            }
            if (!variant.sku) {
                console.log(`\n\n[DEBUG] SKU IS MISSING for Product: '${product.name}', Size: '${item.size}'\n\n`);
            }
            return {
                name: item.name,
                qty: item.qty,
                image: item.image,
                price: item.price,
                size: item.size,
                product: item.product,
                sku: variant.sku,
            };
        }));

        const uniqueId = uuidv4().split('-')[0].toUpperCase(); // Get a short, unique string
        const receiptNumber = `R-${uniqueId}`; // Example: "RC-C8F7E1B"
        // --- END NEW LOGIC ---

        const order = new Order({
            user: req.user._id,
            orderItems: itemsWithSku,
            shippingAddress,
            paymentMethod,
            shippingPrice,
            totalPrice,
            receiptNumber: receiptNumber, // Pass the generated receipt number here
        });
        
        createdOrder = await order.save();
        
       

        try {
            console.log(`Generating PDF bill for order: ${createdOrder._id}`);
            const htmlContent = getHtmlForEBill(createdOrder);
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            const pdfBase64String = await page.pdf({
                format: 'A4',
                printBackground: true,
                encoding: 'base64'
            });
            await browser.close();
            const base64Data = Buffer.from(pdfBase64String).toString('base64');
            console.log("PDF Base64 string generated. First chars:", base64Data.slice(0, 30));

            await sendOrderConfirmationEmail({
                user: req.user,
                order: createdOrder,
                pdfBuffer: base64Data
            });

        } catch (emailError) {
            console.error(`🚨 CRITICAL: The order ${createdOrder._id} was created, but PDF generation or email sending failed.`, emailError);
        }

        await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } });
        res.status(201).json(createdOrder);

    } catch (error) {
        console.error("ERROR CREATING ORDER:", error);
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

// ... other imports like Order, Product etc.

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

        // --- NEW: Business Logic: Check if the order can be cancelled based on time ---
        const hoursSinceOrder = (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceOrder > 24) {
            return res.status(400).json({ message: 'Orders can only be cancelled within 24 hours of placement.' });
        }

        // --- Existing Business Logic: Check order status ---
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
        // The frontend now sends the correct reason, this logic remains the same
        order.cancellationReason = { reason, details };

        const updatedOrder = await order.save();

        res.json(updatedOrder);

    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

exports.generateEBillController = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('user', 'email');
        console.log("Generating e-bill for order:", orderId, order ? "Order found" : "Order NOT found");

        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        const htmlContent = getHtmlForEBill(order);

        // This is the simplified, universal launch configuration
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
            ],
            headless: true,
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Raamya-E-Bill-${order._id}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error in generateEBillController:', error);
        res.status(500).json({ message: 'Server error while generating PDF.' });
    }
};
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get the user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.json({ items: [] }); // Return empty cart if none exists
        }
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// @desc    Add or update an item in the cart
// @route   POST /api/cart
// @access  Private
exports.addItemToCart = async (req, res) => {
    const { productId, size, qty } = req.body;
    const userId = req.user._id;

    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        // --- 👇 NEW LOGIC TO FIND VARIANT AND SKU 👇 ---
        const variant = product.variants.find(v => v.size === size);
        if (!variant) {
            return res.status(404).json({ message: `Size ${size} not available for this product.` });
        }
        if (!variant.sku) {
            console.error(`Data integrity error: SKU missing for product ${product.name}, size ${size}`);
            return res.status(500).json({ message: 'Cannot add item to cart due to a data configuration error. Please contact support.' });
        }
        // --- 👆 END OF NEW LOGIC 👆 ---

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        const itemIndex = cart.items.findIndex(p => p.product.toString() === productId && p.size === size);

        if (itemIndex > -1) {
            cart.items[itemIndex].qty = qty;
        } else {
            const cartItem = {
                product: productId,
                name: product.name,
                size,
                qty,
                price: product.price,
                image: product.images[0],
                sku: variant.sku, // 👈 ADD THE SKU HERE
            };
            cart.items.push(cartItem);
        }
        
        await cart.save();
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// @desc    Remove an item from the cart
// @route   DELETE /api/cart/:productId/:size
// @access  Private
exports.removeItemFromCart = async (req, res) => {
    const { productId, size } = req.params;

    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        // Filter out the item that matches both the product ID and size
        cart.items = cart.items.filter(
            item => !(item.product.toString() === productId && item.size === size)
        );

        await cart.save();
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};
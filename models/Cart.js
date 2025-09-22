const mongoose = require('mongoose');

// This defines the structure for a single item in the cart
const cartItemSchema = new mongoose.Schema({
    product: { 
        type: mongoose.Schema.ObjectId, 
        ref: 'Product', 
        required: true 
    },
    name: { type: String, required: true },
    size: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
});

// This defines the main cart, which belongs to a user and holds items
const cartSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.ObjectId, 
        ref: 'User', 
        required: true, 
        unique: true // Each user can only have one cart
    },
    items: [cartItemSchema],
}, {
    timestamps: true,
});

module.exports = mongoose.model('Cart', cartSchema);
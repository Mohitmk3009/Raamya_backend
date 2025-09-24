const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'User',
    },
}, {
    timestamps: true,
});

const variantSchema = new mongoose.Schema({
    size: { type: String, required: true, enum: ['XS', 'S', 'M', 'L', 'XL'] },
    stock: { type: Number, required: true, min: 0, default: 0 },
});

const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
});
const productSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'User', // Links this product to the admin who created it
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    images: [{
        type: String,
        required: true,
    }],
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
        enum: ['IT girl', 'Girly Pop', 'bloom girl', 'desi diva', 'street chic']
    },
    price: {
        type: Number,
        required: true,
        default: 0,
    },
    variants: [variantSchema],
    reviews: [reviewSchema],
    rating: {
        type: Number,
        required: true,
        default: 0,
    },
    numReviews: {
        type: Number,
        required: true,
        default: 0,
    },
    isNewArrival: {
        type: Boolean,
        default: false,
    },
    isMostWanted: { type: Boolean, default: false }, 
    isSuggested: {
        type: Boolean,
        default: false,
    },
    faqs: [faqSchema], // ADD THIS: For product-specific FAQs

    suggestedItems: [{ // ADD THIS: For upsells like the scrunchie
        type: mongoose.Schema.ObjectId,
        ref: 'Product'
    }],
}, {
    timestamps: true,
});

module.exports = mongoose.model('Product', productSchema);
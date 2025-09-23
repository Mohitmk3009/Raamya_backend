const mongoose = require('mongoose');

const exchangeRequestSchema = mongoose.Schema({
    orderNumber: {
        type: String,
        required: [true, 'Order number is required'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        match: [/\S+@\S+\.\S+/, 'Please use a valid email address.'],
    },
    reason: {
        type: String,
        required: [true, 'Reason for exchange is required'],
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
        default: 'Pending',
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('ExchangeRequest', exchangeRequestSchema);
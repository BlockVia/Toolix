const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
    developer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 500 // Minimum withdrawal $5.00 in cents
    },
    payment_method: {
        type: String, // e.g., 'PayPal', 'USDT', 'Bank Transfer'
        required: true
    },
    payment_details: {
        type: String, // e.g., an email address or wallet address
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'rejected'],
        default: 'pending'
    },
    requested_at: {
        type: Date,
        default: Date.now
    },
    processed_at: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password_hash: {
        type: String,
        required: true
    },
    subscription: {
        active: { type: Boolean, default: false },
        plan: { type: String, default: 'free' },
        expires_at: { type: Date, default: null }
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password_hash')) return next();
    this.password_hash = await bcrypt.hash(this.password_hash, 10);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password_hash);
};

// Check if subscription is active
userSchema.methods.isPremium = function () {
    if (!this.subscription.active) return false;
    if (!this.subscription.expires_at) return false;
    return new Date() < this.subscription.expires_at;
};

// Public profile (no password)
userSchema.methods.toPublic = function () {
    return {
        id: this._id,
        username: this.username,
        email: this.email,
        subscription: {
            active: this.isPremium(),
            plan: this.subscription.plan,
            expires_at: this.subscription.expires_at
        },
        created_at: this.created_at
    };
};

module.exports = mongoose.model('User', userSchema);

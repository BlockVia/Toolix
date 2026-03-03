const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 60
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    icon_emoji: {
        type: String,
        default: '🧰'
    },
    icon_base64: {
        type: String,
        default: null
    },
    category: {
        type: String,
        default: 'Utility',
        enum: ['Utility', 'Overlay', 'Automation', 'Stats', 'Audio', 'Other']
    },
    price: {
        type: Number,
        default: 0,       // in cents, 0 = free
        min: 0
    },
    developer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    developer_name: {
        type: String,
        required: true
    },
    page_url: {
        type: String,
        required: true,
        trim: true
    },
    approved: {
        type: Boolean,
        default: false
    },
    is_official: {
        type: Boolean,
        default: false
    },
    pricing_plan: {
        type: String,
        enum: ['free', 'premium', 'one_time'],
        default: 'free'
    },
    downloads: {
        type: Number,
        default: 0
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

toolSchema.methods.toPublic = function () {
    return {
        id: this._id,
        name: this.name,
        description: this.description,
        icon_emoji: this.icon_emoji,
        icon_base64: this.icon_base64,
        category: this.category,
        price: this.price,
        developer_name: this.developer_name,
        page_url: this.page_url,
        is_official: this.is_official,
        pricing_plan: this.pricing_plan,
        downloads: this.downloads,
        created_at: this.created_at
    };
};

module.exports = mongoose.model('Tool', toolSchema);

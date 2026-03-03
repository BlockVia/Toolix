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
        category: this.category,
        price: this.price,
        developer_name: this.developer_name,
        page_url: this.page_url,
        downloads: this.downloads,
        created_at: this.created_at
    };
};

module.exports = mongoose.model('Tool', toolSchema);

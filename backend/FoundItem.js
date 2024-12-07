const mongoose = require('mongoose');

const foundItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'registrations',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Bags', 'Clothing', 'Accessories', 'Documents', 'Others']
  },
  description: {
    type: String,
    required: true
  },
  additionalDetails: {
    type: mongoose.Schema.Types.Mixed // Flexible schema for different categories
  },
  photo: {
    type: String, // URL or file path of the uploaded photo
    required: false
  },
  location: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'Matched', 'Claimed'],
    default: 'Available'
  },
  matchedLostItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LostItem',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

// Add a text index for better search capabilities
foundItemSchema.index({ description: 'text', category: 'text' });

const FoundItem = mongoose.model('FoundItem', foundItemSchema);

module.exports = FoundItem;
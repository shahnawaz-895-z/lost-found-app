const mongoose = require('mongoose');

const lostItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'registrations', required: true },
  category: { type: String, required: true, enum: ['Electronics', 'Bags', 'Clothing', 'Accessories', 'Documents', 'Others'] },
  description: { type: String, required: true },
  additionalDetails: { type: mongoose.Schema.Types.Mixed }, // Flexible schema for different categories
  photo: { type: String }, // URL or file path of the uploaded photo
  location: { type: String, required: true },
  status: { type: String, enum: ['Reported', 'Matched', 'Resolved'], default: 'Reported' },
  matchedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'foundItems', default: null },
}, { timestamps: true });

// Add a text index for better search capabilities
lostItemSchema.index({ description: 'text', category: 'text' });

const LostItem = mongoose.model('LostItem', lostItemSchema);

module.exports = LostItem;
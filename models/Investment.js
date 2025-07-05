// models/Investment.js
const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  uid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  planAmount: {
    type: Number,
    required: true
  },
  durationDays: {
    type: Number,
    required: true
  },
  returnAmount: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastPayoutDate: {
  type: Date,
  default: Date.now
}
});

module.exports = mongoose.model('Investment', investmentSchema);
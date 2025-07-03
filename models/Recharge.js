// models/Recharge.js
const mongoose = require('mongoose');

const rechargeSchema = new mongoose.Schema({
  uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  phone: String,
  message: String,
  amount: { type: Number, required: true },
  number: String,
  transactionCode: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'confirmed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.Recharge || mongoose.model('Recharge', rechargeSchema);
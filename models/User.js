const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  wallet: { type: Number, default: 0 },
  cashouts: { type: Number, default: 0 },
  expense: { type: Number, default: 0 },
  dailyIncome: { type: Number, default: 0 },
  referralCode: { type: String, required: true, unique: true },
  referredBy: { type: String },
  role: { type: String, default: "user" },
  referralHistory: {
    level1: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    level2: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  referralBonus: { type: Number, default: 0 }, // Track total earned referral bonuses
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
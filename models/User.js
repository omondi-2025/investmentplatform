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
  referralBonus: { type: Number, default: 0 }, // optional if you want to track total bonus
  referralHistory: {
    level1: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    level2: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  referrals: [ // ✅ this is what stores bonus records for history
    {
      email: String,
      amount: Number,
      level: Number, // 1 or 2
      date: Date
    }
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);

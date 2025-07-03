const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// POST /api/withdraw
router.post('/', async (req, res) => {
  try {
    const { uid, name, phone, amount } = req.body;

    if (!uid || !amount || amount < 150) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent multiple withdrawals per day
   // Define today's start and end
const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);

const endOfDay = new Date();
endOfDay.setHours(23, 59, 59, 999);

// Find if a withdrawal exists for today
const existing = await Withdrawal.findOne({
  uid,
  createdAt: { $gte: startOfDay, $lte: endOfDay }
});

if (existing) {
  return res.status(400).json({ message: "Only one withdrawal allowed per day" });
}

    const tax = Math.ceil(amount * 0.15);
    const net = amount - tax;

    const withdrawal = new Withdrawal({
      uid,
      name,
      phone,
      amount,
      tax,
      net,
      status: 'pending'
    });

    await withdrawal.save();

    // Deduct from wallet
    user.wallet -= amount;
    await user.save();

    res.status(201).json({ message: "Withdrawal request submitted", withdrawal });
  } catch (err) {
    console.error("Withdrawal error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
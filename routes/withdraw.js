const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// POST /api/withdraw
router.post('/', async (req, res) => {
  try {
    const { uid, name, phone, amount } = req.body;

    if (!uid || !amount || amount < 150) {
      return res.status(400).json({ message: "Minimum withdrawal amount is Ksh 150." });
    }

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 💡 Restrict withdrawal to non-deposit earnings
    const allowedWithdrawal = user.wallet - user.expense;
    if (allowedWithdrawal < amount) {
      return res.status(400).json({
        message: "You can only withdraw from your earnings (not deposited capital)."
      });
    }

    // ⏱ Prevent multiple withdrawals per day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await Withdrawal.findOne({
      uid,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existing) {
      return res.status(400).json({ message: "Only one withdrawal allowed per day" });
    }

    // ✅ Proceed
    const tax = Math.ceil(amount * 0.15);
    const net = amount - tax;

    const withdrawal = new Withdrawal({
      uid,
      name,
      phone,
      amount,
      tax,
      net,
      status: 'pending',
      createdAt: new Date()
    });

    await withdrawal.save();

    // Deduct from wallet
    user.wallet -= amount;
    user.cashouts += amount;
    await user.save();

    res.status(201).json({ message: "Withdrawal request submitted", withdrawal });
  } catch (err) {
    console.error("Withdrawal error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
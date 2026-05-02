const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// POST /api/withdraw
router.post('/', async (req, res) => {
  try {
    const { uid, name, phone } = req.body;
    const amount = Number(req.body.amount);

    if (!uid || Number.isNaN(amount) || amount < 150) {
      return res.status(400).json({ message: "Minimum withdrawal amount is Ksh 150." });
    }

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 💡 Restrict withdrawal to non-deposit earnings
    const allowedWithdrawal = Number(user.wallet || 0) - Number(user.expense || 0);
    if (allowedWithdrawal < amount) {
      return res.status(400).json({
        message: "You can only withdraw from your earnings (not deposited capital)."
      });
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
    user.wallet = Number(user.wallet || 0) - amount;
    user.cashouts = Number(user.cashouts || 0) + amount;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted",
      tax,
      net,
      newWallet: user.wallet,
      newCashouts: user.cashouts,
      withdrawal
    });
  } catch (err) {
    console.error("Withdrawal error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
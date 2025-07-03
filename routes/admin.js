// routes/admin.js
const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// Approve a withdrawal request
router.post('/approve-withdrawal/:id', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ message: 'Already processed' });
    }

    withdrawal.status = 'approved';
    await withdrawal.save();

    res.json({ message: 'Withdrawal approved', withdrawal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/withdrawals/:id/reject
router.patch('/withdrawals/:id/reject', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal || withdrawal.status !== 'pending') {
      return res.status(404).json({ message: "Withdrawal not found or already handled" });
    }

    withdrawal.status = 'rejected';
    await withdrawal.save();

    // Refund wallet
    const user = await User.findById(withdrawal.uid);
    if (user) {
      user.wallet += withdrawal.amount;
      await user.save();
    }

    res.json({ message: "Withdrawal rejected and funds refunded" });
  } catch (err) {
    res.status(500).json({ message: "Error rejecting withdrawal" });
  }
});

module.exports = router;
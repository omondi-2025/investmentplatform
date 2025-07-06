// routes/agent.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Investment = require('../models/Investment');
const Withdrawal = require('../models/Withdrawal');

// GET /api/agent/dashboard/:refCode
router.get("/dashboard/:refCode", async (req, res) => {
  try {
    const { refCode } = req.params;
    const user = await User.findOne({ referralCode: refCode });

    if (!user) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    const userId = user._id;

    // Count direct referrals
    const totalReferrals = await User.countDocuments({ referredBy: refCode });

    // Calculate total referral earnings from stored referral logs
    const totalEarnings = (user.referrals || []).reduce((sum, r) => sum + (r.amount || 0), 0);

    // Total withdrawn amount by agent
    const totalWithdrawn = await Withdrawal.aggregate([
      { $match: { uid: userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      success: true,
      totalReferrals,
      totalEarnings,
      totalWithdrawn: totalWithdrawn[0]?.total || 0
    });

  } catch (err) {
    console.error("Agent dashboard error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
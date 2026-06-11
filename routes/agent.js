const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const { requireAuth } = require('../middleware/auth');

// GET /api/agent/dashboard/:refCode
router.get("/dashboard/:refCode", requireAuth, async (req, res) => {
  try {
    const { refCode } = req.params;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (String(user.referralCode).toUpperCase() !== String(refCode).toUpperCase()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const userId = user._id;
    const totalReferrals = await User.countDocuments({ referredBy: user.referralCode });
    const totalEarnings = (user.referrals || []).reduce((sum, r) => {
      const rate = r.level === 1 ? 0.2 : 0.01;
      return sum + Number((r.amount || 0) * rate);
    }, 0);

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

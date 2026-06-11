const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const { requireAuth } = require('../middleware/auth');

function calculateReferralEarnings(referrals) {
  return (referrals || []).reduce((sum, entry) => {
    const invested = Number(entry.amount || 0);
    const rate = Number(entry.level) === 1 ? 0.2 : 0.01;
    return sum + invested * rate;
  }, 0);
}

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
    const referralCode = user.referralCode;

    const [totalReferrals, withdrawnAgg] = await Promise.all([
      User.countDocuments({ referredBy: referralCode }),
      Withdrawal.aggregate([
        {
          $match: {
            uid: userId,
            status: { $in: ['approved', 'paid'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalEarnings = calculateReferralEarnings(user.referrals);
    const totalWithdrawn = Number(withdrawnAgg[0]?.total || 0);
    const walletBalance = Number(user.wallet || 0);

    res.json({
      success: true,
      totalReferrals,
      totalEarnings,
      totalWithdrawn,
      walletBalance,
      cashouts: Number(user.cashouts || 0)
    });
  } catch (err) {
    console.error("Agent dashboard error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

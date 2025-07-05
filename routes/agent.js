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

    const totalReferrals = await User.countDocuments({ referredBy: refCode });

    const totalEarnings = await Investment.aggregate([
  { $match: { referredBy: userId } }, // Changed to referredBy instead of agentId
  { $group: { _id: null, total: { $sum: "$referralEarnings" } } }
]);
    
    const totalWithdrawn = await Withdrawal.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      totalReferrals,
      totalEarnings: totalEarnings[0]?.total || 0,
      totalWithdrawn: totalWithdrawn[0]?.total || 0
    });

  } catch (err) {
    console.error("Agent dashboard error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/agent/referrals/:referralCode
router.get("/referrals/:referralCode", async (req, res) => {
  try {
    const { referralCode } = req.params;

    // Level 1 users (referred directly by this user)
    const level1 = await User.find({ referredBy: referralCode });

    // Get referral codes of level 1 users
    const level1RefCodes = level1.map(u => u.referralCode);

    // Level 2 users (referred by level 1 users)
    const level2 = await User.find({ referredBy: { $in: level1RefCodes } });

    // Utility to calculate total deposits per user
    const Recharge = require('../models/Recharge');
    const computeDeposits = async (users) => {
  return Promise.all(users.map(async (u) => {
    const deposits = await Recharge.find({ uid: u._id });
    const totalDeposited = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
    return {
      fullName: u.fullName,
      email: u.email,
      expense: totalDeposited,
      createdAt: u.createdAt
    };
  }));
};

    const level1WithDeposits = await computeDeposits(level1);
    const level2WithDeposits = await computeDeposits(level2);

    res.json({
      success: true,
      level1: level1WithDeposits,
      level2: level2WithDeposits
    });

  } catch (err) {
    console.error("Referral history error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
// routes/admin.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Recharge = require('../models/Recharge');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// In-memory admin session store (resets on server restart)
const adminSessions = new Map();

// POST /api/admin/login — validate credentials from .env
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, Date.now() + 8 * 60 * 60 * 1000); // 8 hours
  res.json({ success: true, token });
});

// Auth middleware — applied to all routes below this point
router.use((req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }
  if (Date.now() > adminSessions.get(token)) {
    adminSessions.delete(token);
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
  next();
});

router.get('/recharges/pending', async (req, res) => {
  try {
    const recharges = await Recharge.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(recharges);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending recharges' });
  }
});

router.get('/withdrawals/pending', async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending withdrawals' });
  }
});

router.post('/recharge/:id/approve', async (req, res) => {
  try {
    const recharge = await Recharge.findById(req.params.id);
    if (!recharge) {
      return res.status(404).json({ message: 'Recharge not found' });
    }

    if (recharge.status !== 'pending') {
      return res.status(400).json({ message: 'Recharge already processed' });
    }

    const user = await User.findById(recharge.uid);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.wallet += recharge.amount;
    recharge.status = 'confirmed';

    await user.save();
    await recharge.save();

    res.json({ message: 'Recharge approved', newWallet: user.wallet });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve recharge' });
  }
});

router.post('/recharge/:id/reject', async (req, res) => {
  try {
    const recharge = await Recharge.findById(req.params.id);
    if (!recharge) {
      return res.status(404).json({ message: 'Recharge not found' });
    }

    if (recharge.status !== 'pending') {
      return res.status(400).json({ message: 'Recharge already processed' });
    }

    recharge.status = 'rejected';
    await recharge.save();

    res.json({ message: 'Recharge rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject recharge' });
  }
});

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

// POST /api/admin/withdrawals/:id/approve
router.post('/withdrawals/:id/approve', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ message: 'Already processed' });
    }

    withdrawal.status = 'approved';
    await withdrawal.save();

    res.json({ message: 'Withdrawal approved', withdrawal });
  } catch (err) {
    res.status(500).json({ message: 'Error approving withdrawal' });
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
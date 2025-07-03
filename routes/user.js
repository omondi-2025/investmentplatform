const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User'); // Your Mongoose model

// Update password
router.post('/update-password', async (req, res) => {
  const { uid, currentPassword, newPassword } = req.body;

  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ success: false, message: "Incorrect current password" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
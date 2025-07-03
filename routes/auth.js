const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-char code
}

router.post("/signup", async (req, res) => {
  try {
    const { fullName, phone, email, password, referredBy } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      fullName,
      phone,
      email,
      password: hashedPassword,
      referralCode: generateReferralCode(),
      referredBy: referredBy || null
    });

    await newUser.save();

    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
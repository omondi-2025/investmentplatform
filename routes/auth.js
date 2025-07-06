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

    const lowerEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: lowerEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique referral code
    let referralCode;
    let exists = true;
    while (exists) {
      referralCode = generateReferralCode();
      exists = await User.findOne({ referralCode });
    }

    // Create new user
    const newUser = new User({
      fullName,
      phone,
      email: lowerEmail,
      password: hashedPassword,
      referralCode,
      referredBy: referredBy || null
    });

    await newUser.save();

    // Exclude password from response
    const userToReturn = { ...newUser._doc };
    delete userToReturn.password;

    res.status(201).json({ success: true, user: userToReturn });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
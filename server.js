// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  ssl: true
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});

// Models
const User = require('./models/User');
const Recharge = require('./models/Recharge'); // ✅ Make sure this file exists
const Investment = require('./models/Investment');

// Default Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Auth: Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const lowerEmail = email.toLowerCase();

    const user = await User.findOne({ email: lowerEmail });
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Auth: Signup

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // e.g. "AB12CD"
}

app.post("/api/signup", async (req, res) => {
  try {
    const { fullName, phone, email, password, refCode } = req.body;
    const lowerEmail = email.toLowerCase();

    // Check if user exists
    const existing = await User.findOne({ email: lowerEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // Create new user with referral code
    const user = new User({
      fullName,
      phone,
      email: lowerEmail,
      password,
      referralCode: generateReferralCode(), // each user gets a unique referralCode
      referredBy: refCode || null,          // the referrer, if present
      wallet: 0,
      cashouts: 0,
      expense: 0,
      dailyIncome: 0,
    });

    await user.save();

    res.status(201).json({ success: true, message: "User registered", user });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "Signup failed" });
  }
});

// Withdrawal
// Models
const Withdrawal = require('./models/Withdrawal');
const withdrawalRoutes = require('./routes/withdraw');

// Routes
app.use('/api/withdraw', withdrawalRoutes);

// ✅ GET: Withdrawal history
app.get("/api/withdrawals/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const history = await Withdrawal.find({ uid: userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error("Withdrawal history error:", err);
    res.status(500).json({ message: "Failed to fetch withdrawal history" });
  }
});

    // Ivestment
app.post('/api/invest', async (req, res) => {
  try {
    const {
      userId,
      planName,
      planAmount,
      durationDays,
      returnAmount
    } = req.body;

    const amount = Number(planAmount);
    const duration = Number(durationDays);
    const returns = Number(returnAmount);

    if ([amount, duration, returns].some(isNaN)) {
      return res.status(400).json({ message: "Invalid investment data" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.wallet < amount) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + duration * 86400000); // 86400000 ms/day

    user.wallet -= amount;
    user.expense += amount;
    user.dailyIncome += returns / duration; // Optional logic
    await user.save();

    const newInvestment = new Investment({
      uid: userId,
      planName,
      planAmount: amount,
      durationDays: duration,
      returnAmount: returns,
      startDate,
      endDate,
      status: 'active',
      createdAt: new Date()
    });

    await newInvestment.save();

    res.json({ message: "Investment successful", newWallet: user.wallet });
  } catch (err) {
    console.error("Investment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

 // routes/recharge.js or inside /api/recharge handler
app.post('/api/recharge', async (req, res) => {
  const { uid, message, amount, number, transactionCode } = req.body;

  try {
    // Avoid duplicate transactions
    const exists = await Recharge.findOne({ transactionCode });
    if (exists) {
      return res.status(400).json({ error: "Transaction already submitted." });
    }

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ error: "User not found." });

    const recharge = await Recharge.create({
      uid,
      name: user.name,
      phone: user.phone,
      message,
      amount,
      number,
      transactionCode,
      status: "confirmed"
    });

    // Update wallet
    user.wallet += amount;
    await user.save();

    return res.status(200).json({ message: "Recharge successful.", newWallet: user.wallet });

  } catch (err) {
    console.error("Recharge error:", err);
    res.status(500).json({ error: "Server error. Try again later." });
  }
});

// ✅ PUT: Update profile
app.put('/api/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.fullName = fullName || user.fullName;
    user.phone = phone || user.phone;

    await user.save();

    res.json({ success: true, message: "Profile updated", user });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
});

  // Update password
app.post("/api/user/update-password", async (req, res) => {
  try {
    const { uid, currentPassword, newPassword } = req.body;

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.password !== currentPassword) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get user investments
app.get('/api/investments/:userId', async (req, res) => {
  try {
    const investments = await Investment.find({ uid: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, investments });
  } catch (err) {
    console.error("Fetch investments error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch investments" });
  }
});

// Get user by ID
app.get('/api/user/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) return res.json(user);
  res.status(404).json({ error: 'User not found' });
});

// Routes
const agentRoutes = require('./routes/agent'); // ✅ Make sure routes/agent.js exists
app.use('/api/agent', agentRoutes);

// Auto-update pending withdrawals to paid after 20 minutes
setInterval(async () => {
  const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);

  try {
    const updated = await Withdrawal.updateMany(
      { status: "pending", createdAt: { $lte: twentyMinsAgo } },
      { $set: { status: "paid" } }
    );

    if (updated.modifiedCount > 0) {
      console.log(`✅ ${updated.modifiedCount} withdrawal(s) marked as paid.`);
    }
  } catch (err) {
    console.error("Auto-update withdrawal error:", err);
  }
}, 60 * 1000); // check every minute

// Server Start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      ssl: true
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

// Models
const User = require('./models/User');
const Recharge = require('./models/Recharge'); // ✅ Make sure this file exists
const Investment = require('./models/Investment');
const payoutJob = require('./cron/investmentPayout');
payoutJob(); // Start cron job
const adminRoutes = require('./routes/admin');

// Default Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function isValidObjectId(value) {
  return mongoose.isValidObjectId(value);
}

function sanitizeUser(user) {
  const userObject = user.toObject ? user.toObject() : { ...user };
  delete userObject.password;
  return userObject;
}

function isPasswordHash(password) {
  return typeof password === 'string' && /^\$2[aby]\$\d{2}\$/.test(password);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(user, candidatePassword) {
  if (isPasswordHash(user.password)) {
    return bcrypt.compare(candidatePassword, user.password);
  }

  if (user.password !== candidatePassword) {
    return false;
  }

  user.password = await hashPassword(candidatePassword);
  await user.save();
  return true;
}

async function createReferralCode() {
  let referralCode = generateReferralCode();

  while (await User.findOne({ referralCode })) {
    referralCode = generateReferralCode();
  }

  return referralCode;
}

// Auth: Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const lowerEmail = email.toLowerCase();

    const user = await User.findOne({ email: lowerEmail });
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    const validPassword = await verifyPassword(user, password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Auth: Signup
app.post("/api/signup", async (req, res) => {
  try {
    const { fullName, phone, email, password, refCode, referredBy } = req.body;
    if (!fullName || !phone || !email || !password) {
      return res.status(400).json({ success: false, message: "All required fields must be filled" });
    }

    const lowerEmail = email.toLowerCase();

    // Check if user exists
    const existing = await User.findOne({ email: lowerEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // Generate referral code for the new user
    const referralCode = await createReferralCode();

    // Handle the referrer (referredBy)
    const suppliedRefCode = (refCode || referredBy || '').trim().toUpperCase();
    let resolvedReferrer = null;
    if (suppliedRefCode) {
      const refUser = await User.findOne({ referralCode: suppliedRefCode });
      if (refUser) {
        resolvedReferrer = refUser.referralCode;
      } else {
        return res.status(400).json({ success: false, message: "Invalid referral code" });
      }
    }

    // Create new user with referral code
    const user = new User({
      fullName,
      phone,
      email: lowerEmail,
      password: await hashPassword(password),
      referralCode,
      referredBy: resolvedReferrer,
      wallet: 0,
      cashouts: 0,
      expense: 0,
      dailyIncome: 0,
    });

    await user.save();

    res.status(201).json({ success: true, message: "User registered", user: sanitizeUser(user) });
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
app.use('/api/admin', adminRoutes);

// ✅ GET: Withdrawal history
app.get("/api/withdrawals/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const history = await Withdrawal.find({ uid: userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error("Withdrawal history error:", err);
    res.status(500).json({ message: "Failed to fetch withdrawal history" });
  }
});

// ✅ GET: Recharge history for a user
app.get('/api/recharges/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const recharges = await Recharge.find({ uid: userId }).sort({ createdAt: -1 });
    res.json(recharges);
  } catch (err) {
    console.error('Recharge history error:', err);
    res.status(500).json({ message: 'Failed to fetch recharge history' });
  }
});

async function getUnifiedHistoryPayload(userId) {
  const user = await User.findById(userId);
  if (!user) {
    return { notFound: true };
  }

  const [investments, recharges, withdrawals] = await Promise.all([
    Investment.find({ uid: userId }).sort({ createdAt: -1 }),
    Recharge.find({ uid: userId }).sort({ createdAt: -1 }),
    Withdrawal.find({ uid: userId }).sort({ createdAt: -1 })
  ]);

  const referralItems = (user.referrals || []).map((ref) => {
    const rate = ref.level === 1 ? 0.2 : 0.01;
    return {
      type: 'referral',
      amount: Number((ref.amount || 0) * rate),
      rawAmount: ref.amount || 0,
      level: ref.level || 0,
      note: `Referral level ${ref.level || 0} (${rate * 100}%)`,
      date: ref.date || user.createdAt
    };
  });

  const investmentItems = investments.map((inv) => ({
    type: 'investment',
    amount: inv.returnAmount || 0,
    note: `${inv.planName || 'Investment'} earnings`,
    status: inv.status,
    date: inv.createdAt
  }));

  const rechargeItems = recharges.map((rec) => ({
    type: 'recharge',
    amount: rec.amount || 0,
    note: 'Wallet recharge',
    status: rec.status,
    date: rec.createdAt
  }));

  const withdrawalItems = withdrawals.map((wd) => ({
    type: 'withdrawal',
    amount: wd.amount || 0,
    tax: wd.tax || 0,
    net: wd.net || 0,
    status: wd.status,
    note: 'Cash withdrawal',
    date: wd.createdAt
  }));

  const items = [...investmentItems, ...rechargeItems, ...withdrawalItems, ...referralItems]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const totals = {
    investmentEarnings: investmentItems.reduce((sum, i) => sum + (i.amount || 0), 0),
    rechargedCash: rechargeItems
      .filter((i) => i.status === 'confirmed')
      .reduce((sum, i) => sum + (i.amount || 0), 0),
    withdrawnCash: withdrawalItems
      .filter((i) => ['approved', 'paid'].includes(String(i.status || '').toLowerCase()))
      .reduce((sum, i) => sum + (i.amount || 0), 0),
    referralEarnings: referralItems.reduce((sum, i) => sum + (i.amount || 0), 0)
  };

  return { notFound: false, items, totals };
}

app.get('/api/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const payload = await getUnifiedHistoryPayload(userId);
    if (payload.notFound) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, totals: payload.totals, items: payload.items });
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
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
const endDate = new Date(startDate.getTime() + duration * 86400000);

// Deduct investment amount from wallet
// Correctly update wallet after checking sufficient balance
user.wallet -= amount;
user.expense += amount;
user.dailyIncome += returns / duration;
await user.save();

   const newInvestment = new Investment({
  uid: userId,
  planName,
  planAmount: amount,
  durationDays: duration,
  initialDurationDays: duration,
  returnAmount: returns,
  startDate,
  endDate,
  status: 'active',
  createdAt: new Date(),
  lastPayoutDate: new Date() // 👈 ADD THIS
});

await newInvestment.save();

// Referral Bonus Logic (Add right after saving the new investment)
  // Level 1 referral
if (user.referredBy) {
  const level1 = await User.findOne({ referralCode: user.referredBy });

  if (level1) {
    const reward1 = amount * 0.20;
    level1.wallet += reward1;

    level1.referrals.push({
      email: user.email,
      amount,
      level: 1,
      date: new Date()
    });

    await level1.save();
	
	// Level 2 referral
    if (level1.referredBy) {
      const level2 = await User.findOne({ referralCode: level1.referredBy });
      if (level2) {
        const reward2 = amount * 0.01;
        level2.wallet += reward2;

        level2.referrals.push({
          email: user.email,
          amount,
          level: 2,
          date: new Date()
        });

        await level2.save();
      }
    }
  }
}

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
     
	 const validAmount = Number(amount);
if (isNaN(validAmount) || validAmount <= 0) {
  return res.status(400).json({ error: "Invalid recharge amount" });
}
    const recharge = await Recharge.create({
      uid,
      name: user.fullName,
      phone: user.phone,
      message,
      amount: validAmount,
      number,
      transactionCode,
      status: "pending"
    });

    return res.status(200).json({
      message: "Recharge submitted and awaiting approval.",
      rechargeId: recharge._id,
      status: recharge.status
    });

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
    if (!uid || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "All password fields are required" });
    }

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const validPassword = await verifyPassword(user, currentPassword);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    user.password = await hashPassword(newPassword);
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
    if (!isValidObjectId(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const investments = await Investment.find({ uid: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, investments });
  } catch (err) {
    console.error("Fetch investments error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch investments" });
  }
});

// Get user by ID
app.get('/api/user/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const user = await User.findById(req.params.id);
    if (user) return res.json(sanitizeUser(user));
    res.status(404).json({ error: 'User not found' });
  } catch (err) {
    console.error('Fetch user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Routes
const agentRoutes = require('./routes/agent'); // ✅ Make sure routes/agent.js exists
app.use('/api/agent', agentRoutes);

app.get('/api/referrals/:userId', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ referrals: user.referrals || [] });
  } catch (err) {
    console.error("Referral fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Withdrawals now remain pending until explicitly approved/rejected by admin.
 
// Server Start
async function startServer() {
  await connectToDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
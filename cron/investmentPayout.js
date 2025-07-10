const cron = require('node-cron');
const Investment = require('../models/Investment');
const User = require('../models/User');

const payoutJob = () => {
  cron.schedule('*/10 * * * *', async () => {
    try {
      console.log("⏰ Running investment payout check...");
      const now = new Date();
      const investments = await Investment.find({ status: 'active' });

      for (const inv of investments) {
        const last = new Date(inv.lastPayoutDate);
        const nextDue = new Date(last.getTime() + 24 * 60 * 60 * 1000);

        if (now >= nextDue && inv.durationDays > 0) {
          const user = await User.findById(inv.uid);
          const dailyPay = inv.returnAmount / inv.durationDays;

          user.wallet += dailyPay;
          await user.save();

          inv.durationDays -= 1;
          inv.lastPayoutDate = now;
          if (inv.durationDays === 0) inv.status = 'completed';

          await inv.save();
          console.log(`💰 Paid ${dailyPay.toFixed(2)} to ${user.fullName}`);
        }
      }
    } catch (err) {
      console.error("🚨 Cron job error:", err.message);
    }
  });
};

module.exports = payoutJob;
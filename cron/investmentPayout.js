const cron = require('node-cron');
const Investment = require('../models/Investment');
const User = require('../models/User');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let isPayoutRunInProgress = false;

const payoutJob = () => {
  cron.schedule('* * * * *', async () => {
    if (isPayoutRunInProgress) {
      console.log('⏳ Skipping payout check: previous run is still in progress.');
      return;
    }

    isPayoutRunInProgress = true;

    try {
      if (User.db.readyState !== 1) {
        console.warn('Skipping investment payout check: MongoDB is disconnected.');
        return;
      }

      console.log('⏰ Running investment payout check...');
      const now = new Date();
      const investments = await Investment.find({ status: 'active' });
      let processedCount = 0;
      let paidCount = 0;

      for (const inv of investments) {
        processedCount += 1;
        try {
          const remainingDays = Number(inv.durationDays || 0);
          if (remainingDays <= 0) {
            inv.status = 'completed';
            await inv.save();
            continue;
          }

          const lastPayoutAt = inv.lastPayoutDate ? new Date(inv.lastPayoutDate) : new Date(inv.startDate || inv.createdAt || now);
          const elapsedMs = now.getTime() - lastPayoutAt.getTime();
          const dueDays = Math.floor(elapsedMs / ONE_DAY_MS);

          if (dueDays <= 0) {
            continue;
          }

          const payoutDays = Math.min(dueDays, remainingDays);
          const totalDays = Number(inv.initialDurationDays || inv.durationDays || 1);
          const dailyPay = Number(inv.returnAmount || 0) / totalDays;
          const totalPayout = dailyPay * payoutDays;

          const user = await User.findById(inv.uid);
          if (!user) {
            console.warn(`⚠️ Skipping payout for investment ${inv._id}: user not found.`);
            continue;
          }

          user.wallet = Number(user.wallet || 0) + totalPayout;
          await user.save();

          inv.durationDays = remainingDays - payoutDays;
          inv.lastPayoutDate = new Date(lastPayoutAt.getTime() + payoutDays * ONE_DAY_MS);
          if (inv.durationDays <= 0) {
            inv.durationDays = 0;
            inv.status = 'completed';
          }

          await inv.save();
          paidCount += 1;

          console.log(
            `💰 Paid ${totalPayout.toFixed(2)} (${payoutDays} day(s)) to ${user.fullName || inv.uid} for investment ${inv._id}`
          );
        } catch (investmentError) {
          console.error(`🚨 Payout error for investment ${inv._id}:`, investmentError.message);
        }
      }

      console.log(`✅ Payout check complete. Processed: ${processedCount}, Paid: ${paidCount}`);
    } catch (err) {
      console.error('🚨 Cron job error:', err.message);
    } finally {
      isPayoutRunInProgress = false;
    }
  });
};

module.exports = payoutJob;
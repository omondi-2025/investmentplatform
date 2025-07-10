// cron/dailyPayout.js
const Investment = require('../models/Investment');
const User = require('../models/User');

const processDailyPayouts = async () => {
  const now = new Date();

  const investments = await Investment.find({
    status: 'active',
    endDate: { $lte: now }
  });

  for (let inv of investments) {
    const user = await User.findById(inv.uid);
    if (user) {
      user.walletBalance += inv.returnAmount;
      await user.save();

      inv.status = 'completed';
      await inv.save();

      console.log(`✅ Paid ${inv.returnAmount} to ${user.email}`);
    }
  }
};

module.exports = processDailyPayouts;

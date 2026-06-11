const INVESTMENT_PACKAGES = [
  { amount: 300, daily: 80, duration: 7 },
  { amount: 500, daily: 130, duration: 45 },
  { amount: 900, daily: 240, duration: 45 },
  { amount: 1700, daily: 453, duration: 45 },
  { amount: 5000, daily: 1330, duration: 45 },
  { amount: 10000, daily: 2660, duration: 45 },
  { amount: 20000, daily: 5320, duration: 45 }
];

function getPackageByAmount(amount) {
  const value = Number(amount);
  return INVESTMENT_PACKAGES.find((pkg) => pkg.amount === value) || null;
}

function getPackageReturnAmount(pkg) {
  return pkg.daily * pkg.duration;
}

module.exports = {
  INVESTMENT_PACKAGES,
  getPackageByAmount,
  getPackageReturnAmount
};

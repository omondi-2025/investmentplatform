// models/Withdrawal.js
const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
  uid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: Number,
  phone: String,
  tax: Number,
  net: Number,
  status: {
    type: String,
    default: "approved"
  }
}, { timestamps: true }); // <-- ADD THIS LINE

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  money_balance: { type: Number, default: 1000 },
  bought_tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }],
});

module.exports = mongoose.model("User", userSchema);

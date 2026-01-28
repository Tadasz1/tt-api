const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ticket_price: { type: Number, required: true },
  from_location: String,
  to_location: String,
  to_location_photo_url: String,
});

module.exports = mongoose.model("Ticket", ticketSchema);

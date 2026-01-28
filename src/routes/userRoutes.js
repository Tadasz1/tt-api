const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const authenticate = require("../middleware/auth");

// 1. SignUp
router.post("/signUp", async (req, res) => {
  let { name, email, password } = req.body;
  const hasNumber = /\d/.test(password);
  if (!email || !email.includes("@") || password.length < 6 || !hasNumber) {
    return res.status(400).json({ message: "validation failed" });
  }
  name = name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  try {
    const newUser = new User({ name, email, password });
    await newUser.save();
    const token = jwt.sign({ id: newUser._id }, "JWT_ACCESS_SECRET", {
      expiresIn: "2h",
    });
    const refreshToken = jwt.sign({ id: newUser._id }, "JWT_REFRESH_SECRET", {
      expiresIn: "1d",
    });
    res.status(200).json({
      message: "Success",
      jwt_token: token,
      jwt_refresh_token: refreshToken,
    });
  } catch (err) {
    res.status(400).json({ message: "Email already exists" });
  }
});

// 2. Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.status(404).json({ message: "wrong credentials" });
  const token = jwt.sign({ id: user._id }, "JWT_ACCESS_SECRET", {
    expiresIn: "2h",
  });
  const refreshToken = jwt.sign({ id: user._id }, "JWT_REFRESH_SECRET", {
    expiresIn: "1d",
  });
  res.status(200).json({ jwt_token: token, jwt_refresh_token: refreshToken });
});

// 3. Refresh Token
router.post("/getNewJwtToken", (req, res) => {
  const { jwt_refresh_token } = req.body;
  if (!jwt_refresh_token) return res.status(400).json({ message: "No token" });
  try {
    const decoded = jwt.verify(jwt_refresh_token, "JWT_REFRESH_SECRET");
    const newToken = jwt.sign({ id: decoded.id }, "JWT_ACCESS_SECRET", {
      expiresIn: "2h",
    });
    res.status(200).json({ jwt_token: newToken, jwt_refresh_token });
  } catch (err) {
    res.status(400).json({ message: "Login again" });
  }
});

// 4. Get All Users
router.get("/getAllUsers", authenticate, async (req, res) => {
  const users = await User.find().sort({ name: 1 });
  res.json(users);
});

// 5. Get User By ID
router.get("/getUserById/:id", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: "Invalid ID format" });
  }
});

// 6. Buy Ticket
router.post("/buyTicket", authenticate, async (req, res) => {
  const { ticket_title, ticket_price } = req.body;
  const user = await User.findById(req.user.id);
  if (user.money_balance < ticket_price)
    return res.status(400).json({ message: "No money" });
  const newTicket = new Ticket({
    title: ticket_title,
    ticket_price,
    userId: user._id,
    from_location: req.body.from_location,
    to_location: req.body.to_location,
  });
  await newTicket.save();
  user.money_balance -= ticket_price;
  user.bought_tickets.push(newTicket._id);
  await user.save();
  res.status(200).json({ message: "Bought!", ticket: newTicket });
});

// 7. Get All Users With Tickets
router.get("/getAllUsersWithTickets", authenticate, async (req, res) => {
  const data = await User.aggregate([
    {
      $lookup: {
        from: "tickets",
        localField: "bought_tickets",
        foreignField: "_id",
        as: "tickets",
      },
    },
    { $sort: { name: 1 } },
  ]);
  res.json(data);
});

// 8. Get User By ID With Tickets
router.get("/getUserByIdWithTickets/:id", authenticate, async (req, res) => {
  try {
    const data = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $lookup: {
          from: "tickets",
          localField: "bought_tickets",
          foreignField: "_id",
          as: "aggregated_tickets",
        },
      },
    ]);
    if (data.length === 0)
      return res.status(404).json({ message: "Not found" });
    res.json(data[0]);
  } catch (err) {
    res.status(400).json({ message: "Invalid ID format" });
  }
});

module.exports = router;

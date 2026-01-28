const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// DATABASE CONNECTION
mongoose
  .connect("mongodb://127.0.0.1:27017/tt_db")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ DB Error:", err));

// DATABASE STRUCTURE
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  money_balance: { type: Number, default: 1000 },
  bought_tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }],
});
const User = mongoose.model("User", userSchema);

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ticket_price: { type: Number, required: true },
  from_location: String,
  to_location: String,
  to_location_photo_url: String,
});
const Ticket = mongoose.model("Ticket", ticketSchema);

// TOKEN VERIFICATION
const authenticate = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Access Denied" });

  try {
    const verified = jwt.verify(token, "JWT_ACCESS_SECRET");
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid Session" });
  }
};

// ENDPOINTS

// 1. /signUp
app.post("/signUp", async (req, res) => {
  let { name, email, password } = req.body;

  // Validation
  const hasNumber = /\d/.test(password);
  if (!email || !email.includes("@") || password.length < 6 || !hasNumber) {
    return res.status(400).json({ message: "validation failed" });
  }

  // Name Formatting
  name = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
      message: "User registered successfully",
      jwt_token: token,
      jwt_refresh_token: refreshToken,
    });
  } catch (err) {
    res.status(400).json({ message: "Email already exists" });
  }
});

// 2. /login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });

  if (!user) {
    return res.status(404).json({ message: "wrong email or password" });
  }

  const token = jwt.sign({ id: user._id }, "JWT_ACCESS_SECRET", {
    expiresIn: "2h",
  });
  const refreshToken = jwt.sign({ id: user._id }, "JWT_REFRESH_SECRET", {
    expiresIn: "1d",
  });

  res.status(200).json({
    message: "Login successful",
    jwt_token: token,
    jwt_refresh_token: refreshToken,
  });
});

// 3. /getNewJwtToken
app.post("/getNewJwtToken", (req, res) => {
  const { jwt_refresh_token } = req.body;

  if (!jwt_refresh_token)
    return res.status(400).json({ message: "No refresh token provided" });

  try {
    const decoded = jwt.verify(jwt_refresh_token, "JWT_REFRESH_SECRET");
    const newToken = jwt.sign({ id: decoded.id }, "JWT_ACCESS_SECRET", {
      expiresIn: "2h",
    });
    res.status(200).json({ jwt_token: newToken, jwt_refresh_token });
  } catch (err) {
    res.status(400).json({ message: "user must login again" });
  }
});

// 4. /getAllUsers
app.get("/getAllUsers", authenticate, async (req, res) => {
  const users = await User.find().sort({ name: 1 });
  res.json(users);
});

// 5. /getUserById
app.get("/getUserById/:id", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(404).json({ message: "User not found" });
  }
});

// 6. /buyTicket
app.post("/buyTicket", authenticate, async (req, res) => {
  const { ticket_title, ticket_price } = req.body;
  const user = await User.findById(req.user.id);

  if (user.money_balance < ticket_price) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  const newTicket = new Ticket({
    title: ticket_title,
    ticket_price: ticket_price,
    userId: user._id,
    from_location: req.body.from_location,
    to_location: req.body.to_location,
    to_location_photo_url: req.body.to_location_photo_url,
  });
  await newTicket.save();

  user.money_balance -= ticket_price;
  user.bought_tickets.push(newTicket._id);
  await user.save();

  res.status(200).json({ message: "Purchase successful", ticket: newTicket });
});

// 7. /getAllUsersWithTickets
app.get("/getAllUsersWithTickets", authenticate, async (req, res) => {
  const data = await User.aggregate([
    {
      $lookup: {
        from: "tickets",
        localField: "bought_tickets",
        foreignField: "_id",
        as: "aggregated_tickets",
      },
    },
    { $sort: { name: 1 } },
  ]);
  res.json(data);
});

// 8. /getUserByIdWithTickets
app.get("/getUserByIdWithTickets/:id", authenticate, async (req, res) => {
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

app.listen(3000, () => console.log("🚀 Server running on port 3000"));

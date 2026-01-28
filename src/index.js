const express = require("express");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes.js");

const app = express();
app.use(express.json());

// DB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/tt_db")
  .then(() => console.log("Database Connected"))
  .catch((err) => console.log("DB Error:", err));

// Routes
app.use("/", userRoutes);

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Passport initialization
//require("./config/passport")(passport);
//app.use(passport.initialize());

// Test route
app.get("/", async (req, res) => {
  res.render("index");
});

// Routes
app.use("/users", require("./routes/userRoutes"));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

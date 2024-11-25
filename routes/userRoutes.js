const express = require("express");
const User = require("../models/User");
const router = express.Router();
const transporter = require("../config/nodemailerConfig");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// Register a new user
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = new User({ username, email, password, verificationToken });
    await user.save();

    return res.json({ message: "User registered successfully" });

    const verificationURL = `${process.env.ROOT}/users/verifyemail?token=${verificationToken}`;

    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify your email",
      text: `Hello ${username},

      Thank you for registering with us! Please verify your email address by clicking the link below:
      
      ${verificationURL}
      
      If you did not register with us, please ignore this email.
      
      Best regards,
      The Codebase Team`,
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
              }
              .email-container {
                  width: 100%;
                  max-width: 600px;
                  margin: 20px auto;
                  background-color: #fff;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              }
              .email-header {
                  text-align: center;
                  padding-bottom: 20px;
              }
              .email-body {
                  font-size: 16px;
                  line-height: 1.5;
              }
              .verification-link {
                  background-color: #4CAF50;
                  color: white;
                  padding: 10px 20px;
                  text-decoration: none;
                  border-radius: 5px;
              }
              .email-footer {
                  margin-top: 20px;
                  font-size: 14px;
                  text-align: center;
                  color: #888;
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="email-header">
                  <h2>Email Verification</h2>
              </div>
              <div class="email-body">
                  <p>Hello ${username},</p>
                  <p>Thank you for registering with us! Please verify your email address by clicking the button below:</p>
                  <p><a href="${verificationURL}" class="verification-link">Verify Email</a></p>
                  <p>If you did not register with us, please ignore this email.</p>
              </div>
              <div class="email-footer">
                  <p>Best regards,<br>The Codebase Team</p>
              </div>
          </div>
      </body>
      </html>
      
      `,
    });

    res.status(201).redirect(`/users/verify?email=${email}`);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/verify", (req, res) => {
  const email = req.query.email;
  res.render("verify", { email });
});

router.get("/verifyemail", async (req, res) => {
  try {
    const token = req.query.token;

    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.json({ message: "Invalid or expired token" });

    user.isVerified = true;
    await user.save();

    res.json({ message: "Email verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/checkemail", async (req, res) => {
  const email = req.query.email;

  const user = await User.findOne({ email });

  return user;
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    if (!user.isVerified)
      return res
        .status(400)
        .json({ message: "Please verify your email before logging in" });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httponly: true,
      secure: true,
      maxage: 3600000,
    });

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    const resetURL = `${process.env.ROOT}/users/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      text: `Click the following link to reset your password: ${resetURL}`,
      html: `
        <p>Hello,</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetURL}">Reset Password</a>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    });

    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/reset-password", async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }, // Ensure token is still valid
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    res.render("reset-password", { token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = password; // This will trigger the `pre-save` hook to hash the password
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.redirect("/login"); // Redirect to login page after successful reset
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

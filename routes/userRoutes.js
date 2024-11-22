const express = require("express");
const User = require("../models/User");
const router = express.Router();
const transporter = require("../config/nodemailerConfig");
const crypto = require("crypto");

// Register a new user
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const verificationToken = crypto.randomBytes(512).toString("hex");

    const user = new User({ username, email, password, verificationToken });
    await user.save();

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

module.exports = router;

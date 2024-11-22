const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, required: true, default: false },
  verificationToken: { type: String, required: true },
  joinedAt: { type: Date, required: true, default: new Date() },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePasswords = function (candidatepassword) {
  return bcrypt.compare(candidatepassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;

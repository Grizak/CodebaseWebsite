const crypto = require("crypto");

const secret = crypto.randomBytes(512).toString("hex");

console.log(secret);

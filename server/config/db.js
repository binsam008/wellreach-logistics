// server/config/db.js
const mongoose = require("mongoose");

async function connect(uri) {
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("Mongo connection error:", err);
    throw err;
  }
}

module.exports = connect;

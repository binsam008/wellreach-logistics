// server/models/Job.js
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    jobNumber: { type: String, required: true, unique: true },
    truckDetails: String,
    driverName: String,
    routeTo: String,
    country: String, // added country
    cost: { type: Number, default: 0 }, // base/truck cost
    sale: { type: Number, default: 0 },
    clientName: String,
    status: { type: String, default: "open" }, // open / completed
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);

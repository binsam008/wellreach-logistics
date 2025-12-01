// server/index.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const connect = require("./config/db");

// routes
const auth = require("./routes/auth");
const jobs = require("./routes/jobs");
const invoices = require("./routes/invoices");

// models
const Admin = require("./models/Admin");
const Job = require("./models/Job"); // 👈 needed for tracking lookup
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(bodyParser.json());

async function seedAdmin() {
  const pass = process.env.ADMIN_PASS || "admin123";
  const hash = await bcrypt.hash(pass, 10);

  await Admin.findOneAndUpdate(
    { username: "admin" },
    { username: "admin", passwordHash: hash },
    { upsert: true }
  );

  console.log("Admin patched or created");
}

// MOUNT API ROUTES (protected by JWT where needed)
app.use("/api/auth", auth);
app.use("/api/jobs", jobs);
app.use("/api/invoices", invoices);

/**
 * PUBLIC TRACKING ENDPOINT
 * GET /track/:id
 * - No auth (clients use this)
 * - Looks up Job by jobNumber
 */
app.get("/track/:id", async (req, res) => {
  try {
    const jobNumber = req.params.id;

    // Find job by jobNumber (tracking ID)
    const job = await Job.findOne({ jobNumber });

    if (!job) {
      return res.json({
        id: jobNumber,
        found: false,
        message: "No shipment found",
      });
    }

    return res.json({
      id: job.jobNumber,
      found: true,
      customer: job.clientName || "",
      status: job.status || "open",
      route: job.routeTo || "",
      truck: job.truckDetails || "",
      driver: job.driverName || "",
      cost: job.cost ?? 0,
      sale: job.sale ?? 0,
      createdAt: job.createdAt,
    });
  } catch (err) {
    console.error("Track error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/wellreach";

connect(MONGO_URI)
  .then(async () => {
    await seedAdmin();
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
  });

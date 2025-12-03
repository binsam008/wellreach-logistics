// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// DB connect util
const connect = require("./config/db");

// Routers
const auth = require("./routes/auth");
const jobs = require("./routes/jobs");
const invoices = require("./routes/invoices");

// Models / utils used by seeding & public endpoints
const Admin = require("./models/Admin");
const Job = require("./models/Job");
const bcrypt = require("bcryptjs");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Simple logger
app.use((req, res, next) => {
  console.log(`>>> ${req.method} ${req.originalUrl}`);
  next();
});

// Health check
app.get("/api/ping", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

// Minimal debug endpoint
app.get("/api/debug/info", (req, res) => {
  res.json({
    message: "WellReach backend",
    env: {
      port: process.env.PORT,
      hasMongoURI: !!process.env.MONGO_URI,
      adminPassLoaded: !!process.env.ADMIN_PASS,
    },
  });
});

// Seed admin user
async function seedAdmin() {
  try {
    const pass = process.env.ADMIN_PASS || "admin123";
    const hash = await bcrypt.hash(pass, 10);

    await Admin.findOneAndUpdate(
      { username: "admin" },
      { username: "admin", passwordHash: hash },
      { upsert: true }
    );

    console.log("✅ Admin patched or created");
  } catch (err) {
    console.error("seedAdmin error:", err);
  }
}

// Mount API routers
app.use("/api/auth", auth);
app.use("/api/jobs", jobs);
app.use("/api/invoices", invoices);

// Public tracking endpoint
app.get("/track/:id", async (req, res) => {
  try {
    const job = await Job.findOne({ jobNumber: req.params.id });

    if (!job) {
      return res.json({
        id: req.params.id,
        found: false,
        message: "No shipment found",
      });
    }

    return res.json({
      id: job.jobNumber,
      found: true,
      customer: job.clientName,
      status: job.status,
      route: job.routeTo,
      truck: job.truckDetails,
      driver: job.driverName,
      cost: job.cost,
      sale: job.sale,
      createdAt: job.createdAt,
    });
  } catch (err) {
    console.error("Track error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * IMPORTANT FIX:
 * Use "/api" (not "/api/*") in the 404 handler — "/api" will match any path under /api (express mounts sub-paths),
 * but doesn't use the problematic path-to-regexp pattern that caused the PathError.
 */
app.use("/api", (req, res) => {
  // If a request reached here then no router matched under /api
  res.status(404).json({ error: "API route not found", path: req.originalUrl });
});

// You may uncomment this block to serve a SPA build from server (adjust path as needed)
// const clientBuild = path.join(__dirname, "..", "client", "dist");
// const clientIndex = path.join(clientBuild, "index.html");
// if (fs.existsSync(clientBuild)) {
//   app.use(express.static(clientBuild));
//   app.get("*", (req, res) => res.sendFile(clientIndex));
// }

// Start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/wellreach";

connect(MONGO_URI)
  .then(async () => {
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`  - Auth routes:   http://localhost:${PORT}/api/auth/...`);
      console.log(`  - Jobs routes:   http://localhost:${PORT}/api/jobs`);
      console.log(`  - Invoices:      http://localhost:${PORT}/api/invoices`);
      console.log(`  - Track public:  http://localhost:${PORT}/track/:id`);
      console.log(`  - Health:        http://localhost:${PORT}/api/ping`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });

// Graceful shutdown handlers
process.on("SIGINT", () => {
  console.log("SIGINT received — shutting down");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down");
  process.exit(0);
});

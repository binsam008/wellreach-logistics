// server/routes/jobs.js
const express = require("express");
const Job = require("../models/Job");
const Invoice = require("../models/Invoice"); // used for cascade delete if desired
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/jobs  (protected) – list all
router.get("/", auth, async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    console.error("Jobs fetch error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// POST /api/jobs  (protected) – create single job
router.post("/", auth, async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();
    res.status(201).json(job);
  } catch (err) {
    console.error("Job create error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// POST /api/jobs/bulk  (protected) – create many jobs at once
router.post("/bulk", auth, async (req, res) => {
  try {
    const { jobs } = req.body;

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No jobs provided for bulk import",
      });
    }

    // Optional: basic cleaning of each job
    const prepared = jobs.map((j) => ({
      jobNumber: j.jobNumber,
      clientName: j.clientName,
      truckDetails: j.truckDetails,
      driverName: j.driverName,
      routeTo: j.routeTo,
      country: j.country || "Bahrain",
      cost: Number(j.cost) || 0,
      sale: Number(j.sale) || 0,
      status: j.status || "DOCUMENT RECEIVED",
    }));

    const created = await Job.insertMany(prepared, { ordered: false });

    res.status(201).json({
      success: true,
      message: "Bulk jobs imported",
      count: created.length,
      jobs: created,
    });
  } catch (err) {
    console.error("Bulk jobs import error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to import jobs",
      error: err.message,
    });
  }
});

// GET /api/jobs/:id  (protected)
router.get("/:id", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job)
      return res
        .status(404)
        .json({ success: false, message: "Job not found" });
    res.json(job);
  } catch (err) {
    console.error("Job fetch error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// PUT /api/jobs/:id  (protected)
router.put("/:id", auth, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!job)
      return res
        .status(404)
        .json({ success: false, message: "Job not found" });
    res.json({ success: true, job });
  } catch (err) {
    console.error("Job update error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// DELETE /api/jobs/:id  (protected) – delete a job and optionally cascade
router.delete("/:id", auth, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job)
      return res
        .status(404)
        .json({ success: false, message: "Job not found" });

    // Optional: delete invoices linked to this job to keep DB tidy
    await Invoice.deleteMany({ job: job._id });

    res.json({
      success: true,
      message: "Job deleted (and related invoices removed)",
    });
  } catch (err) {
    console.error("Job delete error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete job",
      error: err.message,
    });
  }
});

module.exports = router;

// server/routes/invoices.js
const express = require("express");
const Invoice = require("../models/Invoice");
const Job = require("../models/Job");
const auth = require("../middleware/auth");
const generateInvoicePDF = require("../utils/invoicePdf");

const router = express.Router();

// helper to compute summary shape used by frontend
function buildSummary(inv) {
  const job = inv.job;
  const total =
    inv.finalSale ??
    inv.baseCost ??
    (job ? job.sale : 0) ??
    0;
  const paid = Number(inv.paidAmount || 0);
  const balance = total - paid;

  return {
    _id: inv._id,
    invoiceNumber: inv.invoiceNumber,
    jobNumber: job?.jobNumber,
    clientName: inv.clientName,
    status: inv.status,
    currency: inv.currency || "BHD",
    total,
    paidAmount: paid,
    balance,
    createdAt: inv.createdAt,
  };
}

// GET /api/invoices  (protected) – list invoices for Billing panel
router.get("/", auth, async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("job")
      .sort({ createdAt: -1 });

    const data = invoices.map(buildSummary);
    res.json(data);
  } catch (err) {
    console.error("Get invoices error:", err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// POST /api/invoices/from-job/:jobId  (protected) – create invoice from job
router.post("/from-job/:jobId", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const count = await Invoice.countDocuments();
    const invoiceNumber = `WR-${new Date().getFullYear()}-${String(
      count + 1
    ).padStart(4, "0")}`;

    const invoice = await Invoice.create({
      invoiceNumber,
      job: job._id,
      clientName: job.clientName || "Walk-in Customer",
      baseCost: job.cost,
      finalCost: job.cost,
      finalSale: job.sale,
      currency: "BHD",
      paidAmount: 0,
      status: "billed",
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error("Create invoice from job error:", err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// PUT /api/invoices/:id/pay  (protected) – record a payment
router.put("/:id/pay", auth, async (req, res) => {
  try {
    const { amount } = req.body;

    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      return res
        .status(400)
        .json({ error: "Payment amount must be a positive number" });
    }

    const invoice = await Invoice.findById(req.params.id).populate("job");
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const job = invoice.job;
    const total =
      invoice.finalSale ??
      invoice.baseCost ??
      (job ? job.sale : 0) ??
      0;

    let newPaid = Number(invoice.paidAmount || 0) + parsed;

    // don't allow paying more than total
    if (newPaid > total) newPaid = total;

    invoice.paidAmount = newPaid;

    await invoice.save();

    // reload with populate (in case)
    const updated = await Invoice.findById(invoice._id).populate("job");

    res.json(buildSummary(updated));
  } catch (err) {
    console.error("Invoice payment error:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// GET /api/invoices/:id/pdf  (protected) – stream PDF
router.get("/:id/pdf", auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("job");
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const job = invoice.job;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${invoice.invoiceNumber}.pdf`
    );

    generateInvoicePDF(invoice, job, res);
  } catch (err) {
    console.error("PDF error:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

module.exports = router;

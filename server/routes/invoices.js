// server/routes/invoices.js
const express = require("express");
const Invoice = require("../models/Invoice");
const Job = require("../models/Job");
const auth = require("../middleware/auth");
const generateInvoiceDoc = require("../utils/invoicePdf");

const router = express.Router();

function deriveTaxAndCurrencyFromCountry(country = "") {
  const c = String(country || "").toLowerCase();
  if (c.includes("india")) return { taxPercent: 18, currency: "INR" };
  // default Bahrain
  return { taxPercent: 10, currency: "BHD" };
}

// helper to compute summary shape used by frontend
function buildSummary(inv) {
  const job = inv.job;
  const extrasSum = (inv.extraCosts || []).reduce(
    (s, e) => s + Number(e?.amount || 0),
    0
  );
  const base = Number(inv.baseCost ?? (job ? job.cost : 0) ?? 0);
  const discount = Number(inv.discount || 0);
  const taxPercent = Number(inv.taxPercent || 0);

  const subtotal = base + extrasSum;
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = Math.round((taxable * (taxPercent / 100)) * 1000) / 1000;
  const computedFinalSale = Number((taxable + taxAmount).toFixed(3));

  const total = inv.finalSale != null ? Number(inv.finalSale) : computedFinalSale;
  const paid = Number(inv.paidAmount || 0);
  const balance = Number((total - paid).toFixed(3));

  return {
    _id: inv._id,
    invoiceNumber: inv.invoiceNumber,
    jobNumber: job?.jobNumber,
    clientName: inv.clientName,
    status: inv.status,
    currency: inv.currency || (job?.country && deriveTaxAndCurrencyFromCountry(job.country).currency) || "BHD",
    total,
    paidAmount: paid,
    balance,
    taxPercent: Number(inv.taxPercent || 0),
    country: inv.country || job?.country || "",
    createdAt: inv.createdAt,
  };
}

// GET /api/invoices  (protected) – list invoices for Billing panel
router.get("/", auth, async (req, res) => {
  try {
    const invoices = await Invoice.find().populate("job").sort({ createdAt: -1 });
    const data = invoices.map(buildSummary);
    res.json(data);
  } catch (err) {
    console.error("Get invoices error:", err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// GET /api/invoices/:id/full  (protected) – return full invoice with populated job
router.get("/:id/full", auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("job");
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    console.error("Get invoice full error:", err);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

// POST /api/invoices/from-job/:jobId  (protected) – create invoice from job
router.post("/from-job/:jobId", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const count = await Invoice.countDocuments();
    const invoiceNumber = `WR-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // Standard extra cost rows (pre-populated)
    const standardExtras = [
      { label: "Service Charge - Clearance Only", amount: 0 },
      { label: "Health Charges - MOH Paid", amount: 0 },
      { label: "BAS Charges - Port Paid", amount: 0 },
      { label: "Service - Transport & Delivery Charges", amount: 0 },
    ];

    // choose defaults based on job country
    const { taxPercent, currency } = deriveTaxAndCurrencyFromCountry(job.country || "");

    const invoice = await Invoice.create({
      invoiceNumber,
      job: job._id,
      clientName: job.clientName || "Walk-in Customer",
      clientAddress: job.routeTo || "",
      baseCost: job.cost || 0,
      finalCost: job.cost || 0,
      finalSale: job.sale || 0,
      extraCosts: standardExtras,
      currency: currency,
      paidAmount: 0,
      status: "billed",
      discount: 0,
      taxPercent,
      country: job.country || "",
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
      return res.status(400).json({ error: "Payment amount must be a positive number" });
    }

    const invoice = await Invoice.findById(req.params.id).populate("job");
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const extrasSum = (invoice.extraCosts || []).reduce((s, e) => s + Number(e?.amount || 0), 0);
    const base = Number(invoice.baseCost ?? invoice.job?.cost ?? 0);
    const discount = Number(invoice.discount || 0);
    const taxPercent = Number(invoice.taxPercent || 0);

    const subtotal = base + extrasSum;
    const taxable = Math.max(0, subtotal - discount);
    const taxAmount = Math.round((taxable * (taxPercent / 100)) * 1000) / 1000;
    const computedTotal = Number((taxable + taxAmount).toFixed(3));

    let newPaid = Number(invoice.paidAmount || 0) + parsed;
    if (newPaid > computedTotal) newPaid = computedTotal;

    invoice.paidAmount = newPaid;
    if (newPaid >= computedTotal) invoice.status = "paid";

    await invoice.save();
    const updated = await Invoice.findById(invoice._id).populate("job");
    res.json(buildSummary(updated));
  } catch (err) {
    console.error("Invoice payment error:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// PUT /api/invoices/:id/extra-costs (protected) – update extraCosts, discount, taxPercent
router.put("/:id/extra-costs", auth, async (req, res) => {
  try {
    const { extraCosts, discount, taxPercent, finalSale, country } = req.body;

    if (!Array.isArray(extraCosts)) {
      return res.status(400).json({ error: "extraCosts must be an array" });
    }

    const invoice = await Invoice.findById(req.params.id).populate("job");
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const normalized = extraCosts.map((it) => ({
      label: String(it.label || "").trim(),
      amount: Number(it.amount || 0),
    }));

    invoice.extraCosts = normalized;
    invoice.discount = Number(discount || 0);
    invoice.taxPercent = Number(taxPercent || invoice.taxPercent || 0);
    if (country) invoice.country = country;

    const extrasSum = normalized.reduce((s, e) => s + Number(e.amount || 0), 0);
    const base = Number(invoice.baseCost || invoice.job?.cost || 0);
    const subtotal = Number((base + extrasSum).toFixed(3));
    invoice.finalCost = subtotal;

    const taxable = Math.max(0, subtotal - Number(invoice.discount || 0));
    const taxAmount = Math.round((taxable * (Number(invoice.taxPercent || 0) / 100)) * 1000) / 1000;
    const computedFinalSale = Number((taxable + taxAmount).toFixed(3));

    invoice.finalSale = finalSale != null ? Number(finalSale) : computedFinalSale;

    await invoice.save();
    const updated = await Invoice.findById(invoice._id).populate("job");
    res.json(buildSummary(updated));
  } catch (err) {
    console.error("Update extraCosts error:", err);
    res.status(500).json({ error: "Failed to update invoice extra costs" });
  }
});

// DELETE /api/invoices/:id  (protected)
router.delete("/:id", auth, async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    await Invoice.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete invoice error:", err);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// GET /api/invoices/:id/pdf  (protected) – stream PDF
router.get("/:id/pdf", auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("job");
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const job = invoice.job || null;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${invoice.invoiceNumber || invoice._id}.pdf`
    );

    // generate un-piped doc
    const doc = generateInvoiceDoc(invoice, job);

    // pipe and end
    doc.pipe(res);
    doc.end();
    // errors will be logged by pdf util if thrown
  } catch (err) {
    console.error("PDF route error:", err);
    if (!res.headersSent) return res.status(500).json({ error: "Failed to generate PDF" });
    res.end();
  }
});

module.exports = router;

// server/utils/invoicePdf.js
const PDFDocument = require("pdfkit");

function formatDate(d) {
  try {
    if (!d) return "";
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

/**
 * Stream an invoice PDF directly to the response.
 * This function is called from the invoices route.
 *
 * @param {Object} invoice - Invoice mongoose document
 * @param {Object|null} job - Populated Job document (or null)
 * @param {Object} res - Express response
 */
function streamInvoicePDF(invoice, job, res) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // HEADERS
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=invoice-${invoice.invoiceNumber || invoice._id}.pdf`
  );

  // Pipe PDF to response
  doc.pipe(res);

  // ================= HEADER =================
  doc.fontSize(20).text("INVOICE", { align: "right" });
  doc.moveDown();

  doc.fontSize(12).text(`Invoice No: ${invoice.invoiceNumber || invoice._id}`);
  doc.text(`Date: ${formatDate(invoice.issuedAt || invoice.createdAt || Date.now())}`);
  doc.moveDown();

  // Company block (customize as you like)
  doc
    .fontSize(14)
    .text("Wellreach Logistics WLL", { align: "left" })
    .fontSize(10)
    .text("Kingdom of Bahrain")
    .moveDown();

  // ================= CUSTOMER / JOB INFO =================
  doc.fontSize(12).text("Bill To:", { underline: true });
  doc.text(invoice.clientName || job?.clientName || "Walk-in Customer");
  if (invoice.clientAddress || job?.routeTo) {
    doc.text(invoice.clientAddress || job?.routeTo);
  }
  doc.moveDown();

  if (job) {
    doc.text(`Job No: ${job.jobNumber || ""}`);
    doc.text(`From: ${job.routeFrom || job.routeFromLocation || ""}`);
    doc.text(`To: ${job.routeTo || job.routeToLocation || ""}`);
    if (job.vehicleNumber) doc.text(`Vehicle: ${job.vehicleNumber}`);
    doc.moveDown();
  }

  // ================= CHARGES / ITEMS =================
  doc.fontSize(12).text("Charges / Items:", { underline: true });

  // If you have itemized lines, render them
  if (Array.isArray(invoice.items) && invoice.items.length > 0) {
    invoice.items.forEach((item) => {
      const desc = item.description || "";
      const qty = item.qty || 1;
      const rate = item.rate || 0;
      const amount = item.amount || qty * rate;
      doc.text(`${desc} — ${qty} x ${rate} = ${amount}`);
    });
    doc.moveDown();
  }

  // Extra costs summary (if available)
  if (Array.isArray(invoice.extraCosts) && invoice.extraCosts.length > 0) {
    doc.moveDown().text("Extra Costs:", { underline: true });
    invoice.extraCosts.forEach((e) => {
      doc.text(`${e.label || ""}: ${e.amount || 0}`);
    });
    doc.moveDown();
  }

  // ================= TOTALS =================
  const baseCost = Number(invoice.baseCost || 0);
  const extrasSum = Array.isArray(invoice.extraCosts)
    ? invoice.extraCosts.reduce((s, e) => s + Number(e.amount || 0), 0)
    : 0;

  const discount = Number(invoice.discount || 0);
  const taxPercent = Number(invoice.taxPercent || 0);

  const subTotal = Number((baseCost + extrasSum).toFixed(3));
  const taxable = Math.max(0, subTotal - discount);
  const taxAmount = Number(((taxable * taxPercent) / 100).toFixed(3));
  const computedTotal = Number((taxable + taxAmount).toFixed(3));
  const grandTotal =
    invoice.finalSale != null ? Number(invoice.finalSale) : computedTotal;

  doc.moveDown();
  doc.text(`Subtotal: ${subTotal}`);
  doc.text(`Discount: ${discount}`);
  doc.text(`Tax (${taxPercent}%): ${taxAmount}`);
  doc.moveDown();
  doc.fontSize(14).text(`Grand Total: ${grandTotal}`, { underline: true });

  // Paid & balance
  const paidAmount = Number(invoice.paidAmount || 0);
  const balance = Number((grandTotal - paidAmount).toFixed(3));
  doc.moveDown();
  doc.fontSize(12).text(`Paid: ${paidAmount}`);
  doc.text(`Balance: ${balance}`);

  // ================= FOOTER =================
  doc.moveDown().moveDown();
  doc
    .fontSize(10)
    .text(
      "Thank you for choosing Wellreach Logistics.",
      { align: "center" }
    );

  doc.end();
}

module.exports = { streamInvoicePDF };

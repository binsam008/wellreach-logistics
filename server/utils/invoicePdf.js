// server/utils/invoicePdf.js
// Returns an un-piped PDFDocument instance. Caller must pipe() it and call doc.end().
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Brand colors
const BRAND_PURPLE = "#6d28d9";
const BRAND_ORANGE = "#fb923c";

// Helpers
function formatAmount(num, decimals = 3) {
  if (num == null) num = 0;
  return Number(num).toFixed(decimals);
}
function formatWithCurrency(num, currency = "BHD") {
  return `${formatAmount(num)} ${currency}`;
}
function amountToWordsBHD(amount) {
  const small = [
    "zero","one","two","three","four","five","six","seven","eight","nine",
    "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
    "seventeen","eighteen","nineteen",
  ];
  const tens = ["","", "twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

  function toWords(n) {
    n = Math.floor(n);
    if (n < 20) return small[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + small[n % 10] : "");
    if (n < 1000) return small[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + toWords(n % 100) : "");
    if (n < 1000000) return toWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + toWords(n % 1000) : "");
    return String(n);
  }

  const whole = Math.floor(amount || 0);
  const fils = Math.round(((amount || 0) - whole) * 1000);
  const wholePart = toWords(whole);
  let filsPart = "zero fils";
  if (fils > 0) filsPart = toWords(fils) + " fils";
  return wholePart.charAt(0).toUpperCase() + wholePart.slice(1) + " BHD " + filsPart;
}

function safeExists(p) {
  try {
    return fs.existsSync(p);
  } catch (e) {
    return false;
  }
}

function resolveBankDetails(invoice, job) {
  // prefer invoice.bankDetails if present (object)
  if (invoice && invoice.bankDetails && typeof invoice.bankDetails === "object") {
    return invoice.bankDetails;
  }
  const country = ((invoice?.country) || (job?.country) || "").toLowerCase();
  if (country.includes("india")) {
    return {
      bankName: process.env.INDIA_BANK_NAME || "State Bank of India",
      accountNumber: process.env.INDIA_ACCOUNT_NUMBER || "XXXXXXXXXXXX",
      branchInfo: process.env.INDIA_BRANCH || "Mumbai Branch",
      ifsc: process.env.INDIA_IFSC || "IFSC0000000",
      swift: process.env.INDIA_SWIFT || "",
    };
  }
  // default Bahrain
  return {
    bankName: process.env.BAHRAIN_BANK_NAME || "Kuwait Finance House B.S.C. (c)",
    accountNumber: process.env.BAHRAIN_ACCOUNT_NUMBER || "0009451698001",
    iban: process.env.BAHRAIN_IBAN || "BH36AUBB00009451698001",
    swift: process.env.BAHRAIN_SWIFT || "AUBBBHBM",
  };
}

/**
 * generateInvoiceDoc(invoice, job)
 * Returns an un-piped PDFDocument (caller must doc.pipe(res); doc.end();)
 */
function generateInvoiceDoc(invoice = {}, job = {}) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // Compute currency from invoice or country
  const country = ((invoice?.country) || (job?.country) || "").toLowerCase();
  const currency = invoice.currency || (country.includes("india") ? "INR" : "BHD");

  // assets
  const assetsDir = path.join(__dirname, "..", "assets");
  const logoPath = path.join(assetsDir, "logo.png");
  const stampPath = path.join(assetsDir, "stamp.png");

  // layout
  const rightX = 380;
  const tableLeft = 40;

  // Header: logo left
  try {
    if (safeExists(logoPath)) {
      doc.image(logoPath, 40, 28, { width: 76, height: 40, fit: [76, 40] });
    }
  } catch (err) {
    // ignore image errors
    // console.error("logo load:", err && err.message);
  }

  // Title (WELL REACH in purple, LOGISTICS in orange) on same line to avoid overlap
  const titleY = 32;
doc.font("Helvetica-Bold").fontSize(22).fillColor(BRAND_PURPLE) .text("WELL REACH", 120, 30, { width: rightX - 120, align: "left" }); doc.font("Helvetica-Bold").fontSize(22).fillColor(BRAND_ORANGE) .text("LOGISTICS", 120, 50, { width: rightX - 120, align: "left" });

  // Right column: TAX INVOICE and metadata (place below title row)
  const metaYStart = titleY; // align with top of title
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text("TAX INVOICE", rightX, metaYStart, { align: "left" });

  const metaLineY = metaYStart + 16;
  doc.font("Helvetica").fontSize(9).fillColor("#6b7280")
    .text(`Invoice Number: ${invoice.invoiceNumber || ""}`, rightX, metaLineY)
    .text(`Invoice Date: ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("en-GB") : ""}`, rightX, metaLineY + 14);

  if (invoice.clientMobile) {
    doc.text(`Customer Mobile: ${invoice.clientMobile}`, rightX, metaLineY + 28);
  }

  // Move y below header area
  let y = metaLineY + 50;

  // We removed Billing Address section (user requested)
  // Show client name as a small label (not full address)
  if (invoice.clientName || job?.clientName) {
    doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(invoice.clientName || job?.clientName || "", tableLeft, y);
    y += 18;
  }

  // Items table header
  y += 2;
  const colWidths = { index: 25, name: 200, qty: 60, unit: 70, discount: 60, vat: 50, total: 70 };
  doc.rect(tableLeft, y, 515, 20).fill("#f3f4f6");
  doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold")
    .text("#", tableLeft + 5, y + 5, { width: colWidths.index, align: "left" })
    .text("Name", tableLeft + colWidths.index + 5, y + 5, { width: colWidths.name, align: "left" })
    .text("Quantity", tableLeft + colWidths.index + colWidths.name + 5, y + 5, { width: colWidths.qty, align: "center" })
    .text("Unit price", tableLeft + colWidths.index + colWidths.name + colWidths.qty + 5, y + 5, { width: colWidths.unit, align: "right" })
    .text("Discount", tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + 5, y + 5, { width: colWidths.discount, align: "right" })
    .text("VAT%", tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + 5, y + 5, { width: colWidths.vat, align: "right" })
    .text("Total", tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + colWidths.vat + 5, y + 5, { width: colWidths.total, align: "right" });

  y += 20;
  doc.moveTo(tableLeft, y).lineTo(tableLeft + 515, y).strokeColor("#e5e7eb").stroke();

  // Build line items (base + extras)
  const lineItems = [];
  // Use invoice.baseCost (editable) falling back to job.cost
  const baseAmount = Number(invoice.baseCost ?? job?.cost ?? 0);
  if (baseAmount > 0) {
    lineItems.push({ name: "Transport", qty: 1, unitPrice: baseAmount, discount: 0, vat: 0, total: baseAmount });
  }

  (invoice.extraCosts || []).forEach((it) => {
    if (!it) return;
    const label = (it.label || "").trim();
    const amt = Number(it.amount || 0);
    if (label) lineItems.push({ name: label, qty: 1, unitPrice: amt, discount: 0, vat: 0, total: amt });
  });

  // Render rows
  doc.font("Helvetica").fontSize(9).fillColor("#111827");
  lineItems.forEach((item, idx) => {
    const rowHeight = 18;
    y += 4;
    doc
      .text(String(idx + 1), tableLeft + 5, y, { width: colWidths.index, align: "left" })
      .text(item.name, tableLeft + colWidths.index + 5, y, { width: colWidths.name, align: "left" })
      .text(String(item.qty), tableLeft + colWidths.index + colWidths.name + 5, y, { width: colWidths.qty, align: "center" })
      .text(formatAmount(item.unitPrice), tableLeft + colWidths.index + colWidths.name + colWidths.qty + 5, y, { width: colWidths.unit, align: "right" })
      .text(formatAmount(item.discount || 0), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + 5, y, { width: colWidths.discount, align: "right" })
      .text(formatAmount(item.vat || 0), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + 5, y, { width: colWidths.vat, align: "right" })
      .text(formatAmount(item.total || 0), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + colWidths.vat + 5, y, { width: colWidths.total, align: "right" });

    y += rowHeight;
    doc.moveTo(tableLeft, y).lineTo(tableLeft + 515, y).strokeColor("#f3f4f6").stroke();
  });

  // Totals computation
  const subtotal = lineItems.reduce((s, li) => s + (Number(li.total || 0)), 0);
  const discount = Number(invoice.discount || 0);
  const taxPercent = Number(invoice.taxPercent || 0);
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = Math.round((taxable * (taxPercent / 100)) * 1000) / 1000;
  const computedFinalSale = Number((taxable + taxAmount).toFixed(3));
  const totalToShow = computedFinalSale;
  const paid = Number(invoice.paidAmount || 0);
  const balance = Number((totalToShow - paid).toFixed(3));

  // Discount row (show only if discount > 0 or if you want always to display, modify accordingly)
  if (discount > 0) {
    y += 4;
    doc
      .text("", tableLeft + 5, y, { width: colWidths.index })
      .text("Discount", tableLeft + colWidths.index + 5, y, { width: colWidths.name, align: "left" })
      .text("", tableLeft + colWidths.index + colWidths.name + 5, y, { width: colWidths.qty })
      .text("", tableLeft + colWidths.index + colWidths.name + colWidths.qty + 5, y, { width: colWidths.unit })
      .text(formatAmount(discount), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + 5, y, { width: colWidths.discount, align: "right" })
      .text("", tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + 5, y, { width: colWidths.vat })
      .text(formatAmount(-discount), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + colWidths.vat + 5, y, { width: colWidths.total, align: "right" });
    y += 18;
    doc.moveTo(tableLeft, y).lineTo(tableLeft + 515, y).strokeColor("#f3f4f6").stroke();
  }

  // Tax row (show tax percentage and computed tax amount)
  if (taxPercent > 0) {
    y += 4;
    doc
      .text("", tableLeft + 5, y, { width: colWidths.index })
      .text(`Tax (${taxPercent}%)`, tableLeft + colWidths.index + 5, y, { width: colWidths.name, align: "left" })
      .text("", tableLeft + colWidths.index + colWidths.name + 5, y, { width: colWidths.qty })
      .text("", tableLeft + colWidths.index + colWidths.name + colWidths.qty + 5, y, { width: colWidths.unit })
      .text("", tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + 5, y, { width: colWidths.discount })
      .text(String(taxPercent), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + 5, y, { width: colWidths.vat, align: "right" })
      .text(formatAmount(taxAmount), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + colWidths.vat + 5, y, { width: colWidths.total, align: "right" });
    y += 18;
    doc.moveTo(tableLeft, y).lineTo(tableLeft + 515, y).strokeColor("#f3f4f6").stroke();
  }

  // Amount in words
  y += 20;
  doc.font("Helvetica").fontSize(9).fillColor("#111827").text("Amount In Words: " + amountToWordsBHD(totalToShow), tableLeft, y);

  // Totals box on right
  const totalsX = rightX;
  const totalsY = y - 10;
  doc.fontSize(9).fillColor("#4b5563").text("Total", totalsX, totalsY, { width: 120, align: "right" });
  doc.fontSize(9).fillColor("#111827").text(formatWithCurrency(totalToShow, currency), totalsX + 125, totalsY, { width: 80, align: "right" });
  doc.fontSize(9).fillColor("#4b5563").text("Paid", totalsX, totalsY + 14, { width: 120, align: "right" });
  doc.fontSize(9).fillColor("#111827").text(formatWithCurrency(paid, currency), totalsX + 125, totalsY + 14, { width: 80, align: "right" });
  doc.fontSize(9).fillColor("#4b5563").text("Balance due", totalsX, totalsY + 28, { width: 120, align: "right" });
  doc.fontSize(9).fillColor("#111827").text(formatWithCurrency(balance, currency), totalsX + 125, totalsY + 28, { width: 80, align: "right" });
  doc.fontSize(10).fillColor("#0f172a").text("Total Due", totalsX, totalsY + 44, { width: 120, align: "right" });
  doc.fontSize(10).fillColor("#0f172a").text(formatWithCurrency(totalToShow, currency), totalsX + 125, totalsY + 44, { width: 80, align: "right" });

  // Bank details (country-aware)
  const bank = resolveBankDetails(invoice, job);
  const bankY = totalsY + 90;
  doc.font("Helvetica").fontSize(9).fillColor("#111827").text("Please make the payment to our bank account at:", tableLeft, bankY);
  if (country.includes("india")) {
    doc.fontSize(9).text(`Bank name: ${bank.bankName}`, tableLeft, bankY + 16)
      .text(`Account Number: ${bank.accountNumber}`, tableLeft, bankY + 30)
      .text(`IFSC: ${bank.ifsc || bank.branchInfo || ""}`, tableLeft, bankY + 44)
      .text(`${bank.branchInfo || ""}`, tableLeft, bankY + 58);
  } else {
    doc.fontSize(9).text(`Bank name: ${bank.bankName}`, tableLeft, bankY + 16)
      .text(`Account Number: ${bank.accountNumber}`, tableLeft, bankY + 30);
    if (bank.iban) doc.text(`IBAN: ${bank.iban}`, tableLeft, bankY + 44);
    if (bank.swift) doc.text(`Swift Code: ${bank.swift}`, tableLeft, bankY + 58);
  }

  // Optional stamp (if asset present)
  try {
    if (safeExists(stampPath)) {
      const stampW = 120;
      const px = tableLeft + 380;
      const py = Math.min(700, bankY + 20);
      doc.image(stampPath, px, py, { width: stampW });
    }
  } catch (err) {
    // ignore stamp errors
  }

  // Footer page number
  doc.fontSize(8).fillColor("#9ca3af").text("Page 1 of 1", 40, 800, { align: "right" });

  // return un-piped doc — caller must pipe it to response
  return doc;
}

module.exports = generateInvoiceDoc;

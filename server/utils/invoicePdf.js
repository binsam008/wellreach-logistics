// server/utils/invoicePdf.js
const PDFDocument = require("pdfkit");
const path = require("path");

// ---- helpers ----
function formatAmount(num, decimals = 3) {
  if (num == null || !isFinite(num)) num = 0;
  return Number(num).toFixed(decimals);
}

function formatWithCurrency(num, currency = "BHD") {
  return `${formatAmount(num)} ${currency}`;
}

// amount in words – supports BHD (fils) and INR (paise)
function amountToWords(amount, currency = "BHD") {
  if (!isFinite(amount)) amount = 0;

  const small = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];

  function toWords(n) {
    n = Math.floor(n);
    if (n < 20) return small[n];
    if (n < 100) {
      return (
        tens[Math.floor(n / 10)] + (n % 10 ? " " + small[n % 10] : "")
      );
    }
    if (n < 1000) {
      return (
        small[Math.floor(n / 100)] +
        " hundred" +
        (n % 100 ? " " + toWords(n % 100) : "")
      );
    }
    if (n < 1000000) {
      return (
        toWords(Math.floor(n / 1000)) +
        " thousand" +
        (n % 1000 ? " " + toWords(n % 1000) : "")
      );
    }
    return String(n);
  }

  const whole = Math.floor(amount);
  const minor = Math.round((amount - whole) * 1000); // 3 decimals

  const isINR = (currency || "").toUpperCase() === "INR";
  const mainLabel = isINR ? "INR" : "BHD";
  const minorLabel = isINR ? "paise" : "fils";

  const mainPart = toWords(whole);
  const minorPart =
    minor > 0 ? `${toWords(minor)} ${minorLabel}` : `zero ${minorLabel}`;

  // Capitalize first letter
  const capMain = mainPart.charAt(0).toUpperCase() + mainPart.slice(1);

  return `${capMain} ${mainLabel} ${minorPart}`;
}

// ---- MAIN PDF GENERATOR ----
function generateInvoicePDF(invoice, job, stream) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(stream);

  const currency = invoice.currency || "BHD";
  const jobCost = job?.cost ?? 0;
  const createdAt = invoice.createdAt
    ? new Date(invoice.createdAt)
    : new Date();
  const countryRaw = (invoice.country || job?.country || "").toLowerCase();
  const isIndia =
    countryRaw.includes("india") ||
    countryRaw.includes("bharat") ||
    countryRaw === "in";

  // Short tax label: GST for India, VAT for Bahrain
  const taxLabelShort = isIndia ? "GST" : "VAT";

  // ===========================
  // 1️⃣  LOGO
  // ===========================
  const logoPath = path.join(__dirname, "..", "assets", "logo.png");

  try {
    doc.image(logoPath, 40, 30, { width: 80 });
  } catch (err) {
    console.error("Logo not found:", err.message);
    doc.fontSize(14).text("WELL REACH LOGISTICS", 40, 40);
  }

  // ===========================
  // 2️⃣  COMPANY DETAILS (MIDDLE)
  // ===========================
  doc.fontSize(13).fillColor("#0f172a").text(
    "WELL REACH LOGISTICS SERVICES",
    140,
    35,
    { width: 260 }
  );

  // 👉 For Bahrain: show Bahrain address
  // 👉 For India: NO Bahrain address (as you requested)
  if (!isIndia) {
    doc
      .fontSize(9)
      .fillColor("#6b7280")
      .text(
        "Office #2, Building 1698, Block 608, Road 845,\nWadiyan, Sitra, Kingdom of Bahrain.",
        140,
        55,
        { width: 260 }
      );
  }

  // ===========================
  // 3️⃣  TAX INVOICE (RIGHT)
  // ===========================
  const rightX = 420;

  doc
    .fontSize(12)
    .fillColor("#0f172a")
    .text("TAX INVOICE", rightX, 35, { width: 150, align: "left" });

  doc
    .fontSize(9)
    .fillColor("#4b5563")
    .text(`Invoice Number: ${invoice.invoiceNumber}`, rightX, 55, {
      width: 150,
    })
    .text(
      `Invoice Date: ${createdAt.toLocaleDateString("en-GB")}`,
      rightX,
      68,
      { width: 150 }
    );

  if (invoice.clientMobile) {
    doc.text(`Mobile: ${invoice.clientMobile}`, rightX, 82, { width: 150 });
  }

  // ===========================
  // 4️⃣  BILLING ADDRESS
  // ===========================
  let y = 120;

  doc.fontSize(11).fillColor("#0f172a").text("Billing Address", 40, y);

  y += 16;

  doc
    .fontSize(10)
    .fillColor("#111827")
    .text(invoice.clientName || job?.clientName || "", 40, y);

  y += 14;

  const addrLines = invoice.clientAddress?.split("\n") || [job?.routeTo || ""];
  doc.fontSize(9).fillColor("#4b5563");

  addrLines.forEach((line) => {
    if (!line) return;
    doc.text(line, 40, y);
    y += 12;
  });

  // ===========================
  // 5️⃣  ITEM TABLE
  // ===========================
  y += 16;

  const tableLeft = 40;
  const col = {
    i: 25,
    name: 170,
    qty: 50,
    unit: 70,
    disc: 60,
    vat: 40,
    total: 70,
  };

  // Header background
  doc.rect(tableLeft, y, 515, 20).fill("#f3f4f6");

  doc
    .fillColor("#374151")
    .fontSize(9)
    .text("#", tableLeft + 5, y + 5, { width: col.i })
    .text("Name", tableLeft + col.i + 5, y + 5, { width: col.name })
    .text("Qty", tableLeft + col.i + col.name + 5, y + 5, {
      width: col.qty,
      align: "center",
    })
    .text("Unit", tableLeft + col.i + col.name + col.qty + 5, y + 5, {
      width: col.unit,
      align: "right",
    })
    .text("Disc", tableLeft + col.i + col.name + col.qty + col.unit + 5, y + 5, {
      width: col.disc,
      align: "right",
    })
    // 🔁 here we change header from fixed "VAT" to dynamic "VAT" / "GST"
    .text(
      taxLabelShort,
      tableLeft + col.i + col.name + col.qty + col.unit + col.disc + 5,
      y + 5,
      { width: col.vat, align: "right" }
    )
    .text(
      "Total",
      tableLeft +
        col.i +
        col.name +
        col.qty +
        col.unit +
        col.disc +
        col.vat +
        5,
      y + 5,
      { width: col.total, align: "right" }
    );

  // ITEM ROWS
  y += 25;
  doc.moveTo(tableLeft, y).lineTo(tableLeft + 515, y).stroke("#e5e7eb");

  const lineItems = [];

  const baseAmount = invoice.baseCost ?? jobCost;
  if (baseAmount > 0) {
    lineItems.push({
      name: "Transport service charges",
      qty: 1,
      unit: baseAmount,
      disc: 0,
      vat: 0,
      total: baseAmount,
    });
  }

  (invoice.extraCosts || []).forEach((item) => {
    if (!item) return;
    const amt = Number(item.amount || 0);
    if (amt <= 0) return;

    lineItems.push({
      name: item.label || "Additional charge",
      qty: 1,
      unit: amt,
      disc: 0,
      vat: 0,
      total: amt,
    });
  });

  doc.fontSize(9).fillColor("#111827");

  lineItems.forEach((li, idx) => {
    y += 6;
    const rowY = y;

    doc.text(String(idx + 1), tableLeft + 5, rowY, { width: col.i });
    doc.text(li.name, tableLeft + col.i + 5, rowY, { width: col.name });
    doc.text(li.qty, tableLeft + col.i + col.name + 5, rowY, {
      width: col.qty,
      align: "center",
    });
    doc.text(
      formatAmount(li.unit),
      tableLeft + col.i + col.name + col.qty + 5,
      rowY,
      {
        width: col.unit,
        align: "right",
      }
    );
    doc.text(
      "0.000",
      tableLeft + col.i + col.name + col.qty + col.unit + 5,
      rowY,
      {
        width: col.disc,
        align: "right",
      }
    );
    // we’re not splitting tax per line, so show 0 here as before
    doc.text(
      "0.000",
      tableLeft +
        col.i +
        col.name +
        col.qty +
        col.unit +
        col.disc +
        5,
      rowY,
      {
        width: col.vat,
        align: "right",
      }
    );
    doc.text(
      formatAmount(li.total),
      tableLeft +
        col.i +
        col.name +
        col.qty +
        col.unit +
        col.disc +
        col.vat +
        5,
      rowY,
      {
        width: col.total,
        align: "right",
      }
    );

    y += 18;
    doc.moveTo(tableLeft, y).lineTo(tableLeft + 515, y).stroke("#f3f4f6");
  });

  // ===========================
  // 6️⃣  TOTALS + TAX (VAT/GST) + WORDS
  // ===========================
  const rawTotal = lineItems.reduce((s, li) => s + li.total, 0);

  // Try to read tax percent / amount if present; fall back safely
  const taxPercent =
    Number(invoice.taxPercent ?? invoice.taxRate ?? 0) || 0;

  // If invoice.taxAmount is provided, use it; else compute from percent
  const computedTaxAmount = (rawTotal * taxPercent) / 100;
  const taxAmount =
    invoice.taxAmount != null ? Number(invoice.taxAmount) : computedTaxAmount;

  // Final sale = provided value OR subtotal + tax
  const finalSale =
    invoice.finalSale != null
      ? Number(invoice.finalSale)
      : rawTotal + (taxAmount || 0);

  const paid = invoice.paidAmount ?? 0;
  const balance = finalSale - paid;

  y += 20;

  doc
    .fontSize(9)
    .fillColor("#111827")
    .text("Amount In Words: " + amountToWords(finalSale, currency), 40, y);

  const totalsX = 340;
  const ty = y - 10;

  // labels
  doc.fillColor("#4b5563").fontSize(9);
  doc.text("Subtotal", totalsX, ty, { width: 120, align: "right" });
  doc.text(
    `${taxLabelShort} (${taxPercent.toFixed(2)}%)`,
    totalsX,
    ty + 14,
    { width: 120, align: "right" }
  );
  doc.text("Total", totalsX, ty + 28, { width: 120, align: "right" });
  doc.text("Paid", totalsX, ty + 42, { width: 120, align: "right" });
  doc.text("Balance", totalsX, ty + 56, { width: 120, align: "right" });

  // values
  doc.fillColor("#111827");
  doc.text(formatWithCurrency(rawTotal, currency), totalsX + 130, ty, {
    width: 70,
    align: "right",
  });
  doc.text(formatWithCurrency(taxAmount || 0, currency), totalsX + 130, ty + 14, {
    width: 70,
    align: "right",
  });
  doc.text(formatWithCurrency(finalSale, currency), totalsX + 130, ty + 28, {
    width: 70,
    align: "right",
  });
  doc.text(formatWithCurrency(paid, currency), totalsX + 130, ty + 42, {
    width: 70,
    align: "right",
  });
  doc.text(formatWithCurrency(balance, currency), totalsX + 130, ty + 56, {
    width: 70,
    align: "right",
  });

  // ===========================
  // 7️⃣  BANK DETAILS (Bahrain vs India)
  // ===========================
  const bankY = ty + 90;

  const title = isIndia
    ? "Please make the payment to our Indian bank account:"
    : "Please make the payment to our bank account:";

  // ⚠️ EDIT THESE LINES to your real INDIAN account details
  const indianBankLines = [
    "Bank: State Bank of India",
    "Account: 000000000000",
    "IFSC: SBIN0000000",
    "Branch: Your Branch Name",
  ];

  const bahrainBankLines = [
    "Bank: Kuwait Finance House B.S.C. (c)",
    "Account: 0009451698001",
    "IBAN: BH36AUBB00009451698001",
    "SWIFT: AUBBBHBM",
  ];

  const bankLines = isIndia ? indianBankLines : bahrainBankLines;

  doc.fontSize(9).fillColor("#111827").text(title, 40, bankY);

  bankLines.forEach((line, idx) => {
    doc.text(line, 40, bankY + 16 + idx * 14);
  });

  // Footer
  doc.fontSize(8).fillColor("#9ca3af").text("Page 1 of 1", 40, 800, {
    align: "right",
  });

  doc.end();
}

// STREAM WRAPPER
function streamInvoicePDF(invoice, job, res) {
  try {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${invoice.invoiceNumber || invoice._id}.pdf`
    );
    generateInvoicePDF(invoice, job, res);
  } catch (err) {
    console.error("PDF ERROR:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF" });
    } else {
      res.end();
    }
  }
}

module.exports = { generateInvoicePDF, streamInvoicePDF };

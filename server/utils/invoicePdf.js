// server/utils/invoicePdf.js
const PDFDocument = require("pdfkit");

// ---- helpers ----
function formatAmount(num, decimals = 3) {
  if (num == null) num = 0;
  return Number(num).toFixed(decimals);
}

function formatWithCurrency(num, currency = "BHD") {
  return `${formatAmount(num)} ${currency}`;
}

// very simple Number → words for integer + fils (0–9999999)
function amountToWordsBHD(amount) {
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
        tens[Math.floor(n / 10)] +
        (n % 10 ? " " + small[n % 10] : "")
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
    return String(n); // fallback
  }

  const whole = Math.floor(amount);
  const fils = Math.round((amount - whole) * 1000); // 3-decimal

  const wholePart = toWords(whole);
  let filsPart = "zero fils";

  if (fils > 0) {
    filsPart = toWords(fils) + " fils";
  }

  return (
    wholePart.charAt(0).toUpperCase() +
    wholePart.slice(1) +
    " BHD " +
    filsPart
  );
}

// ---- main generator ----
function generateInvoicePDF(invoice, job, stream) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  doc.pipe(stream);

  const currency = invoice.currency || "BHD";

  // Precompute line items: base cost + extras
  const lineItems = [];

  const baseAmount = invoice.baseCost ?? job.cost ?? 0;
  if (baseAmount > 0) {
    lineItems.push({
      name: "Transport service charges",
      qty: 1,
      unitPrice: baseAmount,
      discount: 0,
      vat: 0,
      total: baseAmount,
    });
  }

  (invoice.extraCosts || []).forEach((item) => {
    if (!item) return;
    const amt = Number(item.amount || 0);
    lineItems.push({
      name: item.label || "Additional charge",
      qty: 1,
      unitPrice: amt,
      discount: 0,
      vat: 0,
      total: amt,
    });
  });

  const rawTotal = lineItems.reduce((s, li) => s + (li.total || 0), 0);
  const discount = Number(invoice.discount || 0);
  const totalAfterDiscount = rawTotal - discount;
  const finalSale =
    invoice.finalSale != null ? Number(invoice.finalSale) : totalAfterDiscount;
  const paid = Number(invoice.paidAmount || 0);
  const balance = finalSale - paid;

  // ---------- Header ----------
  // (Logo box placeholder – you can replace with an actual image)
  doc
    .rect(40, 30, 80, 40)
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .stroke();
  doc
    .fontSize(14)
    .fillColor("#0f172a")
    .text("WELL REACH", 45, 38);
  doc
    .fontSize(9)
    .fillColor("#f97316")
    .text("Logistics Services", 45, 55);

  // Company name + address
  doc
    .fontSize(16)
    .fillColor("#0f172a")
    .text("WELL REACH LOGISTICS SERVICES", 140, 35);

  doc
    .fontSize(9)
    .fillColor("#6b7280")
    .text(
      "Office #2, Building 1698, Block 608, Road 845,\nWadiyan, Sitra, Kingdom of Bahrain.",
      140,
      55
    );

  // TAX INVOICE + meta
  const rightX = 300;
  doc
    .fontSize(12)
    .fillColor("#0f172a")
    .text("TAX INVOICE", rightX, 35, { align: "left" });

  doc
    .fontSize(9)
    .fillColor("#6b7280")
    .text(`Invoice Number: ${invoice.invoiceNumber}`, rightX, 55)
    .text(
      `Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString("en-GB")}`,
      rightX,
      69
    );

  if (invoice.clientMobile) {
    doc.text(`Customer Mobile: ${invoice.clientMobile}`, rightX, 83);
  }

  // ---------- Billing address ----------
  let y = 115;
  doc
    .fontSize(10)
    .fillColor("#0f172a")
    .text("Billing Address", 40, y);

  y += 16;

  doc
    .fontSize(10)
    .fillColor("#111827")
    .text(invoice.clientName || job.clientName || "", 40, y);

  y += 14;

  const addrLines =
    invoice.clientAddress?.split("\n") ||
    [job.routeTo || ""];

  doc
    .fontSize(9)
    .fillColor("#4b5563");

  addrLines.forEach((line) => {
    if (!line) return;
    doc.text(line, 40, y);
    y += 12;
  });

  // ---------- Items table header ----------
  y += 10;

  const tableLeft = 40;
  const colWidths = {
    index: 25,
    name: 170,
    qty: 60,
    unit: 70,
    discount: 60,
    vat: 50,
    total: 70,
  };

  // header background
  doc
    .rect(tableLeft, y, 515, 20)
    .fill("#f3f4f6");

  doc
    .fillColor("#374151")
    .fontSize(9)
    .text("#", tableLeft + 5, y + 5, { width: colWidths.index, align: "left" })
    .text(
      "Name",
      tableLeft + colWidths.index + 5,
      y + 5,
      { width: colWidths.name, align: "left" }
    )
    .text(
      "Quantity",
      tableLeft + colWidths.index + colWidths.name + 5,
      y + 5,
      { width: colWidths.qty, align: "center" }
    )
    .text(
      "Unit price",
      tableLeft + colWidths.index + colWidths.name + colWidths.qty + 5,
      y + 5,
      { width: colWidths.unit, align: "right" }
    )
    .text(
      "Discount",
      tableLeft +
        colWidths.index +
        colWidths.name +
        colWidths.qty +
        colWidths.unit +
        5,
      y + 5,
      { width: colWidths.discount, align: "right" }
    )
    .text(
      "VAT%",
      tableLeft +
        colWidths.index +
        colWidths.name +
        colWidths.qty +
        colWidths.unit +
        colWidths.discount +
        5,
      y + 5,
      { width: colWidths.vat, align: "right" }
    )
    .text(
      "Total",
      tableLeft +
        colWidths.index +
        colWidths.name +
        colWidths.qty +
        colWidths.unit +
        colWidths.discount +
        colWidths.vat +
        5,
      y + 5,
      { width: colWidths.total, align: "right" }
    );

  y += 20;
  doc
    .moveTo(tableLeft, y)
    .lineTo(tableLeft + 515, y)
    .strokeColor("#e5e7eb")
    .stroke();

  // ---------- Items rows ----------
  doc.fontSize(9).fillColor("#111827");
  lineItems.forEach((item, idx) => {
    const rowHeight = 18;
    y += 4;

    doc
      .text(String(idx + 1), tableLeft + 5, y, {
        width: colWidths.index,
        align: "left",
      })
      .text(item.name, tableLeft + colWidths.index + 5, y, {
        width: colWidths.name,
        align: "left",
      })
      .text(String(item.qty), tableLeft + colWidths.index + colWidths.name + 5, y, {
        width: colWidths.qty,
        align: "center",
      })
      .text(formatAmount(item.unitPrice), tableLeft + colWidths.index + colWidths.name + colWidths.qty + 5, y, {
        width: colWidths.unit,
        align: "right",
      })
      .text(formatAmount(item.discount || 0), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + 5, y, {
        width: colWidths.discount,
        align: "right",
      })
      .text(formatAmount(item.vat || 0), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + 5, y, {
        width: colWidths.vat,
        align: "right",
      })
      .text(formatAmount(item.total || 0), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + colWidths.vat + 5, y, {
        width: colWidths.total,
        align: "right",
      });

    y += rowHeight;
    doc
      .moveTo(tableLeft, y)
      .lineTo(tableLeft + 515, y)
      .strokeColor("#f3f4f6")
      .stroke();
  });

  // Discount row (if any)
  if (discount > 0) {
    y += 4;
    doc
      .text("", tableLeft + 5, y, { width: colWidths.index })
      .text("Discount", tableLeft + colWidths.index + 5, y, {
        width: colWidths.name,
        align: "left",
      })
      .text("", tableLeft + colWidths.index + colWidths.name + 5, y, {
        width: colWidths.qty,
      })
      .text("", tableLeft + colWidths.index + colWidths.name + colWidths.qty + 5, y, {
        width: colWidths.unit,
      })
      .text(formatAmount(discount), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + 5, y, {
        width: colWidths.discount,
        align: "right",
      })
      .text("", tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + 5, y, {
        width: colWidths.vat,
      })
      .text(formatAmount(-discount), tableLeft + colWidths.index + colWidths.name + colWidths.qty + colWidths.unit + colWidths.discount + colWidths.vat + 5, y, {
        width: colWidths.total,
        align: "right",
      });

    y += 18;
    doc
      .moveTo(tableLeft, y)
      .lineTo(tableLeft + 515, y)
      .strokeColor("#f3f4f6")
      .stroke();
  }

  // ---------- Amount in words ----------
  y += 20;
  doc
    .fontSize(9)
    .fillColor("#111827")
    .text(
      "Amount In Words: " + amountToWordsBHD(finalSale),
      tableLeft,
      y
    );

  // ---------- Totals box (right side) ----------
  const totalsX = 340;
  const totalsY = y - 10;

  doc
    .fontSize(9)
    .fillColor("#4b5563")
    .text("Total", totalsX, totalsY, { width: 120, align: "right" });
  doc
    .fontSize(9)
    .fillColor("#111827")
    .text(formatWithCurrency(finalSale, currency), totalsX + 125, totalsY, {
      width: 80,
      align: "right",
    });

  doc
    .fontSize(9)
    .fillColor("#4b5563")
    .text("Paid", totalsX, totalsY + 14, { width: 120, align: "right" });
  doc
    .fontSize(9)
    .fillColor("#111827")
    .text(formatWithCurrency(paid, currency), totalsX + 125, totalsY + 14, {
      width: 80,
      align: "right",
    });

  doc
    .fontSize(9)
    .fillColor("#4b5563")
    .text("Balance due", totalsX, totalsY + 28, { width: 120, align: "right" });
  doc
    .fontSize(9)
    .fillColor("#111827")
    .text(formatWithCurrency(balance, currency), totalsX + 125, totalsY + 28, {
      width: 80,
      align: "right",
    });

  doc
    .fontSize(10)
    .fillColor("#0f172a")
    .text("Total Due", totalsX, totalsY + 44, { width: 120, align: "right" });
  doc
    .fontSize(10)
    .fillColor("#0f172a")
    .text(formatWithCurrency(finalSale, currency), totalsX + 125, totalsY + 44, {
      width: 80,
      align: "right",
    });

  // ---------- Bank details ----------
  const bankY = totalsY + 90;

  doc
    .fontSize(9)
    .fillColor("#111827")
    .text(
      "Please make the payment to our bank account at:",
      40,
      bankY
    );

  doc.moveDown(0.5);

  doc
    .fontSize(9)
    .fillColor("#111827")
    .text("Bank name: Kuwait Finance House B.S.C. (c)", 40, bankY + 16)
    .text("Account Number: 0009451698001", 40, bankY + 30)
    .text("IBAN: BH36AUBB00009451698001", 40, bankY + 44)
    .text("Swift Code: AUBBBHBM", 40, bankY + 58);

  // simple page footer
  doc
    .fontSize(8)
    .fillColor("#9ca3af")
    .text("Page 1 of 1", 40, 800, { align: "right" });

  doc.end();
}

module.exports = generateInvoicePDF;

require("dotenv").config();
const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const Job = require("../models/Job");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/wellreach";

function derive(country) {
  const c = (country || "").toLowerCase();
  if (c.includes("india")) return { taxPercent: 18, currency: "INR" };
  return { taxPercent: 10, currency: "BHD" };
}

async function run() {
  await mongoose.connect(MONGO_URI);

  const invoices = await Invoice.find().populate("job");

  for (const inv of invoices) {
    const country = inv.country || inv.job?.country || "";
    const d = derive(country);

    if (!inv.taxPercent || inv.taxPercent === 0) {
      inv.taxPercent = d.taxPercent;
    }

    if (!inv.currency) {
      inv.currency = d.currency;
    }

    await inv.save();
    console.log("Updated:", inv.invoiceNumber, inv.taxPercent, inv.currency);
  }

  console.log("✔ DONE — All invoices corrected");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
